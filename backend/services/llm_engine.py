from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from sqlmodel import Session, select

from models import InterviewSession, InterviewTurn, Question, RealtimeSignalWindow, RealtimeEvent
from services.openai_client import generate_json_turn


STAGE_TASK_FLOW: List[Tuple[str, str]] = [
    ("Stage_1_Introduccion", "T1_1_dato_puntual"),
    ("Stage_1_Introduccion", "T1_2_autodescripcion"),
    ("Stage_2_Experiencia", "T2_1_proyecto_entendible"),
    ("Stage_2_Experiencia", "T2_2_repreguntas_proyecto"),
    ("Stage_3_Comportamiento", "T3_1_conductual"),
    ("Stage_3_Comportamiento", "T3_2_bajo_presion"),
    ("Stage_4_Cierre", "T4_1_preguntas_y_siguientes_pasos"),
    ("Stage_4_Cierre", "T4_2_pedir_feedback"),
]


def default_state() -> Dict[str, Any]:
    stage, task_id = STAGE_TASK_FLOW[0]
    return {
        "stage": stage,
        "task_id": task_id,
        "flow_index": 0,
        "question_index": 0,
        "should_follow_up": False,
        "phase": "warmup",
        "current_question_external_id": None,
    }


def _get_recent_signal_summary(db: Session, session_id: int) -> Dict[str, Any]:
    # MVP: promedio simple de últimos N registros (no usamos time window exacta).
    posture = db.exec(
        select(RealtimeSignalWindow)
        .where(RealtimeSignalWindow.session_id == session_id)
        .where(RealtimeSignalWindow.signal_type == "posture")
        .order_by(RealtimeSignalWindow.id.desc())
        .limit(5)
    ).all()
    gaze = db.exec(
        select(RealtimeSignalWindow)
        .where(RealtimeSignalWindow.session_id == session_id)
        .where(RealtimeSignalWindow.signal_type == "gaze")
        .order_by(RealtimeSignalWindow.id.desc())
        .limit(5)
    ).all()

    def avg(items, key: str) -> float:
        if not items:
            return 0.0
        return sum(float(getattr(i, key)) for i in items) / len(items)

    posture_score = avg(posture, "score")

    # gaze off_camera_ratio lo guardamos como features si viene
    off_vals: List[float] = []
    for g in gaze:
        v = (g.features or {}).get("off_camera_ratio")
        if v is not None:
            try:
                off_vals.append(float(v))
            except Exception:
                pass
    off_avg = sum(off_vals) / len(off_vals) if off_vals else 0.0

    silence = db.exec(
        select(RealtimeEvent)
        .where(RealtimeEvent.session_id == session_id)
        .where(RealtimeEvent.event_type == "silence")
        .order_by(RealtimeEvent.id.desc())
        .limit(1)
    ).first()
    last_silence_ms = 0
    last_prolonged = False
    if silence and silence.payload:
        last_silence_ms = int(silence.payload.get("silence_ms", 0) or 0)
        last_prolonged = bool(silence.payload.get("is_prolonged", False))

    return {
        "posture_score": posture_score,
        "gaze_off_camera_ratio": off_avg,
        "last_silence_ms": last_silence_ms,
        "last_silence_prolonged": last_prolonged,
    }


def _pick_question(
    db: Session,
    session: InterviewSession,
    state: Dict[str, Any],
) -> Optional[Question]:
    selected_modules = session.selected_modules or []
    flow_index = int(state.get("flow_index", 0))
    stage, task_id = STAGE_TASK_FLOW[min(max(flow_index, 0), len(STAGE_TASK_FLOW) - 1)]

    q_stmt = select(Question).where(Question.active == True).where(Question.stage == stage).where(Question.task_id == task_id)
    if selected_modules:
        q_stmt = q_stmt.where(Question.module.in_(selected_modules))
    q_stmt = q_stmt.order_by(Question.id.asc())

    candidates = db.exec(q_stmt).all()
    if not candidates:
        # fallback sin filtro por módulo
        candidates = db.exec(
            select(Question)
            .where(Question.active == True)
            .where(Question.stage == stage)
            .where(Question.task_id == task_id)
            .order_by(Question.id.asc())
        ).all()
    if not candidates:
        return None

    idx = int(state.get("question_index", 0))
    idx = min(max(idx, 0), len(candidates) - 1)
    return candidates[idx]


def interview_turn_schema() -> Dict[str, Any]:
    # JSON Schema estricto, cercano a lo que definiste + HTA fields.
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["interviewer_speech", "next_question_id", "feedback", "scores", "state", "stage", "task_id", "expected_checklist", "detected_errors", "follow_up_strategy"],
        "properties": {
            "interviewer_speech": {"type": "string"},
            "next_question_id": {"type": ["string", "null"]},
            "feedback": {
                "type": "object",
                "additionalProperties": False,
                "required": ["content", "body_language"],
                "properties": {
                    "content": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["type", "message"],
                            "properties": {"type": {"type": "string"}, "message": {"type": "string"}},
                        },
                    },
                    "body_language": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["type", "message"],
                            "properties": {"type": {"type": "string"}, "message": {"type": "string"}},
                        },
                    },
                },
            },
            "scores": {
                "type": "object",
                "additionalProperties": False,
                "required": ["content", "delivery", "body_language"],
                "properties": {
                    "content": {"type": "number"},
                    "delivery": {"type": "number"},
                    "body_language": {"type": "number"},
                },
            },
            "state": {
                "type": "object",
                "additionalProperties": False,
                "required": ["module", "question_index", "should_follow_up", "phase"],
                "properties": {
                    "module": {"type": "string"},
                    "question_index": {"type": "integer"},
                    "should_follow_up": {"type": "boolean"},
                    "phase": {"type": "string"},
                },
            },
            "stage": {"type": "string"},
            "task_id": {"type": "string"},
            "expected_checklist": {"type": "array", "items": {"type": "string"}},
            "detected_errors": {"type": "array", "items": {"type": "string"}},
            "follow_up_strategy": {"type": "string"},
        },
    }


