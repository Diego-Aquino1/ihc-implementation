import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FeedbackData, SimulationStage, VisualCue } from "../types";

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]); 
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// --- VEO VIDEO GENERATION ---
export const generateInterviewerAvatar = async (vibe: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let prompt = "A professional HR interviewer, sitting in a modern office, looking directly at the camera, listening attentively, slight nod, cinema quality, 4k";
    
    if (vibe === 'challenger') prompt = "A stern, serious executive interviewer, arms crossed, sharp business suit, modern glass office, looking skeptical but professional, 4k";
    if (vibe === 'empath') prompt = "A friendly, warm HR manager, smiling gently, comfortable office setting, soft lighting, inviting posture, 4k";
    if (vibe === 'analyst') prompt = "A focused, analytical interviewer with glasses, taking notes, minimalist tech office, neutral expression, 4k";

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9' 
      }
    });

    // Polling for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
        // Append API Key for access
        return `${videoUri}&key=${process.env.API_KEY}`;
    }
    return null;
  } catch (error: any) {
    // Robust error checking for object-based errors (native Error objects don't stringify well)
    const status = error.status || error.code || (error.error && error.error.code);
    const message = error.message || error.toString() || '';
    const errString = JSON.stringify(error, Object.getOwnPropertyNames(error)); // Better serialization

    const isNotFound = 
        status === 404 || 
        message.includes("NOT_FOUND") || 
        message.includes("Requested entity was not found") ||
        errString.includes("NOT_FOUND");
        
    const isForbidden = 
        status === 403 || 
        message.includes("PERMISSION_DENIED") || 
        message.includes("billing") ||
        errString.includes("PERMISSION_DENIED");

    if (isNotFound || isForbidden) {
        console.warn("Veo Permission Error (will trigger unlock):", error);
        throw new Error("VEO_KEY_ERROR");
    }
    
    console.error("Veo Generation Unexpected Error:", error);
    return null;
  }
};

// --- GEMINI 3 FLASH VIDEO UNDERSTANDING (Real-time Snapshot) ---
export const analyzeVisualCues = async (imageBase64: string): Promise<VisualCue | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: [
              {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                    { text: "Analiza el lenguaje corporal en este frame de entrevista. Clasifica el comportamiento PRINCIPAL en una de estas categorías exactas: 'Contacto Visual', 'Mirada Desviada', 'Mano en Cara', 'Postura Encorvada', 'Sonriendo'. Sé estricto." }
                ]
              }
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        status: { type: Type.STRING, enum: ['Contacto Visual', 'Mirada Desviada', 'Mano en Cara', 'Postura Encorvada', 'Sonriendo'] },
                        feedback: { type: Type.STRING, description: "Breve consejo de 3 palabras" }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        return {
            timestamp: new Date().toISOString(),
            status: result.status,
            feedback: result.feedback
        };
    } catch (e: any) {
        // Gracefully handle rate limits
        if (e.status === 429 || e.toString().includes('429')) {
             return null;
        }
        console.error("Visual Analysis Error:", e);
        return null;
    }
};

// --- EXISTING AUDIO FUNCTIONS ---

// 1. Generate Speech (TTS) - Backup for non-Live mode
export const generateInterviewSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
export const analyzeAnswer = async (transcription: string, question: string, stage: string, visualCues: VisualCue[] = []): Promise<FeedbackData> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Incorporate visual cues into the analysis context
    const visualSummary = visualCues.length > 0 
        ? `Observaciones visuales durante la respuesta: ${visualCues.map(v => v.status).join(', ')}.` 
        : "No hay datos de video disponibles.";

    // Base instructions
    let systemInstruction = `
      Actúas como un experto coach de entrevistas estricto pero constructivo.
      Analiza la respuesta del candidato basándote en la Pregunta y la Etapa.
      Considera también el lenguaje corporal reportado: ${visualSummary}
      
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
        `;
    }

    // Specific logic for Pressure Simulator
    if (stage === SimulationStage.PRESSURE) {
        systemInstruction += `
        Esta es la etapa de SIMULACIÓN DE PRESIÓN. 
        Agrega "pressureAnalysis" al JSON:
        "pressureAnalysis": {
            "adaptabilityScore": number (0-100),
            "stressControlScore": number (0-100),
            "empathyScore": number (0-100),
            "defensiveScore": number (0-100),
            "confidenceCurve": number[], // Array de 20 enteros (-10 a 10).
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
    const data = JSON.parse(jsonText) as FeedbackData;
    
    // Attach the visual cues passed in
    data.visualAnalysis = visualCues;
    
    return data;

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
      emotionalTone: 'Neutral',
      visualAnalysis: visualCues
    };
  }
};

export const generateStrategicQuestions = async (jdText: string): Promise<string[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Basado en la siguiente Descripción del Puesto, sugiere 3 preguntas estratégicas de alto nivel.
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
        return ["¿Cuáles son los mayores desafíos del equipo?", "¿Cómo contribuye este rol a los objetivos?", "¿Qué define el éxito?"];
    }
};

// --- LIVE API UTILS ---
export const getLiveAPIConfig = (systemInstruction: string) => {
    return {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {} // Enabled for user transcript analysis
        }
    };
};