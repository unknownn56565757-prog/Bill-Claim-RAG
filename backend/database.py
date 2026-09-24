from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# Project root directory
BASE_DIR = Path(__file__).resolve().parent.parent

# SQLite database directory
DATABASE_DIR = BASE_DIR / "database"
DATABASE_DIR.mkdir(exist_ok=True)

# SQLite database file
DATABASE_URL = f"sqlite:///{DATABASE_DIR / 'app.db'}"


# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)


# Create database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# Base class for database models
Base = declarative_base()


def get_db():
    """
    Provide a database session to FastAPI endpoints.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()