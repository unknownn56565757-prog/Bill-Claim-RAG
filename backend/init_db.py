from .database import Base, engine

# Import models so SQLAlchemy knows about all tables
from . import models


def init_database():
    print("Creating SQLite database...")

    Base.metadata.create_all(bind=engine)

    print("Database created successfully.")


if __name__ == "__main__":
    init_database()