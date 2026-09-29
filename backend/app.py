import asyncio
import base64
import hashlib
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.config import settings
from backend.db import get_claim, get_user, init_db, list_claims, save_claim, save_user
from backend.rag import retrieve_context

app = FastAPI(title="Bill Claim API")
UPLOAD_DIR = Path(settings.database_path).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


class ReviewRequest(BaseModel):
    vendor: str | None = None
    date: str | None = None
    total: float | None = Field(default=None, ge=0)
    lineItems: list[dict[str, Any]] | None = None
    confirmed: bool = False


class ProceedRequest(BaseModel):
    approved: bool
    claimableAmount: float = Field(ge=0)


class RetryRequest(BaseModel):
    pass


class AuthRequest(BaseModel):
    identifier: str
    password: str


class SignupRequest(BaseModel):
    name: str
    employeeId: str
    email: str
    phone: str
    password: str


class ChatRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def detect_category(text: str) -> str | None:
    category_terms = {
        "Food": ("food", "meal", "grocery", "groceries", "restaurant", "dinner", "lunch"),
        "Travel": ("travel", "flight", "taxi", "mileage", "parking", "transport"),
        "Medical": ("medical", "doctor", "hospital", "medicine", "pharmacy", "prescription"),
        "Accommodation": ("accommodation", "hotel", "room", "stay", "lodging", "night"),
        "Other": ("office supplies", "equipment", "communication", "miscellaneous"),
    }
    lowered = text.lower()
    for category, terms in category_terms.items():
        if any(term in lowered for term in terms):
            return category
    return None


@app.on_event("startup")
def startup() -> None:
    init_db()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def extract_bill(upload: UploadFile, query: str) -> dict[str, Any]:
    return await extract_bill_content(upload.filename, upload.content_type, await upload.read(), query)


async def extract_bill_content(filename: str | None, content_type: str | None, content: bytes, query: str) -> dict[str, Any]:
    if not settings.ocr_vlm_url:
        raise HTTPException(500, "OCR_VLM_URL is not configured")
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            file_tuple = (filename or "bill", content, content_type or "application/octet-stream")
            headers = {"ngrok-skip-browser-warning": "true"}
            response = await client.post(settings.ocr_vlm_url, headers=headers, files={"image": file_tuple}, data={"query": query})
            if response.status_code in (400, 422):
                response = await client.post(settings.ocr_vlm_url, headers=headers, files={"file": file_tuple}, data={"query": query})
            response.raise_for_status()
            payload = response.json()
            if payload.get("success") is False:
                raise HTTPException(502, payload.get("error", "OCR service rejected the bill"))
            return payload
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError) as error:
        try:
            from groq import Groq
            if not settings.groq_api_key:
                raise RuntimeError("GROQ_API_KEY is not configured")
            client = Groq(api_key=settings.groq_api_key)
            data_url = f"data:{content_type or 'application/octet-stream'};base64,{base64.b64encode(content).decode()}"
            result = client.chat.completions.create(
                model=os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
                temperature=0,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": f"{query} Return JSON with an expenses object whose category values are comma-separated item: amount strings, and an answer string."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ]}],
            )
            return json.loads(result.choices[0].message.content)
        except Exception as fallback_error:
            raise HTTPException(502, f"OCR service failed: {error}. Groq vision fallback failed: {fallback_error}") from fallback_error


def normalize_extraction(payload: dict[str, Any], currency: str) -> dict[str, Any]:
    expenses = payload.get("expenses") or {}
    line_items: list[dict[str, Any]] = []
    structured_items = payload.get("lineItems") or payload.get("line_items") or []
    for item in structured_items:
        if isinstance(item, dict) and item.get("description") is not None:
            try:
                line_items.append({"id": str(uuid.uuid4()), "description": str(item["description"]), "amount": float(item.get("amount", 0))})
            except (TypeError, ValueError):
                pass
    for value in expenses.values():
        if not value or not isinstance(value, str):
            continue
        for item in value.split(","):
            name, _, amount = item.rpartition(":")
            try:
                line_items.append({"id": str(uuid.uuid4()), "description": name.strip() or "Bill total", "amount": float(amount.strip())})
            except ValueError:
                continue
    total = payload.get("total") or payload.get("amount") or sum(item["amount"] for item in line_items)
    return {"vendor": payload.get("vendor") or "Pending human confirmation", "date": payload.get("date") or "", "lineItems": line_items, "total": round(float(total), 2), "currency": payload.get("currency") or currency, "ocrAnswer": payload.get("answer", ""), "suggestedCategory": next((key.title() for key, value in expenses.items() if value), payload.get("category"))}


