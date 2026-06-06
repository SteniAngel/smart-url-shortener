from datetime import datetime, timedelta, timezone

from database import get_connection, init_db
from utils import generate_short_code

init_db()

conn = get_connection()
cursor = conn.cursor()

base_date = datetime.now(timezone.utc)
urls = [
    ("https://www.google.com", 12, base_date - timedelta(days=1)),
    ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", 8, base_date - timedelta(days=2)),
    ("https://github.com", 20, base_date - timedelta(days=3)),
    ("https://www.nilaapps.ai", 5, base_date - timedelta(days=4)),
    ("https://edrevel.ai", 4, base_date - timedelta(days=5)),
    ("https://www.example.com/long-url-path", 3, base_date - timedelta(days=6)),
    ("https://openai.com", 14, base_date - timedelta(days=7)),
    ("https://react.dev", 9, base_date - timedelta(days=8)),
]

for original_url, clicks, created_at in urls:
    short_code = generate_short_code()
    cursor.execute(
        "INSERT INTO urls (original_url, short_code, clicks, created_at, last_accessed) VALUES (?, ?, ?, ?, ?)",
        (original_url, short_code, clicks, created_at.isoformat(), created_at.isoformat()),
    )

conn.commit()
conn.close()

print("Seed data added")
