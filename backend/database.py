import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

DEFAULT_DATABASE_PATH = Path(__file__).resolve().with_name("pisa_backend.db")
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
)

# Auto-seed SQLite database if target path doesn't exist yet
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    try:
        raw_path = SQLALCHEMY_DATABASE_URL[len("sqlite:///"):]
        if not raw_path.startswith("/") and not (len(raw_path) > 1 and raw_path[1] == ":"):
            raw_path = "/" + raw_path
        target_path = Path(raw_path)
        if target_path.resolve() != DEFAULT_DATABASE_PATH.resolve() and not target_path.exists() and DEFAULT_DATABASE_PATH.exists():
            target_path.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy2(DEFAULT_DATABASE_PATH, target_path)
    except Exception:
        pass

connect_args = (
    {"check_same_thread": False, "timeout": 30}
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else {}
)
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
