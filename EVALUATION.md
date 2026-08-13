# Evaluation Strategy & Metrics — PII Redaction Tool

## 1. Overview

This document describes the evaluation methodology for the PII Redaction Tool, covering both the text-based detection pipeline and the image redaction pipeline. The goal is to make every detection decision traceable, reproducible, and defensible in an audit or review setting.

---

## 2. Evaluation Philosophy

PII redaction is a **recall-critical** task. Missing a single piece of PII (a false negative) is far more damaging than over-redacting a safe value (a false positive). The evaluation framework reflects this asymmetry:

- **Recall is the primary metric.** Any FN (missed PII) is a compliance failure.
- **Precision is the secondary metric.** Unnecessary redactions degrade document utility.
- **F1** balances both and is used for overall ranking across entity types.

---

## 3. Ground-Truth (Golden Set) Construction

### 3.1 Annotation Process

A held-out set of test documents is manually annotated before running them through the pipeline. Annotation covers:

| Attribute | Description |
|-----------|-------------|
| `entity_type` | Canonical type (e.g. `PAN`, `EMAIL`, `PERSON`) |
| `text` | Exact string as it appears in the document |
| `start` / `end` | Character offsets in the document's full text |
| `source` | Text paragraph or image filename (e.g. `word/media/image1.png`) |
| `region` | For images: bounding box `{x, y, width, height}` in pixels |
| `notes` | Annotator comments for edge cases |

### 3.2 What counts as PII (annotated)

The following entity types are included in the golden set:

| Entity Type | Examples | Detection Layer |
|-------------|----------|-----------------|
| `PERSON` | Full names, names with salutations | NER (Presidio / fallback) |
| `EMAIL` | Any valid email address | Regex |
| `PHONE_IN` | Indian mobile numbers (`+91`, 10-digit) | Regex |
| `PHONE_INTL` | Non-Indian international numbers | Regex |
| `AADHAAR` | 12-digit Aadhaar in grouped or plain format | Regex |
| `PAN` | Indian PAN: 5 letters + 4 digits + 1 letter | Regex |
| `CREDIT_CARD` | 13–19 digit card numbers (Luhn-valid only) | Regex + Luhn validator |
| `SSN` | US Social Security Numbers | Regex |
| `DOB` | Dates of birth (various formats, context-gated) | Regex + context boost |
| `PASSPORT` | Indian passport numbers | Regex |
| `DRIVING_LICENSE` | Indian DL format | Regex |
| `ADDRESS` | Street addresses, postal addresses | NER |
| `ORG` | Company names with Pvt Ltd / LLP / Inc suffixes | NER + suffix patterns |
| `IP_V4` | Valid IPv4 addresses (octet-range validated) | Regex + validator |
| `IP_V6` | Full IPv6 addresses | Regex |
| `IMAGE_PII` | Any PII detected in an embedded image | OCR + image pipeline |

### 3.3 What is deliberately NOT annotated as PII

The following are explicitly excluded and treated as true negatives (TN):

| Pattern | Reason for exclusion |
|---------|----------------------|
| Ticket / order / reference IDs (e.g. `TCK-2024-00931`, `ORD-12345`) | Internal sequential IDs that match number patterns but carry no personal identity |
| Dates that are not DOBs (e.g. invoice dates, policy dates) | Without a DOB context keyword nearby, date strings are suppressed to avoid false positives |
| IP addresses in log file headers or technical boilerplate | Out of document context — not personal; excluded via context rules |
| Company registration numbers | Structured numeric IDs for legal entities, not individuals |
| Lorem ipsum / placeholder text | Non-real content with zero PII risk |

These exclusions are enforced in `regexDetector.js` via `EXCLUSION_PATTERNS` and context-gating on the `DOB` type.

---

## 4. Metrics Definitions

### 4.1 Per-Entity-Type and Overall Metrics

For each entity type `T`, given the set of all spans across the golden set:

| Metric | Formula | Meaning |
|--------|---------|---------|
| **True Positive (TP)** | Detected span that matches a golden annotation | Correctly identified PII |
| **False Positive (FP)** | Detected span with no matching golden annotation | Over-redaction / wrong flag |
| **False Negative (FN)** | Golden annotation with no matching detection | Missed PII — compliance failure |
| **True Negative (TN)** | Non-PII span correctly not flagged | Correct non-redaction |
| **Precision** | `TP / (TP + FP)` | Of all flagged instances, how many were real PII |
| **Recall** | `TP / (TP + FN)` | Of all real PII, how many were caught |
| **F1 Score** | `2 × Precision × Recall / (Precision + Recall)` | Harmonic mean of precision and recall |
| **Accuracy** | `(TP + TN) / (TP + TN + FP + FN)` | Overall correctness across all spans |

**Span matching rule:** A detected span is counted as a TP if its character overlap with a golden annotation exceeds 80% of the longer of the two spans (lenient matching to account for minor boundary disagreements).

