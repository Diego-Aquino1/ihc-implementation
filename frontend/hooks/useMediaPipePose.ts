import { useEffect, useMemo, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export interface PoseWindow {
  t_start_ms: number;
  t_end_ms: number;
  score: number; // 0..1
  features: Record<string, any>;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function useMediaPipePose(videoEl: HTMLVideoElement | null, windowMs: number = 1000) {
  const [ready, setReady] = useState(false);
  const [lastWindow, setLastWindow] = useState<PoseWindow | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
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
      const pose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      if (cancelled) return;
      landmarkerRef.current = pose;
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
    let sumScore = 0;
    let n = 0;
    let sumShoulderTilt = 0;
    let sumHipTilt = 0;

    const tick = () => {
      const lm = landmarkerRef.current;
      if (!lm || !videoEl) return;
      const now = Date.now();
      const result = lm.detectForVideo(videoEl, performance.now());
      const landmarks = result.landmarks?.[0];
      if (landmarks && landmarks.length >= 25) {
        // indices: shoulders 11,12 ; hips 23,24
        const ls = landmarks[11];
        const rs = landmarks[12];
        const lh = landmarks[23];
        const rh = landmarks[24];

        const shoulderTilt = Math.abs(ls.y - rs.y); // 0..1 aprox
        const hipTilt = Math.abs(lh.y - rh.y);

        // score simple: menos inclinación = mejor
        const score = clamp01(1 - (shoulderTilt * 3 + hipTilt * 3));
        sumScore += score;
        n += 1;
        sumShoulderTilt += shoulderTilt;
        sumHipTilt += hipTilt;
      }

      if (now - windowStart >= windowMs) {
        const avgScore = n ? sumScore / n : 0;
        const payload: PoseWindow = {
          t_start_ms: windowStart,
          t_end_ms: now,
          score: avgScore,
          features: {
            avg_shoulder_tilt: n ? sumShoulderTilt / n : 0,
            avg_hip_tilt: n ? sumHipTilt / n : 0
          }
        };
        setLastWindow(payload);
        windowStart = now;
        sumScore = 0;
        n = 0;
        sumShoulderTilt = 0;
        sumHipTilt = 0;
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


