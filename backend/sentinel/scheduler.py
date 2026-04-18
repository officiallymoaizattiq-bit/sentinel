from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from sentinel.db import get_db

log = logging.getLogger("sentinel.scheduler")


async def trigger_call(patient_id: str) -> None:
    # Late import to avoid circular dep with call_handler.
    from sentinel.call_handler import place_call
    await place_call(patient_id)


async def tick() -> None:
    now = datetime.now(tz=timezone.utc)
    cur = get_db().patients.find({"next_call_at": {"$lte": now}})
    async for p in cur:
        try:
            await trigger_call(p["_id"])
        except Exception:
            log.exception("trigger_call failed for %s", p["_id"])


_sched: AsyncIOScheduler | None = None


def start() -> AsyncIOScheduler:
    global _sched
    if _sched is not None:
        return _sched
    _sched = AsyncIOScheduler()
    _sched.add_job(
        lambda: asyncio.create_task(tick()),
        trigger="interval",
        seconds=60,
        id="sentinel_tick",
        replace_existing=True,
    )
    _sched.add_job(
        lambda: asyncio.create_task(_run_audit()),
        trigger="interval",
        seconds=300,
        id="sentinel_audit",
        replace_existing=True,
    )
    _sched.start()
    return _sched


def stop() -> None:
    global _sched
    if _sched is not None:
        _sched.shutdown(wait=False)
        _sched = None


async def audit_missing_escalations(window_minutes: int = 10) -> list[str]:
    now = datetime.now(tz=timezone.utc)
    threshold = now - timedelta(minutes=window_minutes)
    cur = get_db().calls.find({
        "called_at": {"$gte": threshold},
        "score.recommended_action": {"$in": ["nurse_alert", "suggest_911"]},
    })
    bad: list[str] = []
    async for c in cur:
        existing = await get_db().alerts.find_one({"call_id": c["_id"]})
        if existing is None:
            bad.append(c["_id"])
    return bad


async def _run_audit() -> None:
    missing = await audit_missing_escalations()
    if missing:
        log.error("escalation missing for calls: %s", missing)