def policy_check(category: str, extracted: dict[str, Any], claimed_amount: float) -> dict[str, Any]:
    try:
        context = retrieve_context(f"{category} expense claim of {claimed_amount} {extracted['currency']} with items {extracted['lineItems']}")
    except Exception as error:
        context = f"Policy retrieval unavailable: {error}"
    try:
        from llm import answer_question
        reason = answer_question(f"Assess this {category} claim against policy. Extracted total: {extracted['total']} {extracted['currency']}. Items: {extracted['lineItems']}. Policy: {context}. Reply in at most 3 short bullets and 60 words. State only the key decision and missing information.")
    except Exception as error:
        reason = f"Groq policy review unavailable: {error}. Confirm manually against the retrieved policy."
    return {"claimableAmount": extracted["total"], "status": "Needs human review", "reason": reason, "policyContext": context, "humanConfirmed": False}


@app.on_event("startup")
def ensure_database() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login")
def login(request: AuthRequest) -> dict[str, Any]:
    user = get_user(request.identifier)
    if not user or user["password_hash"] != hashlib.sha256(request.password.encode()).hexdigest():
        raise HTTPException(401, "Invalid credentials")
    return {"token": f"local-{user['id']}", "user": {"id": user["id"], "name": user["name"], "employeeId": user["employee_id"], "email": user["email"], "phone": user["phone"], "role": user["role"]}}


@app.post("/auth/signup")
def signup(request: SignupRequest) -> dict[str, Any]:
    user = {"id": f"u-{uuid.uuid4().hex[:10]}", "name": request.name, "employee_id": request.employeeId, "email": request.email, "phone": request.phone, "role": "employee", "password_hash": hashlib.sha256(request.password.encode()).hexdigest()}
    try:
        save_user(user)
    except Exception as error:
        raise HTTPException(409, "Employee ID or email already registered") from error
    return login(AuthRequest(identifier=request.employeeId, password=request.password))


@app.get("/claims")
def claims(employee_id: str | None = None) -> list[dict[str, Any]]:
    return list_claims(employee_id)


@app.post("/claims")
async def create_claim(employee_id: str = Form(...), employee_name: str = Form(...), category: str = Form("Other"), claimed_amount: float = Form(0), currency: str = Form("USD"), files: list[UploadFile] = File(...)) -> dict[str, Any]:
    if not files:
        raise HTTPException(400, "At least one bill is required")
    contents = [(file, await file.read()) for file in files]
    first_file, first_content = contents[0]
    extracted = normalize_extraction(await extract_bill_content(first_file.filename, first_file.content_type, first_content, f"Extract all bill items and identify the expense category for {category}."), currency)
    category = extracted.get("suggestedCategory") or category
    claimed_amount = claimed_amount or extracted["total"]
    claim_id = f"clm-{uuid.uuid4().hex[:10]}"
    claim_upload_dir = UPLOAD_DIR / claim_id
    claim_upload_dir.mkdir(parents=True, exist_ok=True)
    stored_files = []
    for file, content in contents:
        safe_name = Path(file.filename or "bill").name
        (claim_upload_dir / safe_name).write_bytes(content)
        stored_files.append({"id": str(uuid.uuid4()), "name": safe_name, "type": "pdf" if file.content_type == "application/pdf" else "image", "url": f"http://localhost:8000/uploads/{claim_id}/{safe_name}", "size": len(content)})
    claim = {"id": claim_id, "employeeId": employee_id, "employeeName": employee_name, "category": category, "claimedAmount": claimed_amount, "currency": currency, "status": "Under Review", "submittedAt": now(), "files": stored_files, "extracted": extracted, "policy": policy_check(category, extracted, claimed_amount), "timeline": ["Submitted", "Reconciled", "Policy Check"], "currentStep": "Policy Check", "chat": [{"id": str(uuid.uuid4()), "role": "ai", "text": "OCR is complete. Please verify the extracted fields before I calculate the claimable amount.", "timestamp": now()}]}
    save_claim(claim)
    return claim


@app.get("/claims/{claim_id}")
def claim(claim_id: str) -> dict[str, Any]:
    result = get_claim(claim_id)
    if not result:
        raise HTTPException(404, "Claim not found")
    return result


