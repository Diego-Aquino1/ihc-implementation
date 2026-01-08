import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface LiveSession {
  id: number;
  session_number: number;
  status: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  stages_completed: number;
  total_stages: number;
  stage_durations: {
    introduction: number;
    experience: number;
    behavioral: number;
    stress: number;
    closing: number;
  };
}

interface LiveMetrics {
  id: number;
  session_id: number;
  audio_metrics: {
    avg_wpm: number;
    avg_pause_duration: number;
    total_filler_words: number;
    avg_volume_level: number;
    clarity_score: number;
  };
  visual_metrics: {
    eye_contact_percentage: number;
    posture_score: number;
    smile_count: number;
  };
  overall_score: number;
}

const LiveInterviewResults: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreAnimation, setScoreAnimation] = useState(0);

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  useEffect(() => {
    // Animación del score
    if (metrics?.overall_score) {
      const targetScore = metrics.overall_score;
      const duration = 1500; // 1.5 segundos
      const steps = 60;
      const increment = targetScore / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= targetScore) {
          setScoreAnimation(targetScore);
          clearInterval(timer);
        } else {
          setScoreAnimation(Math.round(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [metrics?.overall_score]);

  const loadSessionData = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      // Intentar cargar del backend primero
      try {
        const fullSession = await api.getFullLiveSession(parseInt(sessionId));
        if (fullSession.session) {
          setSession(fullSession.session);
          if (fullSession.metrics) {
            setMetrics(fullSession.metrics);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Error loading from API, trying localStorage:', err);
      }

      // Fallback a localStorage si la API falla
      const storedSession = localStorage.getItem(`live_session_${sessionId}`);
      const storedMetrics = localStorage.getItem(`live_metrics_${sessionId}`);

      if (storedSession) {
        setSession(JSON.parse(storedSession));
        if (storedMetrics) {
          try {
            const parsedMetrics = JSON.parse(storedMetrics);
            // Si storedMetrics es el objeto de LiveMetrics completo, usarlo directamente
            if (parsedMetrics.audio_metrics || parsedMetrics.visual_metrics) {
              setMetrics(parsedMetrics);
            } else {
              // Si es solo stats del formato anterior, convertirlo
              const convertedMetrics: LiveMetrics = {
                id: 1,
                session_id: parseInt(sessionId),
                audio_metrics: parsedMetrics.metrics || {
                  avg_wpm: parsedMetrics.wpm || 0,
                  avg_pause_duration: parsedMetrics.avgPauseDuration || 0,
                  total_filler_words: parsedMetrics.fillerWords || 0,
                  avg_volume_level: parsedMetrics.volumeLevel || 0,
                  clarity_score: parsedMetrics.clarity || 0
                },
                visual_metrics: {
                  eye_contact_percentage: 0,
                  posture_score: 0,
                  smile_count: 0
                },
                overall_score: parsedMetrics.clarity ? parsedMetrics.clarity * 100 : 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              setMetrics(convertedMetrics);
            }
          } catch (parseError) {
            console.error('Error parsing stored metrics:', parseError);
          }
        }
      } else {
        // Datos simulados para desarrollo
        const mockSession: LiveSession = {
          id: parseInt(sessionId),
          session_number: parseInt(sessionId),
          status: 'completed',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 300,
          stages_completed: 5,
          total_stages: 5,
          stage_durations: {
            introduction: 45,
            experience: 75,
            behavioral: 75,
            stress: 30,
            closing: 45
          }
        };

        const mockMetrics: LiveMetrics = {
          id: 1,
          session_id: parseInt(sessionId),
          audio_metrics: {
            avg_wpm: 145,
            avg_pause_duration: 1200,
            total_filler_words: 5,
            avg_volume_level: 0.75,
            clarity_score: 0.85
          },
          visual_metrics: {
            eye_contact_percentage: 78,
            posture_score: 9,
            smile_count: 12
          },
          overall_score: 85
        };

        setSession(mockSession);
        setMetrics(mockMetrics);
      }
    } catch (error) {
      console.error('Error loading session data:', error);
      setError('No se pudieron cargar los datos de la sesión');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreStars = (score: number): number => {
    return Math.round((score / 100) * 5);
  };

  const getHighlights = (): string[] => {
    if (!metrics) return [];
    const highlights: string[] = [];

    if (metrics.visual_metrics.eye_contact_percentage >= 75) {
      highlights.push('Excelente contacto visual');
    }
    if (metrics.audio_metrics.avg_wpm >= 120 && metrics.audio_metrics.avg_wpm <= 150) {
      highlights.push('Buen ritmo de habla');
    }
    if (metrics.audio_metrics.total_filler_words <= 5) {
      highlights.push('Pocas muletillas');
    } else {
      highlights.push('Podrías reducir muletillas');
    }
    if (metrics.visual_metrics.posture_score >= 8) {
      highlights.push('Excelente postura');
    }
    if (metrics.audio_metrics.clarity_score >= 0.8) {
      highlights.push('Comunicación muy clara');
    }

    return highlights;
  };

  const getNextSessionId = (): number => {
    const lastId = localStorage.getItem('lastLiveSessionId');
    return lastId ? parseInt(lastId) + 1 : 1;
  };

  const handleNewPractice = () => {
    const nextId = getNextSessionId();
    localStorage.setItem('lastLiveSessionId', nextId.toString());
    navigate(`/live/${nextId}`);
  };

  const handleViewDetail = () => {
    if (sessionId) {
      navigate(`/live/${sessionId}/detail`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (!session || !metrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">No se encontraron resultados</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stars = getScoreStars(metrics.overall_score);
  const highlights = getHighlights();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
            ¡Entrevista Completada!
          </h1>
          <p className="text-xl text-white/70">Sesión #{session.session_number}</p>
        </div>

        {/* Score Principal */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div className="text-center">
            <p className="text-white/70 text-lg mb-4">Tu Puntuación General</p>
            <div className={`text-8xl font-black mb-4 ${getScoreColor(metrics.overall_score)}`}>
              {Math.round(scoreAnimation)}
              <span className="text-4xl text-white/50">/100</span>
            </div>
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-3xl ${i < stars ? 'text-yellow-400' : 'text-white/20'}`}
                >
                  ⭐
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">summarize</span>
            Resumen
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-white mb-1">
                {session.stages_completed}/{session.total_stages}
              </div>
              <div className="text-white/70 text-sm">Etapas Completadas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-white mb-1">
                {formatDuration(session.duration_seconds)}
              </div>
              <div className="text-white/70 text-sm">Duración</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-white mb-1">
                {session.stage_durations ? Object.values(session.stage_durations).reduce((a, b) => a + b, 0) / 60 : 0}
              </div>
              <div className="text-white/70 text-sm">Minutos Activos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-white mb-1">
                {metrics.audio_metrics.avg_wpm}
              </div>
              <div className="text-white/70 text-sm">WPM Promedio</div>
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Audio */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">mic</span>
              Audio
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-white/70 text-sm mb-1">
                  <span>WPM</span>
                  <span className="text-white font-semibold">{metrics.audio_metrics.avg_wpm}</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (metrics.audio_metrics.avg_wpm / 200) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-white/70 text-sm mb-1">
                  <span>Claridad</span>
                  <span className="text-white font-semibold">{Math.round(metrics.audio_metrics.clarity_score * 100)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${metrics.audio_metrics.clarity_score * 100}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-white/20">
                <div className="text-white/70 text-sm">Muletillas: <span className="text-white font-semibold">{metrics.audio_metrics.total_filler_words}</span></div>
                <div className="text-white/70 text-sm">Volumen: <span className="text-white font-semibold">{Math.round(metrics.audio_metrics.avg_volume_level * 100)}%</span></div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">visibility</span>
              Visual
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-white/70 text-sm mb-1">
                  <span>Contacto Visual</span>
                  <span className="text-white font-semibold">{Math.round(metrics.visual_metrics.eye_contact_percentage)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${metrics.visual_metrics.eye_contact_percentage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-white/70 text-sm mb-1">
                  <span>Postura</span>
                  <span className="text-white font-semibold">{metrics.visual_metrics.posture_score}/10</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(metrics.visual_metrics.posture_score / 10) * 100}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-white/20">
                <div className="text-white/70 text-sm">Sonrisas: <span className="text-white font-semibold">{metrics.visual_metrics.smile_count}</span></div>
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">timeline</span>
              Progreso
            </h3>
            <div className="space-y-2">
              {['introduction', 'experience', 'behavioral', 'stress', 'closing'].map((stage, index) => {
                const stageNames: Record<string, string> = {
                  introduction: 'Intro',
                  experience: 'Exp',
                  behavioral: 'Comportam.',
                  stress: 'Estrés',
                  closing: 'Cierre'
                };
                const duration = session.stage_durations[stage as keyof typeof session.stage_durations] || 0;
                const completed = index < session.stages_completed;

                return (
                  <div key={stage}>
                    <div className="flex justify-between text-white/70 text-xs mb-1">
                      <span>{stageNames[stage]}</span>
                      <span className={`font-semibold ${completed ? 'text-green-400' : 'text-white/50'}`}>
                        {completed ? '✓' : '○'} {formatDuration(duration)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${completed ? 'bg-green-500' : 'bg-white/30'}`}
                        style={{ width: completed ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Destacados */}
        {highlights.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">lightbulb</span>
              Destacados
            </h3>
            <ul className="space-y-2">
              {highlights.map((highlight, index) => (
                <li key={index} className="text-white/80 flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleViewDetail}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 border border-white/30"
          >
            <span className="material-symbols-outlined">description</span>
            Ver Detalles Completos
          </button>
          <button
            onClick={handleNewPractice}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">videocam</span>
            Nueva Práctica LIVE
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 border border-white/20"
          >
            <span className="material-symbols-outlined">home</span>
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveInterviewResults;

