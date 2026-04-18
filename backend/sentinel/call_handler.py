from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from twilio.twiml.voice_response import Gather, VoiceResponse

from sentinel.config import get_settings
from sentinel.db import get_db


def build_check_in_twiml(*, patient_name: str, action_url: str) -> str:
    resp = VoiceResponse()
    resp.say(
        f"Hi {patient_name}, this is Sentinel, your post-op check-in. "
        "After the beep, please describe how you're feeling today. "
        "Any shortness of breath, fever, confusion, or worsening pain?"
    )
    g = Gather(
        input="speech",
        speech_timeout="auto",
        action=action_url,
        method="POST",
        timeout=10,
    )
    resp.append(g)
    resp.say("We didn't catch that — a nurse will follow up.")
    return str(resp)


def _twilio_create_call(**kwargs):
    from twilio.rest import Client
    s = get_settings()
    client = Client(s.twilio_account_sid, s.twilio_auth_token)
    return client.calls.create(**kwargs)


async def place_call(patient_id: str) -> str:
    db = get_db()
    patient = await db.patients.find_one({"_id": patient_id})
    if patient is None:
        raise LookupError(patient_id)
    s = get_settings()

    base = s.public_base_url.rstrip("/")
    twiml_url = f"{base}/api/calls/twiml?patient_id={patient_id}"

    result = _twilio_create_call(
        to=patient["phone"], from_=s.twilio_from_number,
        url=twiml_url, method="GET",
    )
    return result.sid
