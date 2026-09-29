import json
import hashlib
import sqlite3
from pathlib import Path
from typing import Any

from backend.config import settings


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
    with connect() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS claims (
                id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, employee_name TEXT NOT NULL,
                category TEXT NOT NULL, claimed_amount REAL NOT NULL, currency TEXT NOT NULL,
                status TEXT NOT NULL, submitted_at TEXT NOT NULL, files_json TEXT NOT NULL,
                extracted_json TEXT NOT NULL, policy_json TEXT NOT NULL, timeline_json TEXT NOT NULL,
                chat_json TEXT NOT NULL, approver_note TEXT
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, employee_id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL, phone TEXT NOT NULL, role TEXT NOT NULL,
                password_hash TEXT NOT NULL
            )"""
        )
        for user in (
            ("u-001", "Sarah Chen", "EMP-001", "sarah.chen@company.com", "+1 555-0101", "employee", "password123"),
            ("u-002", "Jane Doe", "APR-01", "jane.doe@company.com", "+1 555-0201", "approver", "approver123"),
        ):
            connection.execute("INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", (*user[:6], hashlib.sha256(user[6].encode()).hexdigest()))


def save_claim(claim: dict[str, Any]) -> None:
    with connect() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO claims VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (claim["id"], claim["employeeId"], claim["employeeName"], claim["category"], claim["claimedAmount"], claim["currency"], claim["status"], claim["submittedAt"], json.dumps(claim["files"]), json.dumps(claim["extracted"]), json.dumps(claim["policy"]), json.dumps(claim["timeline"]), json.dumps(claim["chat"]), claim.get("approverNote")),
        )


def _decode(row: sqlite3.Row) -> dict[str, Any]:
    stored = dict(row)
    claim = {
        "id": stored["id"],
        "employeeId": stored["employee_id"],
        "employeeName": stored["employee_name"],
        "category": stored["category"],
        "claimedAmount": stored["claimed_amount"],
        "currency": stored["currency"],
        "status": stored["status"],
        "submittedAt": stored["submitted_at"],
        "approverNote": stored.get("approver_note"),
    }
    for key in ("files", "extracted", "policy", "timeline", "chat"):
        claim[key] = json.loads(stored[f"{key}_json"])
    if claim["claimedAmount"] <= 0 and claim["extracted"].get("total", 0) > 0:
        claim["claimedAmount"] = claim["extracted"]["total"]
    return claim


def get_claim(claim_id: str) -> dict[str, Any] | None:
    with connect() as connection:
        row = connection.execute("SELECT * FROM claims WHERE id = ?", (claim_id,)).fetchone()
    return _decode(row) if row else None


def list_claims(employee_id: str | None = None) -> list[dict[str, Any]]:
    query = "SELECT * FROM claims"
    parameters: tuple[str, ...] = ()
    if employee_id:
        query += " WHERE employee_id = ?"
        parameters = (employee_id,)
    with connect() as connection:
        return [_decode(row) for row in connection.execute(query + " ORDER BY submitted_at DESC", parameters).fetchall()]


def get_user(identifier: str) -> sqlite3.Row | None:
    with connect() as connection:
        return connection.execute("SELECT * FROM users WHERE email = ? OR employee_id = ?", (identifier, identifier)).fetchone()


def save_user(user: dict[str, str]) -> None:
    with connect() as connection:
        connection.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", tuple(user.values()))