@app.patch("/claims/{claim_id}/review")
def review(claim_id: str, request: ReviewRequest) -> dict[str, Any]:
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    for key in ("vendor", "date", "total", "lineItems"):
        value = getattr(request, key)
        if value is not None:
            claim["extracted"][key] = value
    claim["policy"] = policy_check(claim["category"], claim["extracted"], claim["claimedAmount"])
    claim["policy"]["humanConfirmed"] = request.confirmed
    claim["status"] = "Pending Approval" if request.confirmed else "Under Review"
    claim["currentStep"] = "Pending Approval" if request.confirmed else "Policy Check"
    save_claim(claim)
    return claim


@app.post("/claims/{claim_id}/proceed")
def proceed(claim_id: str, request: ProceedRequest) -> dict[str, Any]:
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    claim["policy"]["claimableAmount"] = request.claimableAmount
    claim["policy"]["humanConfirmed"] = request.approved
    claim["status"] = "Pending Approval" if request.approved else "Denied"
    claim["currentStep"] = claim["status"]
    claim["timeline"].append(claim["status"])
    save_claim(claim)
    return claim


@app.post("/claims/{claim_id}/chat")
def chat(claim_id: str, request: ChatRequest) -> dict[str, Any]:
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    request_text = request.text.strip()
    for message in claim["chat"]:
        message.pop("quickReplies", None)
    employee_message = {"id": str(uuid.uuid4()), "role": "employee", "text": request_text, "timestamp": now()}
    claim["chat"].append(employee_message)
    policy = claim.get("policy", {}).get("policyContext", "")
    prompt = (
        f"Employee message: {request.text}\n"
        f"Claim category: {claim['category']}\n"
        f"Claimed amount: {claim['claimedAmount']} {claim['currency']}\n"
        f"OCR fields: {claim['extracted']}\n"
        f"Retrieved policy: {policy}\n\n"
        "Respond as a claims assistant. Explain whether the correction is accepted, ask for any "
        "missing human confirmation, and never approve automatically. If the employee confirms the "
        "OCR is correct, tell them to use the claimable amount confirmation control."
    )
    continue_match = re.match(r"^continue with (.+)$", request_text, re.IGNORECASE)
    keep_match = re.match(r"^keep reviewing (.+)$", request_text, re.IGNORECASE)
    selected_category = continue_match.group(1).strip().title() if continue_match else None
    mentioned_category = selected_category or detect_category(request_text)
    category_switch = not continue_match and not keep_match and mentioned_category is not None and mentioned_category != claim["category"]
    conversation_claim = claim
    if selected_category:
        try:
            topic_context = retrieve_context(f"{selected_category} policy: {request_text}")
        except Exception:
            topic_context = "No additional policy context was retrieved."
        conversation_claim = {**claim, "originalCategory": claim["category"], "category": selected_category, "policy": {**claim.get("policy", {}), "policyContext": topic_context}}
    try:
        from llm import answer_conversation
        answer = answer_conversation(request_text, conversation_claim)
    except Exception as error:
        answer = f"I could not reach Groq for this review: {error}. Please verify the extracted fields and claimable amount manually."
    ai_message = {"id": str(uuid.uuid4()), "role": "ai", "text": answer, "timestamp": now()}
    if category_switch:
        ai_message["text"] = f"This claim is for {claim['category']}, but your question is about {mentioned_category}. Which should I continue with?"
        ai_message["quickReplies"] = [f"Continue with {mentioned_category}", f"Keep reviewing {claim['category']}"]
    claim["chat"].append(ai_message)
    save_claim(claim)
    return claim


@app.post("/claims/{claim_id}/retry-ocr")
def retry_ocr(claim_id: str, request: RetryRequest) -> dict[str, Any]:
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    file_info = claim["files"][0]
    file_path = UPLOAD_DIR / claim_id / file_info["name"]
    if not file_path.exists():
        raise HTTPException(404, "Original bill file is unavailable")
    payload = asyncio.run(extract_bill_content(file_info["name"], "application/pdf" if file_info["type"] == "pdf" else "image/jpeg", file_path.read_bytes(), f"Extract all bill items and identify the expense category for {claim['category']}."))
    claim["extracted"] = normalize_extraction(payload, claim["currency"])
    claim["category"] = claim["extracted"].get("suggestedCategory") or claim["category"]
    claim["policy"] = policy_check(claim["category"], claim["extracted"], claim["claimedAmount"])
    claim["status"] = "Under Review"
    save_claim(claim)
    return claim


@app.post("/claims/{claim_id}/close")
def close_claim(claim_id: str) -> dict[str, Any]:
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    claim["status"] = "Closed"
    claim["currentStep"] = "Closed"
    claim["timeline"].append("Closed")
    save_claim(claim)
    return claim