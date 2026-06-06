import sqlite3
import threading
from typing import Optional

from config import get_db_path

_local = threading.local()
_lock = threading.Lock()


def get_connection() -> sqlite3.Connection:
    """Return a thread-local SQLite connection (reused per thread)."""
    conn: Optional[sqlite3.Connection] = getattr(_local, "conn", None)
    if conn is None:
        db_path = get_db_path()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA busy_timeout = 5000")
        _local.conn = conn
    return conn


def close_pool() -> None:
    """Close the connection stored on the current thread (called at shutdown)."""
    conn: Optional[sqlite3.Connection] = getattr(_local, "conn", None)
    if conn is not None:
        conn.close()
        _local.conn = None


def init_db() -> None:
    """Create tables and indexes if they don't exist."""
    with _lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS urls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_url TEXT NOT NULL,
                short_code TEXT UNIQUE NOT NULL,
                clicks INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                last_accessed TEXT
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS click_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url_id INTEGER NOT NULL,
                clicked_at TEXT NOT NULL,
                FOREIGN KEY(url_id) REFERENCES urls(id)
            )
            """
        )

        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_urls_short_code ON urls (short_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls (created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_click_events_url_id ON click_events (url_id)")

        cursor.execute("PRAGMA table_info(urls)")
        columns = [row[1] for row in cursor.fetchall()]
        if "created_at" not in columns:
            cursor.execute("ALTER TABLE urls ADD COLUMN created_at TEXT NOT NULL DEFAULT ''")
        if "last_accessed" not in columns:
            cursor.execute("ALTER TABLE urls ADD COLUMN last_accessed TEXT")

        conn.commit()
