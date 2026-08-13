# PII Redaction Tool

A full-stack web application that ingests `.docx` files, detects all PII in both text and embedded images, and produces a redacted `.docx` along with a per-job evaluation report. Every redaction decision is traceable, scored, and stored in MongoDB for audit.

---

## Architecture

```
┌─────────────────────┐        REST API          ┌──────────────────────────┐
│  Next.js Frontend   │ ◄─────────────────────►  │   Express.js Backend     │
│  (App Router, TS)   │                          │   + BullMQ/Redis Queue   │
│  Drag-drop upload   │                          │   + Inline fallback      │
│  Before/After view  │                          └────────────┬─────────────┘
│  Review UI          │                                       │
│  Metrics dashboard  │                          ┌────────────▼─────────────┐
└─────────────────────┘                          │  Redaction Worker        │
                                                 │  ├─ RegexDetector        │
                                                 │  ├─ NER (Presidio/       │
                                                 │  │   fallback heuristic) │
                                                 │  ├─ Image OCR pipeline   │
                                                 │  └─ Pseudonymizer        │
                                                 └───────────┬──────────────┘
                                                             │
                                         ┌───────────────────┼──────────────┐
                                         │                   │              │
                                  ┌──────▼──────┐   ┌────────▼──────┐  ┌────▼────────┐
                                  │   MongoDB   │   │     Redis     │  │  Python     │
                                  │  (jobs,     │   │  (BullMQ job  │  │  FastAPI    │
                                  │  entities,  │   │   queue)      │  │  service    │
                                  │  pseudomap, │   └───────────────┘  │  (Presidio, │
                                  │  eval)      │                      │  OCR, img)  │
                                  └─────────────┘                      └─────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Express.js, BullMQ, Node.js ESM |
| Database | MongoDB (via Mongoose; in-memory fallback when disconnected) |
| Queue | Redis + BullMQ (in-process fallback when Redis unavailable) |
| NER / OCR | Python FastAPI microservice — Presidio, spaCy, Tesseract / EasyOCR |
| Auth | JWT + Google OAuth |

---

## Detection Approach

The pipeline uses a hybrid regex + NER architecture. See [EVALUATION.md](./EVALUATION.md) for full metrics and methodology.

### Regex Layer (`backend/src/detectors/regexDetector.js`)

Handles structured, high-precision formats where a pattern is unambiguous:

| Entity Type | Pattern Notes |
|-------------|--------------|
| `EMAIL` | RFC-5321 compliant |
| `PAN` | 5 letters + 4 digits + 1 letter — no false positives |
| `AADHAAR` | 12-digit starting `[2-9]`, grouped by spaces |
| `CREDIT_CARD` | 13–19 digits with **Luhn algorithm validation** to eliminate random number FPs |
| `PHONE_IN` | `[6-9]\d{9}` with optional `+91` prefix |
| `PHONE_INTL` | International format with country code |
| `SSN` | `NNN-NN-NNNN` |
| `DOB` | Multiple date formats — **context-gated**: only flagged if a DOB keyword (`dob`, `date of birth`, `जन्म तिथि`) is within ±60 characters |
| `IP_V4` | Octet-range validated (each part 0–255) |
| `IP_V6` | Full 8-group hex format |
| `PASSPORT` | Indian format: 1 letter + 7 digits |
| `DRIVING_LICENSE` | State code + 13 digits |

**Deliberately excluded (not flagged):**
- Ticket/order/reference IDs: `TCK-2024-00931`, `ORD-12345`, `INV-001`, etc. — sequential internal IDs that share numeric structure with PII but carry no personal identity. Enforced via `EXCLUSION_PATTERNS` in `regexDetector.js`.
- Invoice/transaction dates lacking a DOB context keyword — suppressed via context-gating to avoid false positives in financial documents.

### NER Layer (`backend/src/detectors/presidioClient.js`)

Handles unstructured entities that regex cannot cover:

- **Primary:** Microsoft Presidio (`AnalyzerEngine`) via Python FastAPI microservice — covers `PERSON`, `LOCATION`, `ORG`, `DATE_TIME`, and India-specific recognizers (`IN_PAN`, `IN_AADHAAR`, `IN_VOTER`, etc.).
- **Fallback (when Python service is offline):** Heuristic patterns — salutation-prefixed names (`Mr./Mrs./Dr. + Capitalized Words`) and company suffix patterns (`Pvt Ltd`, `LLP`, `Inc`, `Limited`).

### Confidence Merging (`backend/src/detectors/piiDetector.js`)

When both layers detect overlapping spans, the higher-confidence entity wins. All entities carry a SHA-256 hash of the original text — raw PII values are never stored.

### Image Pipeline (`backend/src/workers/redactionWorker.js`)

Every image in `word/media/` is processed independently, regardless of z-order:

1. **Extract** all images from the DOCX ZIP, including hidden/overlapping ones.
2. **Classify** the image (ID document, signature, logo, decorative) via OCR keyword heuristics.
3. **OCR with bounding boxes** (Tesseract / EasyOCR) to get per-word coordinates.
4. **Field-level detection** using the same regex + NER stack on OCR output, with bbox attached to each match.
5. **Structural field detection** for known ID layouts (face photo, QR code, anchor-relative fields).
6. **Mask with opaque solid rectangles** — not blur or pixelation (both are reversible; this is the industry-standard defensible approach).
7. **Re-embed** redacted image at original relationship ID so document layout is preserved.

---

## Redaction Modes

Configurable per entity type in the UI (stored per job in MongoDB):

| Mode | Behavior | Example |
|------|----------|---------|
| **MASK** | Replace with block characters | `████████████` |
| **PSEUDONYMIZE** | Replace with consistent fake value (same real value → same fake within a document) | `Rashi Patil` → `Arjun Sharma` |
| **GENERALIZE** | Replace with approximate/categorical value | `15/03/1987` → `1980s` |
| **KEEP** | Do not redact (reviewer decision) | — |

Pseudonymization uses a seeded deterministic generator keyed on `SHA-256(originalText + jobId)` so the mapping is reproducible and auditable without storing raw PII.

---

## Evaluation & Metrics

Per-entity-type Precision, Recall, F1, and Accuracy are computed at the end of every job run and stored in `job.evaluation` in MongoDB. Results are rendered as a metrics dashboard in the Next.js UI.

See **[EVALUATION.md](./EVALUATION.md)** for:
- Golden set construction and annotation methodology
- Per-type expected precision / recall targets
- Known false positive and false negative patterns
- Image pipeline evaluation methodology
- Trending across jobs via MongoDB

---

## Deployment Overview

| Service | Host (recommended) | Notes |
|---------|--------------------|-------|
| Frontend | **Vercel** | Next.js app in `frontend/` |
| Backend | **Render** or **Railway** | Needs persistent worker + Redis |
| MongoDB | **MongoDB Atlas** | Managed, free tier available |
| Redis | **Upstash** or **Redis Cloud** | BullMQ job queue |
| Python service | Same Render instance or separate service | Presidio + OCR |

> Do **not** deploy the Express backend on Vercel — it requires a persistent worker process, file storage, and Redis.

---

## Local Development

```bash
# 1. Backend
cd backend
cp .env.example .env      # fill in MONGODB_URI, REDIS_URL, JWT_SECRET
npm install
npm run dev               # starts Express on :5000

