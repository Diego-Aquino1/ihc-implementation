from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, JSON

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    avatar_url: Optional[str] = None
    plan: Optional[str] = "Free"
    
    sessions: List["SessionData"] = Relationship(back_populates="user")

class SessionData(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    date: datetime = Field(default_factory=datetime.utcnow)
    score: int
    duration_seconds: int
    feedback_summary: Optional[str] = None
    
    user: Optional[User] = Relationship(back_populates="sessions")


# =========================
# MVP Coach Entrevistas (HTA T1–T4)
# =========================

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # ID estable para referenciar desde el frontend/LLM (ej: "Q_T1_1_001")
    external_id: str = Field(index=True, unique=True)

    # Taxonomía de banco
    module: str = Field(index=True)  # HR | Behavioral | SystemDesign | ...
    stage: str = Field(index=True)   # Stage_1_Introduccion | ...
    task_id: str = Field(index=True) # T1_1_dato_puntual | ...

    prompt: str
    difficulty: Optional[str] = Field(default=None, index=True)
    active: bool = Field(default=True, index=True)

    # JSON opcional (rúbrica/followups/tags)
    rubric: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    followups: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))


class InterviewSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    status: str = Field(default="active", index=True)  # active | completed | abandoned

    # Selección/configuración de la sesión
    selected_modules: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    config: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

    # Estado HTA (stage/task actuales + índices + flags)
    state: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

    # Scores acumulados y breakdown
    scores: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class InterviewTurn(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="interviewsession.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    role: str = Field(index=True)  # interviewer | candidate

    # Contexto de pregunta/tarea
    question_external_id: Optional[str] = Field(default=None, index=True)
    stage: Optional[str] = Field(default=None, index=True)
    task_id: Optional[str] = Field(default=None, index=True)

    # Contenido
    text: Optional[str] = None         # interviewer_speech o respuesta texto
    transcript: Optional[str] = None   # STT si aplica

    # Artefactos evaluativos (LLM + agregados)
    llm_payload: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    feedback: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    turn_scores: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    # 'metadata' es reservado por SQLAlchemy Declarative API
    extra: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class RealtimeSignalWindow(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="interviewsession.id", index=True)

    t_start_ms: int = Field(index=True)
    t_end_ms: int = Field(index=True)

    signal_type: str = Field(index=True)  # posture | gaze
    score: float = Field(default=0.0, index=True)
    features: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class RealtimeEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="interviewsession.id", index=True)

    ts_ms: int = Field(index=True)
    event_type: str = Field(index=True)  # silence | client_event | ...
    payload: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
