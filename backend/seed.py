from sqlmodel import Session, select
from models import User, SessionData
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
