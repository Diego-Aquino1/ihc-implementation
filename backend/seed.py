from sqlmodel import Session, select
from models import User, SessionData, Question
from datetime import datetime, timedelta
import random

def seed_data(engine):
    with Session(engine) as session:
        user = session.exec(select(User).limit(1)).first()
        if not user:
            user = User(name="Alex User", email="alex@example.com", plan="Pro", avatar_url="https://picsum.photos/200")
            session.add(user)
            session.commit()
            session.refresh(user)
        
        # Check if sessions exist
        sessions = session.exec(select(SessionData).where(SessionData.user_id == user.id)).all()
        if not sessions:
            print("Seeding session data...")
            for i in range(14):
                dt = datetime.utcnow() - timedelta(days=i*2)
                score = random.randint(70, 95)
                session_data = SessionData(
                    user_id=user.id,
                    date=dt,
                    score=score,
                    duration_seconds=random.randint(120, 600),
                    feedback_summary="Great performance with detailed STAR responses." if score > 85 else "Good effort, focus on being more concise."
                )
                session.add(session_data)
            session.commit()
            print("Seeding complete.")

        # Seed mínimo de banco de preguntas (HTA T1–T4)
        existing_question = session.exec(select(Question).limit(1)).first()
        if not existing_question:
            print("Seeding question bank (HTA T1–T4)...")
            questions = [
                # Stage 1: Introducción
                Question(
                    external_id="Q_T1_1_001",
                    module="HR",
                    stage="Stage_1_Introduccion",
                    task_id="T1_1_dato_puntual",
                    prompt="Para comenzar, ¿cómo te llamas y cuál es tu profesión o rol actual?",
                    rubric={"goal": "Responder datos concretos en 1–2 frases y cerrar."},
                ),
                Question(
                    external_id="Q_T1_1_002",
                    module="HR",
                    stage="Stage_1_Introduccion",
                    task_id="T1_1_dato_puntual",
                    prompt="¿Dónde vives actualmente y qué estudios tienes (máximo 2 frases)?",
                    rubric={"goal": "Dato puntual, conciso, sin divagar."},
                ),
                Question(
                    external_id="Q_T1_2_001",
                    module="HR",
                    stage="Stage_1_Introduccion",
                    task_id="T1_2_autodescripcion",
                    prompt="¿Cómo te describes como profesional? Elige 2–3 rasgos y da un mini-ejemplo.",
                    rubric={"goal": "Rasgos + evidencia breve + conexión al puesto."},
                ),
                Question(
                    external_id="Q_T1_2_002",
                    module="HR",
                    stage="Stage_1_Introduccion",
                    task_id="T1_2_autodescripcion",
                    prompt="¿Cómo te consideras como persona trabajando en equipo? Da un ejemplo corto.",
                    rubric={"goal": "Evitar vaguedad; incluir evidencia."},
                ),

                # Stage 2: Experiencia
                Question(
                    external_id="Q_T2_1_001",
                    module="Behavioral",
                    stage="Stage_2_Experiencia",
                    task_id="T2_1_proyecto_entendible",
                    prompt="Cuéntame sobre un proyecto reciente relevante. Contexto, tu rol, acciones y resultado (ideal STAR).",
                    rubric={"goal": "Estructura (STAR), contexto e impacto."},
                ),
                Question(
                    external_id="Q_T2_2_001",
                    module="Behavioral",
                    stage="Stage_2_Experiencia",
                    task_id="T2_2_repreguntas_proyecto",
                    prompt="En ese proyecto, ¿qué decisión técnica importante tomaste y por qué? ¿Qué aprendiste?",
                    rubric={"goal": "Ejemplo concreto + razonamiento + aprendizaje."},
                ),

                # Stage 3: Comportamiento
                Question(
                    external_id="Q_T3_1_001",
                    module="Behavioral",
                    stage="Stage_3_Comportamiento",
                    task_id="T3_1_conductual",
                    prompt="Cuéntame de un conflicto con un compañero o stakeholder. ¿Qué hiciste tú y cuál fue el resultado?",
                    rubric={"goal": "Competencia (comunicación/conflicto), caso real, acción propia, resultado."},
                ),
                Question(
                    external_id="Q_T3_2_001",
                    module="Leadership",
                    stage="Stage_3_Comportamiento",
                    task_id="T3_2_bajo_presion",
                    prompt="Escenario: el cliente está molesto por un retraso. ¿Cómo respondes en el momento y qué haces después?",
                    rubric={"goal": "Pedir breve tiempo si hace falta, estructurar, claridad y cierre."},
                ),

                # Stage 4: Cierre
                Question(
                    external_id="Q_T4_1_001",
                    module="HR",
                    stage="Stage_4_Cierre",
                    task_id="T4_1_preguntas_y_siguientes_pasos",
                    prompt="Antes de cerrar, ¿qué 1–2 preguntas harías al entrevistador y cómo confirmarías los siguientes pasos?",
                    rubric={"goal": "Hacer preguntas + confirmar proceso + agradecer."},
                ),
                Question(
                    external_id="Q_T4_2_001",
                    module="HR",
                    stage="Stage_4_Cierre",
                    task_id="T4_2_pedir_feedback",
                    prompt="Si el contexto lo permite, ¿cómo pedirías feedback específico al entrevistador?",
                    rubric={"goal": "Feedback específico, profesional, cierre."},
                ),
            ]
            session.add_all(questions)
            session.commit()
            print("Question bank seeding complete.")
