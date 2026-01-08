"""
Modelo de sesión completa de entrevista LIVE
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field


class LiveSession(SQLModel, table=True):
    """Sesión completa de entrevista LIVE"""
    __tablename__ = "live_sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True)  # Foreign key a users.id cuando exista
    session_number: int = Field(default=1, index=True)  # Número de sesión (1, 2, 3...)
    
    # Estado y duración
    status: str = Field(default="in_progress")  # in_progress, completed, abandoned, paused
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    duration_seconds: int = Field(default=0)  # Duración total en segundos
    paused_seconds: int = Field(default=0)  # Tiempo total en pausa
    
    # Progreso
    current_stage: str = Field(default="introduction")  # introduction, experience, behavioral, stress, closing
    stages_completed: int = Field(default=0)  # Cuántas etapas completó
    total_stages: int = Field(default=5)
    
    # Conversación
    total_questions_asked: int = Field(default=0)
    total_user_responses: int = Field(default=0)
    conversation_summary: Optional[str] = None  # Resumen de la conversación
    
    # Tiempos por etapa (en segundos)
    introduction_duration: int = Field(default=0)
    experience_duration: int = Field(default=0)
    behavioral_duration: int = Field(default=0)
    stress_duration: int = Field(default=0)
    closing_duration: int = Field(default=0)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_number": self.session_number,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_seconds": self.duration_seconds,
            "paused_seconds": self.paused_seconds,
            "current_stage": self.current_stage,
            "stages_completed": self.stages_completed,
            "total_stages": self.total_stages,
            "total_questions_asked": self.total_questions_asked,
            "total_user_responses": self.total_user_responses,
            "conversation_summary": self.conversation_summary,
            "stage_durations": {
                "introduction": self.introduction_duration,
                "experience": self.experience_duration,
                "behavioral": self.behavioral_duration,
                "stress": self.stress_duration,
                "closing": self.closing_duration
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_total_duration(self) -> int:
        """Retorna la duración total activa (sin pausas)"""
        return self.duration_seconds - self.paused_seconds
    
    def format_duration(self) -> str:
        """Formatea la duración en formato MM:SS"""
        total = self.get_total_duration()
        minutes = total // 60
        seconds = total % 60
        return f"{minutes}:{seconds:02d}"

