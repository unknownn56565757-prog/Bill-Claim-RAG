import os
from dotenv import load_dotenv
from groq import Groq

from backend.rag import retrieve_context

# --------------------------------
# Load Environment Variables
# --------------------------------

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY (or the legacy GOOGLE_API_KEY) not found in .env file"
    )

# --------------------------------
# Configure Gemini
# --------------------------------

client = Groq(api_key=GROQ_API_KEY)
model_names = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
]
configured_model = os.getenv("GROQ_MODEL")
if configured_model:
    model_names.insert(0, configured_model)

# --------------------------------
# Answer Question
# --------------------------------

def answer_question(question: str):
    try:
        context = retrieve_context(question)
    except Exception as error:
        context = f"Policy retrieval is temporarily unavailable: {error}"

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

    last_error = "unknown Groq error"
    for model_name in model_names:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            return response.choices[0].message.content.strip()
        except Exception as error:
            last_error = str(error)
            if "model" not in last_error.lower() and "not_found" not in last_error.lower():
                break
    return "Groq policy review is temporarily unavailable. Please verify the OCR fields and claimable amount manually before proceeding."


def answer_conversation(message: str, claim: dict) -> str:
    """Generate a normal claim conversation grounded by the retrieved policy context."""
    policy_context = claim.get("policy", {}).get("policyContext", "No policy context was retrieved.")
    claim_category = claim.get("originalCategory", claim.get("category"))
    question_category = claim.get("category")
    prompt = f"""
You are a helpful expense-claim review assistant.
Answer the employee's question directly using the retrieved policy context below.
Be conversational and concise. Do not approve a claim automatically.
If OCR or the claimable amount is uncertain, ask the employee to verify it.
Answer in at most 3 short bullets or 80 words. Ask one clear question when clarification is needed.
The uploaded claim category is {claim_category}. The policy topic requested by the employee is {question_category}.
When those topics differ, answer the requested policy topic first. Do not reject or redirect the question
just because the uploaded receipt belongs to another category. Mention the receipt only if it is necessary
to explain the next step for the claim.

Employee message:
{message}

Claim details:
{claim.get('extracted', {})}
Claimed amount: {claim.get('claimedAmount')} {claim.get('currency')}
Claim category: {claim_category}
Requested policy topic: {question_category}

Retrieved policy context:
{policy_context}
"""
    last_error = "unknown Groq error"
    for model_name in model_names:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            text = response.choices[0].message.content.strip()
            return text if len(text) <= 600 else text[:597].rsplit(" ", 1)[0] + "..."
        except Exception as error:
            last_error = str(error)
            if "model" not in last_error.lower() and "not_found" not in last_error.lower():
                break
    return f"I could not complete the AI response. Please verify the extracted fields manually. ({last_error})"

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