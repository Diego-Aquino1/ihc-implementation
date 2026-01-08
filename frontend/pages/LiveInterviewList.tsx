import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

interface LiveSessionList {
  sessions: LiveSession[];
  total: number;
}

const LiveInterviewList: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data: LiveSessionList = await api.getLiveSessions();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('No se pudieron cargar las sesiones');
      // Datos simulados para desarrollo
      setSessions([
        {
          id: 3,
          session_number: 3,
          status: 'completed',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 323,
          stages_completed: 5,
          total_stages: 5,
          stage_durations: {
            introduction: 45,
            experience: 75,
            behavioral: 75,
            stress: 30,
            closing: 45
          }
        },
        {
          id: 2,
          session_number: 2,
          status: 'completed',
          started_at: new Date(Date.now() - 86400000).toISOString(),
          ended_at: new Date(Date.now() - 86400000 + 252000).toISOString(),
          duration_seconds: 252,
          stages_completed: 4,
          total_stages: 5,
          stage_durations: {
            introduction: 45,
            experience: 75,
            behavioral: 75,
            stress: 0,
            closing: 0
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
      completed: { color: 'bg-green-500', label: 'Completada', icon: 'check_circle' },
      in_progress: { color: 'bg-blue-500', label: 'En Progreso', icon: 'play_circle' },
      abandoned: { color: 'bg-red-500', label: 'Abandonada', icon: 'cancel' },
      paused: { color: 'bg-yellow-500', label: 'En Pausa', icon: 'pause_circle' }
    };

    const config = statusConfig[status] || statusConfig.completed;
    return (
      <span className={`${config.color} text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
        <span className="material-symbols-outlined text-sm">{config.icon}</span>
        {config.label}
      </span>
    );
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

  const handleViewDetail = (sessionId: number) => {
    navigate(`/live/${sessionId}/detail`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando sesiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
              Entrevistas LIVE
            </h1>
            <p className="text-slate-500 dark:text-text-secondary">
              Historial completo de tus prácticas de entrevista en tiempo real
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

        {error && (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Lista de Sesiones */}
        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-surface-dark p-12 rounded-xl border border-gray-200 dark:border-border-dark text-center">
            <div className="text-6xl mb-4">🎥</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              No hay sesiones aún
            </h2>
            <p className="text-text-secondary mb-6">
              Comienza tu primera práctica de entrevista en tiempo real
            </p>
            <button
              onClick={handleNewPractice}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold transition"
            >
              Iniciar Primera Práctica
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-border-dark shadow-sm overflow-hidden">
            {/* Tabla Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-surface-dark border-b border-gray-200 dark:border-border-dark">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      # Sesión
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      Duración
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      Etapas
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                  {sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-gray-50 dark:hover:bg-surface-dark/50 transition cursor-pointer"
                      onClick={() => handleViewDetail(session.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          #{session.session_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {formatDate(session.started_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {formatDuration(session.duration_seconds)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {session.stages_completed}/{session.total_stages}
                        </div>
                        <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${(session.stages_completed / session.total_stages) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(session.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(session.id);
                          }}
                          className="text-primary hover:text-primary-hover font-medium text-sm flex items-center gap-1 ml-auto"
                        >
                          Ver Detalle
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-border-dark">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-surface-dark/50 transition cursor-pointer"
                  onClick={() => handleViewDetail(session.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        Sesión #{session.session_number}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {formatDate(session.started_at)}
                      </div>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-text-secondary mb-1">Duración</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatDuration(session.duration_seconds)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary mb-1">Etapas</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {session.stages_completed}/{session.total_stages}
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(session.stages_completed / session.total_stages) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetail(session.id);
                    }}
                    className="w-full text-primary hover:text-primary-hover font-medium text-sm flex items-center justify-center gap-1"
                  >
                    Ver Detalle
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-text-secondary text-sm">
          Total: {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''}
        </div>
      </div>
    </div>
  );
};

export default LiveInterviewList;

