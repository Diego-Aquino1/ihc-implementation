"""
Modelos de datos para métricas de sesiones LIVE
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field


class LiveMetrics(SQLModel, table=True):
    """Métricas de una sesión LIVE"""
    __tablename__ = "live_metrics"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="live_sessions.id", index=True)
    
    # Audio metrics
    avg_wpm: float = Field(default=0.0)  # Words per minute promedio
    avg_pause_duration: float = Field(default=0.0)  # Duración promedio de pausas (ms)
    total_filler_words: int = Field(default=0)  # Total de muletillas
    avg_volume_level: float = Field(default=0.0)  # Nivel de volumen promedio (0-1)
    clarity_score: float = Field(default=0.0)  # Score de claridad (0-1)
    
    # Visual metrics
    eye_contact_percentage: float = Field(default=0.0)  # Porcentaje de contacto visual
    posture_score: float = Field(default=0.0)  # Score de postura (0-1)
    smile_count: int = Field(default=0)  # Veces que sonrió
    
    # Overall
    overall_score: float = Field(default=0.0)  # Score general (0-100)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "audio_metrics": {
                "avg_wpm": self.avg_wpm,
                "avg_pause_duration": self.avg_pause_duration,
                "total_filler_words": self.total_filler_words,
                "avg_volume_level": self.avg_volume_level,
                "clarity_score": self.clarity_score
            },
            "visual_metrics": {
                "eye_contact_percentage": self.eye_contact_percentage,
                "posture_score": self.posture_score,
                "smile_count": self.smile_count
            },
            "overall_score": self.overall_score,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class LiveAnalysisEvent(SQLModel, table=True):
    """Eventos de análisis en tiempo real durante una sesión LIVE"""
    __tablename__ = "live_analysis_events"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="live_sessions.id", index=True)
    
    # Tipo de evento
    event_type: str = Field(index=True)  # 'visual_cue', 'audio_metric', 'transcription'
    
    # Datos del evento (JSON)
    event_data: str = Field(default="{}")  # JSON string
    
    # Timestamp
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    def to_dict(self) -> Dict[str, Any]:
        import json
        return {
            "id": self.id,
            "session_id": self.session_id,
            "event_type": self.event_type,
            "event_data": json.loads(self.event_data),
            "timestamp": self.timestamp.isoformat()
        }

