from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from database import get_session
from models import SessionData, User
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

class DashboardStats(BaseModel):
    total_sessions: int
    average_score: int
    score_change: int # Percentage change
    favorite_vibe: str # Mocked for now

@router.get("/stats", response_model=DashboardStats)
def get_stats(session: Session = Depends(get_session)):
    user = session.exec(select(User).limit(1)).first()
    if not user:
        # Create default user if not exists to act as initial seed
        user = User(name="Alex User", email="alex@example.com", plan="Pro", avatar_url="https://picsum.photos/200")
        session.add(user)
        session.commit()
        session.refresh(user)

    # Calculate stats
    sessions = session.exec(select(SessionData).where(SessionData.user_id == user.id)).all()
    
    total_sessions = len(sessions)
    if total_sessions == 0:
        return DashboardStats(total_sessions=0, average_score=0, score_change=0, favorite_vibe="Challenger")
    
    avg_score = sum([s.score for s in sessions]) / total_sessions
    
    # Mocking change logic for simplicity
    score_change = 5 

    return DashboardStats(
        total_sessions=total_sessions,
        average_score=int(avg_score),
        score_change=score_change,
        favorite_vibe="Challenger"
    )
