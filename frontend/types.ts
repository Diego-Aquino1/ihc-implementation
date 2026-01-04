export enum SimulationStage {
  ELEVATOR_PITCH = 'ELEVATOR_PITCH',
  STAR_METHOD = 'STAR_METHOD',
  PRESSURE = 'PRESSURE',
  CLOSING = 'CLOSING'
}

export interface SimulationConfig {
  vibe: 'challenger' | 'empath' | 'analyst';
  jdText: string;
  learningObjective?: string;
  questionFocus?: 'behavioral' | 'technical' | 'situational' | 'mixed';
}

export interface StarBreakdown {
  situation: { present: boolean; text: string; feedback: string };
  task: { present: boolean; text: string; feedback: string };
  action: { present: boolean; text: string; feedback: string };
  result: { present: boolean; text: string; feedback: string };
}

export interface EmotionalSegment {
  text: string;
  timestamp: string;
  sentiment: 'empathy' | 'defensive' | 'neutral' | 'confidence' | 'stress';
  feedback: string;
}

export interface PressureBreakdown {
  adaptabilityScore: number; // 0-100
  stressControlScore: number; // 0-100
  empathyScore: number; // 0-100
  defensiveScore: number; // 0-100
  // Array of numbers -100 (stress) to 100 (confidence) representing the flow of the answer
  confidenceCurve: number[]; 
  segments: EmotionalSegment[];
}

export interface VisualCue {
  timestamp: string;
  status: 'atento' | 'nervioso' | 'distraido' | 'confiado';
  feedback: string;
}

export interface FeedbackData {
  score: number;
  transcription: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  pacing: 'Fast' | 'Slow' | 'Optimal';
  fillerWordCount: number;
  emotionalTone: string;
  starAnalysis?: StarBreakdown;
  pressureAnalysis?: PressureBreakdown;
  visualAnalysis?: VisualCue[]; // New field for real-time video understanding
}

export interface SessionData {
  config: SimulationConfig;
  stageData: Record<SimulationStage, FeedbackData | null>;
  currentStage: SimulationStage;
}