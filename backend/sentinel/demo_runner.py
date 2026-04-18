from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sentinel.enrollment import enroll_patient
from sentinel.escalation import send_alert
from sentinel.models import (
    Caregiver,
    Consent,
    RecommendedAction,
    Score,
    SurgeryType,
)
from sentinel.replay import replay_file
from sentinel.seed import seed_cohort


class ScriptedLLM:
    """For fully offline demo. Replace with GeminiLLM() for real runs."""

    def __init__(self, scripted_score: Score):
        # Store under a non-colliding name; the LLM protocol exposes a
        # .score(...) method, so the attribute must not shadow it.
        self._scripted = scripted_score

    async def score(self, **_):
        return self._scripted

    async def embed(self, _):
        return [0.0] * 1536


async def run_trajectory_demo(root: str = "demo") -> str:
    demo_dir = Path(root)
    now = datetime.now(tz=timezone.utc)

    pid = await enroll_patient(
        name="Demo Patient",
        phone="+15555550010",
        surgery_type=SurgeryType.LAP_CHOLE,
        surgery_date=now - timedelta(days=5),
        discharge_date=now - timedelta(days=3),
        caregiver=Caregiver(name="Demo Caregiver", phone="+15555550011"),
        consent=Consent(recorded_at=now, ip="127.0.0.1", version="v1"),
    )
    await seed_cohort(count=20)

    scripted = {
        "baseline": Score(
            deterioration=0.08,
            qsofa=0,
            news2=1,
            red_flags=[],
            summary="nominal",
            recommended_action=RecommendedAction.NONE,
        ),
        "drift": Score(
            deterioration=0.45,
            qsofa=1,
            news2=4,
            red_flags=["mild_tachypnea", "fatigue"],
            summary="mild drift",
            recommended_action=RecommendedAction.CAREGIVER_ALERT,
        ),
        "red": Score(
            deterioration=0.88,
            qsofa=3,
            news2=9,
            red_flags=["tachypnea", "confusion", "fever"],
            summary="concerning deterioration",
            recommended_action=RecommendedAction.SUGGEST_911,
        ),
    }

    for stage in ("baseline", "drift", "red"):
        cid = await replay_file(
            patient_id=pid,
            script_path=str(demo_dir / "scripts" / f"{stage}.txt"),
            wav_path=str(demo_dir / "audio" / f"{stage}.wav"),
            llm=ScriptedLLM(scripted[stage]),
        )
        await send_alert(patient_id=pid, call_id=cid, score=scripted[stage])
        await asyncio.sleep(0.2)
    return pid
