import { GoogleGenAI, Modality } from "@google/genai";
import { FeedbackData, SimulationStage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/webm;base64,")
      resolve(base64String.split(',')[1]); 
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// 1. Generate Speech (TTS)
export const generateInterviewSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;

  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

// 2. Transcribe Audio
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const base64Data = await blobToBase64(audioBlob);
    
    // Explicitly using audio model capability
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Data
            }
          },
          {
            text: "Genera una transcripción literal de este audio. Si el audio es en español, transcríbelo en español. No resumas. Solo emite el texto hablado."
          }
        ]
      }
    });

    return response.text?.trim() || "No se detectó audio claro.";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "Error al transcribir el audio. Por favor intenta de nuevo.";
  }
};

// 3. Analyze Interview Answer
export const analyzeAnswer = async (transcription: string, question: string, stage: string): Promise<FeedbackData> => {
  try {
    // Base instructions
    let systemInstruction = `
      Actúas como un experto coach de entrevistas estricto pero constructivo.
      Analiza la respuesta del candidato basándote en la Pregunta y la Etapa.
      
      IMPORTANTE: TODA la salida de texto (feedback, sugerencias, fortalezas) DEBE SER EN ESPAÑOL.
      Mantén las claves del JSON en inglés, pero los valores de texto en ESPAÑOL.

      Return a pure JSON object with the following schema:
      {
        "score": number (0-100),
        "strengths": string[] (en español),
        "weaknesses": string[] (en español),
        "suggestions": string[] (en español),
        "pacing": "Fast" | "Slow" | "Optimal",
        "fillerWordCount": number,
        "emotionalTone": string (en español, ej: "Seguro", "Nervioso", "Profesional")
      }
    `;

    // Specific logic for STAR Method
    if (stage === SimulationStage.STAR_METHOD) {
        systemInstruction += `
        
        Dado que es la etapa STAR Method, DEBES analizar si la respuesta sigue la estructura: Situación, Tarea, Acción, Resultado.
        Agrega el objeto "starAnalysis" al JSON:
        "starAnalysis": {
            "situation": { "present": boolean, "text": "extracto del texto o vacío", "feedback": "comentario breve en español" },
            "task": { "present": boolean, "text": "extracto del texto o vacío", "feedback": "comentario breve en español" },
            "action": { "present": boolean, "text": "extracto del texto o vacío", "feedback": "comentario breve en español" },
            "result": { "present": boolean, "text": "extracto del texto o vacío", "feedback": "comentario breve en español" }
        }
        
        CRITICO: 
        - Situation: Contexto.
        - Task: El desafío.
        - Action: Lo que ÉL hizo específicamente (busca "yo hice", "creé").
        - Result: Resultados o métricas.
        `;
    }

    // Specific logic for Pressure Simulator
    if (stage === SimulationStage.PRESSURE) {
        systemInstruction += `
        
        Esta es la etapa de SIMULACIÓN DE PRESIÓN. El candidato maneja una situación hostil.
        Analiza regulación emocional, empatía y defensividad.
        
        Agrega "pressureAnalysis" al JSON:
        "pressureAnalysis": {
            "adaptabilityScore": number (0-100),
            "stressControlScore": number (0-100),
            "empathyScore": number (0-100),
            "defensiveScore": number (0-100),
            "confidenceCurve": number[], // Array de 20 enteros (-10 a 10). -10 estrés alto, 10 confianza alta.
            "segments": [
                {
                    "text": "Cita de la respuesta",
                    "timestamp": "00:00", 
                    "sentiment": "empathy" | "defensive" | "stress" | "confidence",
                    "feedback": "Por qué se marcó esto (en español)"
                }
            ]
        }
        `;
    }

    const prompt = `
      Pregunta realizada: "${question}"
      Etapa: "${stage}"
      Transcripción de la respuesta: "${transcription}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as FeedbackData;

  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      score: 0,
      transcription: transcription,
      strengths: [],
      weaknesses: ["Error en el análisis de IA"],
      suggestions: ["Intenta responder nuevamente"],
      pacing: 'Optimal',
      fillerWordCount: 0,
      emotionalTone: 'Neutral'
    };
  }
};

export const generateStrategicQuestions = async (jdText: string): Promise<string[]> => {
    try {
        const prompt = `
            Basado en la siguiente Descripción del Puesto, sugiere 3 preguntas estratégicas de alto nivel que el candidato debería hacer al entrevistador para demostrar seniority.
            Job Description: ${jdText.substring(0, 1000)}...
            
            Retorna un array JSON de strings EN ESPAÑOL.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return ["¿Cuáles son los mayores desafíos del equipo actualmente?", "¿Cómo contribuye este rol a los objetivos anuales?", "¿Qué define el éxito en los primeros 6 meses?"];
    }
}