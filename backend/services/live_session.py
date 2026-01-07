"""
Servicio de gestión de sesiones LIVE
Maneja el estado y lógica de las sesiones de entrevista en tiempo real
"""
from typing import Dict, Optional, Any
from datetime import datetime
from enum import Enum
from services.stage_manager import StageManager, LiveStage


class LiveSessionState:
    """Estado de una sesión LIVE"""
    
    def __init__(self, session_id: int, user_id: Optional[int] = None):
        self.session_id = session_id
        self.user_id = user_id
        self.started_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.is_active = True
        self.questions_count = 0
        self.audio_chunks_received = 0
        self.video_frames_received = 0
        
        # Stage Manager para gestionar etapas y transiciones
        self.stage_manager = StageManager(session_id)
        self.stage_manager.start_session()
        
    @property
    def current_stage(self):
        """Retorna la etapa actual desde el stage manager"""
        return self.stage_manager.current_stage
    
    @property
    def progress(self):
        """Retorna el progreso total desde el stage manager"""
        return self.stage_manager.get_total_progress()
    
    def check_stage_transition(self) -> Optional[LiveStage]:
        """Verifica si debe avanzar de etapa y retorna la nueva etapa si hay cambio"""
        new_stage = self.stage_manager.check_and_advance_stage()
        if new_stage:
            self.last_activity = datetime.utcnow()
        return new_stage
        
    def to_dict(self) -> Dict[str, Any]:
        """Convierte el estado a diccionario para enviar al cliente"""
        stage_data = self.stage_manager.to_dict()
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "current_stage": self.current_stage.value,
            "progress": self.progress,
            "stage_progress": stage_data["stage_progress"],
            "time_remaining": stage_data["time_remaining"],
            "started_at": self.started_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "is_active": self.is_active,
            "questions_count": self.questions_count,
        }
    
    def increment_question(self):
        """Incrementa el contador de preguntas"""
        self.questions_count += 1
        self.last_activity = datetime.utcnow()


# Almacenamiento en memoria de sesiones activas
# En producción, esto debería ser Redis o similar
_active_sessions: Dict[int, LiveSessionState] = {}


def get_session(session_id: int) -> Optional[LiveSessionState]:
    """Obtiene una sesión activa"""
    return _active_sessions.get(session_id)


def create_session(session_id: int, user_id: Optional[int] = None) -> LiveSessionState:
    """Crea una nueva sesión LIVE"""
    session = LiveSessionState(session_id, user_id)
    _active_sessions[session_id] = session
    return session


def remove_session(session_id: int):
    """Elimina una sesión activa"""
    if session_id in _active_sessions:
        del _active_sessions[session_id]


def update_session_progress(session_id: int, progress: float):
    """Actualiza el progreso de una sesión"""
    session = get_session(session_id)
    if session:
        session.update_progress(progress)


def get_all_active_sessions() -> Dict[int, LiveSessionState]:
    """Obtiene todas las sesiones activas (útil para debugging)"""
    return _active_sessions.copy()

