import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def create_test_client(tmp_path, monkeypatch):
    db_file = tmp_path / "test_urls.db"
    monkeypatch.setenv("URL_SHORTENER_DB", str(db_file))

    import config
    import database
    import rate_limiter
    import main

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(rate_limiter)
    importlib.reload(main)

    from database import init_db
    from rate_limiter import rate_limiter as rl

    init_db()
    rl.reset()
    return TestClient(main.app)


def test_create_url_and_redirect(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    response = client.post("/api/urls", json={"url": "https://example.com"})
    assert response.status_code == 201
    data = response.json()
    assert data["short_code"]
    assert data["clicks"] == 0
    assert data["original_url"] == "https://example.com"

    redirect = client.get(f"/{data['short_code']}", follow_redirects=False)
    assert redirect.status_code == 307
    assert redirect.headers["location"] == "https://example.com"


def test_create_url_invalid_url(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    response = client.post("/api/urls", json={"url": "not-a-url"})
    assert response.status_code == 422
    assert "detail" in response.json()


def test_create_url_too_long(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    long_url = "https://example.com/" + "a" * 8200
    response = client.post("/api/urls", json={"url": long_url})
    assert response.status_code == 422


def test_create_url_private_ip_blocked(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    response = client.post("/api/urls", json={"url": "http://192.168.1.1/admin"})
    assert response.status_code == 422

    response = client.post("/api/urls", json={"url": "http://127.0.0.1:8080"})
    assert response.status_code == 422


def test_list_urls_returns_paginated(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    client.post("/api/urls", json={"url": "https://example.com"})
    client.post("/api/urls", json={"url": "https://fastapi.tiangolo.com"})

    response = client.get("/api/urls")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert "page" in body
    assert "total_pages" in body
    assert len(body["items"]) == 2
    assert body["total"] == 2


def test_list_urls_pagination(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    for i in range(5):
        client.post("/api/urls", json={"url": f"https://example{i}.com"})

    response = client.get("/api/urls?page=1&page_size=2")
    body = response.json()
    assert len(body["items"]) == 2
    assert body["total"] == 5
    assert body["total_pages"] == 3

    response = client.get("/api/urls?page=3&page_size=2")
    body = response.json()
    assert len(body["items"]) == 1


def test_analytics_includes_total_clicks_and_last_accessed(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    response = client.post("/api/urls", json={"url": "https://example.com"})
    url_id = response.json()["id"]
    short_code = response.json()["short_code"]

    client.get(f"/{short_code}", follow_redirects=False)
    analytics = client.get(f"/api/urls/{url_id}/analytics")

    assert analytics.status_code == 200
    body = analytics.json()
    assert body["total_clicks"] == 1
    assert body["last_accessed"] is not None
    assert isinstance(body["click_history"], list)


def test_redirect_not_found(tmp_path, monkeypatch):
    client = create_test_client(tmp_path, monkeypatch)

    response = client.get("/notacode", follow_redirects=False)
    assert response.status_code == 404


def test_rate_limiting(tmp_path, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_REQUESTS", "2")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "60")

    db_file = tmp_path / "test_urls.db"
    monkeypatch.setenv("URL_SHORTENER_DB", str(db_file))

    import config
    import database
    import rate_limiter
    import routes
    import main

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(rate_limiter)
    importlib.reload(routes)
    importlib.reload(main)

    from database import init_db

    init_db()

    client = TestClient(main.app)

    # First two should succeed
    r1 = client.post("/api/urls", json={"url": "https://example1.com"})
    r2 = client.post("/api/urls", json={"url": "https://example2.com"})
    assert r1.status_code == 201
    assert r2.status_code == 201

    # Third should be rate limited
    r3 = client.post("/api/urls", json={"url": "https://example3.com"})
    assert r3.status_code == 429
    assert "Too many requests" in r3.json()["detail"]
