from backend.agents.graph import run_agent
from backend.db.database import get_connection

def ask(user_id: int, session_id: int | None, question: str):
    conn = get_connection()

    if session_id is None:
        cur = conn.execute(
            "INSERT INTO chat_sessions(user_id, title) VALUES (?, ?)",
            (user_id, question[:80])
        )
        session_id = cur.lastrowid
    else:
        row = conn.execute(
            "SELECT id FROM chat_sessions WHERE id=? AND user_id=?",
            (session_id, user_id)
        ).fetchone()
        if not row:
            conn.close()
            raise ValueError("Chat session not found.")

    conn.execute(
        "INSERT INTO chat_messages(session_id, role, content) VALUES (?, ?, ?)",
        (session_id, "user", question)
    )
    conn.commit()

    result = run_agent(question)
    answer = result["answer"]
    sources = result.get("sources", [])

    conn.execute(
        "INSERT INTO chat_messages(session_id, role, content) VALUES (?, ?, ?)",
        (session_id, "assistant", answer)
    )
    conn.commit()
    conn.close()

    return {
        "session_id": session_id,
        "answer": answer,
        "sources": sources
    }
