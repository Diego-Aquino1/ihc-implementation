"""
Servicio de persistencia de sesiones LIVE
Maneja el guardado y recuperación de sesiones de entrevista en tiempo real
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlmodel import Session, select
from models.live_session import LiveSession
from models.live_metrics import LiveMetrics, LiveAnalysisEvent
import json
import logging

logger = logging.getLogger(__name__)


def create_live_session(session_id: int, user_id: Optional[int] = None, db: Optional[Session] = None) -> Optional[LiveSession]:
    """
    Crea una nueva sesión LIVE en la base de datos
    
    Args:
        session_id: ID numérico de la sesión (usado como session_number)
        user_id: ID del usuario (opcional)
        db: Sesión de base de datos (opcional, si no se proporciona se usa el engine global)
    """
    try:
        if db is None:
            from database import engine
            with Session(engine) as db:
                return _create_session_internal(session_id, user_id, db)
        else:
            return _create_session_internal(session_id, user_id, db)
    except Exception as e:
        logger.error(f"Error creating live session {session_id}: {e}")
        return None


def _create_session_internal(session_id: int, user_id: Optional[int], db: Session) -> LiveSession:
    """Función interna para crear sesión con sesión de DB ya abierta"""
    # Buscar si ya existe una sesión con este ID
    existing = db.exec(select(LiveSession).where(LiveSession.id == session_id)).first()
    if existing:
        logger.info(f"Live session {session_id} already exists")
        return existing
    
    # Crear nueva sesión
    live_session = LiveSession(
        id=session_id,
        user_id=user_id,
        session_number=session_id,
        status="in_progress",
        started_at=datetime.utcnow(),
        current_stage="introduction",
        stages_completed=0
    )
    
    db.add(live_session)
    db.commit()
    db.refresh(live_session)
    logger.info(f"Created live session {session_id} in database")
    return live_session


def update_session_progress(
    session_id: int,
    stage: Optional[str] = None,
    stage_duration: Optional[int] = None,
    db: Optional[Session] = None
) -> bool:
    """
    Actualiza el progreso de una sesión
    
    Args:
        session_id: ID de la sesión
        stage: Etapa actual (opcional)
        stage_duration: Duración de la etapa actual en segundos (opcional)
        db: Sesión de base de datos (opcional)
    """
    try:
        if db is None:
            from database import engine
            with Session(engine) as db:
                return _update_progress_internal(session_id, stage, stage_duration, db)
        else:
            return _update_progress_internal(session_id, stage, stage_duration, db)
    except Exception as e:
        logger.error(f"Error updating progress for session {session_id}: {e}")
        return False


def _update_progress_internal(session_id: int, stage: Optional[str], stage_duration: Optional[int], db: Session) -> bool:
    """Función interna para actualizar progreso"""
    live_session = db.exec(select(LiveSession).where(LiveSession.id == session_id)).first()
    if not live_session:
        logger.warning(f"Live session {session_id} not found for progress update")
        return False
    
    if stage:
        live_session.current_stage = stage
        
        # Actualizar duración de la etapa correspondiente
        if stage_duration and stage_duration > 0:
            if stage == "introduction":
                live_session.introduction_duration = stage_duration
            elif stage == "experience":
                live_session.experience_duration = stage_duration
            elif stage == "behavioral":
                live_session.behavioral_duration = stage_duration
            elif stage == "stress":
                live_session.stress_duration = stage_duration
            elif stage == "closing":
                live_session.closing_duration = stage_duration
    
    live_session.updated_at = datetime.utcnow()
    db.add(live_session)
    db.commit()
    return True


def finalize_session(
    session_id: int,
    status: str = "completed",
    duration_seconds: int = 0,
    stages_completed: int = 0,
    metrics: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None
) -> Optional[LiveSession]:
    """
    Finaliza una sesión LIVE y guarda las métricas finales
    
    Args:
        session_id: ID de la sesión
        status: Estado final (completed, abandoned)
        duration_seconds: Duración total en segundos
        stages_completed: Número de etapas completadas
        metrics: Diccionario con métricas finales (opcional)
        db: Sesión de base de datos (opcional)
    """
    try:
        if db is None:
            from database import engine
            with Session(engine) as db:
                return _finalize_session_internal(session_id, status, duration_seconds, stages_completed, metrics, db)
        else:
            return _finalize_session_internal(session_id, status, duration_seconds, stages_completed, metrics, db)
    except Exception as e:
        logger.error(f"Error finalizing session {session_id}: {e}")
        return None


def _finalize_session_internal(
    session_id: int,
    status: str,
    duration_seconds: int,
    stages_completed: int,
    metrics: Optional[Dict[str, Any]],
    db: Session
) -> Optional[LiveSession]:
    """Función interna para finalizar sesión"""
    live_session = db.exec(select(LiveSession).where(LiveSession.id == session_id)).first()
    if not live_session:
        logger.warning(f"Live session {session_id} not found for finalization")
        return None
    
    # Actualizar estado de la sesión
    live_session.status = status
    live_session.ended_at = datetime.utcnow()
    live_session.duration_seconds = duration_seconds
    live_session.stages_completed = stages_completed
    live_session.updated_at = datetime.utcnow()
    
    # Guardar métricas finales si se proporcionan
    if metrics:
        save_final_metrics(session_id, metrics, db=db)
    
    db.add(live_session)
    db.commit()
    db.refresh(live_session)
    logger.info(f"Finalized live session {session_id} with status {status}")
    return live_session


def save_final_metrics(session_id: int, metrics: Dict[str, Any], db: Optional[Session] = None) -> Optional[LiveMetrics]:
    """
    Guarda las métricas finales de una sesión
    
    Args:
        session_id: ID de la sesión
        metrics: Diccionario con métricas (stats, visualCue, etc.)
        db: Sesión de base de datos (opcional)
    """
    try:
        if db is None:
            from database import engine
            with Session(engine) as db:
                return _save_metrics_internal(session_id, metrics, db)
        else:
            return _save_metrics_internal(session_id, metrics, db)
    except Exception as e:
        logger.error(f"Error saving final metrics for session {session_id}: {e}")
        return None


def _save_metrics_internal(session_id: int, metrics: Dict[str, Any], db: Session) -> Optional[LiveMetrics]:
    """Función interna para guardar métricas"""
    # Verificar si ya existen métricas para esta sesión
    existing = db.exec(select(LiveMetrics).where(LiveMetrics.session_id == session_id)).first()
    
    stats = metrics.get("stats", {})
    metrics_data = stats.get("metrics", {})
    visual_cue = metrics.get("visualCue")
    
    # Calcular overall score
    audio_score = metrics_data.get("clarity", 0) * 40  # 40% peso
    visual_score = 0
    if visual_cue:
        eye_contact = visual_cue.get("eye_contact_percentage", 0) / 100
        posture = visual_cue.get("posture_score", 0) / 10
        visual_score = (eye_contact * 0.6 + posture * 0.4) * 60  # 60% peso
    
    overall_score = min(100, max(0, audio_score + visual_score))
    
    if existing:
        # Actualizar métricas existentes
        existing.avg_wpm = metrics_data.get("wpm", 0)
        existing.avg_pause_duration = metrics_data.get("avgPauseDuration", 0)
        existing.total_filler_words = metrics_data.get("fillerWords", 0)
        existing.avg_volume_level = metrics_data.get("volumeLevel", 0)
        existing.clarity_score = metrics_data.get("clarity", 0)
        
        if visual_cue:
            existing.eye_contact_percentage = visual_cue.get("eye_contact_percentage", 0)
            existing.posture_score = visual_cue.get("posture_score", 0)
            existing.smile_count = visual_cue.get("smile_count", 0)
        
        existing.overall_score = overall_score
        existing.updated_at = datetime.utcnow()
        
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Crear nuevas métricas
        live_metrics = LiveMetrics(
            session_id=session_id,
            avg_wpm=metrics_data.get("wpm", 0),
            avg_pause_duration=metrics_data.get("avgPauseDuration", 0),
            total_filler_words=metrics_data.get("fillerWords", 0),
            avg_volume_level=metrics_data.get("volumeLevel", 0),
            clarity_score=metrics_data.get("clarity", 0),
            eye_contact_percentage=visual_cue.get("eye_contact_percentage", 0) if visual_cue else 0,
            posture_score=visual_cue.get("posture_score", 0) if visual_cue else 0,
            smile_count=visual_cue.get("smile_count", 0) if visual_cue else 0,
            overall_score=overall_score
        )
        
        db.add(live_metrics)
        db.commit()
        db.refresh(live_metrics)
        logger.info(f"Saved final metrics for session {session_id}")
        return live_metrics


def get_live_session(session_id: int, db: Optional[Session] = None) -> Optional[LiveSession]:
    """Obtiene una sesión LIVE por ID"""
    try:
        if db is None:
            from database import engine
            with Session(engine) as db:
                return db.exec(select(LiveSession).where(LiveSession.id == session_id)).first()
        else:
            return db.exec(select(LiveSession).where(LiveSession.id == session_id)).first()
    except Exception as e:
        logger.error(f"Error getting live session {session_id}: {e}")
        return None


def get_user_live_sessions(user_id: Optional[int] = None, limit: int = 50, db: Optional[Session] = None) -> List[LiveSession]:
    """Obtiene todas las sesiones LIVE de un usuario (o todas si user_id es None)"""
    try:
        if db is None:
            from database import engine
            with Session(engine) as db:
                return _get_sessions_internal(user_id, limit, db)
        else:
            return _get_sessions_internal(user_id, limit, db)
    except Exception as e:
        logger.error(f"Error getting live sessions for user {user_id}: {e}")
        return []


def _get_sessions_internal(user_id: Optional[int], limit: int, db: Session) -> List[LiveSession]:
    """Función interna para obtener sesiones"""
    if user_id:
        statement = select(LiveSession).where(LiveSession.user_id == user_id).order_by(LiveSession.created_at.desc()).limit(limit)
    else:
        statement = select(LiveSession).order_by(LiveSession.created_at.desc()).limit(limit)
    return list(db.exec(statement).all())


def get_session_metrics(session_id: int, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
    """Obtiene las métricas de una sesión"""
    try:
        if db is None:
            from database import engine
            with Session(engine) as db:
                return _get_metrics_internal(session_id, db)
        else:
            return _get_metrics_internal(session_id, db)
    except Exception as e:
        logger.error(f"Error getting metrics for session {session_id}: {e}")
        return None


def _get_metrics_internal(session_id: int, db: Session) -> Optional[Dict[str, Any]]:
    """Función interna para obtener métricas"""
    live_session = db.exec(select(LiveSession).where(LiveSession.id == session_id)).first()
    if not live_session:
        return None
    
    metrics = db.exec(select(LiveMetrics).where(LiveMetrics.session_id == session_id)).first()
    
    result = {
        "session": live_session.to_dict(),
        "metrics": metrics.to_dict() if metrics else None
    }
    
    return result

