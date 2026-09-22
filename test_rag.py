from backend.rag import retrieve_context

while True:

    query = input(
        "\nAsk a question (or type 'exit'): "
    )

    if query.lower() == "exit":
        break

    context = retrieve_context(query)

    print("\n========================")
    print("RETRIEVED CONTEXT")
    print("========================\n")

    print(context)