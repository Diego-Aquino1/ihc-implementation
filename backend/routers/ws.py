import json
import time
from typing import Any, Dict, DefaultDict, Set
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import Session

from database import engine
from models import RealtimeSignalWindow, RealtimeEvent


router = APIRouter(tags=["ws"])


class ConnectionManager:
    def __init__(self) -> None:
        self._sessions: DefaultDict[int, Set[WebSocket]] = defaultdict(set)

    async def connect(self, session_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._sessions[session_id].add(websocket)

    def disconnect(self, session_id: int, websocket: WebSocket) -> None:
        self._sessions[session_id].discard(websocket)
        if not self._sessions[session_id]:
            del self._sessions[session_id]

    async def send(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        await websocket.send_text(json.dumps(message, ensure_ascii=False))


manager = ConnectionManager()


def _now_ms() -> int:
    return int(time.time() * 1000)


def _coach_tip_from_signals(
    msg_type: str,
    payload: Dict[str, Any],
) -> Dict[str, Any] | None:
    """
    Heurísticas MVP (1–3s). Mantener simple y determinístico.
    """
    if msg_type == "silence_event":
        if payload.get("is_prolonged"):
            return {
                "category": "silence",
                "message": "Te quedaste en blanco. Respira, toma 3 segundos y responde en 1–2 frases con un dato concreto.",
            }
        return None

    if msg_type == "posture_window":
        score = float(payload.get("score", 0.0))
        if score < 0.6:
            return {
                "category": "posture",
                "message": "Ajusta tu postura: espalda más recta y hombros relajados. Mantén estabilidad durante la respuesta.",
            }
        return None

    if msg_type == "gaze_window":
        off_ratio = payload.get("off_camera_ratio")
        if off_ratio is None:
            return None
        off_ratio_f = float(off_ratio)
        if off_ratio_f > 0.4:
            return {
                "category": "eye_contact",
                "message": "Intenta mirar más a la cámara al empezar la respuesta y al cerrar la idea.",
            }
        return None

    return None


@router.websocket("/ws/sessions/{session_id}")
async def ws_session(websocket: WebSocket, session_id: int):
    await manager.connect(session_id, websocket)
    await manager.send(
        websocket,
        {"type": "session_state", "payload": {"session_id": session_id, "connected": True, "ts_ms": _now_ms()}},
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                await manager.send(websocket, {"type": "error", "payload": {"message": "JSON inválido"}})
                continue

            msg_type = data.get("type")
            payload = data.get("payload") or {}

            if msg_type not in {"posture_window", "gaze_window", "silence_event"}:
                await manager.send(websocket, {"type": "error", "payload": {"message": "type no soportado"}})
                continue

            # Persistencia mínima (para reportes y debugging)
            try:
                with Session(engine) as db:
                    if msg_type in {"posture_window", "gaze_window"}:
                        db.add(
                            RealtimeSignalWindow(
                                session_id=session_id,
                                t_start_ms=int(payload.get("t_start_ms", 0)),
                                t_end_ms=int(payload.get("t_end_ms", 0)),
                                signal_type="posture" if msg_type == "posture_window" else "gaze",
                                score=float(payload.get("score", 0.0)),
                                features=dict(payload.get("features") or {}),
                            )
                        )
                    else:
                        db.add(
                            RealtimeEvent(
                                session_id=session_id,
                                ts_ms=int(payload.get("ts_ms", _now_ms())),
                                event_type="silence",
                                payload=dict(payload),
                            )
                        )
                    db.commit()
            except Exception:
                # No bloqueamos UX si falla persistencia.
                pass

            tip = _coach_tip_from_signals(msg_type, payload)
            if tip:
                await manager.send(
                    websocket,
                    {"type": "coach_tip", "payload": {**tip, "ts_ms": _now_ms()}},
                )

    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)

