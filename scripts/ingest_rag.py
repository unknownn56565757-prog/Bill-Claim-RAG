import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from langchain_core.documents import Document
from backend.config import settings
from backend.rag import add_documents


def load_policy_documents():

    policy_dir = Path(settings.policies_dir)

    if not policy_dir.exists():
        raise FileNotFoundError(
            f"Policy directory not found: {policy_dir}"
        )

    documents = []

    for file_path in policy_dir.iterdir():

        if not file_path.is_file():
            continue

        if file_path.suffix.lower() not in [".txt", ".md"]:
            continue

        try:
            text = file_path.read_text(
                encoding="utf-8"
            )
        except Exception as e:
            print(
                f"Failed to read {file_path.name}: {e}"
            )
            continue

        if not text.strip():
            print(
                f"Skipping empty file: {file_path.name}"
            )
            continue

        documents.append(
            Document(
                page_content=text,
                metadata={
                    "source": file_path.name
                }
            )
        )

        print(f"Loaded: {file_path.name}")

    return documents


def main():

    print("=" * 60)
    print("POLICY INGESTION")
    print("=" * 60)

    docs = load_policy_documents()

    print(f"\nDocuments loaded: {len(docs)}")

    if not docs:
        print("No policy files found.")
        return

    count = add_documents(docs)

    print(f"Chunks indexed: {count}")

    print("\nIngestion completed successfully.")
    print(
        f"Vector DB ocation: {settings.chroma_dir}"
    )


if __name__ == "__main__":
    main()