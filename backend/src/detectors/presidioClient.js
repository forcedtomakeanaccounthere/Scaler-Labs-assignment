/**
 * PresidioClient — bridges to a Python Presidio / spaCy NER service.
 *
 * Architecture:
 * - The Node.js backend calls a lightweight Python FastAPI microservice
 *   that runs Presidio AnalyzerEngine.
 * - If the Python service is unavailable, we fall back to built-in patterns.
 *
 * Python service expected endpoint:
 *   POST /analyze
 *   Body: { text: string, language: "en" }
 *   Response: { entities: [{ type, text, start, end, score }] }
 *
 * To run the Python service:
 *   pip install presidio-analyzer presidio-anonymizer spacy fastapi uvicorn
 *   python -m spacy download en_core_web_lg
 *   Then run: uvicorn python_service.main:app --port 8000
 */

import axios from "axios";
import { appConfig } from "../config/app.js";

const PYTHON_SERVICE_URL = appConfig.pythonServiceUrl;
let serviceAvailable = null; // null = untested, true/false after first attempt

/**
 * Run NER via Presidio Python service.
 * @param {string} text
 * @returns {Promise<Array<{type, text, start, end, confidence, source}>>}
 */
export async function analyzeWithPresidio(text) {
  if (!text) return [];

  // Fast-fail if already confirmed unavailable
  if (serviceAvailable === false) {
    return fallbackNer(text);
  }

  try {
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/analyze`,
      { text, language: "en" },
      { timeout: 10000 }
    );

    serviceAvailable = true;

    const raw = response.data?.entities || [];
    return raw
      .filter((e) => e.score >= 0.5)
      .map((e) => ({
        type: normalizePresidioType(e.type || e.entity_type),
        text: e.text || text.slice(e.start, e.end),
        start: e.start,
        end: e.end,
        confidence: e.score,
        source: "NER",
      }));
  } catch (err) {
    if (serviceAvailable === null) {
      console.warn(
        "[PresidioClient] Python service unavailable — using built-in NER fallback.",
        err.message
      );
      serviceAvailable = false;
    }
    return fallbackNer(text);
  }
}

/**
 * Map Presidio entity type names to our canonical set.
 */
function normalizePresidioType(type) {
  const map = {
    PERSON: "PERSON",
    EMAIL_ADDRESS: "EMAIL",
    PHONE_NUMBER: "PHONE",
    IN_PAN: "PAN",
    IN_AADHAAR: "AADHAAR",
    IN_VOTER: "VOTER_ID",
    IN_PASSPORT: "PASSPORT",
    IN_DRIVING_LICENSE: "DRIVING_LICENSE",
    CREDIT_CARD: "CREDIT_CARD",
    CRYPTO: "CRYPTO_WALLET",
    DATE_TIME: "DOB",
    LOCATION: "ADDRESS",
    ORGANIZATION: "ORG",
    IP_ADDRESS: "IP_V4",
    URL: "URL",
    NRP: "NATIONALITY",
    MEDICAL_LICENSE: "MEDICAL_ID",
  };
  return map[type] || type;
}

/**
 * Minimal built-in NER fallback when Python service is not running.
 * Uses simple heuristic patterns to catch common unstructured entities.
 *
 * NOTE: This is intentionally lightweight — the real NER power comes from
 * the Python Presidio service. This fallback handles basic cases.
 */
function fallbackNer(text) {
  const results = [];

  // Indian company/org suffixes
  const orgPattern = /\b[A-Z][a-zA-Z\s]+(?:Pvt\.?\s?Ltd\.?|LLP|Inc\.?|Corp\.?|Limited|Enterprises|Associates)\b/g;
  let m;
  while ((m = orgPattern.exec(text)) !== null) {
    results.push({
      type: "ORG",
      text: m[0].trim(),
      start: m.index,
      end: m.index + m[0].length,
      confidence: 0.72,
      source: "NER",
    });
  }

  // Very simple person name heuristic: "Mr./Mrs./Dr./Ms." followed by capitalized words
  const namePattern = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g;
  while ((m = namePattern.exec(text)) !== null) {
    results.push({
      type: "PERSON",
      text: m[0].trim(),
      start: m.index,
      end: m.index + m[0].length,
      confidence: 0.82,
      source: "NER",
    });
  }

  return results;
}
