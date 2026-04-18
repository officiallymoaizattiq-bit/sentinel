from datetime import datetime, timezone

import pytest
from mongomock_motor import AsyncMongoMockClient

from sentinel import enrollment as enr
from sentinel.models import Caregiver, Consent, SurgeryType


@pytest.fixture
def db(monkeypatch):
    client = AsyncMongoMockClient()
    db = client["sentinel_test"]
    monkeypatch.setattr(enr, "get_db", lambda: db)
    return db


async def test_enroll_sets_next_call(db):
    pid = await enr.enroll_patient(
        name="A",
        phone="+15555550010",
        surgery_type=SurgeryType.LAP_CHOLE,
        surgery_date=datetime(2026, 4, 15, tzinfo=timezone.utc),
        discharge_date=datetime(2026, 4, 17, tzinfo=timezone.utc),
        caregiver=Caregiver(name="B", phone="+15555550011"),
        consent=Consent(
            recorded_at=datetime.now(tz=timezone.utc), ip="1.1.1.1", version="v1"
        ),
    )
    doc = await db.patients.find_one({"_id": pid})
    assert doc["next_call_at"] is not None
    assert doc["call_count"] == 0


async def test_enroll_without_consent_rejected(db):
    with pytest.raises(ValueError, match="consent"):
        await enr.enroll_patient(
            name="A",
            phone="+15555550010",
            surgery_type=SurgeryType.LAP_CHOLE,
            surgery_date=datetime.now(tz=timezone.utc),
            discharge_date=datetime.now(tz=timezone.utc),
            caregiver=Caregiver(name="B", phone="+15555550011"),
            consent=None,
        )
