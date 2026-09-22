import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def answer_question(question, context):

    prompt = f"""
You are a Travel Policy Assistant.

Use ONLY the provided policy context.

If the information does not exist in the policy, say:
"I could not find this information in the policy."

Question:
{question}

Policy Context:
{context}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    return response.text