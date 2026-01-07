import React from 'react';

export type LiveStage = 'introduction' | 'experience' | 'behavioral' | 'closing';

interface ProgressBarProps {
  currentStage: LiveStage;
  progress: number; // 0.0 a 1.0 (progreso total)
  stageProgress?: number; // 0.0 a 1.0 (progreso dentro de la etapa actual)
  timeRemaining?: number; // Segundos restantes en etapa actual
  className?: string;
}

const STAGES: Array<{ key: LiveStage; label: string; shortLabel: string }> = [
  { key: 'introduction', label: 'Introducción', shortLabel: 'Intro' },
  { key: 'experience', label: 'Experiencia', shortLabel: 'Exp' },
  { key: 'behavioral', label: 'Comportamiento', shortLabel: 'Comp' },
  { key: 'closing', label: 'Cierre', shortLabel: 'Cierre' },
];

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentStage, 
  progress, 
  stageProgress = 0,
  timeRemaining,
  className = '' 
}) => {
  const currentStageIndex = STAGES.findIndex(s => s.key === currentStage);
  const progressPercentage = Math.round(progress * 100);
  const stageProgressPercentage = Math.round(stageProgress * 100);

  return (
    <div className={`${className}`}>
      {/* Barra de progreso compacta y minimalista */}
      <div className="flex flex-col gap-1">
        {/* Countdown compacto */}
        {timeRemaining !== undefined && (
          <div className="text-[10px] text-white/70 font-mono text-center">
            {timeRemaining}s
          </div>
        )}
        
        {/* Barra de progreso principal - colores neutros */}
        <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Marcadores sutiles de etapas */}
          {STAGES.map((_, index) => (
            <div
              key={index}
              className="absolute top-0 h-full w-px bg-white/30"
              style={{ left: `${(index + 1) * 25}%` }}
            />
          ))}
        </div>

        {/* Etapas minimalistas sin iconos */}
        <div className="flex justify-between items-center gap-1">
          {STAGES.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;

            return (
              <div key={stage.key} className="flex-1 text-center">
                <div
                  className={`text-[9px] font-medium ${
                    isActive 
                      ? 'text-white font-semibold' 
                      : isCompleted 
                      ? 'text-white/60' 
                      : 'text-white/40'
                  }`}
                >
                  {stage.shortLabel}
                </div>
                {/* Indicador de etapa activa */}
                {isActive && (
                  <div className="mt-0.5 h-0.5 bg-white/60 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
