import chromadb
from sentence_transformers import SentenceTransformer

from backend.config import settings


# ============================================================
# EMBEDDING MODEL
# ============================================================

embedding_model = SentenceTransformer(
    settings.embedding_model
)


# ============================================================
# CHROMADB CLIENT
# ============================================================

client = chromadb.PersistentClient(
    path=settings.chroma_dir
)


# ============================================================
# COLLECTION
# ============================================================

def get_collection():
    return client.get_or_create_collection(
        name=settings.chroma_collection
    )


# ============================================================
# RETRIEVE CONTEXT
# ============================================================

def retrieve_context(query: str, n_results=None):

    collection = get_collection()

    count = collection.count()

    if count == 0:
        return []


    # --------------------------------------------------------
    # NUMBER OF RESULTS
    # --------------------------------------------------------
    #
    # Instead of retrieving only top_k, retrieve more candidates.
    # This helps when the most relevant information is not the
    # first semantic match.
    #

    configured_k = n_results or settings.top_k

    candidate_k = max(
        configured_k * 2,
        8
    )

    candidate_k = min(
        candidate_k,
        count
    )


    # --------------------------------------------------------
    # CREATE MULTIPLE QUERY REPRESENTATIONS
    # --------------------------------------------------------
    #
    # The original question is kept unchanged.
    #
    # A second semantic formulation helps questions such as:
    #
    # "how much can I claim for flight?"
    #
    # find chunks containing terms such as:
    #
    # airfare, amount, limit, ceiling, reimbursement, etc.
    #
    # This is NOT a domain filter. It is only retrieval expansion.
    #

    retrieval_queries = [
        query.strip(),
        (
            f"{query.strip()} "
            "reimbursement amount maximum limit ceiling "
            "eligible claim"
        )
    ]


    # --------------------------------------------------------
    # RUN CHROMADB SEARCH FOR EACH QUERY
    # --------------------------------------------------------

    all_results = []


    for retrieval_query in retrieval_queries:

        embedding = embedding_model.encode(
            retrieval_query
        ).tolist()


        results = collection.query(
            query_embeddings=[embedding],
            n_results=candidate_k,
            include=[
                "documents",
                "metadatas",
                "distances"
            ]
        )


        documents = results.get(
            "documents",
            [[]]
        )[0]

        metadatas = results.get(
            "metadatas",
            [[]]
        )[0]

        distances = results.get(
            "distances",
            [[]]
        )[0]


        for i, doc in enumerate(documents):

            if not doc:
                continue


            metadata = (
                metadatas[i]
                if i < len(metadatas)
                else {}
            )


            distance = (
                distances[i]
                if i < len(distances)
                else None
            )


            all_results.append(
                {
                    "text": doc,
                    "metadata": metadata,
                    "distance": distance
                }
            )


    # --------------------------------------------------------
    # REMOVE DUPLICATES
    # --------------------------------------------------------

    unique_results = {}

    for item in all_results:

        text = item["text"].strip()

        if not text:
            continue


        # Use document text as the unique identifier.
        if text not in unique_results:

            unique_results[text] = item

        else:

            # Keep the version with the better distance.
            old_distance = unique_results[text].get(
                "distance"
            )

            new_distance = item.get(
                "distance"
            )


            if (
                old_distance is None
                or (
                    new_distance is not None
                    and new_distance < old_distance
                )
            ):
                unique_results[text] = item


    items = list(
        unique_results.values()
    )


    # --------------------------------------------------------
    # SORT BY SEMANTIC DISTANCE
    # --------------------------------------------------------
    #
    # ChromaDB distance:
    # smaller = more similar
    #

    items.sort(
        key=lambda x: (
            x["distance"]
            if x["distance"] is not None
            else float("inf")
        )
    )


    # --------------------------------------------------------
    # RETURN FINAL CONTEXT
    # --------------------------------------------------------
    #
    # Return more than the original top_k so the LLM has enough
    # relevant policy context to find exact limits and amounts.
    #

    final_k = max(
        configured_k,
        6
    )

    return items[:final_k]