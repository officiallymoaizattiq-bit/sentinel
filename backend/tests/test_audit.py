from datetime import datetime, timedelta, timezone

import pytest
from mongomock_motor import AsyncMongoMockClient

from sentinel import scheduler


@pytest.fixture
def db(monkeypatch):
    client = AsyncMongoMockClient()
    db = client["sentinel_test"]
    monkeypatch.setattr(scheduler, "get_db", lambda: db)
    return db


async def test_audit_flags_missing_escalation(db):
    now = datetime.now(tz=timezone.utc)
    await db.calls.insert_one({
        "_id": "c1", "patient_id": "p1", "called_at": now - timedelta(minutes=2),
        "score": {"recommended_action": "nurse_alert"},
    })
    flagged = await scheduler.audit_missing_escalations()
    assert flagged == ["c1"]

async def test_audit_ignores_if_alert_exists(db):
    now = datetime.now(tz=timezone.utc)
    await db.calls.insert_one({
        "_id": "c1", "patient_id": "p1", "called_at": now - timedelta(minutes=2),
        "score": {"recommended_action": "nurse_alert"},
    })
    await db.alerts.insert_one({
        "_id": "a1", "patient_id": "p1", "call_id": "c1",
        "sent_at": now - timedelta(minutes=1),
    })
    flagged = await scheduler.audit_missing_escalations()
    assert flagged == []
