from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    groq_api_key = os.getenv("GROQ_API_KEY") or os.getenv("GOOGLE_API_KEY")
    ocr_vlm_url = os.getenv("OCR_VLM_URL")
    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    chroma_dir = str(BASE_DIR / "chroma_db")
    policies_dir = str(BASE_DIR / "policy")
    database_path = str(BASE_DIR / "claims.sqlite3")


settings = Settings()