import React from 'react';
import { Link } from 'react-router-dom';
import { SimulationStage, FeedbackData } from '../types';

interface FeedbackAnalysisProps {
  stage: SimulationStage;
  data: FeedbackData | null;
  nextPath: string;
  isFinal?: boolean;
}

const getStageNameES = (stage: SimulationStage) => {
    switch(stage) {
        case SimulationStage.ELEVATOR_PITCH: return 'ELEVATOR PITCH';
        case SimulationStage.STAR_METHOD: return 'MÉTODO STAR';
        case SimulationStage.PRESSURE: return 'SIMULADOR DE PRESIÓN';
        case SimulationStage.CLOSING: return 'CIERRE';
        default: return stage;
    }
}

const FeedbackAnalysis: React.FC<FeedbackAnalysisProps> = ({ stage, data, nextPath, isFinal }) => {
  if (!data) return <div className="p-10 text-center dark:text-white flex flex-col items-center gap-4"><span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span><p>Analizando tu respuesta...</p></div>;

  const isStarStage = stage === SimulationStage.STAR_METHOD && data.starAnalysis;
  const isPressureStage = stage === SimulationStage.PRESSURE && data.pressureAnalysis;

  // Render Pressure Simulator Dashboard
  if (isPressureStage && data.pressureAnalysis) {
      const { adaptabilityScore, stressControlScore, empathyScore, defensiveScore, confidenceCurve, segments } = data.pressureAnalysis;
      
      return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-700 pb-4 mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded uppercase">Sesión Completada</span>
                        <span className="text-slate-400 text-xs">Hace un momento</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Análisis de Desempeño</h1>
                    <p className="text-slate-400 text-sm">Resultados detallados de tu sesión de Presión.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#192633] border border-gray-600 rounded text-white text-sm font-medium hover:bg-[#233648]">
                        <span className="material-symbols-outlined text-sm">share</span> Compartir
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 rounded text-white text-sm font-medium">
                        <span className="material-symbols-outlined text-sm">download</span> Descargar Reporte
                    </button>
                </div>
            </div>

            {/* Top Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* General Score */}
                <div className="bg-[#192633] border border-[#233648] p-6 rounded-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                         <span className="material-symbols-outlined text-primary">trophy</span>
                         <span className="font-bold text-white">Puntuación General</span>
                    </div>
                    <div className="flex items-end gap-3 mb-2">
                        <span className="text-6xl font-black text-white">{data.score}</span>
                        <span className="text-xl text-slate-500 mb-2">/100</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full mt-2">
                        <div className="h-2 rounded-full bg-primary" style={{width: `${data.score}%`}}></div>
                    </div>
                    <p className="text-slate-400 text-xs mt-4 leading-relaxed">
                        {data.score > 80 
                            ? "Excelente manejo de objeciones. Demostraste alta resiliencia." 
                            : "Buen intento, pero se detectaron momentos de duda ante la presión."}
                    </p>
                    {/* Decorative chart bg */}
                    <div className="absolute right-4 top-8 opacity-10">
                        <span className="material-symbols-outlined text-8xl">analytics</span>
                    </div>
                </div>

                {/* Adaptability */}
                <div className="bg-[#192633] border border-[#233648] p-6 rounded-xl relative">
                    <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 text-xs font-bold px-2 py-1 rounded border border-green-500/20">
                        {adaptabilityScore > 75 ? 'ÓPTIMO' : 'NORMAL'}
                    </div>
                    <div className="size-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">psychology</span>
                    </div>
                    <p className="text-slate-400 text-sm">Adaptabilidad</p>
                    <p className="text-3xl font-bold text-white mb-2">{adaptabilityScore > 80 ? 'Alta' : adaptabilityScore > 50 ? 'Media' : 'Baja'}</p>
                    <p className="text-xs text-slate-500">Recuperación ante preguntas trampa.</p>
                </div>

                {/* Stress Control */}
                <div className="bg-[#192633] border border-[#233648] p-6 rounded-xl relative">
                    <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-500 text-xs font-bold px-2 py-1 rounded border border-yellow-500/20">
                        {stressControlScore < 60 ? 'ALERTA' : stressControlScore < 80 ? 'MEJORABLE' : 'BUENO'}
                    </div>
                    <div className="size-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">self_improvement</span>
                    </div>
                     <p className="text-slate-400 text-sm">Control de Estrés</p>
                    <p className="text-3xl font-bold text-white mb-2">{stressControlScore > 80 ? 'Excelente' : stressControlScore > 50 ? 'Moderado' : 'Bajo'}</p>
                    <p className="text-xs text-slate-500">Estabilidad vocal bajo presión.</p>
                </div>
            </div>

            {/* Vocal Analysis & Posture */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Vocal Graph */}
                <div className="lg:col-span-2 bg-[#192633] border border-[#233648] p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                             <span className="material-symbols-outlined text-blue-400">graphic_eq</span>
                             <h3 className="font-bold text-white">Análisis Vocal y Tonal</h3>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1 text-slate-400"><span className="size-2 rounded-full bg-green-500"></span> Confianza</span>
                            <span className="flex items-center gap-1 text-slate-400"><span className="size-2 rounded-full bg-red-500"></span> Estrés</span>
                        </div>
                    </div>

                    <div className="flex items-end justify-between h-40 gap-1 px-2 border-b border-gray-700 relative">
                         {/* Zero line */}
                         <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700 border-t border-dashed border-gray-600"></div>
                         
                         {confidenceCurve.map((val, i) => {
                             const isPositive = val >= 0;
                             const heightPercent = Math.min(Math.abs(val) * 10, 100); // Scale 10 to 100%
                             return (
                                 <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                                     <div 
                                        className={`w-full max-w-[8px] rounded-t-sm transition-all hover:opacity-80 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ height: `${Math.max(heightPercent, 10)}%`, marginBottom: isPositive ? '50%' : '0', marginTop: isPositive ? '0' : '0', opacity: 0.8 }}
                                     ></div>
                                     {/* Tooltip */}
                                     <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-black text-white text-xs p-1 rounded whitespace-nowrap z-10">
                                         {isPositive ? `Confianza: ${val}` : `Estrés: ${Math.abs(val)}`}
                                     </div>
                                 </div>
                             );
                         })}
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>Inicio</span>
                        <span>04:12 - Tono defensivo detectado</span>
                        <span>Fin</span>
                    </div>
                    
                    {/* Emergency Assist Alert Mock */}
                    {stressControlScore < 60 && (
                        <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-3">
                             <span className="material-symbols-outlined text-red-500">medical_services</span>
                             <div>
                                 <p className="text-red-400 text-sm font-bold">Asistencia de Emergencia Activada</p>
                                 <p className="text-red-300/80 text-xs">Detectamos una pausa prolongada y estrés vocal. Sugerencia para ganar tiempo: <span className="italic text-white">"Esa es una perspectiva interesante, permítame un momento..."</span></p>
                             </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Visual/Confidence */}
                <div className="flex flex-col gap-4">
                     {/* Visual Contact Mock */}
                    <div className="bg-[#192633] border border-[#233648] p-6 rounded-xl flex flex-col items-center justify-center">
                        <h3 className="w-full text-left font-bold text-white text-sm mb-4">Contacto Visual (Simulado)</h3>
                        <div className="relative size-32">
                             <svg className="size-full rotate-[-90deg]" viewBox="0 0 36 36">
                                <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <path className="text-primary" strokeDasharray="85, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                <span className="text-3xl font-black">85%</span>
                                <span className="text-[10px] text-slate-400">Sostenido</span>
                            </div>
                        </div>
                        <div className="mt-4 bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded border border-yellow-500/30 flex items-center gap-1">
                            <span className="size-2 bg-yellow-500 rounded-full animate-pulse"></span> Alerta de Postura
                        </div>
                        <p className="text-xs text-slate-500 text-center mt-2">Brazos cruzados detectados en fase de negociación.</p>
                    </div>

                    {/* Confidence Projection */}
                    <div className="bg-[#192633] border border-[#233648] p-6 rounded-xl flex-1">
                         <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">grid_view</span> Proyección de Confianza</h3>
                         <div className="space-y-4">
                             <div>
                                 <div className="flex justify-between text-xs text-slate-400 mb-1">
                                     <span>Calidez</span>
                                     <span>Moderada</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-gray-700 rounded-full">
                                     <div className="h-1.5 bg-yellow-500 rounded-full" style={{width: '60%'}}></div>
                                 </div>
                             </div>
                             <div>
                                 <div className="flex justify-between text-xs text-slate-400 mb-1">
                                     <span>Competencia</span>
                                     <span>Alta</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-gray-700 rounded-full">
                                     <div className="h-1.5 bg-blue-500 rounded-full" style={{width: '90%'}}></div>
                                 </div>
                             </div>
                             <div className="bg-[#111a22] p-3 rounded border-l-2 border-primary mt-2">
                                 <p className="text-xs text-slate-400 italic">"Tu proyección denota autoridad técnica, pero podrías beneficiarte de sonreír más al inicio."</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Emotional Intelligence Breakdown */}
            <div className="bg-[#192633] border border-[#233648] p-6 rounded-xl">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-white text-lg">Análisis de Inteligencia Emocional</h3>
                     <div className="flex gap-6">
                         <div className="text-center">
                             <p className="text-xs text-slate-400 uppercase tracking-wider">Empatía</p>
                             <p className={`text-xl font-black ${empathyScore > 70 ? 'text-green-500' : 'text-yellow-500'}`}>{empathyScore}%</p>
                         </div>
                         <div className="text-center">
                             <p className="text-xs text-slate-400 uppercase tracking-wider">Defensivo</p>
                             <p className={`text-xl font-black ${defensiveScore < 30 ? 'text-green-500' : 'text-red-500'}`}>{defensiveScore}%</p>
                         </div>
                     </div>
                 </div>

                 <div className="relative border-l border-gray-700 ml-4 space-y-8 py-2">
                     {segments.map((segment, idx) => (
                         <div key={idx} className="relative pl-8">
                             {/* Timeline dot */}
                             <div className={`absolute -left-[17px] top-0 size-9 rounded-full border-4 border-[#192633] flex items-center justify-center ${
                                 segment.sentiment === 'empathy' ? 'bg-green-500 text-white' : 
                                 segment.sentiment === 'defensive' ? 'bg-red-500 text-white' : 
                                 segment.sentiment === 'confidence' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                             }`}>
                                 <span className="material-symbols-outlined text-sm">
                                     {segment.sentiment === 'empathy' ? 'sentiment_satisfied' : 
                                      segment.sentiment === 'defensive' ? 'sentiment_dissatisfied' : 
                                      segment.sentiment === 'confidence' ? 'verified' : 'record_voice_over'}
                                 </span>
                             </div>
                             
                             <div className="flex flex-col gap-1">
                                 <span className="text-xs text-slate-500 font-mono">{segment.timestamp || `00:${15 * (idx + 1)}`}</span>
                                 <p className="text-white text-lg font-medium leading-snug">"{segment.text}"</p>
                                 <div className="flex items-center gap-2 mt-1">
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                          segment.sentiment === 'empathy' ? 'bg-green-900/50 text-green-400' : 
                                          segment.sentiment === 'defensive' ? 'bg-red-900/50 text-red-400' : 
                                          segment.sentiment === 'confidence' ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-300'
                                     }`}>
                                         {segment.sentiment}
                                     </span>
                                     {segment.feedback && <span className="text-xs text-slate-400">- {segment.feedback}</span>}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
            
            <div className="flex justify-end pt-4">
                <Link 
                    to={isFinal ? "/dashboard" : nextPath}
                    className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                    {isFinal ? "Volver al Dashboard" : "Siguiente Módulo"} 
                    <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
            </div>
        </div>
      );
  }

  // STANDARD VIEW (ELEVATOR PITCH, STAR, CLOSING)
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-gray-200 dark:border-border-dark pb-6">
         <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">{getStageNameES(stage)}</span>
            </div>
            <h1 className="text-3xl font-black dark:text-white mb-2">Análisis de Desempeño</h1>
            <p className="text-slate-500 dark:text-text-secondary">Revisión detallada de tu respuesta generada por IA.</p>
         </div>
         <div className="flex gap-3">
             <button className="px-4 py-2 bg-gray-100 dark:bg-surface-dark rounded-lg text-sm font-bold dark:text-white flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-[#233648] transition-colors">
                 <span className="material-symbols-outlined">download</span> Exportar
             </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Score Card */}
         <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark relative overflow-hidden shadow-sm">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                 <span className="material-symbols-outlined text-8xl text-primary">verified</span>
             </div>
             <p className="text-sm font-bold text-text-secondary mb-2">Puntaje General</p>
             <div className="flex items-baseline gap-2">
                 <span className="text-6xl font-black dark:text-white">{data.score}</span>
                 <span className="text-xl text-slate-400">/100</span>
             </div>
             <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mt-4">
                 <div className={`h-2 rounded-full ${data.score > 70 ? 'bg-success' : data.score > 40 ? 'bg-warning' : 'bg-danger'}`} style={{width: `${data.score}%`}}></div>
             </div>
             <p className="mt-4 text-sm font-medium dark:text-white">
                {data.score > 80 ? '¡Excelente respuesta!' : data.score > 50 ? 'Vas por buen camino.' : 'Necesita más estructura.'}
             </p>
         </div>

         {/* Tone & Pacing */}
         <div className="md:col-span-2 grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
                 <div className="flex items-center gap-2 mb-2 text-purple-500">
                    <span className="material-symbols-outlined">psychology</span>
                    <span className="font-bold text-sm">Tono Emocional</span>
                 </div>
                 <p className="text-2xl font-bold dark:text-white capitalize">{data.emotionalTone}</p>
                 <p className="text-xs text-text-secondary mt-1">Cómo te percibe el entrevistador.</p>
             </div>
             <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
                 <div className="flex items-center gap-2 mb-2 text-orange-500">
                    <span className="material-symbols-outlined">speed</span>
                    <span className="font-bold text-sm">Ritmo</span>
                 </div>
                 <p className="text-2xl font-bold dark:text-white">{data.pacing === 'Optimal' ? 'Óptimo' : data.pacing === 'Fast' ? 'Rápido' : 'Lento'}</p>
                 <p className="text-xs text-text-secondary mt-1">Muletillas: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{data.fillerWordCount}</span></p>
             </div>
              <div className="col-span-2 bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
                 <p className="font-bold dark:text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">subtitles</span> Transcripción
                 </p>
                 <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">"{data.transcription}"</p>
             </div>
         </div>
      </div>

      {/* STAR Method Visualization */}
      {isStarStage && data.starAnalysis && (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500">star</span> Análisis Método STAR
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Situation */}
                <div className={`p-4 rounded-xl border-l-4 ${data.starAnalysis.situation.present ? 'border-success bg-green-50 dark:bg-[#0d211c]' : 'border-danger bg-red-50 dark:bg-[#2a1215]'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm uppercase tracking-wider dark:text-white">Situación</span>
                        <span className={`material-symbols-outlined text-lg ${data.starAnalysis.situation.present ? 'text-success' : 'text-danger'}`}>
                            {data.starAnalysis.situation.present ? 'check_circle' : 'cancel'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 italic">"{data.starAnalysis.situation.text || 'No detectado'}"</p>
                    <p className={`text-xs font-medium ${data.starAnalysis.situation.present ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {data.starAnalysis.situation.feedback}
                    </p>
                </div>
                {/* Task */}
                <div className={`p-4 rounded-xl border-l-4 ${data.starAnalysis.task.present ? 'border-success bg-green-50 dark:bg-[#0d211c]' : 'border-danger bg-red-50 dark:bg-[#2a1215]'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm uppercase tracking-wider dark:text-white">Tarea</span>
                        <span className={`material-symbols-outlined text-lg ${data.starAnalysis.task.present ? 'text-success' : 'text-danger'}`}>
                            {data.starAnalysis.task.present ? 'check_circle' : 'cancel'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 italic">"{data.starAnalysis.task.text || 'No detectado'}"</p>
                    <p className={`text-xs font-medium ${data.starAnalysis.task.present ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {data.starAnalysis.task.feedback}
                    </p>
                </div>
                {/* Action */}
                <div className={`p-4 rounded-xl border-l-4 ${data.starAnalysis.action.present ? 'border-success bg-green-50 dark:bg-[#0d211c]' : 'border-danger bg-red-50 dark:bg-[#2a1215]'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm uppercase tracking-wider dark:text-white">Acción</span>
                        <span className={`material-symbols-outlined text-lg ${data.starAnalysis.action.present ? 'text-success' : 'text-danger'}`}>
                            {data.starAnalysis.action.present ? 'check_circle' : 'cancel'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 italic">"{data.starAnalysis.action.text || 'No detectado'}"</p>
                    <p className={`text-xs font-medium ${data.starAnalysis.action.present ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {data.starAnalysis.action.feedback}
                    </p>
                </div>
                {/* Result */}
                <div className={`p-4 rounded-xl border-l-4 ${data.starAnalysis.result.present ? 'border-success bg-green-50 dark:bg-[#0d211c]' : 'border-danger bg-red-50 dark:bg-[#2a1215]'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm uppercase tracking-wider dark:text-white">Resultado</span>
                        <span className={`material-symbols-outlined text-lg ${data.starAnalysis.result.present ? 'text-success' : 'text-danger'}`}>
                            {data.starAnalysis.result.present ? 'check_circle' : 'cancel'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 italic">"{data.starAnalysis.result.text || 'No detectado'}"</p>
                    <p className={`text-xs font-medium ${data.starAnalysis.result.present ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {data.starAnalysis.result.feedback}
                    </p>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-green-500/20 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400 mb-4">
                  <span className="material-symbols-outlined">thumb_up</span> Fortalezas
              </h3>
              <ul className="space-y-3">
                  {data.strengths.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm dark:text-slate-200 bg-green-50 dark:bg-green-900/10 p-2 rounded-lg">
                          <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check</span> {s}
                      </li>
                  ))}
              </ul>
          </div>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-yellow-500/20 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-yellow-600 dark:text-yellow-400 mb-4">
                  <span className="material-symbols-outlined">lightbulb</span> Áreas de Mejora
              </h3>
               <ul className="space-y-3">
                  {data.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm dark:text-slate-200 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg">
                          <span className="material-symbols-outlined text-yellow-500 text-sm mt-0.5">arrow_forward</span> {s}
                      </li>
                  ))}
              </ul>
          </div>
      </div>

      <div className="flex justify-end pt-6">
          <Link 
            to={isFinal ? "/dashboard" : nextPath}
            className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
              {isFinal ? "Volver al Dashboard" : "Siguiente Módulo"} 
              <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
      </div>
    </div>
  );
};

export default FeedbackAnalysis;