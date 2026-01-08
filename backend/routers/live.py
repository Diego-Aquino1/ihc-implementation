"""
Router para el feature LIVE - Entrevista en tiempo real
Maneja conexiones WebSocket para comunicación bidireccional
"""
import json
import logging
from typing import Dict, Any
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.websockets import WebSocketState
from sqlmodel import Session, select
from typing import Optional, List

from services.live_session import (
    get_session,
    create_session,
    remove_session,
    update_session_progress,
    LiveStage,
)
from services.live_session_persistence import (
    get_live_session,
    get_user_live_sessions,
    get_session_metrics,
    create_live_session as create_persisted_session
)
from database import engine
from sqlmodel import Session as DBSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["live"])

# Helper functions para guardar análisis
def save_analysis_event(session_id: int, event_type: str, event_data: Dict[str, Any]):
    """Guarda un evento de análisis en la base de datos"""
    try:
        from models.live_metrics import LiveAnalysisEvent
        
        with Session(engine) as db:
            event = LiveAnalysisEvent(
                session_id=session_id,
                event_type=event_type,
                event_data=json.dumps(event_data),
                timestamp=datetime.utcnow()
            )
            db.add(event)
            db.commit()
            logger.info(f"Saved {event_type} event for session {session_id}")
    except Exception as e:
        logger.error(f"Error saving analysis event: {e}")

def save_final_metrics(session_id: int, stats: Dict[str, Any], visual_cue: Dict[str, Any]):
    """Guarda las métricas finales de una sesión"""
    try:
        from models.live_metrics import LiveMetrics
        
        metrics_data = stats.get("metrics", {})
        
        with Session(engine) as db:
            # Buscar si ya existen métricas para esta sesión
            statement = select(LiveMetrics).where(LiveMetrics.session_id == session_id)
            existing = db.exec(statement).first()
            
            if existing:
                # Actualizar métricas existentes
                existing.avg_wpm = metrics_data.get("wpm", 0)
                existing.avg_pause_duration = metrics_data.get("avgPauseDuration", 0)
                existing.total_filler_words = metrics_data.get("fillerWords", 0)
                existing.avg_volume_level = metrics_data.get("volumeLevel", 0)
                existing.clarity_score = metrics_data.get("clarity", 0)
                existing.overall_score = metrics_data.get("clarity", 0) * 100
                existing.updated_at = datetime.utcnow()
                
                if visual_cue:
                    # Actualizar métricas visuales si hay datos
                    if visual_cue.get("status") == "Contacto Visual":
                        existing.eye_contact_percentage = min(100, existing.eye_contact_percentage + 10)
                    elif visual_cue.get("status") == "Sonriendo":
                        existing.smile_count += 1
                
                db.add(existing)
            else:
                # Crear nuevas métricas
                metrics = LiveMetrics(
                    session_id=session_id,
                    avg_wpm=metrics_data.get("wpm", 0),
                    avg_pause_duration=metrics_data.get("avgPauseDuration", 0),
                    total_filler_words=metrics_data.get("fillerWords", 0),
                    avg_volume_level=metrics_data.get("volumeLevel", 0),
                    clarity_score=metrics_data.get("clarity", 0),
                    overall_score=metrics_data.get("clarity", 0) * 100
                )
                db.add(metrics)
            
            db.commit()
            logger.info(f"Saved final metrics for session {session_id}")
    except Exception as e:
        logger.error(f"Error saving final metrics: {e}")

# Almacenamiento de conexiones WebSocket activas
# En producción, usar Redis Pub/Sub o similar
_active_connections: Dict[int, WebSocket] = {}


# ==================== HTTP ENDPOINTS ====================

@router.get("/sessions")
async def get_sessions_endpoint(user_id: Optional[int] = None, limit: int = 50):
    """Obtiene todas las sesiones LIVE del usuario (o todas si user_id es None)"""
    try:
        sessions = get_user_live_sessions(user_id=user_id, limit=limit)
        return {
            "sessions": [session.to_dict() for session in sessions],
            "total": len(sessions)
        }
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_session_detail_endpoint(session_id: int):
    """Obtiene los detalles completos de una sesión LIVE"""
    try:
        session = get_live_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        return session.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/metrics")
