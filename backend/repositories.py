import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from database import get_connection
from models import URLRequest
from utils import generate_short_code


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "original_url": row["original_url"],
        "short_code": row["short_code"],
        "clicks": row["clicks"],
        "created_at": row["created_at"],
        "last_accessed": row["last_accessed"],
    }


def get_all_urls(page: int = 1, page_size: int = 20) -> Tuple[List[Dict[str, Any]], int]:
    """Return a paginated list of URLs and the total count."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM urls")
    total = cursor.fetchone()[0]

    offset = (page - 1) * page_size
    cursor.execute(
        "SELECT * FROM urls ORDER BY COALESCE(last_accessed, created_at) DESC LIMIT ? OFFSET ?",
        (page_size, offset),
    )
    items = [_row_to_dict(row) for row in cursor.fetchall()]
    return items, total


def get_url_by_id(url_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM urls WHERE id = ?", (url_id,))
    row = cursor.fetchone()
    return _row_to_dict(row) if row else None


def get_click_history(url_id: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT substr(clicked_at, 1, 10) AS date, COUNT(*) AS clicks
        FROM click_events
        WHERE url_id = ?
        GROUP BY date
        ORDER BY date
        """,
        (url_id,),
    )
    return [{"date": row["date"], "clicks": row["clicks"]} for row in cursor.fetchall()]


def create_short_url(request: URLRequest, max_attempts: int = 10) -> Dict[str, Any]:
    """Generate a unique short code and insert the URL record."""
    created_at = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()

    for _ in range(max_attempts):
        candidate = generate_short_code()
        try:
            cursor.execute(
                "INSERT INTO urls (original_url, short_code, clicks, created_at) VALUES (?, ?, ?, ?)",
                (request.url, candidate, 0, created_at),
            )
            conn.commit()
            return {
                "id": cursor.lastrowid,
                "original_url": request.url,
                "short_code": candidate,
                "clicks": 0,
                "created_at": created_at,
                "last_accessed": None,
            }
        except sqlite3.IntegrityError:
            continue

    raise RuntimeError("Could not generate a unique short URL")


def register_redirect(short_code: str) -> Optional[Dict[str, Any]]:
    """Increment click count and record the click event atomically."""
    conn = get_connection()
    cursor = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    # Atomic update — returns 0 rows affected if short_code doesn't exist
    cursor.execute(
        "UPDATE urls SET clicks = clicks + 1, last_accessed = ? WHERE short_code = ?",
        (now, short_code),
    )
    if cursor.rowcount == 0:
        return None

    # Get the updated row
    cursor.execute("SELECT * FROM urls WHERE short_code = ?", (short_code,))
    row = cursor.fetchone()
    if not row:
        return None

    # Record the click event
    cursor.execute(
        "INSERT INTO click_events (url_id, clicked_at) VALUES (?, ?)",
        (row["id"], now),
    )
    conn.commit()
    return _row_to_dict(row)
