from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    chroma_dir = str(BASE_DIR / "chroma_db")
    policies_dir = str(BASE_DIR / "policy")


settings = Settings()