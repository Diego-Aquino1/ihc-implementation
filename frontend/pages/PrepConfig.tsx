import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAgentConfig, saveAgentConfig } from '../services/agentConfig';

const PrepConfig: React.FC = () => {
  const navigate = useNavigate();
  const initial = loadAgentConfig();
  const [config, setConfig] = useState(initial);
  const [objective, setObjective] = useState(initial.learningObjective || '');

  const vibes = [
    { 
        id: 'challenger', 
        name: 'El Challenger', 
        desc: 'Alta presión, escepticismo, preguntas rápidas para probar resiliencia.', 
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY4NJjsoPHmuVpaP-H5Vn-8lfSfLaRRTcUqaVVoMs-B8tUBaB3W7Vo6lKvjodwHdQnGVz7nDJQj0-9sVQQ8ULvvERPHCVTfYu4E42LJj19SYiRAgd5n7hOvPXc-GgX2jFkctpfOJHsgLe1rvd9_Ai20zyoETHR75Eao9akcDVXM_6FG8drd6woY_TpBFEEoVdtoNI7nz9ha_t1vtFaG88thOQGoJgv_Jk1CMPdZNZC6uYKxHQLPiNOTbg3bO2z-aEESeAcpkNn0MEG' 
    },
    { 
        id: 'empath', 
        name: 'El Empático', 
        desc: 'Apoyo, escucha activa, ritmo más lento para construir confianza.', 
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgJ372MkM_xGqpuepw2qTdvDNqpaVwctrPE9jWbwkiHPNn3uUiw72WhL-n6FZ_aGqXDSBHBcmJYPWLKwJB8TEQo90xw-LDPfQZYUpYvULCsH6s0QEXaoWhQao9VUWrY8Hm6A76_F7CDH8fT-72L6h0hzHRB3F4JyQF55bgPUwFGXxiN4puGguufHtY6U55ptHC0Xqp-Xe8o_ZPYHETFBlJxv-C1FUZA-VccJVjCjLqkN2ldS9g6ygTYGuxSOE7eLf3RLiau9dkE69c' 
    },
    { 
        id: 'analyst', 
        name: 'El Analista', 
        desc: 'Basado en datos, preguntas de seguimiento profundas para probar precisión.', 
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCE9YXoxnKZiNDI_SUnrgT3sGEO0vlQn-Q_boIjJEGhy6FKVcUyZlE7ytyffAEqaqRpE880S_boeQEUKkWnRY2__5iTT7gpMqCGgDnvqke_1rutVZy_JkgqLboJnudzc5aO1wxQS3Gg7JHKGzBUE6rGp-36P7DBLEBCLLFGakaOF-hPqYlFNlAERwXSNWoZZTLt5EOo5K19_oQM53MNB36_IHd67f1HikbWQvBjidSdI8ds3-ogIiWGijaaVz3ZhvFYa_so7iAGNFnH' 
    },
  ];

  const focusOptions = [
      { id: 'behavioral', name: 'Conductual', icon: 'person_search', sub: 'Habilidades blandas e historial' },
      { id: 'technical', name: 'Técnico', icon: 'terminal', sub: 'Habilidades duras y código' },
      { id: 'situational', name: 'Situacional', icon: 'explore', sub: 'Hipotéticos' },
      { id: 'mixed', name: 'Mix Aleatorio', icon: 'shuffle', sub: 'Impredecible' },
  ];

  const suggestions = [
      { label: 'Regulación Emocional', icon: 'self_improvement' },
      { label: 'Método STAR', icon: 'star' },
      { label: 'Concisión', icon: 'compress' },
      { label: 'Contacto Visual', icon: 'visibility' },
  ];

  const handleStart = () => {
      const next = saveAgentConfig({ ...config, learningObjective: objective });
      setConfig(next);
      navigate('/live');
  }

  return (
    <div className="flex flex-col max-w-[960px] mx-auto w-full">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap gap-2 p-4 text-sm w-full">
        <a className="text-slate-500 dark:text-[#92adc9] font-medium hover:underline" href="#">Inicio</a>
        <span className="text-slate-400 dark:text-[#92adc9] font-medium">/</span>
        <a className="text-slate-500 dark:text-[#92adc9] font-medium hover:underline" href="#">Práctica</a>
        <span className="text-slate-400 dark:text-[#92adc9] font-medium">/</span>
        <span className="text-slate-900 dark:text-white font-medium">Configuración de Sesión</span>
      </nav>

      {/* Page Heading */}
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white font-landing">
            Configura tu Sesión de Práctica
        </h1>
        <p className="text-slate-500 dark:text-[#92adc9] text-base font-normal max-w-2xl">
            Adapta la simulación para apuntar a tus áreas de crecimiento específicas. Esta configuración está diseñada para activar el compromiso cognitivo antes de comenzar.
        </p>
      </div>

      {/* Step 1: Vibe Selection */}
      <section className="p-4 pt-6">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white flex items-center gap-2 font-landing">
                <span className="flex items-center justify-center size-7 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-white">1</span>
                Elige el Vibe del Entrevistador
            </h2>
            <div className="group relative flex items-center cursor-help">
                <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
                <span className="absolute right-0 top-6 w-64 p-2 bg-slate-800 text-xs text-white rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    Variar la personalidad del entrevistador ayuda a construir adaptabilidad y resiliencia emocional.
                </span>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vibes.map((v) => {
                const isSelected = config.vibe === v.id;
                return (
                    <div 
                        key={v.id}
                        onClick={() => setConfig(saveAgentConfig({ vibe: v.id as any }))}
                        className={`cursor-pointer group relative flex flex-col gap-3 p-3 rounded-xl border-2 transition-all ${
                            isSelected 
                            ? 'border-primary bg-primary/5 dark:bg-[#131e2b]' 
                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#1e293b] hover:shadow-lg'
                        }`}
                    >
                        {isSelected && (
                            <div className="absolute -top-3 -right-3 bg-primary text-white rounded-full p-1 shadow-md z-10">
                                <span className="material-symbols-outlined text-sm">check</span>
                            </div>
                        )}
                        <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg overflow-hidden relative" style={{backgroundImage: `url("${v.img}")`}}>
                            <div className={`absolute inset-0 bg-black/20 transition-colors ${isSelected ? 'bg-black/0' : 'group-hover:bg-black/0'}`}></div>
                        </div>
                        <div>
                            <p className="text-slate-900 dark:text-white text-base font-bold">{v.name}</p>
                            <p className="text-slate-500 dark:text-[#92adc9] text-sm mt-1">{v.desc}</p>
                        </div>
                    </div>
                );
            })}
        </div>
      </section>

      {/* Step 2: Learning Objectives */}
      <section className="p-4 pt-6">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white flex items-center gap-2 font-landing">
                <span className="flex items-center justify-center size-7 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-white">2</span>
                Define Objetivos de Aprendizaje
            </h2>
        </div>
        <div className="bg-white dark:bg-[#1e293b] rounded-xl p-5 border border-slate-200 dark:border-slate-700/50">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">¿Cuál es tu objetivo principal para esta sesión?</label>
            <div className="relative">
                <textarea 
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#111a22] border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                    placeholder="ej. Quiero mantener la calma cuando me desafíen sobre mis brechas laborales..." 
                    rows={3}
                />
                <div className="absolute bottom-3 right-3">
                    <span className="material-symbols-outlined text-slate-400 text-lg">mic</span>
                </div>
            </div>
            <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Objetivos Sugeridos:</p>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <button 
                            key={i}
                            onClick={() => setObjective(prev => prev ? prev + ' ' + s.label : s.label)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors border border-transparent hover:border-slate-300"
                        >
                            <span className="material-symbols-outlined text-base">{s.icon}</span> {s.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </section>

      {/* Step 3: Question Focus */}
      <section className="p-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] text-slate-900 dark:text-white flex items-center gap-2 font-landing">
                <span className="flex items-center justify-center size-7 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-white">3</span>
                Selecciona el Enfoque de Preguntas
            </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {focusOptions.map((f) => {
                const isSelected = config.questionFocus === f.id;
                return (
                    <div 
                        key={f.id}
                        onClick={() => setConfig(saveAgentConfig({ questionFocus: f.id as any }))}
                        className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-full text-center ${
                            isSelected 
                            ? 'bg-primary/5 border-primary' 
                            : 'bg-white dark:bg-[#1e293b] border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span className={`material-symbols-outlined text-3xl mb-2 ${isSelected ? 'text-primary' : 'text-slate-400'}`}>{f.icon}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{f.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.sub}</span>
                    </div>
                );
            })}
        </div>
      </section>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center z-10">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-base">spa</span>
            <span>Respira profundo antes de comenzar.</span>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
            <button 
                onClick={() => navigate(-1)}
                className="flex-1 sm:flex-none px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleStart}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                Iniciar Sesión
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
        </div>
      </div>

    </div>
  );
};

export default PrepConfig;