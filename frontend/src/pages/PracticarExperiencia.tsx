import React, { useEffect, useMemo, useState, useRef } from "react";
import { Alert, Badge, Button, Card, Label, Radio, Select, Textarea } from "../components/ui";

type LengthMode = "short" | "detailed";

interface StarState {
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface TypingMetrics {
  keystrokes_per_second: number;
  backspaces_count: number;
  pauses_between_fields: number[];
  incomplete_sentences_count: number;
}

interface EvaluationResponse {
  structure_score: "ok" | "incomplete";
  length_feedback: "too_short" | "adequate" | "too_long";
  technical_level: "ok" | "too_technical";
  pause_warning: boolean;
  filler_words_count: number;
  incomplete_language: boolean;
  thinking_delay: "ok" | "slow";
  word_mixing: boolean;
  suggestions: string[];
}

// Detectar automáticamente la URL del backend basándose en la URL actual
const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return `http://${window.location.hostname}:8005`;
  }
  return "http://localhost:8005";
};

const API_BASE = getApiBase();

const PROJECT_EXAMPLES = [
  {
    id: "custom",
    label: "Escribe tu propio proyecto",
    description: "Describe un proyecto o experiencia que hayas tenido",
  },
  {
    id: "web-app",
    label: "Aplicación web o móvil",
    description: "Desarrollo de una app que resolvió un problema específico",
  },
  {
    id: "team-lead",
    label: "Liderazgo de equipo",
    description: "Proyecto donde coordinaste o lideraste un equipo",
  },
  {
    id: "process-improvement",
    label: "Mejora de proceso",
    description: "Optimización de un proceso interno o de negocio",
  },
  {
    id: "technical-challenge",
    label: "Desafío técnico complejo",
    description: "Problema técnico difícil que resolviste",
  },
  {
    id: "client-project",
    label: "Proyecto con cliente",
    description: "Trabajo directo con cliente o stakeholder",
  },
];

const FILLER_WORDS = ["eh", "este", "mmm", "o sea", "como", "entonces", "bueno", "pues", "digamos"];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function detectFillerWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  return FILLER_WORDS.filter((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lowerText);
  });
}

function detectIncompleteSentences(text: string): number {
  const sentences = text.split(/[.!?]\s+/).filter(Boolean);
  let incomplete = 0;
  for (const sent of sentences) {
    const trimmed = sent.trim();
    if (trimmed.length > 0) {
      if (trimmed.length < 15 && !trimmed.match(/[.!?]$/)) {
        incomplete++;
      }
      if (trimmed.match(/[,]\s*$/) && trimmed.length < 30) {
        incomplete++;
      }
    }
  }
  return incomplete;
}