# 2. Frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev               # starts Next.js on :3000

# 3. Optional: MongoDB + Redis via Docker
cd backend
docker compose up mongo redis
```

### Python Service (optional — enables full NER + image OCR)

```bash
pip install presidio-analyzer presidio-anonymizer spacy fastapi uvicorn easyocr
python -m spacy download en_core_web_lg
uvicorn python_service.main:app --port 8000
```

Without the Python service, the app runs in fallback mode:
- NER uses salutation + org-suffix heuristics.
- Image redaction uses a black rectangle (entire image masked).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Backend port (default: `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL (optional — enables BullMQ queue) |
| `JWT_SECRET` | Long random string for JWT signing |
| `PYTHON_SERVICE_URL` | URL of Python FastAPI service (default: `http://localhost:8000`) |
| `UPLOAD_DIR` | Local path for uploaded files (default: `uploads`) |
| `FRONTEND_URL` | Frontend origin for CORS |
| `GOOGLE_CLIENT_ID` | (optional) Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | (optional) Google OAuth client secret |
| `RECAPTCHA_SECRET_KEY` | (optional) Google reCAPTCHA secret |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | (optional) Google OAuth client ID |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | (optional) reCAPTCHA site key |

---

## Vercel Deployment (Frontend)

1. **Project Settings → General → Root Directory** → set to `frontend`
2. **Framework Preset:** Next.js (auto-detected)
3. **Environment Variables** → add `NEXT_PUBLIC_API_URL` pointing to your backend

---

## Backend Deployment (Render)

1. **Root Directory:** `backend`
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. Add a **Persistent Disk** mounted at `/app/uploads`
5. Set all backend environment variables listed above

---

## Redis (Production)

The backend reads `REDIS_URL` from the environment. Without it, jobs run in-process (no horizontal scaling).

**Upstash (recommended, free tier):**
```
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379
```

When Redis connects successfully, logs will show:
```
[Redis] Connected — BullMQ queue enabled
Redaction worker started: docx-redaction
```

---

## Google OAuth (Production)

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- **Authorized JavaScript origins:** `https://your-frontend.vercel.app`
- **Authorized redirect URIs:** `https://your-backend.onrender.com/api/auth/google/callback`

---

## Project Structure

```
.
├── backend/
│   └── src/
│       ├── config/          # App, DB, Redis, env configuration
│       ├── detectors/       # PIIDetector interface + Regex + Presidio NER
│       ├── middleware/       # JWT auth
│       ├── models/          # Job, PseudoMap, User (Mongoose + in-memory fallback)
│       ├── queues/          # BullMQ queue definitions
│       ├── routes/          # REST API routes (auth, jobs, health)
│       ├── utils/           # DocxProcessor, Pseudonymizer, reCAPTCHA
│       └── workers/         # RedactionWorker, ReportWorker
├── frontend/
│   └── src/
│       └── app/             # Next.js App Router pages and components
├── EVALUATION.md            # Evaluation methodology, metrics, FP/FN analysis
└── README.md
```

### Extensibility

The detector stack follows a `PIIDetector` interface pattern:

```js
// detect(text) → Entity[]
// Entity: { type, text, start, end, confidence, source }
```

To add a new PII type:
1. Add a pattern entry in `regexDetector.js` (structured) or extend `presidioClient.js` (unstructured).
2. Add fake-value generation for the type in `pseudonymizer.js`.
3. Annotate the type in your golden set.

The evaluation pipeline (`computeEvaluation` in `redactionWorker.js`) will automatically include the new type in `byType` metrics — no other changes needed.

---

## Security Notes

- Raw PII values are never stored. MongoDB holds `SHA-256(text)` hashes only.
- Uploaded files are purged after a configurable retention window (`job.purgeAt`, default 24 hours via MongoDB TTL index).
- The pseudonymization map is keyed by `SHA-256(originalText + jobId)` — reversible only by someone with both the raw value and DB access.
- All redaction decisions are logged immutably in `job.auditLog` (actor, action, timestamp, detail).
