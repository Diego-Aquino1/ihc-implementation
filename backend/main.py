from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal
import re


class StructurePayload(BaseModel):
    situation: str
    task: str
    action: str
    result: str


class TypingMetrics(BaseModel):
    """Métricas de escritura para detectar comportamientos"""
    keystrokes_per_second: float
    backspaces_count: int
    pauses_between_fields: List[int]  # segundos entre campos
    incomplete_sentences_count: int


class EvaluationRequest(BaseModel):
    structure: StructurePayload
    length_mode: Literal["short", "detailed"]
    response_time_seconds: int
    typing_metrics: TypingMetrics
    filler_words_detected: List[str]  # muletillas detectadas en frontend


class EvaluationResponse(BaseModel):
    structure_score: Literal["ok", "incomplete"]
    length_feedback: Literal["too_short", "adequate", "too_long"]
    technical_level: Literal["ok", "too_technical"]
    pause_warning: bool
    filler_words_count: int
    incomplete_language: bool
    thinking_delay: Literal["ok", "slow"]  # demora en hilar ideas
    word_mixing: bool  # mezcla palabras / velocidad
    suggestions: List[str]


app = FastAPI(title="Mock Interview Trainer - T2.1")

origins = [
    "http://localhost",
    "http://localhost:3002",
    "http://localhost:5173",  # Por si acaso alguien usa el puerto por defecto
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def count_words(text: str) -> int:
    return len([w for w in text.strip().split() if w])


def detect_incomplete_sentences(text: str) -> int:
    """Detecta frases incompletas (sin punto final, muy cortas, etc)"""
    sentences = re.split(r'[.!?]\s+', text.strip())
    incomplete = 0
    for sent in sentences:
        sent = sent.strip()
        if len(sent) > 0:
            # Frase muy corta sin punto final
            if len(sent) < 15 and not sent.endswith(('.', '!', '?')):
                incomplete += 1
            # Frase que termina con coma o "y" sugiere incompleta
            if sent.endswith((',', ' y', ' e', ' o')) and len(sent) < 30:
                incomplete += 1
    return incomplete


@app.post("/mock/evaluate-t2-1", response_model=EvaluationResponse)
def evaluate_t2_1(payload: EvaluationRequest) -> EvaluationResponse:
    """
    Evaluación mock mejorada para T2.1 que detecta:
    - Estructura STAR
    - Longitud adecuada
    - Nivel técnico
    - Pausas prolongadas
    - Muletillas
    - Lenguaje incompleto
    - Demora en hilar ideas
    - Mezcla de palabras / velocidad
    """
    s = payload.structure

    situation_words = count_words(s.situation)
    task_words = count_words(s.task)
    action_words = count_words(s.action)
    result_words = count_words(s.result)

    total_words = situation_words + task_words + action_words + result_words

    # 1. Estructura: se considera incompleta si alguna parte es muy corta
    if any(w < 10 for w in [situation_words, task_words, action_words, result_words]):
        structure_score: Literal["ok", "incomplete"] = "incomplete"
    else:
        structure_score = "ok"

    # 2. Longitud: umbrales diferentes según modo cognitivo
    if payload.length_mode == "short":
        if total_words < 70:
            length_feedback: Literal["too_short", "adequate", "too_long"] = "too_short"
        elif total_words > 180:
            length_feedback = "too_long"
        else:
            length_feedback = "adequate"
    else:  # detailed
        if total_words < 140:
            length_feedback = "too_short"
        elif total_words > 320:
            length_feedback = "too_long"
        else:
            length_feedback = "adequate"

    # 3. Nivel técnico: simulación basada en palabras clave
    full_text = " ".join(
        [s.situation.lower(), s.task.lower(), s.action.lower(), s.result.lower()]
    )
    technical_keywords = [
        "microservicio", "microservicios", "kubernetes", "docker",
        "latencia", "api", "rest", "graphql", "cdn", "cluster",
        "balanceador", "throughput", "escala horizontal", "cache",
        "redis", "postgresql", "mongodb", "elasticsearch", "kafka",
        "terraform", "ansible", "ci/cd", "jenkins", "gitlab",
    ]
    context_keywords = [
        "cliente", "equipo", "usuario", "negocio", "empresa",
        "stakeholder", "entrevista", "reclutador", "lider",
        "manager", "persona", "gente", "ayudamos", "mejoramos",
        "impacto", "resultado", "aprendí", "experiencia",
    ]

    tech_hits = sum(1 for kw in technical_keywords if kw in full_text)
    context_hits = sum(1 for kw in context_keywords if kw in full_text)

    if tech_hits >= 4 and context_hits <= 2:
        technical_level: Literal["ok", "too_technical"] = "too_technical"
    else:
        technical_level = "ok"

    # 4. Pausa prolongada: tiempo total de respuesta
    pause_warning = payload.response_time_seconds > 40

    # 5. Muletillas: ya viene del frontend
    filler_words_count = len(payload.filler_words_detected)

    # 6. Lenguaje incompleto: detectar frases incompletas
    all_text = f"{s.situation} {s.task} {s.action} {s.result}"
    incomplete_sentences = detect_incomplete_sentences(all_text)
    incomplete_language = incomplete_sentences >= 2 or payload.typing_metrics.incomplete_sentences_count >= 2

    # 7. Demora en hilar ideas: pausas largas entre campos
    pauses_list = payload.typing_metrics.pauses_between_fields or [0]
    avg_pause = sum(pauses_list) / max(len(pauses_list), 1)
    thinking_delay: Literal["ok", "slow"] = "slow" if avg_pause > 20 else "ok"

    # 8. Mezcla palabras / velocidad: muchos backspaces o velocidad muy alta
    # Velocidad muy alta (>5 keystrokes/seg) + muchos backspaces sugiere escribir sin pensar
    word_mixing = (
        payload.typing_metrics.keystrokes_per_second > 5.0 and
        payload.typing_metrics.backspaces_count > 10
    ) or payload.typing_metrics.backspaces_count > 20

    # Sugerencias constructivas basadas en todos los indicadores
    suggestions: List[str] = []

    if structure_score == "incomplete":
        suggestions.append(
            "Equilibra tu respuesta: explica brevemente la situación, la tarea, tus acciones y el resultado."
        )

    if length_feedback == "too_short":
        suggestions.append(
            "Desarrolla un poco más cada parte: agrega 1–2 frases extra por sección para que se entienda mejor."
        )
    elif length_feedback == "too_long":
        suggestions.append(
            "Resume: quédate con las ideas clave y evita detalles muy finos que no cambian la historia."
        )

    if technical_level == "too_technical":
        suggestions.append(
            "Traduce términos técnicos a impacto: qué problema resolviste y cómo ayudó a la persona usuaria o al negocio."
        )

    if result_words < 20:
        suggestions.append(
            "Refuerza el resultado: menciona métricas, cambios concretos o qué aprendiste de la experiencia."
        )

    if pause_warning:
        suggestions.append(
            "Si te quedas en blanco, respira 5 segundos y piensa en: contexto breve, tu objetivo y qué hiciste paso a paso."
        )

    if filler_words_count >= 3:
        suggestions.append(
            "Reduce muletillas: practica pausas breves en lugar de 'eh', 'este' o 'mmm'. Respira y continúa."
        )

    if incomplete_language:
        suggestions.append(
            "Completa tus ideas: cada frase debe tener un punto claro. Si te quedas a medias, vuelve y termina la idea."
        )

    if thinking_delay == "slow":
        suggestions.append(
            "Para hilar ideas más rápido: antes de escribir, piensa en 2 ideas clave + 1 ejemplo. Luego estructura con STAR."
        )

    if word_mixing:
        suggestions.append(
            "Escribe más despacio: piensa antes de escribir. Mejor una respuesta clara y pausada que rápida pero confusa."
        )

    # Garantizar al menos dos sugerencias aunque todo esté "ok"
    if not suggestions:
        suggestions = [
            "Tu respuesta está bien estructurada: practícala en voz alta para ganar fluidez.",
            "La próxima vez prueba una versión más breve y otra más detallada para comparar cuál se siente más natural.",
        ]

    return EvaluationResponse(
        structure_score=structure_score,
        length_feedback=length_feedback,
        technical_level=technical_level,
        pause_warning=pause_warning,
        filler_words_count=filler_words_count,
        incomplete_language=incomplete_language,
        thinking_delay=thinking_delay,
        word_mixing=word_mixing,
        suggestions=suggestions,
    )


@app.get("/health")
def health():
    return {"status": "ok"}