export const PracticarExperiencia: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>("custom");
  const [star, setStar] = useState<StarState>({
    situation: "",
    task: "",
    action: "",
    result: "",
  });
  const [lengthMode, setLengthMode] = useState<LengthMode>("short");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [fieldStartTimes, setFieldStartTimes] = useState<Record<keyof StarState, number | null>>({
    situation: null,
    task: null,
    action: null,
    result: null,
  });
  const [lastFieldEdited, setLastFieldEdited] = useState<keyof StarState | null>(null);
  const [keystrokes, setKeystrokes] = useState(0);
  const [backspaces, setBackspaces] = useState(0);
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const [pauseWarning, setPauseWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [touched, setTouched] = useState<Record<keyof StarState, boolean>>({
    situation: false,
    task: false,
    action: false,
    result: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const textareaRefs = {
    situation: useRef<HTMLTextAreaElement>(null),
    task: useRef<HTMLTextAreaElement>(null),
    action: useRef<HTMLTextAreaElement>(null),
    result: useRef<HTMLTextAreaElement>(null),
  };

  const totalWords = useMemo(
    () =>
      countWords(star.situation) +
      countWords(star.task) +
      countWords(star.action) +
      countWords(star.result),
    [star]
  );

  const fillerWordsDetected = useMemo(() => {
    const allText = Object.values(star).join(" ");
    return detectFillerWords(allText);
  }, [star]);

  const incompleteSentencesCount = useMemo(() => {
    const allText = Object.values(star).join(" ");
    return detectIncompleteSentences(allText);
  }, [star]);

  const technicalWarning = useMemo(() => {
    const full = Object.values(star).join(" ").toLowerCase();
    const technicalKeywords = [
      "microservicio", "microservicios", "kubernetes", "docker",
      "latencia", "api", "rest", "graphql", "cdn", "cluster",
      "throughput", "terraform", "ansible", "ci/cd", "jenkins",
    ];
    const contextKeywords = [
      "cliente", "equipo", "usuario", "negocio", "empresa",
      "reclutador", "manager", "lider", "persona", "gente",
      "ayudamos", "mejoramos", "impacto", "resultado", "aprendí",
    ];
    const techHits = technicalKeywords.filter((k) => full.includes(k)).length;
    const contextHits = contextKeywords.filter((k) => full.includes(k)).length;
    return techHits >= 4 && contextHits <= 1;
  }, [star]);

  const lengthHint = useMemo(() => {
    if (lengthMode === "short") {
      if (totalWords < 60) return "Muy corto: prueba agregar 1–2 frases más por sección.";
      if (totalWords > 180)
        return "Bastante largo para una respuesta breve: quizá puedes resumir un poco.";
      return "Longitud adecuada para una respuesta breve de 1–2 minutos.";
    }
    if (totalWords < 130)
      return "Algo corto para una respuesta detallada: agrega más contexto o aprendizajes.";
    if (totalWords > 320)
      return "Muy largo: intenta quedarte con los momentos clave del proyecto.";
    return "Longitud adecuada para una respuesta detallada de 3–4 minutos.";
  }, [lengthMode, totalWords]);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed > 15 && !lastFieldEdited) {
        setPauseWarning(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, lastFieldEdited]);

  const calculateTypingMetrics = (): TypingMetrics => {
    const now = Date.now();
    const typingDuration = typingStartTime ? (now - typingStartTime) / 1000 : 1;
    const keystrokesPerSecond = typingDuration > 0 ? keystrokes / typingDuration : 0;

    const pauses: number[] = [];
    const fields: (keyof StarState)[] = ["situation", "task", "action", "result"];
    for (let i = 0; i < fields.length - 1; i++) {
      const currentEnd = fieldStartTimes[fields[i]];
      const nextStart = fieldStartTimes[fields[i + 1]];
      if (currentEnd && nextStart) {
        pauses.push(Math.round((nextStart - currentEnd) / 1000));
      }
    }

    return {
      keystrokes_per_second: Math.round(keystrokesPerSecond * 100) / 100,
      backspaces_count: backspaces,
      pauses_between_fields: pauses.length > 0 ? pauses.map(p => Math.round(p)) : [0],
      incomplete_sentences_count: incompleteSentencesCount,
    };
  };

  const handleChange = (field: keyof StarState, value: string) => {
    setStar((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setLastFieldEdited(field);

    if (!typingStartTime) {
      setTypingStartTime(Date.now());
    }

    if (!fieldStartTimes[field]) {
      setFieldStartTimes((prev) => ({ ...prev, [field]: Date.now() }));
    } else {
      if (lastFieldEdited && lastFieldEdited !== field) {
        setFieldStartTimes((prev) => ({ ...prev, [lastFieldEdited]: Date.now() }));
      }
    }

    setKeystrokes((prev) => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace") {
      setBackspaces((prev) => prev + 1);
    }
  };

  const handleStart = () => {
    setStartedAt(Date.now());
    setLastFieldEdited(null);
    setPauseWarning(false);
    setEvaluation(null);
    setKeystrokes(0);
    setBackspaces(0);
    setTypingStartTime(null);
    setFieldStartTimes({
      situation: null,
      task: null,
      action: null,
      result: null,
    });
  };

  const canSubmit =
    star.situation.trim().length > 0 &&
    star.task.trim().length > 0 &&
    star.action.trim().length > 0 &&
    star.result.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    const now = Date.now();
    const baseline = startedAt ?? now;
    const responseTimeSeconds = Math.max(1, Math.round((now - baseline) / 1000));

    const typingMetrics = calculateTypingMetrics();

    try {
      const res = await fetch(`${API_BASE}/mock/evaluate-t2-1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structure: star,
          length_mode: lengthMode,
          response_time_seconds: responseTimeSeconds,
          typing_metrics: typingMetrics,
          filler_words_detected: fillerWordsDetected,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error del backend:", res.status, errorText);
        throw new Error(`Backend error: ${res.status}`);
      }

      const data: EvaluationResponse = await res.json();
      
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        data.suggestions = [
          "No se pudo procesar el feedback correctamente.",
          "Intenta enviar de nuevo o revisa tu respuesta.",
        ];
      }
      
      setEvaluation(data);
    } catch (error) {
      console.error("Error al enviar:", error);
      setEvaluation({
        structure_score: "incomplete",
        length_feedback: "too_short",
        technical_level: technicalWarning ? "too_technical" : "ok",
        pause_warning: pauseWarning,
        filler_words_count: fillerWordsDetected.length,
        incomplete_language: incompleteSentencesCount >= 2,
        thinking_delay: "ok",
        word_mixing: false,
        suggestions: [
          "No se pudo contactar al evaluador mock, pero puedes revisar si cada parte STAR cuenta una mini-historia.",
          "Imagina que se lo explicas a alguien que no es técnico y practica en voz alta.",
        ],
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStar({ situation: "", task: "", action: "", result: "" });
    setTouched({
      situation: false,
      task: false,
      action: false,
      result: false,
    });
    setSubmitAttempted(false);
    setEvaluation(null);
    setStartedAt(null);
    setLastFieldEdited(null);
    setPauseWarning(false);
    setKeystrokes(0);
    setBackspaces(0);
    setTypingStartTime(null);
    setFieldStartTimes({
      situation: null,
      task: null,
      action: null,
      result: null,
    });
  };

  const renderField = (
    key: keyof StarState,
    title: string,
    helper: string,
    placeholder: string
  ) => {
    const value = star[key];
    const words = countWords(value);
    const showError = submitAttempted && value.trim().length === 0;
    const fieldFillerWords = detectFillerWords(value);
    
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={key} className="text-base font-semibold">
            {title}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              {words} {words === 1 ? "palabra" : "palabras"}
            </span>
            {words < 10 && (
              <Badge variant="warning" className="text-xs">Muy breve</Badge>
            )}
            {fieldFillerWords.length > 0 && (
              <Badge variant="info" className="text-xs">
                {fieldFillerWords.length} muletilla{fieldFillerWords.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-neutral-600">{helper}</p>
        <Textarea
          ref={textareaRefs[key]}
          id={key}
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          error={showError}
          className="min-h-[100px] resize-y"
        />
        {showError && (
          <span className="text-sm text-rose-600 font-medium">
            Completa esta parte antes de continuar.
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 bg-indigo-600 rounded-full"></div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Describe un proyecto o experiencia
          </h1>
        </div>
        <p className="max-w-3xl text-base text-neutral-600 leading-relaxed">
          Entrena cómo contar un proyecto de forma clara y estructurada, usando el método STAR.
          Imagina que estás frente a una persona reclutadora real.
        </p>
      </div>

      {/* Selector de proyecto */}
      <Card variant="outline" className="border-indigo-200 bg-indigo-50/50">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold text-neutral-900">
              Selecciona un ejemplo relevante
            </Label>
            <Badge variant="info">Paso 1</Badge>
          </div>
          <p className="text-sm text-neutral-600">
            Elige el tipo de proyecto o experiencia que quieres practicar. Esto te ayudará a enfocarte en un ejemplo concreto.
          </p>
          <Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="max-w-md"
          >
            {PROJECT_EXAMPLES.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.label} — {proj.description}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Pregunta del entrevistador */}
      <Card className="border-l-4 border-l-indigo-600">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-lg">👤</span>
          </div>
          <div className="flex-1">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">
              Pregunta de la persona entrevistadora
            </h2>
            <p className="text-base text-neutral-800 leading-relaxed italic">
              "Cuéntame sobre un proyecto o experiencia en la que hayas trabajado recientemente y de la que te sientas orgulloso/a."
            </p>
            <p className="mt-3 text-sm text-neutral-600">
              Piensa en algo que conozcas bien. No tiene que ser perfecto, solo que puedas explicarlo con claridad.
            </p>
          </div>
        </div>
      </Card>

      {/* Modo de longitud y métricas */}
      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Label className="text-base font-semibold">Ajustar longitud</Label>
            <Badge variant="info">Paso 2</Badge>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            Decide si quieres practicar una respuesta breve o detallada. Esto te ayudará a saber cuánto extenderse.
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-transparent hover:border-neutral-200 cursor-pointer transition-colors">
              <Radio
                name="lengthMode"
                checked={lengthMode === "short"}
                onChange={() => setLengthMode("short")}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-semibold text-neutral-900 block">
                  Respuesta breve (1–2 minutos)
                </span>
                <span className="text-sm text-neutral-600">
                  Ideal para una primera pasada rápida. Enfócate en lo esencial.
                </span>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-transparent hover:border-neutral-200 cursor-pointer transition-colors">
              <Radio
                name="lengthMode"
                checked={lengthMode === "detailed"}
                onChange={() => setLengthMode("detailed")}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-semibold text-neutral-900 block">
                  Respuesta detallada (3–4 minutos)
                </span>
                <span className="text-sm text-neutral-600">
                  Para profundizar: más contexto, decisiones y aprendizajes.
                </span>
              </div>
            </label>
          </div>
        </Card>

        <Card variant="subtle">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">
            Métricas en tiempo real
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Palabras totales</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900">{totalWords}</span>
                <Badge variant={lengthMode === "short" ? "default" : "info"}>
                  {lengthMode === "short" ? "Objetivo: 80–150" : "Objetivo: 150–280"}
                </Badge>
              </div>
            </div>
            <div className="text-xs text-neutral-600 bg-white p-2 rounded border border-neutral-200">
              {lengthHint}
            </div>
            {technicalWarning && (
              <Alert variant="warning" className="py-2">
                <p className="text-xs">
                  ⚠️ Parece muy técnico. Imagina que se lo explicas a alguien fuera de tu área y agrega más contexto.
                </p>
              </Alert>
            )}
            {fillerWordsDetected.length > 0 && (
              <Alert variant="info" className="py-2">
                <p className="text-xs">
                  💬 Detectadas {fillerWordsDetected.length} muletilla{fillerWordsDetected.length > 1 ? "s" : ""}: {fillerWordsDetected.join(", ")}
                </p>
              </Alert>
            )}
          </div>
        </Card>
      </div>

      {/* Estructura STAR */}
      <Card className="border-2 border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Label className="text-lg font-semibold">Estructurar con STAR</Label>
            <Badge variant="info">Paso 3</Badge>
          </div>
          <Badge variant="default">Situación · Tarea · Acción · Resultado</Badge>
        </div>
        <p className="text-sm text-neutral-600 mb-6">
          Usa cada bloque para escribir ideas clave. No hace falta que sea texto perfecto: piensa en apuntes que luego dirías en voz alta.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {renderField(
            "situation",
            "S · Situación",
            "¿En qué contexto ocurrió? ¿Dónde trabajabas? ¿Qué problema existía?",
            "Ej: Estaba en el equipo de soporte y comenzamos a recibir muchas quejas por tiempos de respuesta muy altos..."
          )}
          {renderField(
            "task",
            "T · Tarea",
            "¿Qué se esperaba de ti? ¿Qué objetivo asumiste?",
            "Ej: Me pidieron analizar por qué se demoraban tanto las respuestas y proponer una forma de reducir los tiempos..."
          )}
          {renderField(
            "action",
            "A · Acción",
            "¿Qué hiciste concretamente? Menciona 2–3 pasos claves.",
            "Ej: Revisé los datos de tickets, organicé sesiones con el equipo y propuse un cambio en la forma de priorizar los casos..."
          )}
          {renderField(
            "result",
            "R · Resultado",
            "¿Qué pasó al final? ¿Qué cambió? ¿Qué aprendiste?",
            "Ej: Logramos reducir el tiempo de respuesta en un 30%, mejoró la satisfacción del cliente y aprendí a presentar datos de forma clara..."
          )}
        </div>
      </Card>

      {/* Controles y advertencias */}
      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <Card>
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">
            Antes de enviar
          </h3>
          <ul className="space-y-2 text-sm text-neutral-700 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">✓</span>
              <span>Asegúrate de que cada letra de STAR tenga al menos 2 frases.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">✓</span>
              <span>Evita solo listar tecnologías; explica el problema y a quién ayudaste.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">✓</span>
              <span>
                Si te quedas en blanco:{" "}
                <span className="font-semibold">
                  respira 5 segundos y piensa en 2 ideas + 1 ejemplo.
                </span>
              </span>
            </li>
          </ul>
          {pauseWarning && (
            <Alert variant="warning" className="mb-4">
              <p className="text-sm">
                ⏳ Detectamos una pausa larga al empezar. Es normal ponerse nervioso/a. Tómate un momento para ordenar tus ideas y luego vuelve a escribir.
              </p>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleStart}
              className="w-full"
            >
              🎯 Empezar a practicar (reinicia temporizador)
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Evaluando respuesta..." : "📤 Enviar para recibir feedback"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="w-full"
            >
              Limpiar y empezar de nuevo
            </Button>
            {!canSubmit && submitAttempted && (
              <Alert variant="danger" className="py-2">
                <p className="text-sm font-medium">
                  Completa las cuatro secciones STAR antes de continuar.
                </p>
              </Alert>
            )}
          </div>
        </Card>

        <Card variant="subtle">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">
            Consejos para evitar bloqueos
          </h3>
          <div className="space-y-3 text-sm text-neutral-700">
            <div className="p-3 bg-white rounded-lg border border-neutral-200">
              <p className="font-medium mb-1">Si no sabes cómo responder:</p>
              <p className="text-xs text-neutral-600">
                Empieza con el contexto más simple: "Estaba trabajando en [equipo/proyecto] y..."
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-neutral-200">
              <p className="font-medium mb-1">Si mezclas palabras:</p>
              <p className="text-xs text-neutral-600">
                Escribe más despacio. Piensa antes de escribir. Mejor claro que rápido.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-neutral-200">
              <p className="font-medium mb-1">Si te demoras en hilar ideas:</p>
              <p className="text-xs text-neutral-600">
                Usa STAR como guía: primero el contexto, luego el objetivo, después tus acciones, y finalmente el resultado.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Feedback */}
      {evaluation && (
        <Card className="border-2 border-indigo-300 bg-indigo-50/30">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-neutral-900">
              Feedback inmediato
            </h2>
            <Badge variant="success">Evaluación completa</Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="p-4 bg-white rounded-lg border border-neutral-200">
              <div className="text-xs font-medium text-neutral-600 mb-1">
                Estructura
              </div>
              <div className="flex items-center gap-2">
                {evaluation.structure_score === "ok" ? (
                  <>
                    <Badge variant="success">Completa</Badge>
                    <span className="text-xs text-neutral-700">STAR bien aplicado</span>
                  </>
                ) : (
                  <>
                    <Badge variant="warning">Incompleta</Badge>
                    <span className="text-xs text-neutral-700">Falta desarrollo</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-neutral-200">
              <div className="text-xs font-medium text-neutral-600 mb-1">
                Longitud
              </div>
              <div className="flex items-center gap-2">
                {evaluation.length_feedback === "too_short" && (
                  <>
                    <Badge variant="warning">Muy corta</Badge>
                    <span className="text-xs text-neutral-700">Desarrolla más</span>
                  </>
                )}
                {evaluation.length_feedback === "adequate" && (
                  <>
                    <Badge variant="success">Adecuada</Badge>
                    <span className="text-xs text-neutral-700">Buen balance</span>
                  </>
                )}
                {evaluation.length_feedback === "too_long" && (
                  <>
                    <Badge variant="warning">Larga</Badge>
                    <span className="text-xs text-neutral-700">Resume un poco</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-neutral-200">
              <div className="text-xs font-medium text-neutral-600 mb-1">
                Claridad
              </div>
              <div className="flex items-center gap-2">
                {evaluation.technical_level === "ok" ? (
                  <>
                    <Badge variant="success">Clara</Badge>
                    <span className="text-xs text-neutral-700">Bien explicado</span>
                  </>
                ) : (
                  <>
                    <Badge variant="warning">Muy técnica</Badge>
                    <span className="text-xs text-neutral-700">Agrega contexto</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-neutral-200">
              <div className="text-xs font-medium text-neutral-600 mb-1">
                Fluidez
              </div>
              <div className="flex flex-col gap-1">
                {evaluation.pause_warning && (
                  <Badge variant="warning" className="text-xs">Pausa larga</Badge>
                )}
                {evaluation.filler_words_count > 0 && (
                  <Badge variant="info" className="text-xs">
                    {evaluation.filler_words_count} muletilla{evaluation.filler_words_count > 1 ? "s" : ""}
                  </Badge>
                )}
                {evaluation.incomplete_language && (
                  <Badge variant="warning" className="text-xs">Lenguaje incompleto</Badge>
                )}
                {evaluation.thinking_delay === "slow" && (
                  <Badge variant="info" className="text-xs">Demora en hilar</Badge>
                )}
                {evaluation.word_mixing && (
                  <Badge variant="warning" className="text-xs">Mezcla palabras</Badge>
                )}
                {!evaluation.pause_warning && evaluation.filler_words_count === 0 && !evaluation.incomplete_language && (
                  <Badge variant="success" className="text-xs">Fluida</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">
              Sugerencias concretas para mejorar
            </h3>
            <ul className="space-y-2">
              {(evaluation.suggestions || []).map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="text-indigo-600 mt-0.5">→</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};

