"""
Stage Manager - Gestión de etapas y transiciones automáticas
Maneja el timer de 60 segundos por etapa y las transiciones
El timer solo comienza cuando el entrevistador empieza a hablar
"""
from datetime import datetime
from typing import Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class LiveStage(str, Enum):
    """Etapas de la entrevista LIVE"""
    INTRODUCTION = "introduction"
    EXPERIENCE = "experience"
    BEHAVIORAL = "behavioral"
    CLOSING = "closing"


# Orden de las etapas
STAGE_ORDER = [
    LiveStage.INTRODUCTION,
    LiveStage.EXPERIENCE,
    LiveStage.BEHAVIORAL,
    LiveStage.CLOSING,
]

# Duración de cada etapa en segundos
STAGE_DURATION = 60


class StageManager:
    """Gestiona las etapas y transiciones automáticas de la entrevista"""
    
    def __init__(self, session_id: int):
        self.session_id = session_id
        self.current_stage = LiveStage.INTRODUCTION
        self.current_stage_index = 0
        self.current_stage_start_time: Optional[datetime] = None
        self.total_start_time: Optional[datetime] = None
        self.timer_started = False  # Indica si el timer de la etapa actual ha comenzado
        
    def start_session(self):
        """Inicia la sesión (sin iniciar el timer aún)"""
        self.total_start_time = datetime.utcnow()
        self.current_stage_start_time = None  # No iniciar timer automáticamente
        self.current_stage = STAGE_ORDER[0]
        self.current_stage_index = 0
        self.timer_started = False
        logger.info(f"Session {self.session_id} started at stage: {self.current_stage.value} (timer not started)")
    
    def start_stage_timer(self):
        """Inicia el timer de la etapa actual (llamado cuando el entrevistador empieza a hablar)"""
        if not self.timer_started or self.current_stage_start_time is None:
            self.current_stage_start_time = datetime.utcnow()
            self.timer_started = True
            logger.info(f"Session {self.session_id}: Timer started for stage {self.current_stage.value}")
        
    def check_and_advance_stage(self) -> Optional[LiveStage]:
        """
        Verifica si debe avanzar de etapa (60s transcurridos desde que empezó a hablar)
        Retorna la nueva etapa si hubo cambio, None si no
        """
        # Si el timer no ha comenzado, no avanzar de etapa
        if not self.timer_started or not self.current_stage_start_time:
            return None
        
        # Calcular tiempo transcurrido en la etapa actual
        elapsed = (datetime.utcnow() - self.current_stage_start_time).total_seconds()
        
        if elapsed >= STAGE_DURATION:
            # Avanzar a la siguiente etapa
            next_stage = self.get_next_stage()
            if next_stage:
                logger.info(f"Session {self.session_id}: Advancing from {self.current_stage.value} to {next_stage.value} after {elapsed:.1f}s")
                self.advance_to_stage(next_stage)
                return next_stage
            else:
                # Última etapa completada
                logger.info(f"Session {self.session_id}: All stages completed")
                return None
        
        return None
    
    def get_next_stage(self) -> Optional[LiveStage]:
        """Retorna la siguiente etapa, o None si es la última"""
        if self.current_stage_index < len(STAGE_ORDER) - 1:
            return STAGE_ORDER[self.current_stage_index + 1]
        return None
    
    def advance_to_stage(self, stage: LiveStage):
        """Avanza a una etapa específica (timer se iniciará cuando el entrevistador empiece a hablar)"""
        self.current_stage = stage
        self.current_stage_index = STAGE_ORDER.index(stage)
        self.current_stage_start_time = None  # Timer se iniciará cuando empiece a hablar
        self.timer_started = False
        logger.info(f"Session {self.session_id}: Advanced to stage {stage.value} (waiting for timer start)")
    
    def get_time_remaining(self) -> int:
        """Retorna segundos restantes en la etapa actual (0 a STAGE_DURATION)"""
        if not self.timer_started or not self.current_stage_start_time:
            return STAGE_DURATION  # Si el timer no ha comenzado, mostrar tiempo completo
        
        elapsed = (datetime.utcnow() - self.current_stage_start_time).total_seconds()
        remaining = max(0, int(STAGE_DURATION - elapsed))
        return remaining
    
    def get_stage_progress(self) -> float:
        """Retorna progreso de la etapa actual (0.0 a 1.0)"""
        if not self.timer_started or not self.current_stage_start_time:
            return 0.0  # Si el timer no ha comenzado, progreso es 0
        
        elapsed = (datetime.utcnow() - self.current_stage_start_time).total_seconds()
        progress = min(1.0, max(0.0, elapsed / STAGE_DURATION))
        return progress
    
    def get_total_progress(self) -> float:
        """Retorna progreso total de todas las etapas (0.0 a 1.0)"""
        if not self.total_start_time:
            return 0.0
        
        total_duration = STAGE_DURATION * len(STAGE_ORDER)
        elapsed = (datetime.utcnow() - self.total_start_time).total_seconds()
        progress = min(1.0, max(0.0, elapsed / total_duration))
        return progress
    
    def get_system_instruction_for_stage(self) -> str:
        """Retorna las instrucciones del sistema para la etapa actual"""
        stage_instructions = {
            LiveStage.INTRODUCTION: (
                "Eres un entrevistador profesional. En esta etapa de INTRODUCCIÓN, "
                "haz preguntas de introducción como 'Cuéntame sobre ti', '¿Quién eres?', "
                "'¿Qué te apasiona?', '¿Por qué estás interesado en esta posición?'. "
                "Sé natural y conversacional. Responde en español."
            ),
            LiveStage.EXPERIENCE: (
                "Eres un entrevistador profesional. En esta etapa de EXPERIENCIA, "
                "pregunta sobre experiencia laboral: 'Háblame de tu experiencia', "
                "'¿Cuál ha sido tu proyecto más importante?', '¿Qué logros destacarías?', "
                "'Describe tu experiencia con [tecnología/herramienta]'. "
                "Sé específico y busca detalles. Responde en español."
            ),
            LiveStage.BEHAVIORAL: (
                "Eres un entrevistador profesional. En esta etapa de COMPORTAMIENTO, "
                "haz preguntas comportamentales usando el método STAR: "
                "'Cuéntame sobre una situación desafiante', '¿Cómo manejaste un conflicto?', "
                "'Dame un ejemplo de liderazgo', 'Describe una vez que tuviste que trabajar bajo presión'. "
                "Busca estructura en las respuestas (Situación, Tarea, Acción, Resultado). Responde en español."
            ),
            LiveStage.CLOSING: (
                "Eres un entrevistador profesional. En esta etapa de CIERRE, "
                "cierra la entrevista de forma profesional: '¿Tienes alguna pregunta para mí?', "
                "'¿Qué te gustaría saber sobre la posición?', '¿Cuáles son tus expectativas?', "
                "'¿Hay algo más que quieras agregar?'. "
                "Sé abierto y receptivo. Responde en español."
            )
        }
        
        base_instruction = (
            "Eres un entrevistador virtual y coach estricto pero constructivo. "
            "Tu objetivo es hacer preguntas relevantes y dar feedback útil. "
            "Sé profesional, amigable y enfocado en evaluar las competencias del candidato. "
            "Mantén las preguntas concisas y espera respuestas completas antes de hacer la siguiente pregunta."
        )
        
        stage_specific = stage_instructions.get(self.current_stage, stage_instructions[LiveStage.INTRODUCTION])
        return f"{base_instruction}\n\n{stage_specific}"
    
    def to_dict(self) -> dict:
        """Retorna el estado actual como diccionario"""
        return {
            "current_stage": self.current_stage.value,
            "current_stage_index": self.current_stage_index,
            "time_remaining": self.get_time_remaining(),
            "stage_progress": self.get_stage_progress(),
            "total_progress": self.get_total_progress(),
            "is_completed": self.current_stage == LiveStage.CLOSING and self.get_time_remaining() == 0
        }

