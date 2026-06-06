import ipaddress
from typing import Optional
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, field_validator


# --- Private/reserved IP check for SSRF protection ---
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _is_private_host(hostname: str) -> bool:
    """Return True if the hostname resolves to a private/reserved IP range."""
    try:
        addr = ipaddress.ip_address(hostname)
        return any(addr in net for net in _BLOCKED_NETWORKS)
    except ValueError:
        # Not a raw IP, it's a domain — allow (DNS resolution is too expensive here)
        return False


class URLRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        formatted = value.strip()
        if not formatted:
            raise ValueError("URL is required")

        if len(formatted) > 8192:
            raise ValueError("URL is too long (max 8192 characters)")

        if "://" not in formatted:
            formatted = f"https://{formatted}"

        parsed = urlparse(formatted)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("Invalid URL")

        hostname = parsed.hostname or ""

        # Block private/reserved IPs (SSRF protection)
        if _is_private_host(hostname):
            raise ValueError("Invalid URL")

        if ".." in hostname or (
            "." not in hostname
            and hostname != "localhost"
            and not hostname.replace(".", "").isdigit()
        ):
            raise ValueError("Invalid URL")

        return formatted


class UrlData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_url: str
    short_code: str
    clicks: int
    created_at: str
    last_accessed: Optional[str] = None


class ClickHistoryItem(BaseModel):
    date: str
    clicks: int


class PaginatedUrlsResponse(BaseModel):
    items: list[UrlData]
    total: int
    page: int
    page_size: int
    total_pages: int


class UrlAnalyticsResponse(BaseModel):
    url: UrlData
    total_clicks: int
    last_accessed: Optional[str] = None
    click_history: list[ClickHistoryItem] = []
