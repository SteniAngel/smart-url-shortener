from typing import Any, Dict, List, Optional, Tuple

from models import URLRequest
from repositories import (
    create_short_url,
    get_all_urls,
    get_click_history,
    get_url_by_id,
    register_redirect,
)


def create_url(request: URLRequest) -> Dict[str, Any]:
    """Validate and persist a new shortened URL."""
    return create_short_url(request)


def list_urls(page: int = 1, page_size: int = 20) -> Tuple[List[Dict[str, Any]], int]:
    """Return paginated URL list with total count."""
    return get_all_urls(page=page, page_size=page_size)


def get_url_analytics(url_id: int) -> Optional[Dict[str, Any]]:
    """Fetch URL details along with click history for analytics."""
    url_data = get_url_by_id(url_id)
    if not url_data:
        return None

    click_history = get_click_history(url_id)
    return {
        "url": url_data,
        "total_clicks": url_data["clicks"],
        "last_accessed": url_data.get("last_accessed"),
        "click_history": click_history,
    }


def resolve_short_code(short_code: str) -> Optional[Dict[str, Any]]:
    """Resolve a short code: increment clicks and return the URL data."""
    return register_redirect(short_code)
