from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import SessionData, User

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/", response_model=List[SessionData])
def get_history(session: Session = Depends(get_session)):
    # Assuming single user context
    user = session.exec(select(User).limit(1)).first()
    if not user:
        return []
    
    statement = select(SessionData).where(SessionData.user_id == user.id).order_by(SessionData.date.desc())
    results = session.exec(statement).all()
    return results
