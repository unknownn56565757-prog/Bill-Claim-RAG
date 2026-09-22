from pathlib import Path
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb

# -----------------------------
# Configuration
# -----------------------------

POLICY_DIR = Path("policy")
CHROMA_DB_DIR = "chroma_db"
COLLECTION_NAME = "travel_policies"

# -----------------------------
# Embedding Model
# -----------------------------

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

# -----------------------------
# Chroma DB
# -----------------------------

client = chromadb.PersistentClient(
    path=CHROMA_DB_DIR
)

collection = client.get_or_create_collection(
    name=COLLECTION_NAME
)

# -----------------------------
# PDF Text Extraction
# -----------------------------

def extract_pdf_text(pdf_path):

    reader = PdfReader(str(pdf_path))

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text

# -----------------------------
# Chunking
# -----------------------------

def chunk_text(
    text,
    chunk_size=1000,
    overlap=200
):

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunks.append(
            text[start:end]
        )

        start += chunk_size - overlap

    return chunks

# -----------------------------
# Generate Embedding
# -----------------------------

def get_embedding(text):

    return embedding_model.encode(
        text
    ).tolist()

# -----------------------------
# Ingestion
# -----------------------------

def ingest_documents():

    pdf_files = list(
        POLICY_DIR.glob("*.pdf")
    )

    if not pdf_files:
        print(
            "No PDF files found in policy folder."
        )
        return

    total_chunks = 0

    for pdf_file in pdf_files:

        print(
            f"\nProcessing: {pdf_file.name}"
        )

        try:

            text = extract_pdf_text(
                pdf_file
            )

            if not text.strip():

                print(
                    f"Skipping empty file: {pdf_file.name}"
                )
                continue

            chunks = chunk_text(text)

            print(
                f"Created {len(chunks)} chunks"
            )

            for index, chunk in enumerate(chunks):

                embedding = get_embedding(
                    chunk
                )

                collection.add(
                    ids=[
                        f"{pdf_file.stem}_{index}"
                    ],
                    documents=[
                        chunk
                    ],
                    embeddings=[
                        embedding
                    ],
                    metadatas=[
                        {
                            "source": pdf_file.name,
                            "chunk": index
                        }
                    ]
                )

                total_chunks += 1

            print(
                f"Completed: {pdf_file.name}"
            )

        except Exception as e:

            print(
                f"Failed to process {pdf_file.name}: {e}"
            )

    print("\n================================")
    print(
        f"Total chunks stored: {total_chunks}"
    )
    print(
        "Ingestion completed successfully."
    )
    print("================================")

# -----------------------------
# Main
# -----------------------------

if __name__ == "__main__":
    ingest_documents()

print("Ingestion completed successfully.")
print("================================")