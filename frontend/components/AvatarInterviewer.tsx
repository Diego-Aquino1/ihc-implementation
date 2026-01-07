import React from 'react';

interface AvatarInterviewerProps {
  name?: string;
  title?: string;
  promptText: string;
  isSpeaking: boolean;
  isThinking?: boolean;
  avatarUrl?: string;
}

const AvatarInterviewer: React.FC<AvatarInterviewerProps> = ({
  name = 'Entrenador',
  title = 'Entrevistador',
  promptText,
  isSpeaking,
  isThinking,
  avatarUrl
}) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80"></div>

      {/* Center avatar */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-6 w-full">
        <div className="relative">
          {/* Speaking ring */}
          {isSpeaking && (
            <div className="absolute -inset-4 rounded-full border border-primary/60 animate-pulse"></div>
          )}

          <div
            className="size-44 md:size-52 rounded-full bg-cover bg-center border border-white/20 shadow-2xl"
            style={{
              backgroundImage: `url("${avatarUrl || 'https://picsum.photos/seed/interviewer-avatar/400/400'}")`
            }}
          />

          {/* Mouth indicator */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden">
            <div
              className={`h-full bg-primary/80 ${
                isSpeaking ? 'animate-[pulse_0.6s_ease-in-out_infinite]' : 'opacity-40'
              }`}
              style={{ width: isSpeaking ? '100%' : '40%' }}
            />
          </div>
        </div>

        {/* Identity */}
        <div className="text-center">
          <p className="text-white font-bold text-lg">{name}</p>
          <p className="text-white/60 text-sm">{title}</p>
        </div>

        {/* Speech bubble */}
        <div className="w-full max-w-3xl bg-black/35 backdrop-blur-md border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">Pregunta</span>
            {isThinking && <span className="text-white/60 text-xs">Procesando…</span>}
          </div>
          <p className="text-white text-lg md:text-xl leading-relaxed">“{promptText}”</p>
        </div>
      </div>
    </div>
  );
};

export default AvatarInterviewer;


