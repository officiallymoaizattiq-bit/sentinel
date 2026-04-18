import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from sentinel import api, enrollment, escalation, scoring
from sentinel.main import create_app


@pytest.fixture
async def client(monkeypatch):
    mock = AsyncMongoMockClient()
    db = mock["sentinel_test"]
    for mod in (api, enrollment, escalation, scoring):
        monkeypatch.setattr(mod, "get_db", lambda d=db: d)
    app = create_app(start_scheduler=False)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as c:
        yield c


async def test_enroll_and_list(client):
    r = await client.post("/api/patients", json={
        "name": "A", "phone": "+15555550010", "language": "en",
        "surgery_type": "lap_chole",
        "surgery_date": "2026-04-15T00:00:00Z",
        "discharge_date": "2026-04-17T00:00:00Z",
        "caregiver": {"name": "B", "phone": "+15555550011"},
        "consent": {"recorded_at": "2026-04-17T00:00:00Z",
                    "ip": "1.1.1.1", "version": "v1"},
    })
    assert r.status_code == 201
    pid = r.json()["id"]

    r2 = await client.get("/api/patients")
    assert r2.status_code == 200
    assert any(p["id"] == pid for p in r2.json())
