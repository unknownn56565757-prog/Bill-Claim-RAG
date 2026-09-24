import os

from dotenv import load_dotenv
from google import genai

from backend.rag import retrieve_context


# --------------------------------
# Load Environment Variables
# --------------------------------

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError(
        "GOOGLE_API_KEY not found in .env file"
    )


# --------------------------------
# Configure Gemini
# --------------------------------

client = genai.Client(
    api_key=GOOGLE_API_KEY
)


# --------------------------------
# Answer Question
# --------------------------------

def answer_question(question: str):

    context = retrieve_context(question)

    if not context.strip():
        return (
            "I could not find that information in "
            "the travel policy documents."
        )

    prompt = f"""
You are a Business Travel Policy Assistant.

Answer using ONLY the provided policy context.

STRICT RULES:

1. Answer only from the provided context.
2. Never make assumptions.
3. Never invent reimbursement amounts.
4. Never invent approval workflows.
5. Never invent policy limits.
6. If information is unavailable, respond exactly:
I could not find that information in the travel policy documents.

RESPONSE FORMAT:

Provide a professional business response.

The answer must:
- Be concise.
- Be easy to read.
- Use bullet points when appropriate.
- Summarize long policy text.
- Do not mention context, retrieval, chunks or documents.
- Do not include Evidence or Sources sections.
- Speak directly to the employee.

Question:
{question}

Policy Context:
{context}

Final Answer:
"""

    try:

        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt
        )

        return response.text.strip()

    except Exception as e:

        return (
            f"Error generating answer: {str(e)}"
        )


# --------------------------------
# Interactive Test
# --------------------------------

if __name__ == "__main__":

    print("\nBusiness Travel Assistant Ready")

    while True:

        question = input(
            "\nAsk a question (or type 'exit'): "
        )

        if question.lower() == "exit":
            break

        answer = answer_question(
            question
        )

        print("\n================================")
        print("ANSWER")
        print("================================\n")

        print(answer)