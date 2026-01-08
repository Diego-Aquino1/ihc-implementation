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
  paused_seconds: number;
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
  created_at: string;
  updated_at: string;
}

const LiveInterviewDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Cargar sesión completa con métricas
      try {
        const fullSession = await api.getFullLiveSession(parseInt(sessionId));
        if (fullSession.session) {
          setSession(fullSession.session);
          setMetrics(fullSession.metrics || null);
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.error('API error, using fallback data:', apiError);
      }
    } catch (err) {
      console.error('Error loading session data:', err);
      setError('No se pudieron cargar los datos de la sesión');
      
      // Datos simulados para desarrollo
      const mockSession: LiveSession = {
        id: parseInt(sessionId),
        session_number: parseInt(sessionId),
        status: 'completed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: 300,
        paused_seconds: 30,
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
        overall_score: 85,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setSession(mockSession);
      setMetrics(mockMetrics);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStageName = (stage: string): string => {
    const names: Record<string, string> = {
      introduction: 'Introducción',
      experience: 'Experiencia',
      behavioral: 'Comportamiento',
      stress: 'Análisis de Estrés',
      closing: 'Cierre'
    };
    return names[stage] || stage;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            {error || 'Sesión no encontrada'}
          </h2>
          <button
            onClick={() => navigate('/live/list')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            Volver a Lista
          </button>
        </div>
      </div>
    );
  }

  const stageOrder = ['introduction', 'experience', 'behavioral', 'stress', 'closing'];
  const totalStageTime = Object.values(session.stage_durations).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/live/list')}
            className="text-primary hover:text-primary-hover flex items-center gap-2 mb-4 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver a Lista
          </button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                Sesión #{session.session_number}
              </h1>
              <p className="text-text-secondary">
                {formatDate(session.started_at)}
              </p>
            </div>
            <button
              onClick={handleNewPractice}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">videocam</span>
              Nueva Práctica LIVE
            </button>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
            <div className="text-sm text-text-secondary mb-1">Estado</div>
            <div className={`text-lg font-bold ${
              session.status === 'completed' ? 'text-green-500' :
              session.status === 'abandoned' ? 'text-red-500' :
              session.status === 'in_progress' ? 'text-blue-500' :
              'text-yellow-500'
            }`}>
              {session.status === 'completed' ? '✓ Completada' :
               session.status === 'abandoned' ? '✗ Abandonada' :
               session.status === 'in_progress' ? '▶ En Progreso' :
               '⏸ En Pausa'}
            </div>
          </div>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
            <div className="text-sm text-text-secondary mb-1">Duración Total</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {formatDuration(session.duration_seconds)}
            </div>
            {session.paused_seconds > 0 && (
              <div className="text-xs text-text-secondary mt-1">
                ({formatDuration(session.paused_seconds)} en pausa)
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
            <div className="text-sm text-text-secondary mb-1">Etapas Completadas</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {session.stages_completed}/{session.total_stages}
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(session.stages_completed / session.total_stages) * 100}%` }}
              />
            </div>
          </div>
          {metrics && (
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="text-sm text-text-secondary mb-1">Score General</div>
              <div className={`text-lg font-bold ${
                metrics.overall_score >= 80 ? 'text-green-500' :
                metrics.overall_score >= 60 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {Math.round(metrics.overall_score)}/100
              </div>
            </div>
          )}
        </div>

        {/* Progreso por Etapa */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">timeline</span>
            Progreso por Etapa
          </h2>
          <div className="space-y-4">
            {stageOrder.map((stage, index) => {
              const duration = session.stage_durations[stage as keyof typeof session.stage_durations] || 0;
              const completed = index < session.stages_completed;
              const percentage = totalStageTime > 0 ? (duration / totalStageTime) * 100 : 0;

              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${completed ? 'text-green-500' : 'text-gray-400'}`}>
                        {completed ? '✓' : '○'}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {getStageName(stage)}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {formatDuration(duration)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-text-secondary">
                      {Math.round(percentage)}% del tiempo total
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-12">
                    <div
                      className={`h-full transition-all ${completed ? 'bg-green-500' : 'bg-gray-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Métricas */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Audio */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">mic</span>
                Métricas de Audio
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">WPM Promedio</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {metrics.audio_metrics.avg_wpm}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, (metrics.audio_metrics.avg_wpm / 200) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Claridad</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {Math.round(metrics.audio_metrics.clarity_score * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${metrics.audio_metrics.clarity_score * 100}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-border-dark">
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Muletillas</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      {metrics.audio_metrics.total_filler_words}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Volumen Promedio</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      {Math.round(metrics.audio_metrics.avg_volume_level * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Pausa Promedio</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      {(metrics.audio_metrics.avg_pause_duration / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">visibility</span>
                Métricas Visuales
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Contacto Visual</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {Math.round(metrics.visual_metrics.eye_contact_percentage)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${metrics.visual_metrics.eye_contact_percentage}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Postura</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {metrics.visual_metrics.posture_score}/10
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(metrics.visual_metrics.posture_score / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-border-dark">
                  <div className="text-xs text-text-secondary mb-1">Sonrisas Detectadas</div>
                  <div className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {metrics.visual_metrics.smile_count}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!metrics && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <span className="material-symbols-outlined">info</span>
              <span className="font-medium">Las métricas de esta sesión aún no están disponibles.</span>
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleNewPractice}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined">videocam</span>
            Nueva Práctica LIVE
          </button>
          <button
            onClick={() => navigate('/live/list')}
            className="px-6 py-3 bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-surface-dark/80 text-slate-900 dark:text-white rounded-xl font-bold border border-gray-200 dark:border-border-dark transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined">list</span>
            Ver Todas las Sesiones
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveInterviewDetail;

