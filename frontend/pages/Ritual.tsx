import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Ritual: React.FC = () => {
  const navigate = useNavigate();

  // Auto advance logic or manual button
  // For this demo, let's keep manual to let user experience it

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl md:text-5xl font-black dark:text-white mb-6 animate-pulse-slow">Respira...</h1>
        <p className="text-lg text-slate-500 dark:text-text-secondary max-w-md mb-12">
            Tómate un momento para centrarte. Inhala profundamente cuando el círculo se expanda, exhala cuando se contraiga.
        </p>

        <div className="relative flex items-center justify-center mb-12">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-breath"></div>
            <div className="size-64 rounded-full border-4 border-primary/30 flex items-center justify-center animate-breath shadow-[0_0_50px_rgba(19,127,236,0.3)]">
                 <div className="size-40 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl">
                    <span className="material-symbols-outlined text-white text-6xl">spa</span>
                 </div>
            </div>
        </div>

        <button 
            onClick={() => navigate('/sim/pitch')}
            className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark hover:border-primary text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
        >
            Estoy listo <span className="material-symbols-outlined">arrow_forward</span>
        </button>
    </div>
  );
};

export default Ritual;