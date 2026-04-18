import pytest
from mongomock_motor import AsyncMongoMockClient

from sentinel import call_handler as ch


@pytest.fixture
def db(monkeypatch):
    client = AsyncMongoMockClient()
    db = client["sentinel_test"]
    monkeypatch.setattr(ch, "get_db", lambda: db)
    return db


async def test_place_call_demo_mode_stores_placeholder(db, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    await db.patients.insert_one({
        "_id": "p1", "name": "A", "phone": "+15555550010",
        "caregiver": {"phone": "+1"}, "call_count": 0,
    })
    placed: list[str] = []

    def fake_create(**kwargs):
        placed.append(kwargs["to"])
        class R: sid = "CAtest"
        return R()

    monkeypatch.setattr(ch, "_twilio_create_call", fake_create)
    await ch.place_call("p1")
    assert placed == ["+15555550010"]


def test_twiml_prompt_contains_patient_name():
    xml = ch.build_check_in_twiml(patient_name="Alex",
                                  action_url="http://x/api/calls/gather")
    assert "Alex" in xml and "<Gather" in xml
