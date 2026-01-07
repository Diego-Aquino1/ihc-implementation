import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import ProgressBar, { LiveStage } from '../components/ProgressBar';
import { LiveWebSocketClient, LiveMessage, LiveSession } from '../services/wsLive';
import { getLiveAPIConfig, analyzeVisualCues } from '../services/geminiService';
import { AudioAnalyzer, AudioMetrics } from '../services/audioAnalysis';
import LiveFeedbackHUD from '../components/LiveFeedbackHUD';
import InterviewerAvatar from '../components/InterviewerAvatar';
import { VisualCue } from '../types';

// Helper functions para audio (similar a SimulationStagePage)
function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
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
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const LiveInterviewPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  // WebSocket state
  const [wsClient, setWsClient] = useState<LiveWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  // Gemini Live state
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [hasAgentStartedSpeaking, setHasAgentStartedSpeaking] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  
  // Analysis state
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    wpm: 0,
    avgPauseDuration: 0,
    fillerWords: 0,
    volumeLevel: 0,
    clarity: 0
  });
  const [visualCue, setVisualCue] = useState<VisualCue | null>(null);
  const [showFeedback, setShowFeedback] = useState(true);
  
  // Timer y Stage Info
  const [timer, setTimer] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>(undefined);
  const [stageProgress, setStageProgress] = useState<number>(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const sessionRef = useRef<any>(null); // Gemini Live Session
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const transcriptionRef = useRef<string>('');
  const audioAnalyzerRef = useRef<AudioAnalyzer>(new AudioAnalyzer());
  const visualAnalysisIntervalRef = useRef<number | null>(null);
  const lastVideoFrameTimeRef = useRef<number>(0);
  const lastStageInfoRequestRef = useRef<number>(0);
  const reconnectNotificationRef = useRef<boolean>(false);

  // Timer
  useEffect(() => {
    if (isLiveConnected) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isLiveConnected]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup function
  const cleanupLiveSession = () => {
    if (sessionRef.current) {
      // Gemini Live session cleanup
      if (typeof sessionRef.current.then === 'function') {
        sessionRef.current.then((s: any) => {
          if (s && typeof s.close === 'function') {
            s.close();
          }
        }).catch(() => {});
      } else if (sessionRef.current && typeof sessionRef.current.close === 'function') {
        sessionRef.current.close();
      }
      sessionRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsLiveConnected(false);
  };

  // Inicializar WebSocket
  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    const client = new LiveWebSocketClient(parseInt(sessionId));
    
    client.onMessage((message: LiveMessage) => {
      switch (message.type) {
        case 'connected':
          setSession(message.session);
          setIsConnected(true);
          setConnectionStatus('connected');
          setHasAgentStartedSpeaking(false);
          // Actualizar info de etapa inicial
          if (message.session) {
            setTimeRemaining(message.session.time_remaining);
            setStageProgress(message.session.stage_progress || 0);
          }
          break;
        
        case 'session_reset':
          // Sesión reiniciada - resetear estados y actualizar sesión
          console.log('Session reset received:', message.session);
          // Limpiar sesión LIVE actual primero
          cleanupLiveSession();
          // Detener stream de video/audio
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          // Resetear todos los estados
          setIsLiveConnected(false);
          setIsAgentSpeaking(false);
          setHasAgentStartedSpeaking(false);
          setTranscription('');
          setTimer(0);
          setTimeRemaining(message.session?.time_remaining);
          setStageProgress(message.session?.stage_progress || 0);
          setAudioMetrics({
            wpm: 0,
            avgPauseDuration: 0,
            fillerWords: 0,
            volumeLevel: 0,
            clarity: 0
          });
          setVisualCue(null);
          transcriptionRef.current = '';
          audioAnalyzerRef.current = new AudioAnalyzer();
          // Actualizar sesión - esto triggerá el useEffect para reiniciar la sesión LIVE
          setSession(message.session);
          break;
        
        case 'stage_update':
          if (message.session) {
            setSession(message.session);
            setTimeRemaining(message.session.time_remaining);
            setStageProgress(message.session.stage_progress || 0);
            // Reset flag cuando cambia de etapa
            setHasAgentStartedSpeaking(false);
            console.log('Stage updated:', message.session.current_stage);
          }
          break;
        
        case 'stage_timer_started':
          console.log('Stage timer started on backend');
          break;
        
        case 'stage_info':
          if (message.data) {
            setTimeRemaining(message.data.time_remaining);
            setStageProgress(message.data.stage_progress || 0);
          }
          break;
        
        case 'error':
          setError(message.message || 'Unknown error');
          setConnectionStatus('error');
          break;
        
        default:
          console.log('WebSocket message:', message.type);
      }
    });

    client.onError((error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      // No mostrar mensaje de error al usuario - la reconexión es automática
    });

    client.onClose(() => {
      setIsConnected(false);
      if (!client.getReconnectAttempts()) {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('connecting');
        // No mostrar mensaje de reconexión - es automático
      }
    });

    client.onReconnect(() => {
      console.log('WebSocket reconnected successfully');
      reconnectNotificationRef.current = true;
      setConnectionStatus('connected');
      setError(null);
      // Reinicializar después de reconexión
      setTimeout(() => {
        client.initialize();
        reconnectNotificationRef.current = false;
      }, 500);
    });

    setConnectionStatus('connecting');
    let stageInfoInterval: number | null = null;
    
    client.connect()
      .then(() => {
        client.initialize();
        setWsClient(client);
        
        // Solicitar información de etapa cada segundo (para countdown) con debouncing
        stageInfoInterval = window.setInterval(() => {
          if (client.isConnected()) {
            const now = Date.now();
            // Solo enviar si ha pasado al menos 1 segundo desde la última solicitud
            if (now - lastStageInfoRequestRef.current >= 1000) {
              client.send({ type: 'get_stage_info' });
              lastStageInfoRequestRef.current = now;
            }
          }
        }, 1000);
      })
      .catch((err) => {
        console.error('Failed to connect:', err);
        setConnectionStatus('error');
        setError('Failed to connect to server');
      });

    return () => {
      if (stageInfoInterval !== null) {
        clearInterval(stageInfoInterval);
      }
      if (client) {
        client.disconnect();
      }
    };
  }, [sessionId]);

  // Inicializar cámara y Gemini Live
  useEffect(() => {
    if (!isConnected || !wsClient) {
      return;
    }

    const startLiveSession = async () => {
      try {
        // Setup Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        inputAudioContextRef.current = inputCtx;
        audioContextRef.current = outputCtx;
        nextStartTimeRef.current = 0;

        // Microphone and Camera Stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: { width: 640, height: 480 }
        });

        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // System instruction basada en la etapa actual
        const currentStage = session?.current_stage || 'introduction';
        const stageInstructions = {
          introduction: "Eres un entrevistador profesional. En esta etapa, haz preguntas de introducción como 'Cuéntame sobre ti', '¿Quién eres?', '¿Qué te apasiona?'. Sé natural y conversacional. Responde en español.",
          experience: "Eres un entrevistador profesional. En esta etapa, pregunta sobre experiencia laboral: 'Háblame de tu experiencia', '¿Cuál ha sido tu proyecto más importante?'. Sé específico y busca detalles. Responde en español.",
          behavioral: "Eres un entrevistador profesional. En esta etapa, haz preguntas comportamentales usando el método STAR: 'Cuéntame sobre una situación desafiante', '¿Cómo manejaste un conflicto?'. Busca estructura en las respuestas. Responde en español.",
          closing: "Eres un entrevistador profesional. En esta etapa, cierra la entrevista: '¿Tienes alguna pregunta?', '¿Qué te gustaría saber sobre la posición?'. Sé abierto y receptivo. Responde en español."
        };

        const systemInstruction = `Eres un entrevistador virtual y coach estricto pero constructivo. ${stageInstructions[currentStage as keyof typeof stageInstructions]}`;

        // Connect to Gemini Live
        // La API key se expone vía vite.config.ts desde .env.local
        const apiKey = (process.env as any).GEMINI_API_KEY || 
                      (process.env as any).API_KEY ||
                      import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY no está configurada. Agrega GEMINI_API_KEY en frontend/.env.local');
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const sessionPromise = ai.live.connect({
          ...getLiveAPIConfig(systemInstruction),
          callbacks: {
            onopen: () => {
              console.log('Gemini Live Session Connected');
              setIsLiveConnected(true);
              
              // Stream Audio In
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const blob = createBlob(inputData);
                
                if (sessionRef.current) {
                  sessionRef.current.then((s: any) => {
                    s.sendRealtimeInput({ media: blob });
                  }).catch((err: any) => console.error('Error sending input', err));
                }
              };
              
              source.connect(processor);
              processor.connect(inputCtx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              // Capture User Transcription
              if (msg.serverContent?.inputTranscription) {
                const text = msg.serverContent.inputTranscription.text;
                if (text) {
                  transcriptionRef.current += text + ' ';
                  setTranscription(transcriptionRef.current);
                  
                  // Analizar audio (transcripción)
                  audioAnalyzerRef.current.processTranscription(text);
                  
                  // Actualizar métricas de audio
                  const metrics = audioAnalyzerRef.current.getMetrics();
                  setAudioMetrics(metrics);
                  
                  // Notificar al backend sobre transcripción
                  if (wsClient) {
                    wsClient.send({
                      type: 'transcription',
                      text: text,
                      metrics: metrics
                    });
                  }
                }
              }

              // Handle Audio Output
              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && audioContextRef.current) {
                setIsAgentSpeaking(true);
                
                // Si es la primera vez que el entrevistador habla en esta etapa, iniciar el timer
                if (!hasAgentStartedSpeaking && wsClient) {
                  setHasAgentStartedSpeaking(true);
                  wsClient.send({ type: 'start_stage_timer' });
                  console.log('Timer started: Interviewer started speaking');
                }
                
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
              console.log('Gemini Live Session Closed');
              setIsLiveConnected(false);
            },
            onerror: (e) => {
              console.error('Gemini Live Error', e);
              setIsLiveConnected(false);
              setError('Error en Gemini Live API');
            }
          }
        });

        sessionRef.current = sessionPromise;

        sessionPromise.catch((err) => {
          console.error('Failed to connect to Gemini Live:', err);
          setIsLiveConnected(false);
          setError('No se pudo conectar a Gemini Live. Verifica tu API Key.');
        });

      } catch (err) {
        console.error('Failed to start live session:', err);
        setIsLiveConnected(false);
        setError('Error al iniciar sesión LIVE');
      }
    };

    startLiveSession();

    return () => {
      cleanupLiveSession();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isConnected, wsClient, session?.current_stage]);

  // Capturar frames de video periódicamente y analizar (optimizado)
  useEffect(() => {
    if (!isLiveConnected || !wsClient || !videoRef.current || !canvasRef.current) {
      return;
    }

    // Optimización: reducir frecuencia de captura y análisis
    const VIDEO_FRAME_INTERVAL = 1000; // 1 segundo (antes 600ms)
    const VISUAL_ANALYSIS_INTERVAL = 3000; // 3 segundos (antes 2 segundos)

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const now = Date.now();
      
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && wsClient?.isConnected()) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const ANALYSIS_WIDTH = 320;
          const ANALYSIS_HEIGHT = 180;
          
          canvas.width = ANALYSIS_WIDTH;
          canvas.height = ANALYSIS_HEIGHT;
          ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
          
          // Solo enviar frame si ha pasado el intervalo
          if (now - lastVideoFrameTimeRef.current >= VIDEO_FRAME_INTERVAL) {
            const imageData = canvas.toDataURL('image/jpeg', 0.3); // Calidad reducida de 0.5 a 0.3
            wsClient.sendVideoFrame(imageData);
            lastVideoFrameTimeRef.current = now;
          }
          
          // Análisis visual con Gemini Flash (cada 3 segundos para no saturar)
          if (!visualAnalysisIntervalRef.current || now - visualAnalysisIntervalRef.current > VISUAL_ANALYSIS_INTERVAL) {
            visualAnalysisIntervalRef.current = now;
            
            // Análisis visual en background (solo si no hay análisis pendiente)
            const base64 = canvas.toDataURL('image/jpeg', 0.3).split(',')[1];
            analyzeVisualCues(base64).then(cue => {
              if (cue && wsClient?.isConnected()) {
                setVisualCue(cue);
                
                // Enviar análisis visual al backend
                wsClient.send({
                  type: 'visual_analysis',
                  cue: cue
                });
              }
            }).catch(err => {
              // Silenciar errores de rate limit
              if (!err.toString().includes('429')) {
                console.error('Visual analysis error:', err);
              }
            });
          }
        }
      }
    }, VIDEO_FRAME_INTERVAL);

    return () => clearInterval(interval);
  }, [isLiveConnected, wsClient]);

  const handleEndSession = () => {
    // Obtener estadísticas finales
    const finalStats = audioAnalyzerRef.current.getStats();
    
    // Enviar estadísticas finales al backend
    if (wsClient) {
      wsClient.send({
        type: 'session_end',
        stats: finalStats,
        visualCue: visualCue
      });
    }
    
    cleanupLiveSession();
    if (wsClient) {
      wsClient.send({ type: 'disconnect' });
      wsClient.disconnect();
    }
    navigate('/dashboard');
  };

  const handleRetry = () => {
    // Enviar comando al backend para reiniciar la sesión
    if (wsClient && wsClient.isConnected()) {
      // Enviar mensaje de reset al backend
      wsClient.send({ type: 'reset_session' });
      // El handler de 'session_reset' se encargará de limpiar y resetear todo
    } else {
      // Si no hay conexión, recargar la página
      window.location.reload();
    }
  };

  const toggleFeedback = () => {
    setShowFeedback(!showFeedback);
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Session ID Required</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-2rem)] overflow-hidden bg-black rounded-xl">
      {/* MAIN VIDEO CONTAINER - Ajustado al área disponible */}
      <div className="relative w-full h-full">
        
        {/* Canvas para captura (oculto) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 1. INTERVIEWER LAYER (Background) - Avatar Animado - Proporción adecuada */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-black">
          <div className="relative w-full h-full max-w-4xl max-h-[75vh] flex items-center justify-center">
            <InterviewerAvatar
              isAgentSpeaking={isAgentSpeaking}
              isListening={!isAgentSpeaking && transcription.length > 0}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Gradient Overlay para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none"></div>

        {/* 2. STATS HUD - PiP Flotante (Izquierda y Derecha) */}
        {showFeedback && isLiveConnected && (
          <LiveFeedbackHUD
            audioMetrics={audioMetrics}
            visualCue={visualCue}
            isVisible={true}
          />
        )}

        {/* 3. BARRA DE PROGRESO - PiP Flotante (Superior Centro, más pequeña) */}
        {session && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2 shadow-2xl">
              <ProgressBar
                currentStage={session.current_stage as LiveStage}
                progress={session.progress}
                stageProgress={stageProgress}
                timeRemaining={timeRemaining}
                className="min-w-[280px]"
              />
            </div>
          </div>
        )}

        {/* 4. CONTROLES SUPERIORES - Flotante (Top Right) */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
          {/* Timer */}
          {isLiveConnected && (
            <div className="flex items-center gap-2 text-sm text-white font-mono bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20">
              <span className="material-symbols-outlined text-base">timer</span>
              {formatTime(timer)}
            </div>
          )}
          
          {/* Status Badge */}
          <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
            isLiveConnected ? 'bg-green-500/90 text-white' :
            connectionStatus === 'connecting' ? 'bg-yellow-500/90 text-white' :
            'bg-red-500/90 text-white'
          }`}>
            {isLiveConnected ? (reconnectNotificationRef.current ? '● Reconectado' : '● LIVE') :
             connectionStatus === 'connecting' ? (wsClient && wsClient.getReconnectAttempts() > 0 ? `● Reconectando (${wsClient.getReconnectAttempts()})` : '● Conectando...') :
             '● Desconectado'}
          </div>
          
          {/* Toggle Feedback */}
          {isLiveConnected && (
            <button
              onClick={toggleFeedback}
              className="px-3 py-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/30 transition border border-white/20"
              title={showFeedback ? 'Ocultar stats' : 'Mostrar stats'}
            >
              <span className="material-symbols-outlined text-base">
                {showFeedback ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
          
          {/* Reintentar - Mostrar si la entrevista terminó (última etapa completada) */}
          {session?.current_stage === 'closing' && timeRemaining !== undefined && timeRemaining <= 0 && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 border border-blue-600"
              title="Reiniciar la entrevista desde el inicio"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              <span className="hidden md:inline">Reintentar</span>
            </button>
          )}
          
          {/* Finalizar */}
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 border border-red-600"
          >
            <span className="material-symbols-outlined text-base">stop</span>
            <span className="hidden md:inline">Finalizar</span>
          </button>
        </div>

        {/* 5. TÍTULO Y PREGUNTA - Bottom Left (Flotante, más pequeño) */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 max-w-xl pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/60 font-semibold uppercase tracking-wider text-[10px]">
              Entrevista en Tiempo Real
            </span>
          </div>
          <h1 className="text-white text-xl md:text-2xl font-bold leading-tight drop-shadow-2xl text-pretty">
            {session ? (
              session.current_stage === 'introduction' ? 'Cuéntame sobre ti. ¿Quién eres y qué te apasiona?' :
              session.current_stage === 'experience' ? 'Háblame de tu experiencia profesional más relevante.' :
              session.current_stage === 'behavioral' ? 'Describe una situación desafiante y cómo la resolviste.' :
              '¿Tienes alguna pregunta para mí?'
            ) : 'Conectando con el entrevistador...'}
          </h1>
          
          {/* Transcripción en tiempo real */}
          {transcription && (
            <div className="mt-2 text-sm text-white/80 bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20 max-h-24 overflow-y-auto">
              <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Tu respuesta:</span>
              <p className="leading-relaxed text-xs">{transcription}</p>
            </div>
          )}
        </div>

        {/* 6. PiP USER WEBCAM - Bottom Right (Flotante, más pequeño) */}
        <div className="absolute bottom-4 right-4 z-30">
          <div className="relative w-48 md:w-56 aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-2xl border-2 border-white/30 ring-2 ring-black/50 group/pip transition-all hover:scale-105 hover:border-primary/50">
            <video 
              ref={videoRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
              autoPlay 
              muted 
              playsInline
            />

            {/* Audio Bars in PiP */}
            {isLiveConnected && (
              <div className="absolute bottom-3 left-3 flex gap-0.5 items-end h-4">
                <div className="w-1 bg-green-400 rounded-sm audio-bar" style={{animationDuration: '0.6s'}}></div>
                <div className="w-1 bg-green-400 rounded-sm audio-bar" style={{animationDuration: '0.8s'}}></div>
                <div className="w-1 bg-green-400 rounded-sm audio-bar" style={{animationDuration: '0.4s'}}></div>
              </div>
            )}
          </div>
        </div>

        {/* 7. Agent Speaking Indicator (Center) */}
        {isAgentSpeaking && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 p-4 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 z-10">
            <span className="w-2 h-6 bg-white rounded-full animate-[bounce_1s_infinite]"></span>
            <span className="w-2 h-8 bg-white rounded-full animate-[bounce_1.2s_infinite]"></span>
            <span className="w-2 h-6 bg-white rounded-full animate-[bounce_0.8s_infinite]"></span>
          </div>
        )}
      </div>

      {/* Notificación de reconexión exitosa (solo si hay reconexión activa) */}
      {reconnectNotificationRef.current && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <span className="material-symbols-outlined">check_circle</span>
          <span>Conexión restaurada</span>
        </div>
      )}
    </div>
  );
};

export default LiveInterviewPage;
