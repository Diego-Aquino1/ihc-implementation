import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioRecorder from '../components/AudioRecorder';
import AvatarInterviewer from '../components/AvatarInterviewer';
import { api } from '../services/api';
import { connectSessionWS, wsSend, WSMessage } from '../services/ws';
import { useMediaPipePose } from '../hooks/useMediaPipePose';
import { useMediaPipeFaceMesh } from '../hooks/useMediaPipeFaceMesh';
import { loadAgentConfig } from '../services/agentConfig';

function scoreColor(score: number) {
  if (score >= 0.75) return 'text-emerald-400';
  if (score >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}

const InterviewLivePage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [coachTips, setCoachTips] = useState<Array<{ category: string; message: string; ts_ms: number }>>([]);

  const [interviewerText, setInterviewerText] = useState<string>('Creando sesión…');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsMode, setTtsMode] = useState<'cosyvoice' | 'browser' | 'none'>('none');

  const [postureScore, setPostureScore] = useState(0);
  const [gazeScore, setGazeScore] = useState(0);

  // Silence detector (simple RMS)
  const [silenceMs, setSilenceMs] = useState(0);
  const silenceSentRef = useRef(false);
  const silenceThresholdMs = 10_000;

  const { lastWindow: poseWindow } = useMediaPipePose(videoRef.current, 1000);
  const { lastWindow: gazeWindow } = useMediaPipeFaceMesh(videoRef.current, 1000);

  const selectedModules = useMemo(() => ['HR', 'Behavioral', 'Leadership'], []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cfg = loadAgentConfig();
      const created = await api.createSession(selectedModules, cfg);
      if (!mounted) return;
      setSessionId(created.session_id);
    })().catch((e) => {
      console.error(e);
      setInterviewerText('Error creando sesión (revisa backend).');
    });
    return () => {
      mounted = false;
    };
  }, [selectedModules]);

  useEffect(() => {
    if (!sessionId) return;
    const socket = connectSessionWS(sessionId, (msg: WSMessage) => {
      if (msg.type === 'coach_tip' && msg.payload) {
        setCoachTips((prev) => [msg.payload, ...prev].slice(0, 5));
      }
    });
    setWs(socket);
    return () => {
      try {
        socket.close();
      } catch {}
      setWs(null);
    };
  }, [sessionId]);

  // Webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Send Pose window
  useEffect(() => {
    if (!ws || !poseWindow || !sessionId) return;
    setPostureScore(poseWindow.score);
    wsSend(ws, {
      type: 'posture_window',
      payload: {
        t_start_ms: poseWindow.t_start_ms,
        t_end_ms: poseWindow.t_end_ms,
        score: poseWindow.score,
        features: poseWindow.features
      }
    });
  }, [ws, poseWindow, sessionId]);

  // Send gaze window
  useEffect(() => {
    if (!ws || !gazeWindow || !sessionId) return;
    setGazeScore(gazeWindow.score);
    wsSend(ws, {
      type: 'gaze_window',
      payload: {
        t_start_ms: gazeWindow.t_start_ms,
        t_end_ms: gazeWindow.t_end_ms,
        score: gazeWindow.score,
        off_camera_ratio: gazeWindow.features?.off_camera_ratio
      }
    });
  }, [ws, gazeWindow, sessionId]);

  // Silence detection via mic RMS (optional permission)
  useEffect(() => {
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let raf: number | null = null;
    let lastTs = performance.now();
    let localSilenceMs = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        src.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!analyser) return;
          analyser.getByteTimeDomainData(data);
          // RMS
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const now = performance.now();
          const dt = now - lastTs;
          lastTs = now;

          const isSilent = rms < 0.02;
          if (isSilent) localSilenceMs += dt;
          else localSilenceMs = 0;

          setSilenceMs(Math.floor(localSilenceMs));

          if (ws && sessionId) {
            const prolonged = localSilenceMs >= silenceThresholdMs;
            if (prolonged && !silenceSentRef.current) {
              silenceSentRef.current = true;
              wsSend(ws, {
                type: 'silence_event',
                payload: { ts_ms: Date.now(), silence_ms: Math.floor(localSilenceMs), is_prolonged: true }
              });
            }
            if (!prolonged) silenceSentRef.current = false;
          }

          raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
      } catch (e) {
        // si el usuario no da permiso, el MVP sigue sin silencio realtime
      }
    })();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (ctx && ctx.state !== 'closed') ctx.close();
    };
  }, [ws, sessionId]);

  const playTtsIfAvailable = async (text: string) => {
    const tts = await api.tts(text);
    if (!tts) {
      // Fallback: TTS del navegador (speechSynthesis) para que el MVP sea audible sin CosyVoice
      try {
        if ('speechSynthesis' in window) {
          setTtsMode('browser');
          setIsSpeaking(true);
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = 'es-ES';
          utter.rate = 1.02;
          utter.onend = () => setIsSpeaking(false);
          utter.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utter);
          return;
        }
      } catch {}

      setTtsMode('none');
      // último fallback: simulación de speaking para UX
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 1200);
      return;
    }
    const audioBase64 = tts.audio_base64;
    const mime = tts.mime || 'audio/wav';
    if (!audioBase64) return;
    const audio = new Audio(`data:${mime};base64,${audioBase64}`);
    try {
      setTtsMode('cosyvoice');
      setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch {
      // autoplay blocked - ignore
      setIsSpeaking(false);
    }
  };

  const fetchNext = async () => {
    if (!sessionId) return;
    setIsProcessing(true);
    try {
      const res = await api.nextTurn(sessionId);
      const text = res?.turn?.interviewer_speech || '...';
      setInterviewerText(text);
      await playTtsIfAvailable(text);
    } catch (e) {
      console.error(e);
      setInterviewerText('Error obteniendo siguiente turno (revisa OPENAI_API_KEY).');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!sessionId) return;
    // primer turno
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleRecordingComplete = async (blob: Blob) => {
    if (!sessionId) return;
    setIsRecording(false);
    setIsProcessing(true);
    try {
      const res = await api.submitAnswerAudio(sessionId, blob);
      setLastTranscript(res.transcript || null);
      await fetchNext();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-6xl mx-auto gap-4">
      {/* Top: stages bar (simple MVP) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Entrevista en vivo</h1>
          <p className="text-sm text-slate-500 dark:text-text-secondary">Sesión: {sessionId ?? '…'}</p>
          <p className="text-xs text-slate-500 dark:text-text-secondary">
            Audio: {ttsMode === 'cosyvoice' ? 'CosyVoice' : ttsMode === 'browser' ? 'TTS del navegador (fallback)' : 'Sin TTS'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-border-dark text-slate-700 dark:text-white/90 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/10"
          >
            {isPaused ? 'Reanudar' : 'Pausar'}
          </button>
          <button
            onClick={() => playTtsIfAvailable(interviewerText)}
            disabled={!sessionId || isProcessing}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-border-dark text-slate-700 dark:text-white/90 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50"
          >
            Repetir pregunta
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-3 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div className="h-full w-1/3 bg-primary"></div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-text-secondary">
        <span>[Introducción]</span>
        <span>[Experiencia]</span>
        <span>[Cierre]</span>
      </div>

      {/* Main: virtual meeting */}
      <div className="relative flex-1 bg-black rounded-2xl overflow-hidden border border-border-dark shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://picsum.photos/seed/interviewer/1400/900")' }}
        ></div>

        <AvatarInterviewer
          name="Entrenador"
          title="Entrevistador"
          promptText={interviewerText}
          isSpeaking={isSpeaking || isProcessing}
          isThinking={isProcessing}
        />

        {/* Self view (PiP) */}
        <div className="absolute bottom-5 right-5 w-44 md:w-56 aspect-video rounded-xl overflow-hidden border border-white/10 shadow-xl bg-gray-900">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="absolute bottom-0 left-0 w-full p-2 bg-black/45 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-white/80">Postura</span>
              <span className={scoreColor(postureScore)}>{Math.round(postureScore * 100)}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold mt-0.5">
              <span className="text-white/80">Mirada</span>
              <span className={scoreColor(gazeScore)}>{Math.round(gazeScore * 100)}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold mt-0.5">
              <span className="text-white/80">Silencio</span>
              <span className={silenceMs >= silenceThresholdMs ? 'text-red-400' : 'text-white/80'}>
                {Math.floor(silenceMs / 1000)}s
              </span>
            </div>
          </div>
        </div>

        {/* Coach tips (overlay) */}
        <div className="absolute top-5 left-5 w-[320px] max-w-[70vw]">
          <div className="bg-black/35 backdrop-blur-md border border-white/10 rounded-xl p-3">
            <p className="text-xs font-bold uppercase text-white/70 mb-2">Feedback en tiempo real</p>
            {coachTips.length === 0 ? (
              <p className="text-sm text-white/70">Aún no hay tips. Habla o ajusta postura/mirada.</p>
            ) : (
              <ul className="space-y-2">
                {coachTips.map((t, idx) => (
                  <li key={idx} className="text-sm text-white/90">
                    <span className="font-bold">{t.category}: </span>
                    {t.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom controls (mic centered) */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="px-4 py-2 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/80 text-sm">
            Tu turno: presiona el micrófono y responde naturalmente.
          </div>

          {isPaused ? (
            <div className="px-4 py-2 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/80 text-sm">
              Sesión en pausa
            </div>
          ) : (
            <AudioRecorder
              variant="icon"
              isRecording={isRecording}
              onRecordingComplete={handleRecordingComplete}
              onToggleRecording={() => setIsRecording(!isRecording)}
              disabled={!sessionId || isProcessing}
            />
          )}
        </div>

        {/* Transcript small hint */}
        {lastTranscript && (
          <div className="absolute bottom-5 left-5 max-w-[60vw]">
            <div className="bg-black/35 backdrop-blur-md border border-white/10 rounded-xl p-3">
              <p className="text-xs font-bold uppercase text-white/70 mb-1">Tu transcripción</p>
              <p className="text-sm text-white/90 italic">“{lastTranscript}”</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewLivePage;


