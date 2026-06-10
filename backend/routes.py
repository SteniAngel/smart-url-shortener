import math

from fastapi import APIRouter, HTTPException, Path, Query, Request
from fastapi.responses import RedirectResponse

from config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from models import PaginatedUrlsResponse, URLRequest, UrlAnalyticsResponse, UrlData
from services import create_url, get_url_analytics, list_urls, resolve_short_code

router = APIRouter()


@router.post("/api/urls", response_model=UrlData, status_code=201)
def create_url_route(req: URLRequest, request: Request):
    # Rate limiting on creation endpoint
    client_ip = request.client.host if request.client else "unknown"
    # Import fresh to allow test monkeypatching
    from rate_limiter import rate_limiter
    allowed, remaining = rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        )

    try:
        url_data = create_url(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not url_data:
        raise HTTPException(status_code=500, detail="Unable to generate short URL")

    return url_data


@router.get("/api/urls", response_model=PaginatedUrlsResponse)
def list_urls_route(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page"),
):
    items, total = list_urls(page=page, page_size=page_size)
    total_pages = max(1, math.ceil(total / page_size))
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/api/urls/{url_id}/analytics", response_model=UrlAnalyticsResponse)
def analytics_route(url_id: int = Path(..., gt=0)):
    analytics_data = get_url_analytics(url_id)
    if not analytics_data:
        raise HTTPException(status_code=404, detail="URL not found")

    return analytics_data


@router.get("/{short_code}")
def redirect(
    short_code: str = Path(..., min_length=4, max_length=16, pattern="^[A-Za-z0-9]{4,16}$")
):
    url_data = resolve_short_code(short_code)
    if not url_data:
        raise HTTPException(status_code=404, detail="Short URL not found")

    response = RedirectResponse(url=url_data["original_url"], status_code=302)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response
