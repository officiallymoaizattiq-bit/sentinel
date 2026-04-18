# Sentinel — Design Spec

**Date:** 2026-04-18
**Status:** Approved for implementation planning
**Context:** Hackathon — Patient-Centered Tech track; side tracks: Gemini, ElevenLabs, MongoDB, Startup.

---

## 1. Problem & Target

### Problem

Sepsis kills ~270,000 Americans per year; roughly 80% originate outside the hospital. Families of post-operative patients consistently report in retrospect that the patient "sounded off" a day before collapse — breathlessness, confusion, word-finding trouble, slowed speech. Emergency physicians routinely say that if the patient had been seen twelve hours earlier they would have survived.

That twelve-hour gap — between the subtle vocal signs a loved one can't quite name and a 911 call made too late — is the product.

### Target cohort (hackathon scope)

Post-operative **abdominal-surgery** patients (laparoscopic cholecystectomy, appendectomy, C-section, exploratory laparotomy), discharged home, days 0–14.

Rationale:
- Narrow risk rubric fits a single long-context prompt cleanly.
- Audio baselines are comparable (same patient, same surgery type, predictable recovery arc).
- Demo story is sharp: *"Post-op sepsis kills quietly at home. We catch it."*

### Users

| Role | Relationship to product |
|---|---|
| **Patient** (primary) | Receives phone calls; answers questions; is the monitored subject. |
| **Caregiver** (secondary) | Listed at enrollment; receives escalation SMS. |
| **On-call nurse** (tertiary) | Sees clinician dashboard; receives nurse-level alerts; makes clinical decisions. |

Patient-centered by definition: the patient uses it and directly benefits. Nurse is the escalation target, not the operator.

### Success criteria (hackathon demo)

1. A live outbound call to a phone in the room. Conversation happens. Transcript and score appear on dashboard.
2. Three pre-recorded synthetic patient calls (day-1 baseline / day-3 drift / day-5 red) play through the real pipeline; deterioration trajectory visibly worsens on the dashboard.
3. Threshold-crossing call triggers escalation: SMS to caregiver phone, SMS to nurse phone, banner on dashboard.
4. Vector cohort search surfaces ≥1 similar prior case with outcome data.

### Out of scope (explicit)

- Any disease pattern outside post-op abdominal sepsis / dehiscence / ileus.
- Real EHR integration. Mock FHIR only.
- HIPAA-compliant production infrastructure. Demonstrate secure-by-design; acknowledge scope.
- Mobile app. Phone call + web dashboard only.
- Real patient data. Synthetic recordings plus one live judge call on stage.

### Clinical / legal framing

Sentinel is positioned as a **monitoring and alert tool, not a diagnostic device**. All alerts escalate to a licensed nurse who makes the clinical decision. Sentinel does not autonomously dial 911. This keeps the product FDA-wellness-adjacent rather than Class II medical device territory for the hackathon scope.

---

## 2. Architecture

### Component diagram

```
┌─────────────┐    ┌───────────────┐    ┌──────────────────┐
│  Enrollment │───▶│  MongoDB Atlas │◀──▶│  Clinician       │
│  (Web form) │    │  - patients    │    │  Dashboard       │
└─────────────┘    │  - care_plans  │    │  (Next.js)       │
                   │  - calls (ts)  │    └──────────────────┘
                   │  - alerts      │              ▲
                   │  - vectors     │              │
                   └───────────────┘              │
                           ▲                       │
                           │                       │
        ┌──────────────────┴───────┐               │
        │                          │               │
┌───────▼────────┐        ┌────────▼────────┐      │
│  Call Scheduler│        │  Call Handler   │      │
│  (APScheduler) │─trigger▶│  (FastAPI)     │──────┘
└────────────────┘        │                 │
                          │  Twilio voice   │
                          │  ElevenLabs     │
                          │  Conversational │
                          │  AI (WebSocket) │
                          └────────┬────────┘
                                   │ transcript+audio
                                   ▼
                          ┌─────────────────┐
                          │  Scoring Engine │
                          │  - Gemini (text)│
                          │  - audio feats  │
                          │    (openSMILE)  │
                          └────────┬────────┘
                                   │ score
                                   ▼
                          ┌─────────────────┐
                          │  Escalation     │
                          │  (Twilio SMS)   │
                          └─────────────────┘
```

