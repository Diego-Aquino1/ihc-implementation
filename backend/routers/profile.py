from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/", response_model=User)
def get_profile(session: Session = Depends(get_session)):
    # Mocking single user for this demo
    user = session.exec(select(User).limit(1)).first()
    if not user:
        # Create default user if not exists
        user = User(name="Alex User", email="alex@example.com", plan="Pro", avatar_url="https://picsum.photos/200")
        session.add(user)
        session.commit()
        session.refresh(user)
    return user

@router.put("/", response_model=User)
def update_profile(user_update: User, session: Session = Depends(get_session)):
    user = session.exec(select(User).limit(1)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.name = user_update.name
    user.email = user_update.email
    # Update other fields as needed
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
