import { useEffect, useMemo, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface GazeWindow {
  t_start_ms: number;
  t_end_ms: number;
  score: number; // 0..1 (contacto visual aprox)
  features: Record<string, any>;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function useMediaPipeFaceMesh(videoEl: HTMLVideoElement | null, windowMs: number = 1000) {
  const [ready, setReady] = useState(false);
  const [lastWindow, setLastWindow] = useState<GazeWindow | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);

  const wasmBaseUrl = useMemo(
    () => 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!videoEl) return;
      const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);
      const face = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' },
        runningMode: 'VIDEO',
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
        numFaces: 1
      });
      if (cancelled) return;
      landmarkerRef.current = face;
      setReady(true);
    }

    init();
    return () => {
      cancelled = true;
      try {
        landmarkerRef.current?.close();
      } catch {}
      landmarkerRef.current = null;
      setReady(false);
    };
  }, [videoEl, wasmBaseUrl]);

  useEffect(() => {
    if (!videoEl || !ready || !landmarkerRef.current) return;

    let windowStart = Date.now();
    let n = 0;
    let offCount = 0;

    const tick = () => {
      const lm = landmarkerRef.current;
      if (!lm || !videoEl) return;
      const now = Date.now();
      const result = lm.detectForVideo(videoEl, performance.now());
      const face = result.faceLandmarks?.[0];
      if (face && face.length) {
        // Heurística muy simple MVP:
        // si el "nose tip" está lejos del centro horizontal, asumimos mirada fuera.
        // Landmark 1 suele estar cerca de punta de nariz.
        const nose = face[1];
        const off = Math.abs(nose.x - 0.5) > 0.15;
        n += 1;
        if (off) offCount += 1;
      }

      if (now - windowStart >= windowMs) {
        const offRatio = n ? offCount / n : 0;
        const score = clamp01(1 - offRatio);
        setLastWindow({
          t_start_ms: windowStart,
          t_end_ms: now,
          score,
          features: {
            off_camera_ratio: offRatio
          }
        });
        windowStart = now;
        n = 0;
        offCount = 0;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [videoEl, ready, windowMs]);

  return { ready, lastWindow };
}