### 4.2 Confidence Threshold

Entities with `confidence < 0.70` are routed to human review (`PENDING_REVIEW`) before the final redaction pass. The evaluation metrics reported below are computed on the **final** set of entities (after reviewer accept/reject), not on raw detector output. This reflects the real system output, not a hypothetical ideal.

---

## 5. Text Pipeline Evaluation

### 5.1 Per-Type Results (design targets)

The table below describes the expected performance characteristics of each detection layer, based on the implementation design and the known properties of the underlying patterns:

| Entity Type | Expected Precision | Expected Recall | Notes |
|-------------|-------------------|-----------------|-------|
| `EMAIL` | ≥ 0.99 | ≥ 0.99 | RFC-5321 regex with full domain validation |
| `PAN` | ≥ 0.99 | ≥ 0.99 | Fixed alphanumeric structure is unambiguous |
| `AADHAAR` | ≥ 0.97 | ≥ 0.95 | First digit `[2-9]` rule cuts most numeric FPs |
| `CREDIT_CARD` | ≥ 0.95 | ≥ 0.90 | Luhn validation eliminates random number FPs |
| `SSN` | ≥ 0.95 | ≥ 0.93 | Distinct `NNN-NN-NNNN` format |
| `PHONE_IN` | ≥ 0.93 | ≥ 0.92 | `[6-9]\d{9}` pattern with `+91` normalization |
| `PHONE_INTL` | ≥ 0.88 | ≥ 0.85 | Broader pattern — some FPs in financial tables |
| `IP_V4` | ≥ 0.90 | ≥ 0.90 | Octet validation removes `999.x.x.x` FPs |
| `PASSPORT` | ≥ 0.80 | ≥ 0.78 | Pattern overlaps with some product codes |
| `DRIVING_LICENSE` | ≥ 0.80 | ≥ 0.78 | State-code prefix adds specificity |
| `DOB` | ≥ 0.82 | ≥ 0.75 | Context keyword gate required; bare dates suppressed |
| `PERSON` | ≥ 0.80 | ≥ 0.78 | NER-dependent; salutation heuristic for fallback |
| `ORG` | ≥ 0.72 | ≥ 0.70 | Suffix patterns help; generic NER misses India-specific entities |
| `ADDRESS` | ≥ 0.75 | ≥ 0.70 | Most variable type; NER handles free-form text |

### 5.2 False Positive / False Negative Examples

**Known false positive patterns:**

| FP Pattern | Entity Type Triggered | Why It's a FP | Fix Applied |
|------------|----------------------|---------------|-------------|
| `TCK-2024-00931` | Would match DOB/numeric | Internal ticket ID, not personal | `EXCLUSION_PATTERNS` in regexDetector.js |
| `192.168.1.1` in a network config section | `IP_V4` | Technically a valid IP but not PII in context | Accepted as low-risk FP; policy allows `KEEP` |
| Invoice dates (`15/03/2024`) | `DOB` | Date format matches DOB regex | Context-gating: only flagged if DOB keyword is within ±60 chars |
| Product serial numbers like `AB12 3456 7890` | `AADHAAR` | 12-digit grouped number | First-digit `[2-9]` constraint reduces this |

**Known false negative patterns:**

| FN Pattern | Entity Type | Why It's Missed | Mitigation |
|------------|-------------|-----------------|------------|
| Names without salutations (e.g. "Rashi Patil") | `PERSON` | Fallback NER only triggers on `Mr./Mrs./Dr.` prefixes | Resolved when Presidio Python service is running |
| Aadhar number with non-space separator (e.g. `2345-6789-0123`) | `AADHAAR` | Regex expects space or no separator | Mitigated by OCR field detection on ID images |
| Handwritten or stylized text in images | `IMAGE_PII` | OCR accuracy drops on non-printed fonts | EasyOCR preferred over Tesseract for multilingual content |

---

## 6. Image Pipeline Evaluation

### 6.1 Image Classification Accuracy

Each embedded image is classified before PII extraction. Classification uses a heuristic cascade: aspect ratio → OCR text density → keyword hits (`"INCOME TAX DEPARTMENT"`, `"आधार"`, `"Government of India"`).

| Image Type | Classification Target |
|------------|----------------------|
| Aadhar card | Routed to full field-level redaction |
| PAN card | Routed to full field-level redaction |
| Passport scan | Routed to full field-level redaction |
| Driver's licence | Routed to full field-level redaction |
| Signature | Masked as `IMAGE_PII` |
| QR code | Decoded (if possible) + masked unconditionally |
| Logo / decorative | Excluded from redaction pipeline |

### 6.2 Image PII Region Detection

For each image processed through OCR + field detection:

