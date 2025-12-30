import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateInterviewSpeech, transcribeAudio, analyzeAnswer } from '../services/geminiService';
import AudioRecorder from '../components/AudioRecorder';
import { SimulationStage, SessionData, FeedbackData } from '../types';

interface SimulationStageProps {
  stage: SimulationStage;
  title: string;
  description: string;
  nextPath: string;
  sessionData: SessionData;
  isClosing?: boolean;
  onSave: (data: FeedbackData) => void;
}

// Audio Decoding Helper Functions for Raw PCM
const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const createAudioBufferFromPCM = (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const SimulationStagePage: React.FC<SimulationStageProps> = ({ 
  stage, title, description, nextPath, sessionData, isClosing, onSave 
}) => {
  const navigate = useNavigate();
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    
    return () => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, []);

  // Play Intro Logic
  useEffect(() => {
    let active = true;

    const playIntro = async () => {
      if (!description) return;
      
      setIsPlayingTTS(true);
      
      // Stop previous if any
      if (sourceNodeRef.current) {
          try { sourceNodeRef.current.stop(); } catch(e) {}
      }

      const base64Audio = await generateInterviewSpeech(description);
      
      if (!active) return;

      if (base64Audio && audioContextRef.current) {
        try {
            // Resume context if suspended (browser autoplay policy)
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const pcmData = decodeBase64(base64Audio);
            const buffer = createAudioBufferFromPCM(pcmData, audioContextRef.current);
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
                if (active) setIsPlayingTTS(false);
            };
            
            sourceNodeRef.current = source;
            source.start(0);

        } catch (e) {
            console.error("Audio Playback Error", e);
            if (active) setIsPlayingTTS(false);
        }
      } else {
        if (active) setIsPlayingTTS(false);
      }
    };

    playIntro();
    
    return () => {
        active = false;
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch(e) {}
        }
    };
  }, [description]); 

  const handleRecordingComplete = async (blob: Blob) => {
    setIsRecording(false);
    setIsProcessing(true);

    // 1. Transcribe
    const transcription = await transcribeAudio(blob);
    
    // 2. Analyze
    const feedback = await analyzeAnswer(transcription, description, stage);
    
    // 3. Save & Navigate
    onSave(feedback);
    
    navigate(nextPath);
    setIsProcessing(false);
  };

  const handleSkipToBuilder = () => {
    if(isClosing) navigate(nextPath);
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto gap-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
                <span className="uppercase tracking-wider">Módulo de Entrenamiento</span>
                <span>/</span>
                <span className="text-primary font-bold">{title}</span>
            </div>
            <h1 className="text-2xl font-bold dark:text-white">Entrevista Simulada</h1>
          </div>
          <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-xs font-bold animate-pulse">
            <span className="size-2 rounded-full bg-red-500"></span> LIVE
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[500px]">
          {/* Main Video Area */}
          <div className="lg:col-span-8 bg-black rounded-2xl relative overflow-hidden group shadow-2xl border border-border-dark">
             {/* Background Image (Interviewer) */}
             <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{backgroundImage: 'url("https://picsum.photos/seed/interviewer/1200/800")'}} // Placeholder
             ></div>
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40"></div>
             
             {/* Overlay Content */}
             <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                   <div className="size-10 rounded-full bg-cover border-2 border-white/20" style={{backgroundImage: 'url("https://picsum.photos/seed/avatar/100")'}}></div>
                   <div>
                       <p className="text-white font-bold text-sm">Sarah Jenkins</p>
                       <p className="text-white/60 text-xs">HR Director</p>
                   </div>
                   {isPlayingTTS && (
                       <div className="ml-auto flex gap-1">
                           <div className="w-1 bg-primary h-4 animate-bounce"></div>
                           <div className="w-1 bg-primary h-6 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                           <div className="w-1 bg-primary h-3 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                       </div>
                   )}
                </div>
                
                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                    <p className="text-primary text-xs font-bold uppercase mb-1">Pregunta Actual</p>
                    <h2 className="text-white text-xl md:text-2xl font-semibold leading-relaxed">"{description}"</h2>
                </div>
             </div>
          </div>

          {/* Right Console */}
          <div className="lg:col-span-4 flex flex-col gap-4">
             {/* Instructions / Timer */}
             <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-border-dark">
                 <div className="flex items-center gap-2 mb-2 text-text-secondary">
                    <span className="material-symbols-outlined">timer</span>
                    <span className="text-xs font-bold uppercase">Tiempo Restante</span>
                 </div>
                 <div className="text-5xl font-black dark:text-white tabular-nums">02:00</div>
                 <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary w-full origin-left animate-[pulse_120s_linear_forwards]"></div>
                 </div>
             </div>

             {/* Recorder / Self View */}
             <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative border border-border-dark flex flex-col items-center justify-center">
                 <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{backgroundImage: 'url("https://picsum.photos/seed/user/600/600")'}}></div>
                 
                 <div className="relative z-10 w-full p-6 flex flex-col items-center gap-4">
                    {isProcessing ? (
                        <div className="flex flex-col items-center gap-2">
                             <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                             <p className="text-white font-bold">Analizando respuesta...</p>
                        </div>
                    ) : (
                        <AudioRecorder 
                            isRecording={isRecording} 
                            onRecordingComplete={handleRecordingComplete}
                            onToggleRecording={() => setIsRecording(!isRecording)}
                            disabled={isProcessing}
                        />
                    )}
                 </div>
             </div>
             
             {/* Action for Closing Stage Specific */}
             {isClosing && (
                 <button onClick={handleSkipToBuilder} className="w-full py-3 rounded-xl border border-gray-200 dark:border-border-dark text-slate-500 dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-dark transition-colors text-sm font-medium">
                     Saltar a Constructor de Preguntas
                 </button>
             )}
          </div>
       </div>
    </div>
  );
};

export default SimulationStagePage;