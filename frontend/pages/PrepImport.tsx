import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PrepImportProps {
  onNext: (jdText: string) => void;
}

const PrepImport: React.FC<PrepImportProps> = ({ onNext }) => {
  const navigate = useNavigate();
  const [jdText, setJdText] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  const handleNext = () => {
    // In a real app we might validate files here, 
    // for now we just proceed, optionally passing the pasted text
    onNext(jdText);
    navigate('/prep-config');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[960px] mx-auto gap-8 py-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="w-full">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <a href="#" className="text-slate-500 dark:text-[#92adc9] hover:text-primary dark:hover:text-white text-sm md:text-base font-medium transition-colors">Inicio</a>
          </li>
          <li><span className="text-slate-400 dark:text-[#556980] text-sm md:text-base font-medium">/</span></li>
          <li><span aria-current="page" className="text-slate-900 dark:text-white text-sm md:text-base font-medium">Paso 2: Configuración de Perfil</span></li>
        </ol>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
        <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight font-landing">
            Calibremos tu simulación de entrevista.
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed">
            Sube tu CV y la Descripción del Puesto. Nuestra IA usa esto para adaptar las preguntas a tu nivel de experiencia y los requisitos específicos del rol, optimizando tu carga cognitiva durante la práctica.
        </p>
      </div>

      {/* Upload Area Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
        
        {/* CV Upload Zone */}
        <div className="group relative flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <label className="text-slate-900 dark:text-white font-semibold text-lg flex items-center gap-2 font-landing">
                    <span className="material-symbols-outlined text-primary">description</span>
                    Currículum / CV
                </label>
                <span className="text-xs font-medium px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">Requerido</span>
            </div>
            
            <div className="relative flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-[#324d67] bg-white dark:bg-surface-dark p-8 transition-all duration-200 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-[#1E2C3A] group-hover:shadow-lg dark:group-hover:shadow-none h-80">
                <div className="size-16 rounded-full bg-blue-50 dark:bg-primary/10 flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-slate-900 dark:text-white text-base font-bold">Haz clic para subir o arrastra y suelta</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">PDF, DOCX (Máx 5MB)</p>
                </div>
                <button className="mt-2 flex items-center justify-center rounded-lg h-10 px-6 bg-slate-900 dark:bg-[#233648] hover:bg-primary dark:hover:bg-primary text-white text-sm font-bold transition-colors shadow-sm">
                    Explorar Archivos
                </button>
                {/* Hidden input mock */}
                <input accept=".pdf,.docx,.doc" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="file" />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 px-1">
                <span className="material-symbols-outlined text-sm">info</span>
                <span>Analizado de forma segura para extracción de habilidades</span>
            </div>
        </div>

        {/* JD Upload Zone */}
        <div className="group relative flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <label className="text-slate-900 dark:text-white font-semibold text-lg flex items-center gap-2 font-landing">
                    <span className="material-symbols-outlined text-primary">work</span>
                    Descripción del Puesto
                </label>
                <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Opcional</span>
            </div>

            <div className="relative flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-[#324d67] bg-white dark:bg-surface-dark p-8 transition-all duration-200 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-[#1E2C3A] group-hover:shadow-lg dark:group-hover:shadow-none h-80">
                {!isPasting ? (
                    <>
                        <div className="size-16 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-3xl text-purple-600 dark:text-purple-400">text_snippet</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center">
                            <p className="text-slate-900 dark:text-white text-base font-bold">Sube archivo o pega texto</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Requisitos del rol objetivo</p>
                        </div>
                        <div className="flex gap-3 mt-2 relative z-10">
                            <button className="flex items-center justify-center rounded-lg h-10 px-6 bg-slate-900 dark:bg-[#233648] hover:bg-primary dark:hover:bg-primary text-white text-sm font-bold transition-colors shadow-sm">
                                Subir
                            </button>
                            <button 
                                onClick={(e) => { e.preventDefault(); setIsPasting(true); }}
                                className="flex items-center justify-center rounded-lg h-10 px-6 bg-transparent border border-slate-300 dark:border-[#4B5E71] hover:border-primary text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-bold transition-colors"
                            >
                                Pegar Texto
                            </button>
                        </div>
                        {/* Hidden input mock */}
                        <input accept=".pdf,.txt,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="file" />
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col gap-2 animate-in fade-in duration-300">
                        <textarea 
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                            placeholder="Pega la descripción del puesto aquí..."
                            className="w-full h-full flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white resize-none p-0"
                            autoFocus
                        />
                        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-[#324d67]">
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsPasting(false); }}
                                className="text-xs font-bold text-primary hover:text-blue-400"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 px-1">
                <span className="material-symbols-outlined text-sm">info</span>
                <span>Usado para alinear la dificultad de las preguntas</span>
            </div>
        </div>

      </div>

      {/* Footer / Actions */}
      <div className="flex flex-col items-center gap-8 mt-4 pb-12">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-[#1c2936] border border-slate-200 dark:border-[#324d67]">
            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm">lock</span>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">
                Tus documentos se procesan de forma segura y nunca se comparten con terceros.
            </p>
        </div>

        <button 
            onClick={handleNext}
            className="group w-full md:w-auto min-w-[240px] h-12 flex items-center justify-center gap-3 bg-primary hover:bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-200 transform active:scale-95"
        >
            <span className="text-base font-bold tracking-wide">Analizar y Continuar</span>
            <span className="material-symbols-outlined text-white transition-transform group-hover:translate-x-1">arrow_forward</span>
        </button>
      </div>

    </div>
  );
};

export default PrepImport;