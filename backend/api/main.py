from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, EmailStr
from backend.db.database import init_db, get_connection
from backend.auth.security import hash_password, verify_password, create_access_token, decode_access_token
from backend.services.chat_service import ask

app = FastAPI(title="Business Travel Claim AI", version="1.0.0")

@app.on_event("startup")
def startup():
    init_db()

class AuthRequest(BaseModel):
    name: str | None = None
    email: EmailStr
    password: str

class ChatRequest(BaseModel):
    question: str
    session_id: int | None = None

def current_user(authorization):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        payload = decode_access_token(authorization.split(" ", 1)[1])
        return int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

@app.post("/auth/signup")
def signup(req: AuthRequest):
    if not req.name:
        raise HTTPException(status_code=400, detail="Name is required.")

    conn = get_connection()
    existing = conn.execute("SELECT id FROM users WHERE email=?", (req.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="An account already exists for this email.")

    cur = conn.execute(
        "INSERT INTO users(name,email,password_hash) VALUES(?,?,?)",
        (req.name.strip(), req.email.lower(), hash_password(req.password))
    )
    conn.commit()
    user_id = cur.lastrowid
    conn.close()

    return {"access_token": create_access_token(user_id), "user_id": user_id}

@app.post("/auth/login")
def login(req: AuthRequest):
    conn = get_connection()
    user = conn.execute(
        "SELECT id,password_hash,name,email FROM users WHERE email=?",
        (req.email.lower(),)
    ).fetchone()
    conn.close()

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "access_token": create_access_token(user["id"]),
        "user_id": user["id"],
        "name": user["name"],
        "email": user["email"]
    }

@app.get("/me")
def me(authorization: str | None = Header(default=None)):
    user_id = current_user(authorization)
    conn = get_connection()
    user = conn.execute(
        "SELECT id,name,email FROM users WHERE id=?", (user_id,)
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return dict(user)

@app.post("/chat")
def chat(req: ChatRequest, authorization: str | None = Header(default=None)):
    user_id = current_user(authorization)
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        return ask(user_id, req.session_id, req.question.strip())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to answer the question: {e}")

@app.get("/sessions")
def sessions(authorization: str | None = Header(default=None)):
    user_id = current_user(authorization)
    conn = get_connection()
    rows = conn.execute(
        "SELECT id,title,created_at FROM chat_sessions WHERE user_id=? ORDER BY id DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