### Unit responsibilities

| Unit | Purpose | Depends on |
|---|---|---|
| Enrollment | Capture patient, care plan, contacts, consent | Mongo |
| Scheduler | Fire calls per schedule (2×/day by default) | Mongo; triggers Call Handler |
| Call Handler | Orchestrate outbound call; bridge Twilio ↔ ElevenLabs; capture transcript + audio | Twilio, ElevenLabs, Mongo |
| Scoring Engine | Transcript + audio + history → deterioration score + structured reasoning | Gemini, openSMILE, Mongo |
| Escalation | Route alerts per severity (patient / caregiver / nurse / 911-suggestion) | Twilio SMS, Mongo |
| Dashboard | Clinician view: trajectory, alert feed, cohort-match panel | Mongo |
| Vector layer | Transcript embeddings; cohort similarity search | Mongo Atlas Vector |

### Boundaries & rationale

- **Call Handler knows nothing about scoring.** It hands off transcript and audio and moves on. Scoring may be slow; calls must not wait for it.
- **Scheduler is independent.** A cron failure cannot kill in-progress calls.
- **Escalation is a pure function** of `(score, policy, contacts)` — trivial to unit-test exhaustively.

### Tech choices

| Concern | Choice | Reason |
|---|---|---|
| Backend language | Python 3.11 + FastAPI | Good audio libs; solid Twilio and Gemini SDKs |
| In-process scheduling | APScheduler | No Celery/Temporal overhead for hackathon |
| Frontend | Next.js + Tailwind + Recharts | Fast to ship; trajectory charts need Recharts |
| Telephony | Twilio Voice + SMS | Outbound calls + Media Streams |
| Voice conversation | ElevenLabs Conversational AI (WebSocket) | Real-time, low-latency, agent config API |
| LLM reasoning | Gemini 2.x | Long-context for multi-call history; native function calling |
| Database | MongoDB Atlas | Time-series collections + native vector index in one store |
| Audio features | openSMILE (eGeMAPS) via opensmile-python | Published feature set used in clinical voice research |
| Hosting (demo) | Fly.io or Render + ngrok for Twilio webhooks | One-command deploy |

---

## 3. Data Flow

### End-to-end: one call

1. **Scheduler fires** at scheduled time.
   - Reads patients where `next_call_at <= now`.
   - POSTs Call Handler: `{patient_id}`.
2. **Call Handler** initiates.
   - Loads patient, care plan, and last three calls from Mongo.
   - Builds ElevenLabs agent config: base prompt + care plan summary + context from prior call ("last call you mentioned abdominal soreness at 4/10").
   - Twilio creates the outbound call; Media Stream is bridged to the ElevenLabs WebSocket.
   - ElevenLabs runs a ≤90-second, ≤12-turn conversation. Transcript events and audio chunks stream in.
   - On hangup: raw audio written to object storage (S3-compatible); transcript written to Mongo `calls`.
3. **Scoring Engine** (triggered on call end, async).
   - openSMILE → eGeMAPS feature vector.
   - Compute drift vs patient baseline (day-1 features); z-score per feature.
   - Send transcript + drift vector + last-three-calls history to Gemini with a function-calling schema.
   - Gemini embeds transcript → Mongo vector index.
   - Vector search: three most-similar prior calls in the cohort; outcomes attached.
   - Write score + similar cases to the call document.
4. **Escalation**.
   - Switch on `recommended_action`:
     - `none` / `patient_check` → logged only.
     - `caregiver_alert` → SMS caregiver.
     - `nurse_alert` → SMS nurse + dashboard banner.
     - `suggest_911` → SMS caregiver + SMS nurse + dashboard 911-prompt.
   - Write to `alerts` collection.
5. **Dashboard**.
   - Websocket push (or 5-second poll) updates trajectory chart and alert feed.

### Gemini function-calling schema

```
emit_score(
  deterioration: float,            # 0.0–1.0
  qsofa: int,                      # 0–3
  news2: int,                      # 0–20
  red_flags: string[],             # e.g. ["tachypnea","confusion_markers"]
  summary: string,                 # 1–2 sentence clinical summary
  recommended_action: "none" | "patient_check" | "caregiver_alert"
                    | "nurse_alert" | "suggest_911"
)
```

