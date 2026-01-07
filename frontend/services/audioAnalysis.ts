/**
 * Servicio de análisis de audio en tiempo real
 * Detecta velocidad, muletillas, pausas, volumen, etc.
 */

export interface AudioMetrics {
  wpm: number; // Words per minute
  avgPauseDuration: number; // Duración promedio de pausas (ms)
  fillerWords: number; // Cantidad de muletillas detectadas
  volumeLevel: number; // Nivel de volumen (0-1)
  clarity: number; // Claridad del habla (0-1)
}

export interface FillerWord {
  word: string;
  timestamp: number;
  count: number;
}

const COMMON_FILLER_WORDS_ES = [
  'eh', 'ehh', 'ehhh',
  'mm', 'mmm', 'mmmm',
  'este', 'esto',
  'o sea',
  'pues',
  'bueno',
  'como que',
  'tipo',
  'digamos',
  'entonces',
  'básicamente',
  'literalmente',
  'realmente',
  'verdad',
  'sabes',
  'entiendes',
  'no sé',
  'creo que',
  'es que'
];

export class AudioAnalyzer {
  private transcriptionBuffer: string[] = [];
  private wordTimestamps: Array<{ word: string; timestamp: number }> = [];
  private fillerWordsDetected: FillerWord[] = [];
  private pauseTimestamps: number[] = [];
  private lastSpeechTimestamp: number = 0;
  private volumeSamples: number[] = [];
  
  constructor() {
    this.reset();
  }

  reset() {
    this.transcriptionBuffer = [];
    this.wordTimestamps = [];
    this.fillerWordsDetected = [];
    this.pauseTimestamps = [];
    this.lastSpeechTimestamp = Date.now();
    this.volumeSamples = [];
  }

  /**
   * Procesa nueva transcripción
   */
  processTranscription(text: string, timestamp: number = Date.now()) {
    if (!text || text.trim().length === 0) return;

    // Detectar pausa si ha pasado tiempo desde la última palabra
    const timeSinceLastSpeech = timestamp - this.lastSpeechTimestamp;
    if (timeSinceLastSpeech > 1000) { // Pausa de más de 1 segundo
      this.pauseTimestamps.push(timeSinceLastSpeech);
    }

    // Agregar al buffer
    this.transcriptionBuffer.push(text);
    this.lastSpeechTimestamp = timestamp;

    // Procesar palabras
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    words.forEach(word => {
      this.wordTimestamps.push({ word, timestamp });

      // Detectar muletillas
      if (this.isFillerWord(word)) {
        const existing = this.fillerWordsDetected.find(f => f.word === word);
        if (existing) {
          existing.count++;
          existing.timestamp = timestamp;
        } else {
          this.fillerWordsDetected.push({ word, timestamp, count: 1 });
        }
      }
    });
  }

  /**
   * Procesa nivel de volumen
   */
  processVolume(level: number) {
    this.volumeSamples.push(level);
    // Mantener solo los últimos 100 samples
    if (this.volumeSamples.length > 100) {
      this.volumeSamples.shift();
    }
  }

  /**
   * Verifica si una palabra es muletilla
   */
  private isFillerWord(word: string): boolean {
    return COMMON_FILLER_WORDS_ES.some(filler => 
      word.includes(filler) || filler.includes(word)
    );
  }

  /**
   * Calcula métricas actuales
   */
  getMetrics(): AudioMetrics {
    const totalWords = this.wordTimestamps.length;
    const totalTime = totalWords > 0 
      ? (this.lastSpeechTimestamp - this.wordTimestamps[0].timestamp) / 1000 / 60 
      : 0;

    const wpm = totalTime > 0 ? totalWords / totalTime : 0;

    const avgPauseDuration = this.pauseTimestamps.length > 0
      ? this.pauseTimestamps.reduce((a, b) => a + b, 0) / this.pauseTimestamps.length
      : 0;

    const fillerWords = this.fillerWordsDetected.reduce((sum, f) => sum + f.count, 0);

    const volumeLevel = this.volumeSamples.length > 0
      ? this.volumeSamples.reduce((a, b) => a + b, 0) / this.volumeSamples.length
      : 0;

    // Claridad basada en WPM y muletillas
    // WPM ideal: 120-150, menos muletillas = mejor claridad
    const wpmScore = Math.max(0, 1 - Math.abs(wpm - 135) / 135);
    const fillerScore = Math.max(0, 1 - (fillerWords / Math.max(totalWords, 1)) * 10);
    const clarity = (wpmScore * 0.6 + fillerScore * 0.4);

    return {
      wpm: Math.round(wpm),
      avgPauseDuration: Math.round(avgPauseDuration),
      fillerWords,
      volumeLevel: Math.round(volumeLevel * 100) / 100,
      clarity: Math.round(clarity * 100) / 100
    };
  }

  /**
   * Obtiene feedback en español
   */
  getFeedback(): string[] {
    const metrics = this.getMetrics();
    const feedback: string[] = [];

    // WPM
    if (metrics.wpm < 100) {
      feedback.push('Habla un poco más rápido para mantener el interés');
    } else if (metrics.wpm > 160) {
      feedback.push('Reduce la velocidad, hablas muy rápido');
    } else if (metrics.wpm >= 120 && metrics.wpm <= 150) {
      feedback.push('Excelente ritmo de habla');
    }

    // Pausas
    if (metrics.avgPauseDuration > 3000) {
      feedback.push('Reduce las pausas largas');
    } else if (metrics.avgPauseDuration > 1500) {
      feedback.push('Buenas pausas, mantén el ritmo');
    }

    // Muletillas
    if (metrics.fillerWords > 10) {
      feedback.push('Evita las muletillas (eh, mm, este...)');
    } else if (metrics.fillerWords > 5) {
      feedback.push('Reduce un poco las muletillas');
    } else if (metrics.fillerWords <= 2) {
      feedback.push('Excelente claridad, sin muletillas');
    }

    // Volumen
    if (metrics.volumeLevel < 0.3) {
      feedback.push('Habla más fuerte, no se te escucha bien');
    } else if (metrics.volumeLevel > 0.8) {
      feedback.push('Baja un poco el volumen');
    }

    // Claridad general
    if (metrics.clarity >= 0.8) {
      feedback.push('Comunicación muy clara');
    } else if (metrics.clarity < 0.5) {
      feedback.push('Mejora tu claridad al hablar');
    }

    return feedback;
  }

  /**
   * Obtiene las muletillas más frecuentes
   */
  getTopFillerWords(limit: number = 5): FillerWord[] {
    return this.fillerWordsDetected
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Obtiene estadísticas completas
   */
  getStats() {
    return {
      metrics: this.getMetrics(),
      feedback: this.getFeedback(),
      topFillers: this.getTopFillerWords(),
      totalWords: this.wordTimestamps.length,
      totalPauses: this.pauseTimestamps.length,
      transcriptionLength: this.transcriptionBuffer.join(' ').length
    };
  }
}

