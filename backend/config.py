import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Pagination defaults
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Rate limiting
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "999999"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))


def get_db_path() -> Path:
    _db_path = os.getenv("URL_SHORTENER_DB", str(BASE_DIR / "urls.db"))
    _db_path = Path(_db_path)
    if not _db_path.is_absolute():
        _db_path = BASE_DIR / _db_path
    return _db_path.resolve()


ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8000").split(",")
    if origin.strip()
]