def generate_interviewer_turn(
    db: Session,
    session: InterviewSession,
    last_candidate_turn: Optional[InterviewTurn],
) -> Dict[str, Any]:
    state = session.state or default_state()
    q = _pick_question(db, session, state)
    signals = _get_recent_signal_summary(db, session.id)
    cfg = session.config or {}
    vibe = (cfg.get("vibe") or "empath").lower()
    learning_objective = (cfg.get("learningObjective") or "").strip()
    question_focus = (cfg.get("questionFocus") or "mixed").lower()

    vibe_style = {
        "empath": "Eres cálido, paciente y alentador. Ayudas a bajar ansiedad. Das tips suaves y validas emociones.",
        "challenger": "Eres exigente y directo. Presionas con repreguntas y pides precisión. Mantén tono profesional, sin agresividad.",
        "analyst": "Eres analítico y metódico. Pides claridad, definiciones y ejemplos. Priorizas precisión y estructura.",
    }.get(vibe, "Eres profesional, claro y constructivo.")

    # Construir prompt con HTA.
    system = (
        "Eres un entrevistador virtual y coach estricto pero constructivo. "
        "Debes conducir una entrevista por etapas (T1–T4), hacer repreguntas si la respuesta fue pobre/incompleta, "
        "y entregar micro-feedback. "
        f"{vibe_style} "
        f"Enfoque de preguntas: {question_focus}. "
        + (f"Objetivo de aprendizaje del usuario: {learning_objective}. " if learning_objective else "")
        "CRITICO: Devuelve SOLO un JSON válido según el schema estricto. "
        "Mantén las claves en inglés y los textos (valores) en español."
    )

    last_answer = ""
    if last_candidate_turn:
        last_answer = (last_candidate_turn.transcript or last_candidate_turn.text or "").strip()

    q_prompt = q.prompt if q else "Continúa con la entrevista con una pregunta apropiada."
    module = q.module if q else (session.selected_modules[0] if session.selected_modules else "HR")

    user = f"""
Contexto de sesión:
- selected_modules: {session.selected_modules}
- current_stage: {state.get('stage')}
- current_task_id: {state.get('task_id')}
- current_question_index: {state.get('question_index')}

Señales recientes (tiempo real):
- posture_score: {signals.get('posture_score')}
- gaze_off_camera_ratio: {signals.get('gaze_off_camera_ratio')}
- last_silence_ms: {signals.get('last_silence_ms')}
- last_silence_prolonged: {signals.get('last_silence_prolonged')}

Pregunta objetivo:
\"{q_prompt}\"

Última respuesta del candidato (si existe):
\"{last_answer}\"

Instrucciones por tarea:
- Si es T1_1_dato_puntual: exigir 1–2 frases, factual, cierre.
- Si es T1_2_autodescripcion: 2–3 rasgos + mini-ejemplo + conexión al puesto.
- Si es T2/T3: sugerir STAR si falta estructura.
- Si hubo silencio prolongado: dar tip de respiración/estructura antes de repreguntar.

Ahora genera el turno del entrevistador y el feedback.
"""

    result = generate_json_turn(system=system, user=user, schema=interview_turn_schema())

    # Sane defaults + backfill mínimo
    result.setdefault("state", {})
    result["state"].setdefault("module", module)
    result["state"].setdefault("question_index", int(state.get("question_index", 0)))
    result["state"].setdefault("should_follow_up", False)
    result["state"].setdefault("phase", state.get("phase", "core"))
    result.setdefault("stage", state.get("stage"))
    result.setdefault("task_id", state.get("task_id"))

    if q and not result.get("next_question_id"):
        result["next_question_id"] = q.external_id

    return result


def apply_turn_to_state(session: InterviewSession, turn_json: Dict[str, Any]) -> None:
    """
    Actualiza session.state en base a la salida del LLM.
    Para MVP, avanzamos en la state machine cuando should_follow_up == False.
    """
    state = session.state or default_state()

    # stage/task de salida
    stage = turn_json.get("stage") or state.get("stage")
    task_id = turn_json.get("task_id") or state.get("task_id")

    should_follow_up = bool((turn_json.get("state") or {}).get("should_follow_up", False))
    question_index = int((turn_json.get("state") or {}).get("question_index", state.get("question_index", 0)))

    # Si no hay follow-up, avanzamos al siguiente task.
    flow_index = int(state.get("flow_index", 0))
    if not should_follow_up:
        flow_index = min(flow_index + 1, len(STAGE_TASK_FLOW) - 1)
        next_stage, next_task_id = STAGE_TASK_FLOW[flow_index]
        stage = next_stage
        task_id = next_task_id
        question_index = 0
    else:
        # repregunta: mantenemos task y question_index
        pass

    state.update(
        {
            "stage": stage,
            "task_id": task_id,
            "flow_index": flow_index,
            "question_index": question_index,
            "should_follow_up": should_follow_up,
            "phase": (turn_json.get("state") or {}).get("phase", state.get("phase", "core")),
            "current_question_external_id": turn_json.get("next_question_id"),
        }
    )
    session.state = state