---

## 4. Data Model (MongoDB Atlas)

```js
// patients
{
  _id, name, phone, language,
  surgery_type: "lap_chole" | "appy" | "csection" | "ex_lap",
  surgery_date, discharge_date,
  caregiver: { name, phone },
  assigned_nurse_id,
  enrollment_day: 0..14,
  next_call_at, call_count,
  consent: { recorded_at, ip, version }
}

// care_plans
{ _id, patient_id, meds[], red_flags[], allergies[], goals_of_care }

// calls  (time-series: timeField=called_at, metaField=patient_id)
{
  _id, patient_id, called_at, duration_s,
  transcript: [{ role, text, t_start, t_end }],
  audio_url,
  audio_features: {
    f0_mean, jitter, shimmer, speech_rate, pause_ratio,
    breaths_per_min, hnr, ...
  },
  baseline_drift: { ...same_keys_as_features, zscore },
  score: {
    deterioration: 0.62,
    qsofa: 2,
    news2: 6,
    red_flags: ["tachypnea", "confusion_markers"],
    summary: "...",
    recommended_action: "nurse_alert"
  },
  similar_calls: [{ call_id, similarity, outcome }],
  embedding: [...]               // 1536 floats (vector index)
}

// alerts
{ _id, patient_id, call_id, severity, channel[], sent_at,
  acknowledged_by, ack_at }

// cohort_outcomes  (seeded synthetic for demo)
{ _id, case_id, surgery_type, day, summary, embedding,
  outcome: "recovered" | "readmitted" | "sepsis" | "died" }
```

### Indexes

- `patients.next_call_at`
- `calls` time-series on `patient_id`
- `calls.embedding` vector (cosine, 1536 dims)
- `cohort_outcomes.embedding` vector

---

## 5. Signals & Grounding

No model training occurs during the hackathon. Three signal layers:

### Vocal biomarkers (engineered, no training)

openSMILE eGeMAPS feature set — 88 features including jitter, shimmer, HNR, F0 statistics, speech rate, and pause ratio. Each call is compared to the patient's own day-1 baseline via z-score drift. Published thresholds from respiratory-distress literature inform warning levels (e.g., breaths/min ≥ 22 per qSOFA).

### Red-flag classification (prompt-based)

Rubric hardcoded in the Gemini system prompt, grounded in published clinical scores:
- **qSOFA** — respiratory rate ≥22, altered mentation, SBP ≤100 (sepsis screen).
- **NEWS2** — UK NHS deterioration score.
- **Post-operative warning signs** — dehiscence, ileus, SSI per ACS NSQIP.

Gemini extracts reported symptoms, confusion markers, and response latency, then emits a structured score via function calling.

### Cohort similarity (embeddings)

Gemini embeddings over call transcripts, indexed in MongoDB Atlas Vector. Seeded with synthetic cases with labeled outcomes for demo. Similar prior calls are surfaced on the dashboard with their outcomes.

### Post-hackathon validation plan (reference only)

- **Coswara** (IISc) — respiratory voice, CC-BY, for vocal distress baseline calibration.
- **Cambridge COVID-19 Sounds** — breathing/cough audio, research license, for respiratory distress.
- **DAIC-WOZ** — clinical interview audio, for confusion/affect features.
- **MIMIC-IV / eICU-CRD** — PhysioNet credentialed, for text red-flag validation and deterioration patterns.

None are used during the hackathon. Credentialed datasets require weeks of approval.

---

## 6. Error Handling

