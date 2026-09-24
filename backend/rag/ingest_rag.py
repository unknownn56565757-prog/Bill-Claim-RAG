from pathlib import Path
import hashlib
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
from backend.config import settings

embedding_model = SentenceTransformer(settings.embedding_model)
client = chromadb.PersistentClient(path=settings.chroma_dir)
collection = client.get_or_create_collection(name=settings.chroma_collection)

def extract_pages(pdf_path):
    reader = PdfReader(str(pdf_path))
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            yield page_number, text

def chunk_text(text, chunk_size=1200, overlap=200):
    text = " ".join(text.split())
    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks

def ingest_documents():
    policy_dir = Path(settings.policies_dir)
    policy_dir.mkdir(parents=True, exist_ok=True)
    pdfs = list(policy_dir.glob("*.pdf"))

    if not pdfs:
        print(f"No PDFs found in {policy_dir}")
        return

    total = 0
    for pdf in pdfs:
        print(f"Processing {pdf.name}")
        for page, text in extract_pages(pdf):
            for idx, chunk in enumerate(chunk_text(text)):
                stable_id = hashlib.sha256(
                    f"{pdf.name}:{page}:{idx}:{chunk}".encode("utf-8")
                ).hexdigest()
                embedding = embedding_model.encode(chunk).tolist()
                collection.upsert(
                    ids=[stable_id],
                    documents=[chunk],
                    embeddings=[embedding],
                    metadatas=[{
                        "source": pdf.name,
                        "page": page,
                        "chunk": idx,
                        "type": "policy"
                    }]
                )
                total += 1
    print(f"Ingestion completed. {total} chunks indexed.")

if __name__ == "__main__":
    ingest_documents()
