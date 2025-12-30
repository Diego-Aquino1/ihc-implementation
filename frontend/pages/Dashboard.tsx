import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SessionData } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  session: SessionData;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [stats, setStats] = useState({
    total_sessions: 0,
    average_score: 0,
    score_change: 0,
    favorite_vibe: 'Loading...'
  });

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Hola, Alex</h1>
          <p className="text-slate-500 dark:text-text-secondary">Estás progresando muy bien. Tu confianza ha aumentado un 12% esta semana.</p>
        </div>
        <Link to="/prep-import" className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined">add_circle</span>
          Nueva Práctica
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 bg-primary/10 text-primary rounded-lg material-symbols-outlined">mic</span>
            <span className="font-bold dark:text-white">Sesiones</span>
          </div>
          <p className="text-4xl font-black dark:text-white">{stats.total_sessions}</p>
          <p className="text-xs text-text-secondary mt-1">Total completadas</p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 bg-green-500/10 text-green-500 rounded-lg material-symbols-outlined">trending_up</span>
            <span className="font-bold dark:text-white">Puntaje Promedio</span>
          </div>
          <p className="text-4xl font-black dark:text-white">{stats.average_score}<span className="text-lg text-slate-400">/100</span></p>
          <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">arrow_upward</span> +{stats.score_change}% vs semana pasada
          </p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 bg-purple-500/10 text-purple-500 rounded-lg material-symbols-outlined">psychology</span>
            <span className="font-bold dark:text-white">Vibe Favorito</span>
          </div>
          <p className="text-2xl font-bold dark:text-white">{stats.favorite_vibe}</p>
          <p className="text-xs text-text-secondary mt-1">El más practicado</p>
        </div>
      </div>

      {/* Modules List */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold dark:text-white">Módulos de Entrenamiento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/sim/pitch" className="group bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark hover:border-primary/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl text-primary">record_voice_over</span>
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">Elevator Pitch</h3>
            <p className="text-sm text-text-secondary">Perfecciona tu introducción de 2 minutos.</p>
            <div className="mt-4 flex items-center text-primary text-sm font-bold">
              Comenzar <span className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
          <Link to="/sim/star" className="group bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark hover:border-primary/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl text-purple-500">star</span>
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">Método STAR</h3>
            <p className="text-sm text-text-secondary">Estructura tus respuestas de experiencia.</p>
            <div className="mt-4 flex items-center text-purple-500 text-sm font-bold">
              Comenzar <span className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
          <Link to="/sim/pressure" className="group bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark hover:border-primary/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl text-red-500">crisis_alert</span>
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">Simulador de Presión</h3>
            <p className="text-sm text-text-secondary">Entrena tu compostura ante preguntas hostiles.</p>
            <div className="mt-4 flex items-center text-red-500 text-sm font-bold">
              Comenzar <span className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
          <Link to="/sim/closing/question" className="group bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark hover:border-primary/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl text-green-500">psychology_alt</span>
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-2">Pregunta Estratégica</h3>
            <p className="text-sm text-text-secondary">Aprende a cerrar la entrevista con impacto.</p>
            <div className="mt-4 flex items-center text-green-500 text-sm font-bold">
              Comenzar <span className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;