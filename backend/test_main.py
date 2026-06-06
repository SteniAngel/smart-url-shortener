import sys
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset the rate limiter before each test (handles reloaded modules)."""
    import rate_limiter as rl_mod
    rl_mod.rate_limiter.reset()
    # Also reset if the module was reloaded by other tests
    if "rate_limiter" in sys.modules:
        sys.modules["rate_limiter"].rate_limiter.reset()
    yield


@pytest.fixture()
def client():
    """Provide a test client that triggers the lifespan (init_db)."""
    with TestClient(app) as c:
        yield c


def test_create_and_redirect(client):
    response = client.post("/api/urls", json={"url": "https://example.com"})
    assert response.status_code == 201
    data = response.json()
    assert data["short_code"]
    assert data["clicks"] == 0

    short_code = data["short_code"]
    redirect = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect.status_code == 307
    assert redirect.headers["location"] == "https://example.com"


def test_security_headers(client):
    response = client.get("/api/urls")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
