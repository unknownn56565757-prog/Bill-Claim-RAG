from datetime import datetime, timedelta, timezone

from jose import jwt
from pwdlib import PasswordHash


# ==========================================
# JWT Configuration
# ==========================================

SECRET_KEY = "change-this-secret-key-in-production"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ==========================================
# Password Hashing
# ==========================================

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """
    Hash a user's password before storing it.
    """

    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Verify a password against its stored hash.
    """

    return password_hash.verify(
        plain_password,
        hashed_password
    )


# ==========================================
# JWT Token
# ==========================================

def create_access_token(user_id: int) -> str:
    """
    Create a JWT access token for an authenticated user.
    """

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )