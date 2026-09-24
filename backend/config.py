from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    groq_api_key = os.getenv("GROQ_API_KEY")
    jwt_secret_key = os.getenv("JWT_SECRET_KEY", "change-me")
    database_url = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'business_claims.db'}")
    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    embedding_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    chroma_dir = str(BASE_DIR / "chroma_db")
    policies_dir = str(BASE_DIR / "policy")
    chroma_collection = os.getenv("CHROMA_COLLECTION", "travel_policies")
    top_k = int(os.getenv("TOP_K", "6"))

settings = Settings()
