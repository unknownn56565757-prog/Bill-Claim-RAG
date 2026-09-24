# Business Travel Claim AI

Full-stack employee assistant with:

- Streamlit frontend
- FastAPI backend
- SQLite user and chat database
- JWT authentication
- ChromaDB vector store
- Sentence Transformers embeddings
- PDF policy ingestion
- LangGraph agent workflow
- Gemini LLM
- Policy-grounded responses
- Source/page references

## 1. Create environment

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and add your Gemini API key.

## 2. Add policies

Put company travel/reimbursement PDFs into:

```text
policy/
```

Then run:

```powershell
python -m backend.rag.ingest_rag
```

## 3. Start backend

From the project root:

```powershell
uvicorn backend.api.main:app --reload --port 8000
```

## 4. Start frontend

Open another terminal:

```powershell
.\.venv\Scripts\Activate.ps1
streamlit run frontend/app.py
```

Open the URL printed by Streamlit.

## Architecture

```text
Streamlit
   |
   | HTTP
   v
FastAPI
   |
   +-- JWT Authentication
   +-- SQLite
   +-- LangGraph
          |
          +-- Retrieve policy
          |
          +-- Generate grounded answer
                    |
                    v
                  Gemini
```

## Important production notes

Before public production deployment:

1. Replace the SQLite database with PostgreSQL or another managed relational database.
2. Store `JWT_SECRET_KEY` in a production secret manager.
3. Restrict CORS and place the API behind HTTPS.
4. Add rate limiting and audit logging.
5. Pin dependency versions after testing.
6. Use a managed/vector database or persistent Chroma deployment appropriate to expected scale.
7. Establish document versioning and an approved-policy publishing workflow.
8. Add automated tests for authentication, retrieval and policy-answer grounding.
9. Never commit `.env` or API keys.
