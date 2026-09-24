from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from backend.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

def create_access_token(user_id: int):
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)

def decode_access_token(token: str):
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
