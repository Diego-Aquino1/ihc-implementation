/**
 * HUD de feedback en tiempo real para la entrevista LIVE
 * Stats compactos y visuales, distribuidos entre izquierda y derecha
 */
import React from 'react';
import { AudioMetrics } from '../services/audioAnalysis';
import { VisualCue } from '../types';

interface LiveFeedbackHUDProps {
  audioMetrics: AudioMetrics;
  visualCue: VisualCue | null;
  isVisible?: boolean;
}

const LiveFeedbackHUD: React.FC<LiveFeedbackHUDProps> = ({
  audioMetrics,
  visualCue,
  isVisible = true
}) => {
  if (!isVisible) return null;

  // Determinar color según valor
  const getScoreColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  // WPM thresholds
  const wpmColor = audioMetrics.wpm >= 120 && audioMetrics.wpm <= 150 
    ? 'text-green-400' 
    : audioMetrics.wpm >= 100 && audioMetrics.wpm <= 160 
    ? 'text-yellow-400' 
    : 'text-red-400';

  // Visual status color
  const visualStatusColor = visualCue?.status === 'Contacto Visual' || visualCue?.status === 'Sonriendo'
    ? 'text-green-400'
    : visualCue?.status === 'Mirada Desviada'
    ? 'text-yellow-400'
    : 'text-red-400';

  const overallScore = Math.round((audioMetrics.clarity * 0.7 + (visualCue ? 0.3 : 0)) * 100);

  return (
    <>
      {/* Stats Izquierda - Audio Metrics (Compactos) */}
      <div className="absolute top-20 left-4 z-30 flex flex-col gap-2">
        {/* WPM - Compacto */}
        <div className="bg-black/75 backdrop-blur-md border border-white/25 rounded-lg p-3 shadow-xl min-w-[120px]">
          <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1 font-semibold">
            Velocidad
          </div>
          <div className={`text-2xl font-bold ${wpmColor} mb-1 leading-none`}>
            {audioMetrics.wpm}
          </div>
          <div className="text-white/50 text-[10px] mb-2">WPM</div>
          {/* Barra visual de progreso */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                audioMetrics.wpm >= 120 && audioMetrics.wpm <= 150 
                  ? 'bg-green-400' 
                  : audioMetrics.wpm >= 100 && audioMetrics.wpm <= 160 
                  ? 'bg-yellow-400' 
                  : 'bg-red-400'
              }`}
              style={{ 
                width: `${Math.min(100, Math.max(0, ((audioMetrics.wpm - 80) / 100) * 100))}%` 
              }}
            />
          </div>
        </div>

        {/* Claridad - Compacto */}
        <div className="bg-black/75 backdrop-blur-md border border-white/25 rounded-lg p-3 shadow-xl min-w-[120px]">
          <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1 font-semibold">
            Claridad
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(audioMetrics.clarity, { good: 0.7, warning: 0.5 })} mb-1 leading-none`}>
            {Math.round(audioMetrics.clarity * 100)}
          </div>
          <div className="text-white/50 text-[10px] mb-2">%</div>
          {/* Barra visual */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getScoreColor(audioMetrics.clarity, { good: 0.7, warning: 0.5 }).replace('text-', 'bg-')}`}
              style={{ width: `${audioMetrics.clarity * 100}%` }}
            />
          </div>
        </div>

        {/* Muletillas - Compacto */}
        <div className="bg-black/75 backdrop-blur-md border border-white/25 rounded-lg p-3 shadow-xl min-w-[120px]">
          <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1 font-semibold">
            Muletillas
          </div>
          <div className={`text-2xl font-bold ${
            audioMetrics.fillerWords <= 3 ? 'text-green-400' : 
            audioMetrics.fillerWords <= 7 ? 'text-yellow-400' : 
            'text-red-400'
          } mb-1 leading-none`}>
            {audioMetrics.fillerWords}
          </div>
          <div className="text-white/50 text-[10px]">detectadas</div>
        </div>
      </div>

      {/* Stats Derecha - Visual Metrics y Score (Compactos) */}
      <div className="absolute top-20 right-4 z-30 flex flex-col gap-2">
        {/* Estado Visual - Compacto */}
        {visualCue && (
          <div className="bg-black/75 backdrop-blur-md border border-white/25 rounded-lg p-3 shadow-xl min-w-[150px] max-w-[180px]">
            <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1 font-semibold">
              Lenguaje Corporal
            </div>
            <div className={`text-lg font-bold ${visualStatusColor} mb-1 leading-tight line-clamp-2`}>
              {visualCue.status}
            </div>
            {visualCue.feedback && (
              <div className="text-white/60 text-[10px] mt-2 italic border-t border-white/10 pt-2 line-clamp-2">
                {visualCue.feedback}
              </div>
            )}
          </div>
        )}

        {/* Score General - Compacto */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/25 rounded-lg p-3 shadow-xl min-w-[120px]">
          <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1 font-semibold">
            Puntuación
          </div>
          <div className="text-3xl font-bold text-white mb-1 leading-none">
            {overallScore}
          </div>
          <div className="text-white/50 text-[10px] mb-2">/ 100</div>
          {/* Barra de score visual */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                overallScore >= 80 ? 'bg-green-400' : 
                overallScore >= 60 ? 'bg-yellow-400' : 
                'bg-red-400'
              }`}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>

        {/* Volumen - Compacto */}
        <div className="bg-black/75 backdrop-blur-md border border-white/25 rounded-lg p-3 shadow-xl min-w-[120px]">
          <div className="text-white/60 text-[10px] uppercase tracking-wider mb-2 font-semibold">
            Volumen
          </div>
          <div className="flex items-end gap-1 h-6 justify-center">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  i < Math.floor(audioMetrics.volumeLevel * 6)
                    ? 'bg-blue-400'
                    : 'bg-white/20'
                }`}
                style={{ 
                  height: `${30 + (i * 8)}%`,
                  transitionDelay: `${i * 30}ms`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default LiveFeedbackHUD;