async def get_metrics_endpoint(session_id: int):
    """Obtiene las métricas completas de una sesión LIVE"""
    try:
        metrics_data = get_session_metrics(session_id)
        if not metrics_data:
            raise HTTPException(status_code=404, detail=f"Metrics for session {session_id} not found")
        return metrics_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metrics for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/full")
async def get_full_session_endpoint(session_id: int):
    """Obtiene la sesión completa con métricas"""
    try:
        session = get_live_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        metrics_data = get_session_metrics(session_id)
        return {
            "session": session.to_dict(),
            "metrics": metrics_data.get("metrics") if metrics_data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting full session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== WEBSOCKET ENDPOINT ====================

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int):
    """
    Endpoint WebSocket para sesiones LIVE
    
    Tipos de mensajes:
    - client -> server:
      * {"type": "connect", "user_id": int}
      * {"type": "audio_chunk", "data": "base64_audio"}
      * {"type": "video_frame", "data": "base64_image"}
      * {"type": "ping"}
    
    - server -> client:
      * {"type": "connected", "session": {...}}
      * {"type": "stage_update", "stage": "introduction", "progress": 0.25}
      * {"type": "interviewer_audio", "data": "base64_audio"}
      * {"type": "feedback", "metrics": {...}}
      * {"type": "pong"}
    """
    await websocket.accept()
    
    try:
        # Obtener o crear sesión en memoria
        session = get_session(session_id)
        if not session:
            # Crear nueva sesión en memoria (user_id se puede obtener del primer mensaje)
            session = create_session(session_id)
            logger.info(f"Created new LIVE session in memory: {session_id}")
            
            # Crear también la sesión en la base de datos
            try:
                from services.live_session_persistence import create_live_session
                create_live_session(session_id, user_id=None)  # user_id puede ser None por ahora
                logger.info(f"Created live session {session_id} in database")
            except Exception as e:
                logger.error(f"Error creating live session in database: {e}")
        
        # Registrar conexión
        _active_connections[session_id] = websocket
        
        # Enviar confirmación de conexión
        await websocket.send_json({
            "type": "connected",
            "session": session.to_dict(),
            "message": "Connected to LIVE session"
        })
        
        logger.info(f"WebSocket connected for session {session_id}")
        
        # Iniciar loop de verificación de transiciones de etapa (cada segundo)
        import asyncio
        async def check_stage_transitions():
            """Verifica transiciones de etapa cada segundo con manejo de errores mejorado"""
            consecutive_errors = 0
            max_consecutive_errors = 10
            
            while True:
                try:
                    if session_id in _active_connections and websocket.client_state == WebSocketState.CONNECTED:
                        session = get_session(session_id)
                        if session and session.is_active:
                            new_stage = session.check_stage_transition()
                            if new_stage:
                                # Actualizar progreso en la base de datos
                                try:
                                    from services.live_session_persistence import update_session_progress
                                    from datetime import datetime
                                    # Calcular duración de la etapa anterior
                                    if session.stage_manager.current_stage_start_time:
                                        elapsed = (datetime.utcnow() - session.stage_manager.current_stage_start_time).total_seconds()
                                        update_session_progress(
                                            session_id=session_id,
                                            stage=new_stage.value,
                                            stage_duration=int(elapsed)
                                        )
                                        logger.info(f"Updated progress in DB: stage={new_stage.value}, duration={int(elapsed)}s")
                                except Exception as e:
                                    logger.error(f"Error updating session progress in DB: {e}")
                                
                                # Notificar cambio de etapa al cliente
                                try:
                                    await websocket.send_json({
                                        "type": "stage_update",
                                        "session": session.to_dict(),
                                        "message": f"Transición a etapa: {new_stage.value}"
                                    })
                                    logger.info(f"Stage transition notified for session {session_id}")
                                    consecutive_errors = 0  # Reset error counter on success
                                except Exception as send_error:
                                    logger.error(f"Error sending stage update: {send_error}")
                                    consecutive_errors += 1
                    else:
                        # WebSocket desconectado, salir del loop
                        logger.info(f"WebSocket disconnected, stopping stage transition check for session {session_id}")
                        break
                    
                    await asyncio.sleep(1)  # Verificar cada segundo
                    
                except WebSocketDisconnect:
                    logger.info(f"WebSocket disconnected during stage check for session {session_id}")
                    break
                except Exception as e:
                    consecutive_errors += 1
                    logger.error(f"Error in stage transition check (attempt {consecutive_errors}): {e}")
                    
                    # Si hay demasiados errores consecutivos, salir
                    if consecutive_errors >= max_consecutive_errors:
                        logger.error(f"Too many consecutive errors, stopping stage transition check for session {session_id}")
                        break
                    
                    # Esperar un poco antes de continuar después de error
                    await asyncio.sleep(2)
        
        # Iniciar tarea de verificación de transiciones
        transition_task = asyncio.create_task(check_stage_transitions())
        
        # Loop principal de mensajes
        while True:
            try:
                # Recibir mensaje del cliente
                data = await websocket.receive_text()
                message = json.loads(data)
                message_type = message.get("type")
                
                # Manejar diferentes tipos de mensajes
                if message_type == "connect":
                    # Actualizar user_id si se proporciona
                    user_id = message.get("user_id")
                    if user_id:
                        session.user_id = user_id
                    await websocket.send_json({
                        "type": "connected",
                        "session": session.to_dict()
                    })
                
                elif message_type == "audio_chunk":
                    # Audio del usuario recibido (ahora manejado por Gemini Live en frontend)
                    session.audio_chunks_received += 1
                    await websocket.send_json({
                        "type": "audio_received",
                        "chunk_id": session.audio_chunks_received
                    })
                
                elif message_type == "transcription":
                    # Transcripción del usuario recibida desde Gemini Live
                    text = message.get("text", "")
                    metrics = message.get("metrics", {})
                    if text:
                        logger.info(f"User transcription: {text[:50]}... | WPM: {metrics.get('wpm', 0)}")
                        
                        # Guardar evento de transcripción
                        save_analysis_event(session_id, "transcription", {
                            "text": text,
                            "metrics": metrics
                        })
                        
                        await websocket.send_json({
                            "type": "transcription_received",
                            "text": text
                        })
                
                elif message_type == "visual_analysis":
                    # Análisis visual recibido
                    cue = message.get("cue", {})
                    if cue:
                        logger.info(f"Visual cue: {cue.get('status', 'unknown')}")
                        
                        # Guardar evento de análisis visual
                        save_analysis_event(session_id, "visual_cue", cue)
                        
                        await websocket.send_json({
                            "type": "visual_analysis_received"
                        })
                
                elif message_type == "session_end":
                    # Sesión finalizada, guardar estadísticas finales
                    stats = message.get("stats", {})
                    visual_cue = message.get("visualCue", {})
                    duration_seconds = message.get("duration_seconds", 0)
                    stages_completed = message.get("stages_completed", 0)
                    
                    logger.info(f"Session {session_id} ended. Saving final stats...")
                    
                    # Finalizar sesión en la base de datos y guardar métricas
                    try:
                        from services.live_session_persistence import finalize_session
                        from datetime import datetime
                        
                        metrics_data = {
                            "stats": stats,
                            "visualCue": visual_cue
                        }
                        
                        # Calcular stages_completed basado en la etapa actual
                        if not stages_completed and session:
                            current_stage = session.current_stage
                            stage_order = ["introduction", "experience", "behavioral", "stress", "closing"]
                            try:
                                stage_index = stage_order.index(current_stage.value if hasattr(current_stage, 'value') else current_stage)
                                stages_completed = stage_index + 1  # +1 porque es 1-indexed
                            except ValueError:
                                stages_completed = 5  # Por defecto
                        
                        finalized_session = finalize_session(
                            session_id=session_id,
                            status="completed",
                            duration_seconds=duration_seconds or 0,
                            stages_completed=stages_completed,
                            metrics=metrics_data
                        )
                        
                        # Obtener métricas guardadas
                        from services.live_session_persistence import get_session_metrics
                        metrics_result = get_session_metrics(session_id)
                        
                        if finalized_session:
                            response_data = {
                                "type": "session_end_confirmed",
                                "session": finalized_session.to_dict(),
                                "stats": stats
                            }
                            if metrics_result and metrics_result.get("metrics"):
                                response_data["metrics"] = metrics_result["metrics"].to_dict()
                            
                            await websocket.send_json(response_data)
                        else:
                            # Fallback a método anterior si falla la persistencia
                            save_final_metrics(session_id, stats, visual_cue)
                            await websocket.send_json({
                                "type": "session_end_confirmed",
                                "stats": stats
                            })
                    except Exception as e:
                        logger.error(f"Error finalizing session in DB: {e}")
                        # Fallback a método anterior
                        save_final_metrics(session_id, stats, visual_cue)
                        await websocket.send_json({
                            "type": "session_end_confirmed",
                            "stats": stats
                        })
                
                elif message_type == "video_frame":
                    # Frame de video del usuario recibido
                    session.video_frames_received += 1
                    # TODO: Analizar frame y enviar feedback
                    # Por ahora, solo confirmamos recepción
                    await websocket.send_json({
                        "type": "video_received",
                        "frame_id": session.video_frames_received
                    })
                
                elif message_type == "question_completed":
                    # Usuario completó una pregunta
                    session.increment_question()
                    await websocket.send_json({
                        "type": "stage_update",
                        "stage": session.current_stage.value,
                        "progress": session.progress,
                        "session": session.to_dict()
                    })
                
                elif message_type == "ping":
                    # Heartbeat
                    await websocket.send_json({"type": "pong"})
                
                elif message_type == "disconnect":
                    # Cliente solicita desconexión
                    transition_task.cancel()
                    break
                
                elif message_type == "get_stage_info":
                    # Cliente solicita información de etapa (para countdown, etc.)
                    if session:
                        stage_info = session.stage_manager.to_dict()
                        await websocket.send_json({
                            "type": "stage_info",
                            "data": stage_info
                        })
                
                elif message_type == "start_stage_timer":
                    # Cliente notifica que el entrevistador empezó a hablar - iniciar timer
                    if session:
                        session.stage_manager.start_stage_timer()
                        logger.info(f"Stage timer started for session {session_id} at stage {session.current_stage.value}")
                        await websocket.send_json({
                            "type": "stage_timer_started",
                            "message": "Timer started"
                        })
                
                elif message_type == "reset_session":
                    # Cliente solicita reiniciar la sesión desde el principio
                    if session:
                        # Reiniciar el stage manager
                        session.stage_manager.start_session()
                        # Resetear otros estados si es necesario
                        session.questions_count = 0
                        session.set_agent_speaking(False)
                        logger.info(f"Session {session_id} reset to beginning")
                        await websocket.send_json({
                            "type": "session_reset",
                            "session": session.to_dict(),
                            "message": "Session reset to beginning"
                        })
                
                elif message_type == "agent_speaking_start":
                    # Cliente notifica que la IA empezó a hablar
                    if session:
                        session.set_agent_speaking(True)
                        logger.debug(f"Agent started speaking in session {session_id}")
                
                elif message_type == "agent_speaking_end":
                    # Cliente notifica que la IA terminó de hablar
                    if session:
                        session.set_agent_speaking(False)
                        logger.debug(f"Agent finished speaking in session {session_id}")
                        # Verificar si hay una transición pendiente ahora que la IA terminó
                        new_stage = session.check_stage_transition()
                        if new_stage:
                            await websocket.send_json({
                                "type": "stage_update",
                                "session": session.to_dict(),
                                "message": f"Transición a etapa: {new_stage.value} (después de que la IA terminó)"
                            })
                
                elif message_type == "session_pause":
                    # Cliente solicita pausar/reanudar la sesión
                    if session:
                        paused = data.get("paused", False)
                        session.is_paused = paused
                        
                        # Actualizar paused_seconds en la base de datos
                        try:
                            from models.live_session import LiveSession
                            from sqlmodel import Session as DBSession, select
                            
                            # Si se está pausando, guardar timestamp; si se reanuda, calcular diferencia
                            if paused:
                                # Iniciar pausa - guardar timestamp
                                if not session._pause_start_time:
                                    session._pause_start_time = datetime.utcnow()
                            else:
                                # Terminar pausa - calcular tiempo pausado y actualizar DB
                                if session._pause_start_time:
                                    pause_duration = (datetime.utcnow() - session._pause_start_time).total_seconds()
                                    # Actualizar paused_seconds en la sesión persistida
                                    with DBSession(engine) as db:
                                        db_session = db.exec(select(LiveSession).where(LiveSession.id == session_id)).first()
                                        if db_session:
                                            db_session.paused_seconds = int(db_session.paused_seconds or 0) + int(pause_duration)
                                            db_session.updated_at = datetime.utcnow()
                                            db.add(db_session)
                                            db.commit()
                                            logger.info(f"Updated paused_seconds for session {session_id}: +{int(pause_duration)}s")
                                    session._pause_start_time = None
                        except Exception as e:
                            logger.error(f"Error updating pause time: {e}")
                        
                        logger.info(f"Session {session_id} {'paused' if paused else 'resumed'}")
                        await websocket.send_json({
                            "type": "session_paused" if paused else "session_resumed",
                            "message": f"Session {'paused' if paused else 'resumed'}"
                        })
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    })
            
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received from session {session_id}: {e}")
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Invalid JSON format. Please check your message structure."
                        })
                except Exception as send_error:
                    logger.error(f"Error sending error message: {send_error}")
            
            except WebSocketDisconnect:
                logger.info(f"Client disconnected during message processing for session {session_id}")
                break
            
            except Exception as e:
                logger.error(f"Error processing message for session {session_id}: {e}", exc_info=True)
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Error processing message: {str(e)}"
                        })
                except Exception as send_error:
                    logger.error(f"Error sending error message: {send_error}")
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    
    finally:
        # Limpiar conexión y tarea de transiciones
        try:
            transition_task.cancel()
        except:
            pass
        if session_id in _active_connections:
            del _active_connections[session_id]
        
        # Opcional: mantener sesión activa por un tiempo antes de eliminarla
        # remove_session(session_id)
        logger.info(f"Cleaned up connection for session {session_id}")


@router.post("/sessions/{session_id}/start")
async def start_live_session(session_id: int, user_id: int = None):
    """Inicia una nueva sesión LIVE"""
    session = create_session(session_id, user_id)
    return {
        "success": True,
        "session": session.to_dict(),
        "message": "LIVE session started"
    }


@router.get("/sessions/{session_id}/status")
async def get_session_status(session_id: int):
    """Obtiene el estado actual de una sesión LIVE"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "success": True,
        "session": session.to_dict()
    }


@router.post("/sessions/{session_id}/end")
async def end_live_session(session_id: int):
    """Finaliza una sesión LIVE"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_active = False
    remove_session(session_id)
    
    # Cerrar conexión WebSocket si existe
    if session_id in _active_connections:
        ws = _active_connections[session_id]
        if ws.client_state != WebSocketState.DISCONNECTED:
            try:
                await ws.close()
            except:
                pass
        del _active_connections[session_id]
    
    return {
        "success": True,
        "message": "LIVE session ended",
        "final_session": session.to_dict()
    }

