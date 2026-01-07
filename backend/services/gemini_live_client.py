"""
Cliente para Gemini Live API
Maneja la conexión y streaming de audio bidireccional con Gemini Live
"""
import os
import base64
import logging
from typing import Optional, Callable, Dict, Any
import asyncio
from google import genai

logger = logging.getLogger(__name__)


class GeminiLiveClient:
    """Cliente para interactuar con Gemini Live API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY no está configurada")
        
        self.client = genai.Client(api_key=self.api_key)
        self.session: Optional[Any] = None
        self.is_connected = False
        
        # Callbacks
        self.on_audio_received: Optional[Callable[[bytes], None]] = None
        self.on_transcription: Optional[Callable[[str], None]] = None
        self.on_error: Optional[Callable[[Exception], None]] = None
        self.on_close: Optional[Callable[[], None]] = None
    
    def connect(
        self,
        system_instruction: str,
        stage: str = "introduction"
    ) -> None:
        """
        Conecta a Gemini Live API
        
        Args:
            system_instruction: Instrucciones del sistema para el entrevistador
            stage: Etapa actual de la entrevista (introduction, experience, behavioral, closing)
        """
        try:
            # Configurar instrucciones según la etapa
            stage_instructions = {
                "introduction": "Eres un entrevistador profesional. En esta etapa, haz preguntas de introducción como 'Cuéntame sobre ti', '¿Quién eres?', '¿Qué te apasiona?'. Sé natural y conversacional.",
                "experience": "Eres un entrevistador profesional. En esta etapa, pregunta sobre experiencia laboral: 'Háblame de tu experiencia', '¿Cuál ha sido tu proyecto más importante?', '¿Qué logros destacarías?'. Sé específico y busca detalles.",
                "behavioral": "Eres un entrevistador profesional. En esta etapa, haz preguntas comportamentales usando el método STAR: 'Cuéntame sobre una situación desafiante', '¿Cómo manejaste un conflicto?', 'Dame un ejemplo de liderazgo'. Busca estructura en las respuestas.",
                "closing": "Eres un entrevistador profesional. En esta etapa, cierra la entrevista: '¿Tienes alguna pregunta?', '¿Qué te gustaría saber sobre la posición?', '¿Cuáles son tus expectativas?'. Sé abierto y receptivo."
            }
            
            full_instruction = f"{system_instruction}\n\n{stage_instructions.get(stage, stage_instructions['introduction'])}"
            
            # Crear sesión Live
            # Nota: La API de Gemini Live puede variar, ajustar según documentación actual
            self.session = self.client.live.connect(
                model="gemini-2.5-flash-native-audio-preview-09-2025",
                system_instruction=full_instruction,
                response_modalities=["audio"],
                input_audio_transcription={}
            )
            
            self.is_connected = True
            logger.info(f"Connected to Gemini Live API for stage: {stage}")
            
        except Exception as e:
            logger.error(f"Error connecting to Gemini Live: {e}")
            self.is_connected = False
            if self.on_error:
                self.on_error(e)
            raise
    
    def send_audio_chunk(self, audio_data: bytes, mime_type: str = "audio/webm") -> None:
        """
        Envía un chunk de audio a Gemini Live
        
        Args:
            audio_data: Datos de audio en bytes
            mime_type: Tipo MIME del audio (audio/webm, audio/pcm, etc.)
        """
        if not self.is_connected or not self.session:
            logger.warning("Cannot send audio: not connected")
            return
        
        try:
            # Enviar audio a Gemini Live
            # La implementación exacta depende de la API de Gemini Live
            # Esto es un ejemplo basado en la estructura esperada
            self.session.send_realtime_input({
                "media": {
                    "mimeType": mime_type,
                    "data": base64.b64encode(audio_data).decode('utf-8')
                }
            })
            
        except Exception as e:
            logger.error(f"Error sending audio chunk: {e}")
            if self.on_error:
                self.on_error(e)
    
    def send_audio_base64(self, audio_base64: str, mime_type: str = "audio/webm") -> None:
        """
        Envía audio en formato base64
        
        Args:
            audio_base64: Audio codificado en base64 (sin prefijo data:)
            mime_type: Tipo MIME del audio
        """
        try:
            audio_bytes = base64.b64decode(audio_base64)
            self.send_audio_chunk(audio_bytes, mime_type)
        except Exception as e:
            logger.error(f"Error decoding base64 audio: {e}")
            if self.on_error:
                self.on_error(e)
    
    def set_callbacks(
        self,
        on_audio_received: Optional[Callable[[bytes, str], None]] = None,
        on_transcription: Optional[Callable[[str], None]] = None,
        on_error: Optional[Callable[[Exception], None]] = None,
        on_close: Optional[Callable[[], None]] = None
    ):
        """
        Configura callbacks para eventos de Gemini Live
        
        Args:
            on_audio_received: Callback cuando se recibe audio del entrevistador (audio_bytes, mime_type)
            on_transcription: Callback cuando se recibe transcripción del usuario
            on_error: Callback cuando ocurre un error
            on_close: Callback cuando se cierra la conexión
        """
        self.on_audio_received = on_audio_received
        self.on_transcription = on_transcription
        self.on_error = on_error
        self.on_close = on_close
        
        # Configurar handlers en la sesión si está conectada
        if self.session and self.is_connected:
            self._setup_session_handlers()
    
    def _setup_session_handlers(self):
        """Configura los handlers de eventos de la sesión"""
        if not self.session:
            return
        
        # Nota: La implementación exacta depende de la API de Gemini Live
        # Esto es un ejemplo de cómo podría estructurarse
        try:
            # Handler para mensajes del servidor
            def on_message(msg: Any):
                # Audio del entrevistador
                if hasattr(msg, 'server_content') and msg.server_content:
                    model_turn = getattr(msg.server_content, 'model_turn', None)
                    if model_turn and hasattr(model_turn, 'parts'):
                        for part in model_turn.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                audio_data = base64.b64decode(part.inline_data.data)
                                mime_type = getattr(part.inline_data, 'mime_type', 'audio/pcm')
                                if self.on_audio_received:
                                    self.on_audio_received(audio_data, mime_type)
                    
                    # Transcripción del usuario
                    input_transcription = getattr(msg.server_content, 'input_transcription', None)
                    if input_transcription and hasattr(input_transcription, 'text'):
                        if self.on_transcription:
                            self.on_transcription(input_transcription.text)
            
            # Asignar handlers (ajustar según API real)
            if hasattr(self.session, 'on_message'):
                self.session.on_message = on_message
            
        except Exception as e:
            logger.error(f"Error setting up session handlers: {e}")
    
    def update_stage(self, stage: str, system_instruction: Optional[str] = None):
        """
        Actualiza la etapa de la entrevista y las instrucciones
        
        Args:
            stage: Nueva etapa (introduction, experience, behavioral, closing)
            system_instruction: Instrucciones opcionales adicionales
        """
        if not self.is_connected:
            logger.warning("Cannot update stage: not connected")
            return
        
        # Nota: Gemini Live puede no soportar actualización de instrucciones en vuelo
        # En ese caso, sería necesario reconectar con nuevas instrucciones
        logger.info(f"Stage updated to: {stage}")
    
    def disconnect(self):
        """Cierra la conexión con Gemini Live"""
        try:
            if self.session:
                if hasattr(self.session, 'close'):
                    self.session.close()
                self.session = None
            self.is_connected = False
            
            if self.on_close:
                self.on_close()
            
            logger.info("Disconnected from Gemini Live API")
        except Exception as e:
            logger.error(f"Error disconnecting: {e}")
    
    def __del__(self):
        """Cleanup al destruir el objeto"""
        if self.is_connected:
            self.disconnect()

