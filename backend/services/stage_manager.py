"""
Stage Manager - Gestión de etapas y transiciones automáticas
Maneja timers específicos por etapa y las transiciones suaves:
- Introducción: 45s
- Experiencia: 75s
- Comportamiento: 75s
- Análisis de Estrés: 30s
- Cierre: 45s
El timer solo comienza cuando el entrevistador empieza a hablar.
Permite hasta 25% de tiempo adicional si la IA está hablando al momento de transición.
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
    STRESS = "stress"
    CLOSING = "closing"


# Orden de las etapas
STAGE_ORDER = [
    LiveStage.INTRODUCTION,
    LiveStage.EXPERIENCE,
    LiveStage.BEHAVIORAL,
    LiveStage.STRESS,
    LiveStage.CLOSING,
]

# Duración de cada etapa en segundos (específica por etapa)
STAGE_DURATIONS = {
    LiveStage.INTRODUCTION: 45,
    LiveStage.EXPERIENCE: 75,
    LiveStage.BEHAVIORAL: 75,
    LiveStage.STRESS: 30,
    LiveStage.CLOSING: 45,
}

# Tiempo máximo adicional permitido si la IA está hablando (proporción del tiempo base)
# Por ejemplo, 0.25 = 25% adicional (45s + 11s = 56s, 75s + 19s = 94s, etc.)
MAX_EXTENDED_TIME_RATIO = 0.25


class StageManager:
    """Gestiona las etapas y transiciones automáticas de la entrevista"""
    
    def __init__(self, session_id: int):
        self.session_id = session_id
        self.current_stage = LiveStage.INTRODUCTION
        self.current_stage_index = 0
        self.current_stage_start_time: Optional[datetime] = None
        self.total_start_time: Optional[datetime] = None
        self.timer_started = False  # Indica si el timer de la etapa actual ha comenzado
    
    def get_stage_duration(self, stage: Optional[LiveStage] = None) -> int:
        """Retorna la duración de la etapa especificada (o la actual si no se especifica)"""
        if stage is None:
            stage = self.current_stage
        return STAGE_DURATIONS.get(stage, 60)
    
    def get_max_extended_time(self, stage: Optional[LiveStage] = None) -> int:
        """Retorna el tiempo máximo adicional para la etapa (proporcional a su duración)"""
        duration = self.get_stage_duration(stage)
        return int(duration * MAX_EXTENDED_TIME_RATIO)
        
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
        
    def check_and_advance_stage(self, force: bool = False) -> Optional[LiveStage]:
        """
        Verifica si debe avanzar de etapa según la duración específica de cada etapa
        Retorna la nueva etapa si hubo cambio, None si no
        
        Args:
            force: Si es True, fuerza la transición incluso si no se cumplió el tiempo exacto
        """
        # Si el timer no ha comenzado, no avanzar de etapa
        if not self.timer_started or not self.current_stage_start_time:
            return None
        
        # Calcular tiempo transcurrido en la etapa actual
        elapsed = (datetime.utcnow() - self.current_stage_start_time).total_seconds()
        stage_duration = self.get_stage_duration()
        
        if elapsed >= stage_duration or force:
            # Avanzar a la siguiente etapa
            next_stage = self.get_next_stage()
            if next_stage:
                logger.info(f"Session {self.session_id}: Advancing from {self.current_stage.value} to {next_stage.value} after {elapsed:.1f}s (force={force})")
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
        """Retorna segundos restantes en la etapa actual"""
        stage_duration = self.get_stage_duration()
        if not self.timer_started or not self.current_stage_start_time:
            return stage_duration  # Si el timer no ha comenzado, mostrar tiempo completo
        
        elapsed = (datetime.utcnow() - self.current_stage_start_time).total_seconds()
        remaining = max(0, int(stage_duration - elapsed))
        return remaining
    
    def get_stage_progress(self) -> float:
        """Retorna progreso de la etapa actual (0.0 a 1.0)"""
        if not self.timer_started or not self.current_stage_start_time:
            return 0.0  # Si el timer no ha comenzado, progreso es 0
        
        stage_duration = self.get_stage_duration()
        elapsed = (datetime.utcnow() - self.current_stage_start_time).total_seconds()
        progress = min(1.0, max(0.0, elapsed / stage_duration))
        return progress
    
    def get_total_progress(self) -> float:
        """Retorna progreso total de todas las etapas (0.0 a 1.0)"""
        if not self.total_start_time:
            return 0.0
        
        # Calcular duración total sumando todas las duraciones específicas
        total_duration = sum(STAGE_DURATIONS.values())
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
            LiveStage.STRESS: (
                "Eres un entrevistador profesional. En esta etapa de ANÁLISIS DE ESTRÉS, "
                "haz UNA pregunta desafiante y difícil para evaluar cómo maneja el candidato la presión. "
                "Ejemplos: '¿Por qué deberíamos contratarte en lugar de otros 50 candidatos?', "
                "'Convénceme de que eres la mejor opción en 30 segundos', "
                "'¿Cuál es tu mayor debilidad profesional y cómo te ha afectado?', "
                "'Si tu jefe te pide algo poco ético, ¿qué harías?'. "
                "Mantén un tono profesional pero desafiante. Solo HAZ UNA PREGUNTA en esta etapa. Responde en español."
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

