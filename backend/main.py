from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from contextlib import asynccontextmanager
from routers import dashboard, history, profile, live

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
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(history.router)
app.include_router(profile.router)
app.include_router(live.router)

@app.get("/")
def read_root():
    return {"message": "InterviewCoach Backend Running"}
