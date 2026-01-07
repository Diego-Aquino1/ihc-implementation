from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from contextlib import asynccontextmanager
from routers import dashboard, history, profile, ws, sessions, tts

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    from database import engine
    from seed import seed_data
    seed_data(engine)
    yield

app = FastAPI(lifespan=lifespan)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    # En Starlette, '*' con allow_credentials=True puede impedir que se envíe el header CORS.
    # Para dev local, declaramos orígenes explícitos.
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(history.router)
app.include_router(profile.router)
app.include_router(ws.router)
app.include_router(sessions.router)
app.include_router(tts.router)

@app.get("/")
def read_root():
    return {"message": "InterviewCoach Backend Running"}
