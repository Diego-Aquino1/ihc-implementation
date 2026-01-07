import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage } from "@google/genai";
import { analyzeVisualCues, analyzeAnswer, getLiveAPIConfig } from '../services/geminiService';
import { SimulationStage, SessionData, FeedbackData, VisualCue } from '../types';

interface SimulationStageProps {
  stage: SimulationStage;
  title: string;
  description: string;
  nextPath: string;
  sessionData: SessionData;
  isClosing?: boolean;
  onSave: (data: FeedbackData) => void;
}

// Audio Helper for Live API
function createBlob(data: Float32Array): { data: string, mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    
    // Manual Base64 Encode
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    return {
        data: b64,
        mimeType: 'audio/pcm;rate=16000',
    };
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length; // Mono
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}

const SimulationStagePage: React.FC<SimulationStageProps> = ({ 
  stage, title, description, nextPath, sessionData, isClosing, onSave 
}) => {
  const navigate = useNavigate();
  
  // State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [visualFeedback, setVisualFeedback] = useState<VisualCue | null>(null);
  const [visualHistory, setVisualHistory] = useState<VisualCue[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualIntervalRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef<boolean>(false); // Concurrency control
  const sessionRef = useRef<any>(null); // Live Session
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const transcriptionRef = useRef<string>(""); // Store user speech
  
  // Avatar generation removed for now; keep cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupLiveSession();
    };
  }, []);

  // Timer Effect
  useEffect(() => {
      if (isLiveConnected) {
          timerIntervalRef.current = window.setInterval(() => {
              setTimer(prev => prev + 1);
          }, 1000);
      } else {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
      return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isLiveConnected]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Avatar unlock/opt-out removed for now.

  // 2. Cleanup Function
  const cleanupLiveSession = () => {
      if (sessionRef.current) {
          // sessionRef.current could be a Promise or the Session object.
          // If it's the session object, it might have a close method.
          // If it's a promise, we can't easily cancel it, but we can ignore result.
      }
      sessionRef.current = null;
      
      if (inputAudioContextRef.current) {
          inputAudioContextRef.current.close();
          inputAudioContextRef.current = null;
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
      if (visualIntervalRef.current) {
          clearInterval(visualIntervalRef.current);
          visualIntervalRef.current = null;
      }
      setIsLiveConnected(false);
  };

  // 3. Start Live Interaction
  const startLiveSession = async () => {
      if (isLiveConnected) return;
      setIsLiveConnected(true);
      setVisualHistory([]);
      setTimer(0);
      transcriptionRef.current = ""; // Reset transcript

      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      try {
          // Microphone Stream
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          if (videoRef.current) {
              videoRef.current.srcObject = stream; // Show self in small monitor
          }

          // Connect to Gemini Live
          const sysInstruction = `Eres un entrevistador ${sessionData.config.vibe} (en español). Tu tarea es hacer ESTA pregunta exacta: "${description}". Escucha la respuesta del candidato. Luego, di "Gracias" y termina el turno.`;

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // CRITICAL: We create the promise but attach a catch to avoid Unhandled Promise Rejection
          // if it fails before we use .then() in the audio processor.
          const sessionPromise = ai.live.connect({
              ...getLiveAPIConfig(sysInstruction),
              callbacks: {
                  onopen: () => {
                      console.log("Live Session Connected");
                      // Stream Audio In
                      const source = inputCtx.createMediaStreamSource(stream);
                      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                      processor.onaudioprocess = (e) => {
                          const inputData = e.inputBuffer.getChannelData(0);
                          const blob = createBlob(inputData);
                          // Use the promise to send input
                          if (sessionRef.current) {
                              sessionRef.current.then((session: any) => {
                                  session.sendRealtimeInput({ media: blob });
                              }).catch((err: any) => console.error("Error sending input", err));
                          }
                      };
                      source.connect(processor);
                      processor.connect(inputCtx.destination);
                      
                      // Start Visual Monitoring
                      startVisualMonitoring();
                  },
                  onmessage: async (msg: LiveServerMessage) => {
                      // Capture User Transcription
                      if (msg.serverContent?.inputTranscription) {
                          const text = msg.serverContent.inputTranscription.text;
                          if (text) {
                              transcriptionRef.current += text;
                          }
                      }

                      // Handle Audio Output
                      const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                      if (audioData && audioContextRef.current) {
                          setIsAgentSpeaking(true);
                          const buffer = await decodeAudioData(decodeBase64(audioData), audioContextRef.current);
                          const source = audioContextRef.current.createBufferSource();
                          source.buffer = buffer;
                          source.connect(audioContextRef.current.destination);
                          
                          const startTime = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                          source.start(startTime);
                          nextStartTimeRef.current = startTime + buffer.duration;
                          
                          source.onended = () => setIsAgentSpeaking(false);
                      }
                      
                      // Handle Turn Completion
                      if (msg.serverContent?.turnComplete) {
                          setIsAgentSpeaking(false);
                      }
                  },
                  onclose: () => {
                      console.log("Session Closed");
                      setIsLiveConnected(false);
                  },
                  onerror: (e) => {
                      console.error("Live Error", e);
                  }
              }
          });

          // Handle initial connection failure
          sessionPromise.catch((err) => {
              console.error("Failed to connect to Live API:", err);
              setIsLiveConnected(false);
              alert("No se pudo conectar a Gemini Live. Por favor verifica tu conexión y API Key.");
          });

          sessionRef.current = sessionPromise;

      } catch (err) {
          console.error("Failed to start session:", err);
          setIsLiveConnected(false);
      }
  };

  // 4. Visual Monitoring Loop (Gemini 3 Flash)
  const startVisualMonitoring = () => {
      if (visualIntervalRef.current) clearInterval(visualIntervalRef.current);
      isAnalyzingRef.current = false;

      // Ultra-fast polling with reduced resolution
      visualIntervalRef.current = window.setInterval(async () => {
          if (isAnalyzingRef.current) return; // Drop frame if previous is still processing
          
          if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4 && videoRef.current.videoWidth > 0) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                  isAnalyzingRef.current = true;
                  
                  // CRITICAL: Reduce resolution for speed. 
                  // 320x180 is enough for gesture detection and uploads 10x faster than HD.
                  const ANALYSIS_WIDTH = 320;
                  const ANALYSIS_HEIGHT = 180;

                  canvasRef.current.width = ANALYSIS_WIDTH;
                  canvasRef.current.height = ANALYSIS_HEIGHT;
                  
                  // Draw scaled down image
                  ctx.drawImage(videoRef.current, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
                  
                  // Low quality JPEG for speed
                  const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                  
                  if (base64) {
                      // Fire and forget - well, await it but allow the loop to continue
                      try {
                          const result = await analyzeVisualCues(base64);
                          if (result) {
                              setVisualFeedback(result);
                              setVisualHistory(prev => [...prev, result]);
                          }
                      } catch (e) {
                          console.error("Visual loop error", e);
                      }
                  }
                  isAnalyzingRef.current = false;
              }
          }
      }, 600); // Poll every 600ms (near real-time)
  };

  const handleStopAndAnalyze = async () => {
      setIsProcessing(true);
      cleanupLiveSession();
      
      const realTranscript = transcriptionRef.current || "(No se detectó audio del usuario o hubo un error en la transcripción)";
      
      const feedback = await analyzeAnswer(realTranscript, description, stage, visualHistory);
      onSave(feedback);
      navigate(nextPath);
      setIsProcessing(false);
  };

  const handleActionClick = () => {
      if (isLiveConnected) {
          handleStopAndAnalyze();
      } else {
          startLiveSession();
      }
  };

  // Helper for Status Icon/Color
  const getStatusVisuals = (status: string) => {
      switch(status) {
          case 'Contacto Visual': return { icon: 'visibility', color: 'bg-green-500', text: 'text-green-400' };
          case 'Mirada Desviada': return { icon: 'visibility_off', color: 'bg-yellow-500', text: 'text-yellow-400' };
          case 'Mano en Cara': return { icon: 'face', color: 'bg-orange-500', text: 'text-orange-400' };
          case 'Postura Encorvada': return { icon: 'accessibility_new', color: 'bg-red-500', text: 'text-red-400' };
          case 'Sonriendo': return { icon: 'sentiment_satisfied', color: 'bg-blue-500', text: 'text-blue-400' };
          default: return { icon: 'person', color: 'bg-gray-500', text: 'text-gray-400' };
      }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
       {/* Breadcrumbs */}
       <div className="flex items-center gap-2 text-sm px-1 shrink-0">
          <span className="text-slate-500 dark:text-[#92adc9] font-medium">Módulo: {sessionData.config.questionFocus || 'Entrevista'}</span>
          <span className="text-slate-400 dark:text-[#586e84] material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-medium">Paso: {title}</span>
       </div>

       {/* MAIN STAGE CONTAINER - PiP Layout */}
       <div className="relative w-full flex-grow min-h-[500px] rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800 group">
          
          {/* Canvas for capturing frames (hidden) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* 1. INTERVIEWER LAYER (Background) - static background for now */}
          <div className="absolute inset-0 w-full h-full">
               <div
                 className="absolute inset-0 w-full h-full bg-cover bg-center"
                 data-alt="Professional interviewer background"
                 style={{
                   backgroundImage:
                     'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDbeDxlDwBKWZ4j4U3d58wmU8s6-VXqzYZHHFQE9dYP3VrQSWtVhXPf-3pUld7HmQ_RqxRGbitaZCzm__u0U0ReW6v4fQdDDEzTHy8j5C04yu76sqZV-eQIq5pRC3a_AyNAmBS-5zBe6EkERZTvBFCZt4cM_nqnw-CGrcaOPagE9T-_B2gPf7W4VySTBeIGo9MsJeAh3HFdEZW3r9F7E947QQQd_Qy7fwiHEKo6OMTLOz3NMaRv7UCjSf1_hGJT3R-TuPcCspNr4fc")',
                 }}
               />
          </div>

          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none"></div>

          {/* 2. TOP HUD: VISUAL ANALYSIS */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
               {isLiveConnected && (
                   <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 flex items-center gap-4 pr-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                       <div className="flex items-center gap-3">
                           {/* Status Icon */}
                           <div className={`size-10 rounded-xl flex items-center justify-center ${visualFeedback ? getStatusVisuals(visualFeedback.status).color : 'bg-gray-700'} shadow-lg`}>
                               <span className="material-symbols-outlined text-white text-xl">
                                   {visualFeedback ? getStatusVisuals(visualFeedback.status).icon : 'hourglass_empty'}
                               </span>
                           </div>
                           
                           {/* Text Analysis */}
                           <div className="flex flex-col">
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Análisis Visual en Tiempo Real</span>
                               {visualFeedback ? (
                                   <div className="flex items-center gap-2">
                                       <span className={`text-sm font-bold ${getStatusVisuals(visualFeedback.status).text} whitespace-nowrap`}>
                                           {visualFeedback.status}
                                       </span>
                                       <span className="text-xs text-slate-300 border-l border-white/20 pl-2 opacity-80 whitespace-nowrap hidden md:block">
                                           {visualFeedback.feedback}
                                       </span>
                                   </div>
                               ) : (
                                   <span className="text-sm font-medium text-white/50 italic flex items-center gap-2">
                                       <span className="size-2 bg-primary rounded-full animate-pulse"></span> Escaneando...
                                   </span>
                               )}
                           </div>
                       </div>
                   </div>
               )}
          </div>

          {/* Status Indicator (Left) */}
          <div className="absolute top-6 left-6 z-10 hidden md:block">
               {isLiveConnected && (
                   <div className="px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
                       <span className="size-2 rounded-full bg-white"></span>
                       LIVE
                   </div>
               )}
          </div>

          {/* 3. CENTER OVERLAYS (Veo Unlock / Agent Speaking) */}
          {/* Avatar generation and unlock UI removed for now */}

          {isAgentSpeaking && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 p-3 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 z-10">
                    <span className="w-1.5 h-4 bg-white rounded-full animate-[bounce_1s_infinite]"></span>
                    <span className="w-1.5 h-6 bg-white rounded-full animate-[bounce_1.2s_infinite]"></span>
                    <span className="w-1.5 h-4 bg-white rounded-full animate-[bounce_0.8s_infinite]"></span>
               </div>
          )}

          {/* 4. BOTTOM AREA: Question, Controls & PiP */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row items-end justify-between gap-6 z-20">
               
               {/* Question Text (Left) */}
               <div className="flex flex-col gap-2 max-w-xl mb-2 pointer-events-none">
                   <div className="flex items-center gap-2 mb-1">
                       <span className="material-symbols-outlined text-primary text-2xl">chat_bubble</span>
                       <span className="text-primary font-semibold uppercase tracking-wider text-xs">Pregunta Actual</span>
                   </div>
                   <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight drop-shadow-lg text-pretty">
                        "{description}"
                   </h1>
                   
                   {/* Timer Display */}
                   <div className="flex items-center gap-2 mt-2 text-slate-300 font-mono bg-black/30 backdrop-blur-md px-3 py-1 rounded-lg w-fit border border-white/10">
                        <span className="material-symbols-outlined text-sm">timer</span>
                        {formatTime(timer)} / 02:00
                   </div>
               </div>

               {/* Center Action Button (Floating) */}
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <button 
                        onClick={handleActionClick}
                        disabled={isProcessing}
                        className={`group relative flex items-center justify-center size-20 rounded-full shadow-2xl transition-all transform hover:scale-110 ${
                            isLiveConnected 
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50' 
                            : 'bg-primary hover:bg-primary-hover shadow-primary/40'
                        }`}
                    >
                        {isProcessing ? (
                            <span className="material-symbols-outlined text-white text-4xl animate-spin">progress_activity</span>
                        ) : (
                            <span className={`material-symbols-outlined text-white text-4xl filled`}>
                                {isLiveConnected ? 'stop' : 'mic'}
                            </span>
                        )}
                        
                        {!isLiveConnected && !isProcessing && (
                            <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-0 group-hover:opacity-100"></span>
                        )}
                    </button>
                    <span className="text-xs text-white/70 font-medium tracking-wide drop-shadow-md bg-black/20 px-2 py-0.5 rounded">
                        {isLiveConnected ? "Finalizar Respuesta" : "Responder"}
                    </span>
               </div>

               {/* PiP USER WEBCAM (Bottom Right) */}
               <div className="relative w-48 md:w-64 aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-white/20 ring-1 ring-black/50 group/pip z-30 transition-all hover:scale-105 hover:border-primary/50">
                    <video 
                        ref={videoRef}
                        className="w-full h-full object-cover transform scale-x-[-1]"
                        autoPlay muted playsInline
                    />

                    {/* Audio Bars in PiP */}
                    {isLiveConnected && (
                        <div className="absolute bottom-3 left-3 flex gap-0.5 items-end h-4">
                             <div className="w-1 bg-green-400 audio-bar rounded-sm" style={{animationDuration: '0.6s'}}></div>
                             <div className="w-1 bg-green-400 audio-bar rounded-sm" style={{animationDuration: '0.8s'}}></div>
                             <div className="w-1 bg-green-400 audio-bar rounded-sm" style={{animationDuration: '0.4s'}}></div>
                        </div>
                    )}
               </div>
          </div>
       </div>
    </div>
  );
};

export default SimulationStagePage;