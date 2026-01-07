import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Gemini removed: this page is deprecated in the MVP live flow.

interface StrategicBuilderProps {
  jdText: string;
  nextPath: string;
}

const StrategicBuilder: React.FC<StrategicBuilderProps> = ({ jdText, nextPath }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [savedQuestions, setSavedQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
       const suggestions: string[] = [];
       setQuestions(suggestions);
       setIsLoading(false);
    };
    fetchSuggestions();
  }, [jdText]);

  const addQuestion = (q: string) => {
    if (!savedQuestions.includes(q)) {
        setSavedQuestions([...savedQuestions, q]);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto gap-6 py-6">
       <div className="text-center mb-6">
           <h1 className="text-3xl font-black dark:text-white">Constructor de Preguntas</h1>
           <p className="text-slate-500 dark:text-text-secondary">Prepara tus preguntas finales para demostrar interés estratégico.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Suggestions */}
           <div className="flex flex-col gap-4">
               <h3 className="font-bold dark:text-white flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary">auto_awesome</span> Sugerencias IA
               </h3>
               {isLoading ? (
                   <div className="animate-pulse space-y-3">
                       <div className="h-20 bg-gray-200 dark:bg-surface-dark rounded-xl"></div>
                       <div className="h-20 bg-gray-200 dark:bg-surface-dark rounded-xl"></div>
                   </div>
               ) : (
                   questions.map((q, i) => (
                       <div key={i} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-border-dark hover:border-primary/50 transition-colors group">
                           <p className="text-sm dark:text-white mb-3">{q}</p>
                           <button onClick={() => addQuestion(q)} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                               <span className="material-symbols-outlined text-sm">add_circle</span> Agregar
                           </button>
                       </div>
                   ))
               )}
               
               <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-border-dark">
                   <textarea 
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm dark:text-white resize-none"
                      placeholder="Escribe tu propia pregunta..."
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                   />
                   <div className="flex justify-end mt-2">
                       <button 
                         onClick={() => { if(customQuestion) { addQuestion(customQuestion); setCustomQuestion(''); }}}
                         className="bg-gray-100 dark:bg-[#111a22] hover:bg-gray-200 px-3 py-1 rounded text-xs font-bold dark:text-white transition-colors"
                       >
                           Guardar
                       </button>
                   </div>
               </div>
           </div>

           {/* Saved List */}
           <div className="flex flex-col gap-4">
               <h3 className="font-bold dark:text-white flex items-center gap-2">
                   <span className="material-symbols-outlined text-green-500">checklist</span> Tu Lista ({savedQuestions.length})
               </h3>
               <div className="bg-gray-50 dark:bg-[#111a22] rounded-xl p-1 min-h-[300px]">
                   {savedQuestions.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                           <span className="material-symbols-outlined text-4xl mb-2">playlist_add</span>
                           <p className="text-sm">Agrega preguntas del panel izquierdo.</p>
                       </div>
                   ) : (
                       <div className="flex flex-col gap-2 p-2">
                           {savedQuestions.map((q, i) => (
                               <div key={i} className="bg-white dark:bg-surface-dark p-4 rounded-lg border-l-4 border-primary shadow-sm flex justify-between items-start gap-3">
                                   <p className="text-sm dark:text-white">{q}</p>
                                   <button onClick={() => setSavedQuestions(savedQuestions.filter(sq => sq !== q))} className="text-slate-400 hover:text-red-500">
                                       <span className="material-symbols-outlined text-sm">delete</span>
                                   </button>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           </div>
       </div>

       <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#111a22] border-t border-gray-200 dark:border-border-dark flex justify-end lg:pl-64 z-10">
            <button 
                onClick={() => navigate(nextPath)}
                className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
                Finalizar Práctica
            </button>
       </div>
    </div>
  );
};

export default StrategicBuilder;