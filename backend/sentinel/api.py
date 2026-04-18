from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from sentinel import enrollment
from sentinel.db import get_db
from sentinel.models import Caregiver, Consent, SurgeryType

router = APIRouter(prefix="/api")


class EnrollRequest(BaseModel):
    name: str
    phone: str
    language: str = "en"
    surgery_type: SurgeryType
    surgery_date: datetime
    discharge_date: datetime
    caregiver: Caregiver
    consent: Consent | None = None


@router.post("/patients", status_code=201)
async def enroll(body: EnrollRequest):
    try:
        pid = await enrollment.enroll_patient(
            name=body.name,
            phone=body.phone,
            language=body.language,
            surgery_type=body.surgery_type,
            surgery_date=body.surgery_date,
            discharge_date=body.discharge_date,
            caregiver=body.caregiver,
            consent=body.consent,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"id": pid}


@router.get("/patients")
async def list_patients():
    docs = [d async for d in get_db().patients.find({})]
    return [
        {
            "id": d["_id"],
            "name": d["name"],
            "surgery_type": d["surgery_type"],
            "next_call_at": d.get("next_call_at"),
            "call_count": d.get("call_count", 0),
        }
        for d in docs
    ]


@router.get("/patients/{pid}/calls")
async def patient_calls(pid: str):
    cur = (
        get_db()
        .calls.find({"patient_id": pid})
        .sort("called_at", 1)
    )
    return [
        {
            "id": d["_id"],
            "called_at": d["called_at"],
            "score": d.get("score"),
            "similar_calls": d.get("similar_calls", []),
            "short_call": d.get("short_call", False),
            "llm_degraded": d.get("llm_degraded", False),
        }
        async for d in cur
    ]


@router.get("/alerts")
async def list_alerts():
    cur = get_db().alerts.find({}).sort("sent_at", -1).limit(50)
    return [
        {
            "id": d["_id"],
            "patient_id": d["patient_id"],
            "call_id": d["call_id"],
            "severity": d["severity"],
            "channel": d["channel"],
            "sent_at": d["sent_at"],
        }
        async for d in cur
    ]