| Failure | Detection | Response |
|---|---|---|
| Patient doesn't answer | Twilio `no-answer` / `busy` | Retry after 15 min, max 3/day. After 3 no-answers: SMS caregiver "can't reach [name], please check in." |
| Patient hangs up mid-call | Call ended <20 s | Score what we have; set `short_call=true`; lower confidence weight. |
| ElevenLabs WebSocket drops | Connection close | Reconnect once; if that fails, fall back to Twilio TwiML + pre-recorded prompts (minimum-viable check-in) with Twilio STT transcript. |
| Gemini failure / timeout | Exception or >30 s | Retry once with shorter context. If still failing: **rules-only score** from audio features + keyword match on red flags. Set `llm_degraded=true`. |
| Mongo write failure | Driver exception | Write to local SQLite dead-letter queue; dashboard banner "writes degraded"; replay on recovery. |
| Twilio SMS failure | Webhook error status | Retry once; then log `escalation_failed=true`; red banner on dashboard — on-call nurse must be reached by any available channel. Never silently swallow. |
| Score crosses threshold but no alert sent | 5-min audit cron | Any `recommended_action` in `{nurse_alert, suggest_911}` without a corresponding alert in the last 10 min → page SRE and flood dashboard. |
| Missing consent | Enrollment check | Reject call scheduling. No call fires without a recorded consent artifact. |
| Language mismatch | Patient language ≠ prompt language | Detect on first call; switch agent voice and prompt language on next call. |
| Audio feature extraction fails | openSMILE exception | Score on transcript alone; set `audio_degraded=true`. |

### Principles

- **Never silently drop an alert.** Every escalation path has a dead-man's-switch audit.
- **Degrade, don't die.** Each subsystem has a rules-only fallback.
- **Auditable.** Every decision writes score inputs + model version + prompt hash.

---

## 7. Testing

### Unit (CI-fast)

- **Scoring Engine:** given transcript X + features Y → expected structured score. Table-driven.
- **Escalation policy:** pure function `(score, config, contacts) → actions[]`. Exhaustive threshold coverage.
- **Audio feature extractor:** fixed WAV → known feature vector (snapshot test).
- **Consent gate:** scheduler refuses a patient without a consent document.

### Integration (mocked telephony)

- Fake Twilio webhook → Call Handler → Mongo writes verified.
- Fake ElevenLabs WS event stream → transcript assembly + audio capture.
- Gemini responses stubbed with canned JSON → full scoring path.

### End-to-end (demo-validation)

- Three pre-recorded audio files (baseline / drift / red) replayed through the pipeline → dashboard shows yellow → red trajectory.
- Live Twilio call to a team phone → real round-trip.
- Escalation: threshold-crossing call fires SMS to judge's phone (with explicit permission).

### Clinical "validation" (honest framing for slide)

Not a clinical trial. The rubric is guideline-based (qSOFA, NEWS2). The audio features are published. Cohort matching is exploratory. Next step post-hackathon is an IRB-backed pilot with a single surgical service.

### Load

Ten concurrent calls. Hackathon will not see more. Stubbed.

---

## 8. Side-Track Coverage

| Track | How Sentinel uses it (meaningfully) |
|---|---|
| **Gemini** | Long-context reasoning across multiple prior calls; native function calling to emit structured clinical score; embeddings for transcript similarity. |
| **ElevenLabs** | Conversational AI as the call agent (real-time WebSocket), with empathetic voice tuned to post-op patients. Optional voice cloning of discharge nurse (with consent). |
| **MongoDB** | Time-series collection for per-patient call trajectory; native Atlas Vector Search for cohort similarity; single store for operational and analytical data. |
| **Startup** | Buyer is the hospital. ROI ties to CMS HRRP readmission penalties and sepsis-bundle performance (~$5k per avoided episode). SaaS per enrolled patient; pilot-first GTM into surgical services. |

---

## 9. Demo Plan (on stage)

1. Dashboard open. Three fake patients enrolled.
2. Play day-1 baseline call for Patient A. Green trajectory.
3. Play day-3 drift call. Yellow trajectory; subtle red flags surfaced.
4. Play day-5 red call. Red trajectory; SMS fires to caregiver and nurse phones (visible on stage). Vector panel shows three similar prior cases, two of whom developed sepsis.
5. Ask a judge to hand over their phone. Live outbound call to the judge. Round-trip transcript appears on dashboard.

---

## 10. Open Risks

- **Audio biomarker accuracy in 36 hours** — mitigate by using published features and patient-own baseline z-scores, not an ML model trained from scratch.
- **Telephony plumbing time** — Twilio Media Streams ↔ ElevenLabs WebSocket bridge is the single biggest unknown. Prototype this Hour 1.
- **Voice cloning consent on stage** — if cloning the discharge nurse voice is demoed, make consent framing unambiguous.
- **Liability framing** — "alert, not diagnose." Keep language tight in UI and pitch.
- **Hallucinated clinical advice** — enforce Gemini function-calling output only; reject free-form answers in the call agent outside the care-plan context.
