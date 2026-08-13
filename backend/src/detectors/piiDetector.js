/**
 * PIIDetector — unified interface combining regex and NER layers.
 *
 * Extensibility: implement the same interface to add a new detector:
 *   { detect(text): Promise<Entity[]> }
 * Then register it in the detectors array below.
 */

import { detectPII } from "./regexDetector.js";
import { analyzeWithPresidio } from "./presidioClient.js";
import crypto from "crypto";

/**
 * Main detection entry point.
 * Runs all detectors, merges results, deduplicates by span overlap.
 *
 * @param {string} text
 * @returns {Promise<Array<Entity>>}
 */
export async function detectAllPII(text) {
  if (!text) return [];

  const [regexEntities, nerEntities] = await Promise.all([
    Promise.resolve(detectPII(text)),
    analyzeWithPresidio(text),
  ]);

  // Merge: prefer higher-confidence entity when spans overlap
  const merged = mergeEntities([...regexEntities, ...nerEntities]);

  // Attach content hash (SHA-256 of the raw text) — never store raw PII
  return merged.map((e) => ({
    ...e,
    textHash: sha256(e.text),
  }));
}

/**
 * Merge overlapping entities from multiple detectors.
 * When two entities overlap, keep the higher-confidence one.
 */
function mergeEntities(entities) {
  // Sort by start position, then by confidence descending
  const sorted = [...entities].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.confidence - a.confidence;
  });

  const result = [];
  for (const entity of sorted) {
    const overlap = result.findIndex(
      (r) => entity.start < r.end && entity.end > r.start
    );

    if (overlap === -1) {
      result.push(entity);
    } else if (entity.confidence > result[overlap].confidence) {
      result[overlap] = entity;
    }
    // else: existing entity wins, discard this one
  }

  return result;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text || "").digest("hex");
}
