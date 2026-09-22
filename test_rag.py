from backend.rag import search_policy
from llm import answer_question

while True:

    query = input("\nAsk: ")

    if query.lower() == "exit":
        break

    context = search_policy(query)

    answer = answer_question(
        question=query,
        context=context
    )

    print("\nAnswer:")
    print(answer)