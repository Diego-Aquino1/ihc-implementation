import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.openai_client import synthesize_speech_base64


router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    format: Optional[str] = "wav"


@router.post("")
async def tts(req: TTSRequest):
    """
    MVP: puente hacia CosyVoice si está configurado.
    - Si existe COSYVOICE_URL, se llama y se devuelve la respuesta.
    - Si no, hacemos fallback a OpenAI TTS (para que el usuario escuche igual).
    """
    cosy_url = os.getenv("COSYVOICE_URL")
    if not cosy_url:
        try:
            return {**synthesize_speech_base64(text=req.text, voice=req.voice, fmt=req.format or "wav"), "provider": "openai"}
        except Exception as e:
            raise HTTPException(status_code=501, detail=f"TTS no disponible (CosyVoice no configurado y OpenAI TTS falló): {e}")

    timeout_s = float(os.getenv("COSYVOICE_TIMEOUT_S", "30"))
    payload = {"text": req.text, "voice": req.voice, "format": req.format}

    async with httpx.AsyncClient(timeout=timeout_s) as client:
        r = await client.post(cosy_url.rstrip("/") + "/tts", json=payload)
        r.raise_for_status()
        # Se asume que CosyVoice responde con JSON {audio_base64, mime} o similar
        return r.json()


