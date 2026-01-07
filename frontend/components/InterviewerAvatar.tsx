/**
 * Avatar visual animado del entrevistador
 * Animación CSS sincronizada con audio en tiempo real
 */
import React from 'react';

interface InterviewerAvatarProps {
  isAgentSpeaking: boolean;
  isListening?: boolean;
  className?: string;
}

const InterviewerAvatar: React.FC<InterviewerAvatarProps> = ({
  isAgentSpeaking,
  isListening = false,
  className = ''
}) => {
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Avatar Base - Imagen o diseño CSS */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Imagen del entrevistador - sin zoom excesivo */}
        <div 
          className={`relative w-full h-full bg-contain bg-center bg-no-repeat transition-all duration-300 ${
            isAgentSpeaking ? 'scale-[1.02]' : 'scale-100'
          }`}
          style={{
            backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDbeDxlDwBKWZ4j4U3d58wmU8s6-VXqzYZHHFQE9dYP3VrQSWtVhXPf-3pUld7HmQ_RqxRGbitaZCzm__u0U0ReW6v4fQdDDEzTHy8j5C04yu76sqZV-eQIq5pRC3a_AyNAmBS-5zBe6EkERZTvBFCZt4cM_nqnw-CGrcaOPagE9T-_B2gPf7W4VySTBeIGo9MsJeAh3HFdEZW3r9F7E947QQQd_Qy7fwiHEKo6OMTLOz3NMaRv7UCjSf1_hGJT3R-TuPcCspNr4fc")',
          }}
        />
        
        {/* Overlay con animación de respiración cuando está idle */}
        {!isAgentSpeaking && !isListening && (
          <div className="absolute inset-0 animate-pulse opacity-20" style={{
            animation: 'breathe 3s ease-in-out infinite'
          }} />
        )}
      </div>

      {/* Ondas de Audio cuando habla */}
      {isAgentSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-primary/50"
              style={{
                width: `${80 + i * 40}px`,
                height: `${80 + i * 40}px`,
                animation: `audioWave ${1 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
                opacity: 0.6 - (i * 0.1)
              }}
            />
          ))}
        </div>
      )}

      {/* Indicador de Listening (cuando el usuario habla) */}
      {isListening && !isAgentSpeaking && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-6 bg-green-400 rounded-full"
              style={{
                animation: 'bounce 0.8s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
          <span className="ml-2 text-xs text-green-400 font-medium">Escuchando...</span>
        </div>
      )}

      {/* Estilos CSS inline para animaciones */}
      <style>{`
        @keyframes audioWave {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.2;
          }
        }
        
        @keyframes breathe {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: scaleY(0.5);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
};

export default InterviewerAvatar;

