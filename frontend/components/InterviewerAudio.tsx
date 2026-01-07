/**
 * Componente para reproducir audio del entrevistador
 * Recibe audio del backend y lo reproduce en tiempo real
 */
import { useEffect, useRef, useState } from 'react';

interface InterviewerAudioProps {
  audioData?: string; // Base64 audio data
  mimeType?: string; // MIME type del audio
  isPlaying?: boolean;
  onPlaybackEnd?: () => void;
}

const InterviewerAudio: React.FC<InterviewerAudioProps> = ({
  audioData,
  mimeType = 'audio/pcm',
  isPlaying = false,
  onPlaybackEnd,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);

  useEffect(() => {
    // Inicializar AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!audioData || !audioContextRef.current) {
      return;
    }

    playAudio(audioData, mimeType);
  }, [audioData, mimeType]);

  const playAudio = async (base64Data: string, mime: string) => {
    if (!audioContextRef.current) {
      return;
    }

    try {
      // Decodificar base64
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convertir a AudioBuffer según el formato
      let audioBuffer: AudioBuffer;

      if (mime.includes('pcm') || mime.includes('raw')) {
        // PCM raw data - convertir Int16 a Float32
        const int16Array = new Int16Array(bytes.buffer);
        const frameCount = int16Array.length;
        audioBuffer = audioContextRef.current.createBuffer(1, frameCount, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = int16Array[i] / 32768.0;
        }
      } else {
        // Otros formatos (WebM, MP3, etc.) - usar decodeAudioData
        audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      }

      // Crear source node
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      // Programar reproducción (evitar solapamientos)
      const startTime = Math.max(
        nextStartTimeRef.current,
        audioContextRef.current.currentTime
      );
      
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      setIsCurrentlyPlaying(true);

      source.onended = () => {
        setIsCurrentlyPlaying(false);
        if (onPlaybackEnd) {
          onPlaybackEnd();
        }
      };

      sourceRef.current = source;
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsCurrentlyPlaying(false);
    }
  };

  return (
    <div className="hidden">
      {/* Componente sin UI visual, solo maneja audio */}
      {isCurrentlyPlaying && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />
      )}
    </div>
  );
};

export default InterviewerAudio;

