import chromadb
from sentence_transformers import SentenceTransformer
from pathlib import Path

# --------------------------------
# Configuration
# --------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

CHROMA_DB_DIR = str(BASE_DIR / "chroma_db")
COLLECTION_NAME = "travel_policies"

# --------------------------------
# Embedding Model
# --------------------------------

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

# --------------------------------
# Chroma Client
# --------------------------------

client = chromadb.PersistentClient(
    path=CHROMA_DB_DIR
)

collection = client.get_collection(
    name=COLLECTION_NAME
)

# --------------------------------
# Retrieve Context
# --------------------------------

def retrieve_context(query: str, n_results: int = 3):

    query_embedding = embedding_model.encode(
        query
    ).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )

    documents = results.get("documents", [])

    if not documents:
        return "No documents found in ChromaDB."

    if not documents[0]:
        return "No matching documents found."

    return "\n\n".join(documents[0])


# --------------------------------
# Test
# --------------------------------

if __name__ == "__main__":

    while True:

        question = input(
            "\nAsk a question (or type 'exit'): "
        )

        if question.lower() == "exit":
            break

        context = retrieve_context(question)

        print("\n========================")
        print("RETRIEVED CONTEXT")
        print("========================\n")

        print(context)