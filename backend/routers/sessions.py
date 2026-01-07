import base64
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import InterviewSession, InterviewTurn, Question, User
from services.llm_engine import default_state, generate_interviewer_turn, apply_turn_to_state
from services.openai_client import transcribe_audio


router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    selected_modules: List[str] = []
    user_id: Optional[int] = None
    config: Dict[str, Any] = {}


class CreateSessionResponse(BaseModel):
    session_id: int
    state: Dict[str, Any]


class NextTurnResponse(BaseModel):
    turn: Dict[str, Any]
    tts: Dict[str, Any] = {}


@router.post("", response_model=CreateSessionResponse)
def create_session(payload: CreateSessionRequest, db: Session = Depends(get_session)):
    # Single user fallback
    user_id = payload.user_id
    if not user_id:
        user = db.exec(select(User).limit(1)).first()
        if not user:
            user = User(name="Alex User", email="alex@example.com", plan="Pro", avatar_url="https://picsum.photos/200")
            db.add(user)
            db.commit()
            db.refresh(user)
        user_id = user.id

    # Si no mandan módulos, elegimos los que existan en Question
    modules = payload.selected_modules
    if not modules:
        modules = [m for (m,) in db.exec(select(Question.module).distinct()).all()]
        if not modules:
            # seed debería haberlos creado
            modules = ["HR", "Behavioral", "Leadership"]

    base_config = {"pause_threshold_s": 10}
    if payload.config:
        base_config.update(payload.config)

    session = InterviewSession(
        user_id=user_id,
        selected_modules=modules,
        config=base_config,
        state=default_state(),
        scores={"content": 0.0, "delivery": 0.0, "body_language": 0.0},
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return CreateSessionResponse(session_id=session.id, state=session.state)


@router.get("/{session_id}")
def get_session_state(session_id: int, db: Session = Depends(get_session)):
    s = db.get(InterviewSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    turns = db.exec(
        select(InterviewTurn).where(InterviewTurn.session_id == session_id).order_by(InterviewTurn.id.desc()).limit(10)
    ).all()
    turns_json = [
        {
            "id": t.id,
            "role": t.role,
            "text": t.text,
            "transcript": t.transcript,
            "question_external_id": t.question_external_id,
            "stage": t.stage,
            "task_id": t.task_id,
            "created_at": t.created_at.isoformat(),
        }
        for t in turns
    ]
    return {"session": {"id": s.id, "status": s.status, "selected_modules": s.selected_modules}, "state": s.state, "scores": s.scores, "turns": turns_json}


@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: int,
    db: Session = Depends(get_session),
    text: Optional[str] = Form(default=None),
    audio: Optional[UploadFile] = File(default=None),
):
    s = db.get(InterviewSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = None
    if audio is not None:
        audio_bytes = await audio.read()
        transcript = transcribe_audio(
            audio_bytes=audio_bytes,
            filename=audio.filename or "audio.webm",
            mime_type=audio.content_type or "audio/webm",
        )

    turn = InterviewTurn(
        session_id=session_id,
        role="candidate",
        text=text,
        transcript=transcript,
        stage=(s.state or {}).get("stage"),
        task_id=(s.state or {}).get("task_id"),
        question_external_id=(s.state or {}).get("current_question_external_id"),
        extra={"audio_mime": getattr(audio, "content_type", None)} if audio else {},
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)

    return {"ok": True, "turn_id": turn.id, "transcript": transcript}


@router.post("/{session_id}/next", response_model=NextTurnResponse)
def next_turn(session_id: int, db: Session = Depends(get_session)):
    s = db.get(InterviewSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    last_candidate = db.exec(
        select(InterviewTurn)
        .where(InterviewTurn.session_id == session_id)
        .where(InterviewTurn.role == "candidate")
        .order_by(InterviewTurn.id.desc())
        .limit(1)
    ).first()

    turn_json = generate_interviewer_turn(db, s, last_candidate)
    apply_turn_to_state(s, turn_json)

    # Persistimos el turno del entrevistador
    interviewer_turn = InterviewTurn(
        session_id=session_id,
        role="interviewer",
        text=turn_json.get("interviewer_speech"),
        transcript=None,
        stage=turn_json.get("stage"),
        task_id=turn_json.get("task_id"),
        question_external_id=turn_json.get("next_question_id"),
        llm_payload=turn_json,
        feedback=turn_json.get("feedback") or {},
        turn_scores=turn_json.get("scores") or {},
    )
    db.add(interviewer_turn)
    db.add(s)
    db.commit()
    db.refresh(interviewer_turn)
    db.refresh(s)

    # TTS se resolverá por endpoint separado en el MVP (frontend lo llama con el texto).
    return NextTurnResponse(turn=turn_json, tts={"audio_url": None, "audio_base64": None, "mime": None})


@router.get("/{session_id}/report")
def report(session_id: int, db: Session = Depends(get_session)):
    s = db.get(InterviewSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    turns = db.exec(select(InterviewTurn).where(InterviewTurn.session_id == session_id).order_by(InterviewTurn.id.asc())).all()
    # Resumen simple MVP
    content_scores = []
    delivery_scores = []
    body_scores = []
    for t in turns:
        if t.role == "interviewer" and t.turn_scores:
            try:
                content_scores.append(float(t.turn_scores.get("content", 0)))
                delivery_scores.append(float(t.turn_scores.get("delivery", 0)))
                body_scores.append(float(t.turn_scores.get("body_language", 0)))
            except Exception:
                pass

    def avg(xs: List[float]) -> float:
        return sum(xs) / len(xs) if xs else 0.0

    return {
        "session_id": session_id,
        "status": s.status,
        "selected_modules": s.selected_modules,
        "state": s.state,
        "scores": {"content": avg(content_scores), "delivery": avg(delivery_scores), "body_language": avg(body_scores)},
        "turn_count": len(turns),
        "recommendations": [
            "Practica responder con estructura (STAR) en etapas T2 y T3.",
            "Cuida postura y mira a cámara al iniciar y cerrar ideas.",
        ],
    }


