from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import settings

COLLECTION_NAME = "travel_policies"

CHUNK_SIZE = 250
CHUNK_OVERLAP = 100

DEFAULT_RETRIEVAL_K = 2
FETCH_K = 20

_embeddings = None
_vectorstore = None
_splitter = None


def get_embeddings():
    global _embeddings

    if _embeddings is None:
        __embeddings = GoogleGenerativeAIEmbeddings(
          model="text-embedding-004",
          google_api_key=settings.gemini_api_key
)

    return _embeddings


def get_splitter():
    global _splitter

    if _splitter is None:
        _splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=[
                "\n\n",
                "\n",
                ". ",
                " ",
                ""
            ]
        )

    return _splitter


def get_vectorstore():
    global _vectorstore

    if _vectorstore is None:
        _vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=get_embeddings(),
            persist_directory=settings.chroma_dir
        )

    return _vectorstore


def split_documents(documents):
    splitter = get_splitter()

    chunks = []

    for document in documents:
        split_texts = splitter.split_text(
            document.page_content
        )

        for idx, text in enumerate(split_texts):
            chunks.append(
                Document(
                    page_content=text,
                    metadata={
                        **document.metadata,
                        "chunk_index": idx
                    }
                )
            )

    return chunks


def add_documents(documents):

    if not documents:
        return 0

    chunks = split_documents(documents)

    print(f"Total chunks created: {len(chunks)}")

    vectorstore = get_vectorstore()

    ids = []

    for doc in chunks:
        source = doc.metadata.get(
            "source",
            "unknown"
        )

        chunk_index = doc.metadata.get(
            "chunk_index",
            0
        )

        ids.append(
            f"{source}_{chunk_index}"
        )

    vectorstore.add_documents(
        documents=chunks,
        ids=ids
    )

    return len(chunks)


def retrieve_documents(
    query,
    k=DEFAULT_RETRIEVAL_K
):
    vectorstore = get_vectorstore()

    return vectorstore.similarity_search(
        query=query,
        k=k
    )

def retrieve_context(
    query,
    k=DEFAULT_RETRIEVAL_K
):
    docs = retrieve_documents(
        query=query,
        k=k
    )

    if not docs:
        return "No relevant policy found."

    results = []

    for idx, doc in enumerate(docs, start=1):

        source = doc.metadata.get(
            "source",
            "unknown"
        )

        results.append(
            f"""
SOURCE {idx}
Document: {source}

{doc.page_content}
"""
        )

    return "\n\n".join(results)


def search_policy(query):
    return retrieve_context(query)