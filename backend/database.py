from sqlmodel import SQLModel, create_engine, Session

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=True, connect_args=connect_args)

def create_db_and_tables():
    # Importar todos los modelos antes de crear las tablas
    try:
        # Importar modelos base
        from models.base import User, SessionData
        # Importar modelos LIVE
        from models.live_session import LiveSession
        from models.live_metrics import LiveMetrics, LiveAnalysisEvent
    except ImportError as e:
        print(f"Warning: Could not import some models: {e}")
        pass  # Los modelos se importarán cuando estén disponibles
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
