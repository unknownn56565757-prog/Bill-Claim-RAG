from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .schemas import SignupRequest, LoginRequest, AuthResponse
from .auth import hash_password, verify_password, create_access_token
from llm import answer_question


# ==========================================
# FastAPI Application
# ==========================================

app = FastAPI(
    title="Bill Claim RAG API",
    description="Backend API for authentication, RAG chat, and bill claims",
    version="1.0.0"
)


# ==========================================
# CORS Configuration
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Health / Root
# ==========================================

@app.get("/")
def root():
    return {
        "message": "Bill Claim RAG API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ==========================================
# Signup
# ==========================================

@app.post(
    "/auth/signup",
    response_model=AuthResponse
)
def signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):

    # Check whether email already exists
    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered"
        )

    # Hash password
    hashed_password = hash_password(
        request.password
    )

    # Create user
    user = User(
        name=request.name,
        email=request.email,
        password_hash=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create JWT token
    access_token = create_access_token(
        user.id
    )

    return AuthResponse(
        message="Account created successfully",
        access_token=access_token,
        user_id=user.id,
        name=user.name,
        email=user.email
    )


# ==========================================
# Login
# ==========================================

@app.post(
    "/auth/login",
    response_model=AuthResponse
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    # Find user
    user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(
        request.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create JWT token
    access_token = create_access_token(
        user.id
    )

    return AuthResponse(
        message="Login successful",
        access_token=access_token,
        user_id=user.id,
        name=user.name,
        email=user.email
    )


# ==========================================
# RAG Chat
# ==========================================

@app.post("/rag/query")
def rag_query(request: dict):

    question = request.get(
        "question",
        ""
    ).strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question is required"
        )

    # Retrieve policy context and generate
    # an answer using the configured LLM
    answer = answer_question(question)

    return {
        "question": question,
        "answer": answer
    }