| Region Type | Detection Method | Redaction Method |
|-------------|-----------------|-----------------|
| Name field | OCR + NER on extracted text with bbox | Opaque black rectangle |
| DOB / date field | OCR + regex with `"DOB"` anchor | Opaque black rectangle |
| ID number (PAN/Aadhaar) | OCR + structural field detection | Opaque black rectangle |
| Address | OCR + NER | Opaque black rectangle |
| Face photo | Structural position detection (top-right on Aadhaar/PAN) | Opaque black rectangle |
| QR code | QR decoder + unconditional masking | Opaque black rectangle |
| Signature | Structural position detection | Opaque black rectangle |

### 6.3 Layered / Hidden Image Handling

**Critical design requirement:** Every image in `word/media/` is processed independently, regardless of z-order or visibility in the document layout. If an image is overlaid by another shape in the DOCX XML, both the overlay and the underlying image are fully redacted. This prevents the attack vector where a user drags the top image away in the output document to reveal unredacted content beneath.

**Evaluation check for layered images:**

For test documents containing overlapping images (e.g. PAN card placed over Aadhaar card):

1. Extract all images from `word/media/` via `extractImages()` in `docxProcessor.js`.
2. Verify each image is individually redacted (separate `redactedImages` map entry).
3. Re-open the output `.docx` and confirm all `word/media/` images are opaque.

### 6.4 Redaction Method: Opaque Masking

All image regions are redacted with solid black (or neutral gray) filled rectangles, not blur or pixelation. This choice is intentional:

- Gaussian blur is reversible with deblurring algorithms.
- Pixelation is reversible with super-resolution techniques.
- Opaque masking is the industry-standard, legally defensible method (used in DoD and legal document redaction).

Optionally, a `[REDACTED]` label is overlaid at the center of each masked region so reviewers can see that redaction occurred without seeing the original content.

---

## 7. Evaluation Pipeline Implementation

Evaluation is computed at the end of every job run in `redactionWorker.js → computeEvaluation()`. The computed metrics are stored in MongoDB under `job.evaluation`:

```json
{
  "overall": {
    "precision": 0.94,
    "recall": 0.91,
    "f1": 0.925,
    "accuracy": 0.94
  },
  "byType": [
    { "entityType": "PAN",    "tp": 3, "fp": 0, "fn": 0, "precision": 1.0, "recall": 1.0, "f1": 1.0 },
    { "entityType": "EMAIL",  "tp": 5, "fp": 0, "fn": 0, "precision": 1.0, "recall": 1.0, "f1": 1.0 },
    { "entityType": "PERSON", "tp": 4, "fp": 1, "fn": 1, "precision": 0.8, "recall": 0.8, "f1": 0.8 }
  ],
  "imageMetrics": {
    "totalImages": 2,
    "imagesWithPii": 2,
    "regionsRedacted": 2
  }
}
```

This is returned via the `/api/jobs/:id` endpoint and rendered as a metrics dashboard in the Next.js frontend.

### 7.1 Trending Across Jobs

Because evaluation results are persisted per job in MongoDB, it is possible to:

- Track precision/recall trends over time and across document types.
- Identify systematic regressions (e.g., a new document format that degrades recall).
- Filter by entity type or document source to identify weak spots.

This turns the tool from a one-off script into an auditable, improvable compliance pipeline.

---

## 8. Human-in-the-Loop Review

Entities with `confidence < 0.70` are flagged as `PENDING_REVIEW` and the job transitions to `awaiting_review` status. The frontend presents these detections with bounding-box highlights and an accept/reject toggle.

- **Accepted** detections proceed to redaction.
- **Rejected** detections are marked with `reviewerAction: "REJECTED"` and `action: "KEEP"`.

Reviewer decisions are logged immutably in `job.auditLog` and factored into the final evaluation metrics, reflecting the actual system output rather than the raw detector performance.

---

## 9. Evaluation Limitations and Known Gaps

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Presidio Python service unavailable | NER falls back to salutation-based heuristic; recall drops for unstructured names | Run `uvicorn python_service.main:app --port 8000` for full NER capability |
| OCR accuracy on low-resolution or handwritten images | Image PII may be missed | Recommend EasyOCR over Tesseract for multilingual/Devanagari content |
| Golden set size | Small golden sets produce high-variance metrics | Grow the annotated set with each new document type processed |
| Pseudonymized values are deterministic (seeded from hash) | An attacker with access to the seed and entity type could reverse-engineer | The seed includes `jobId` which is not public; reversibility requires DB access |
| No automated CI evaluation run | Regressions may go undetected | Add `scripts/evaluate.ts` integration test that runs the golden set on each PR |

---

## 10. Extending the Evaluation

To add a new entity type to the evaluation:

1. Add a recognizer in `regexDetector.js` (structured) or extend `presidioClient.js` (unstructured).
2. Add golden-set annotations for the new type in `test-documents/golden/`.
3. The `computeEvaluation()` function in `redactionWorker.js` will automatically include the new type in `byType` metrics on the next run — no changes needed to the evaluation logic.

This follows the `PIIDetector` interface pattern: `detect(text) → Entity[]`.
