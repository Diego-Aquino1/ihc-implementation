import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  isRecording: boolean;
  onRecordingComplete: (blob: Blob) => void;
  onToggleRecording: () => void;
  disabled?: boolean;
  variant?: 'full' | 'icon';
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ isRecording, onRecordingComplete, onToggleRecording, disabled, variant = 'full' }) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      
      // MimeType fallback
      let mimeType = 'audio/webm'; 
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
         mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
         mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob);
        // Stop all tracks
        audioStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
    onToggleRecording();
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`group relative flex items-center justify-center ${variant === 'icon' ? 'size-24' : 'size-20'} rounded-full transition-all transform hover:scale-105 shadow-xl ${
            isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-primary hover:bg-blue-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`material-symbols-outlined text-white ${variant === 'icon' ? 'text-4xl' : 'text-3xl'} ${isRecording ? 'animate-pulse' : ''}`}>
           {isRecording ? 'stop' : 'mic'}
        </span>
        {isRecording && (
             <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></span>
        )}
      </button>
      {variant === 'full' && (
        <>
          <p className="mt-4 text-slate-900 dark:text-white font-medium text-lg">
            {isRecording ? 'Grabando respuesta...' : 'Grabar respuesta'}
          </p>
          <p className="text-sm text-slate-500 dark:text-text-secondary">
            {isRecording ? 'Presiona para detener' : 'Presiona para hablar'}
          </p>
        </>
      )}
      
      {/* Visualizer Mock */}
      {variant === 'full' && isRecording && (
          <div className="flex items-center gap-1 h-6 mt-2">
             <div className="w-1 bg-red-500 audio-bar rounded-full" style={{animationDuration: '0.6s'}}></div>
             <div className="w-1 bg-red-500 audio-bar rounded-full" style={{animationDuration: '0.9s'}}></div>
             <div className="w-1 bg-red-500 audio-bar rounded-full" style={{animationDuration: '0.5s'}}></div>
             <div className="w-1 bg-red-500 audio-bar rounded-full" style={{animationDuration: '0.7s'}}></div>
             <div className="w-1 bg-red-500 audio-bar rounded-full" style={{animationDuration: '0.6s'}}></div>
          </div>
      )}
    </div>
  );
};

export default AudioRecorder;