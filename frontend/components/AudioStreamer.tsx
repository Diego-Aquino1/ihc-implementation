/**
 * Componente para captura y streaming continuo de audio
 * Envía chunks de audio al backend vía WebSocket
 */
import { useEffect, useRef, useState } from 'react';

interface AudioStreamerProps {
  wsClient: any; // LiveWebSocketClient
  isActive: boolean;
  onError?: (error: Error) => void;
}

const AudioStreamer: React.FC<AudioStreamerProps> = ({ wsClient, isActive, onError }) => {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!isActive || !wsClient) {
      stopStreaming();
      return;
    }

    startStreaming();

    return () => {
      stopStreaming();
    };
  }, [isActive, wsClient]);

  const startStreaming = async () => {
    try {
      // Obtener acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Crear AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Crear fuente de audio desde el stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // Crear ScriptProcessor para capturar audio (deprecated pero funciona)
      // Alternativa moderna: usar AudioWorklet (más complejo)
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isActive || !wsClient?.isConnected()) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convertir Float32Array a Int16Array (formato PCM)
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp y convertir a int16
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convertir a base64
        const base64 = btoa(
          String.fromCharCode.apply(null, Array.from(new Uint8Array(int16Array.buffer)))
        );

        // Enviar chunk de audio al backend
        wsClient.sendAudioChunk(base64);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsStreaming(true);
    } catch (error) {
      console.error('Error starting audio stream:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  const stopStreaming = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsStreaming(false);
  };

  return null; // Componente sin UI
};

export default AudioStreamer;

