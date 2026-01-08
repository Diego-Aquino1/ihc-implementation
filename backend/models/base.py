"""
Modelos base del sistema
"""
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    avatar_url: Optional[str] = None
    plan: Optional[str] = "Free"
    
    sessions: List["SessionData"] = Relationship(back_populates="user")

class SessionData(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    date: datetime = Field(default_factory=datetime.utcnow)
    score: int
    duration_seconds: int
    feedback_summary: Optional[str] = None
    
    user: Optional[User] = Relationship(back_populates="sessions")

