import io
import os
import base64
from typing import Any, Dict, Optional

from openai import OpenAI


def _client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Intentar cargar desde .env (dev local)
        try:
            from dotenv import load_dotenv

            # Carga .env desde cwd y luego backend/.env si existe
            load_dotenv()
            load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
            api_key = os.getenv("OPENAI_API_KEY")
        except Exception:
            api_key = None
    if not api_key:
        raise RuntimeError(
            "Falta OPENAI_API_KEY en el entorno del backend. "
            "Exporta la variable en el mismo proceso donde corre uvicorn o crea backend/.env con OPENAI_API_KEY=..."
        )
    return OpenAI(api_key=api_key)


def get_llm_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def get_stt_model() -> str:
    # Whisper es el default más compatible.
    return os.getenv("OPENAI_STT_MODEL", "whisper-1")

def get_tts_model() -> str:
    # Modelo TTS de OpenAI (fallback mientras CosyVoice no esté levantado)
    return os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")

def synthesize_speech_base64(*, text: str, voice: Optional[str] = None, fmt: str = "wav") -> Dict[str, str]:
    """
    Genera audio TTS con OpenAI y devuelve {audio_base64, mime}.
    """
    client = _client()
    voice_name = voice or os.getenv("OPENAI_TTS_VOICE", "alloy")
    response_format = fmt if fmt in {"mp3", "opus", "aac", "flac", "wav", "pcm"} else "wav"

    audio = client.audio.speech.create(
        model=get_tts_model(),
        voice=voice_name,
        input=text,
        response_format=response_format,
    )

    # _legacy_response.HttpxBinaryResponseContent soporta .read()
    audio_bytes = audio.read() if hasattr(audio, "read") else bytes(audio)  # type: ignore[arg-type]

    mime_map = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "flac": "audio/flac",
        "aac": "audio/aac",
        "opus": "audio/ogg",
        "pcm": "audio/pcm",
    }

    return {
        "audio_base64": base64.b64encode(audio_bytes).decode("ascii"),
        "mime": mime_map.get(response_format, "audio/wav"),
    }


def transcribe_audio(*, audio_bytes: bytes, filename: str, mime_type: str) -> str:
    """
    STT turn-based. Para MVP, basta con transcripción literal.
    """
    client = _client()
    file_obj = io.BytesIO(audio_bytes)
    # OpenAI SDK usa el tuple (filename, filebytes, mimetype)
    transcription = client.audio.transcriptions.create(
        model=get_stt_model(),
        file=(filename or "audio.webm", file_obj.getvalue(), mime_type or "audio/webm"),
        prompt="Transcribe literal en español. No resumas. Devuelve solo el texto hablado.",
        temperature=0,
    )
    # SDK puede devolver objeto con atributo text
    return getattr(transcription, "text", "") or ""


def generate_json_turn(*, system: str, user: str, schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    LLM con salida JSON (compatible con openai python SDK 2.x).
    """
    client = _client()
    model = get_llm_model()

    import json

    prompt_with_schema = (
        f"{user}\n\n"
        "REGLA CRÍTICA: Responde SOLO JSON válido (sin markdown).\n"
        "Debes cumplir este JSON Schema (informativo):\n"
        f"{json.dumps(schema, ensure_ascii=False)}\n"
    )

    # En SDK 2.x, response_format funciona en chat.completions
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt_with_schema},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    text = resp.choices[0].message.content or "{}"
    return json.loads(text)


