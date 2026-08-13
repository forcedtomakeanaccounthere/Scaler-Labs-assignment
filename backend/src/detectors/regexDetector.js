/**
 * RegexDetector — pattern-based PII detection for structured formats.
 *
 * Design decisions:
 * - Luhn check on credit card numbers to eliminate false positives
 * - Sequential/ticket IDs (TCK-2024-00931, ORD-12345, etc.) are NOT flagged
 * - Context boosting: numbers near "PAN", "Aadhaar", "DOB" get confidence bump
 */

// ── Patterns ────────────────────────────────────────────────────────────────
const PATTERNS = [
  {
    type: "EMAIL",
    regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    confidence: 0.99,
  },
  {
    type: "PHONE_IN",
    regex: /(?<!\d)(\+91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}(?!\d)/g,
    confidence: 0.93,
  },
  {
    type: "PHONE_INTL",
    regex: /\+[1-9]\d{1,3}[\s\-]?\d{3,5}[\s\-]?\d{4,7}(?!\d)/g,
    confidence: 0.88,
  },
  {
    type: "AADHAAR",
    // 12-digit number in groups of 4 (e.g. 2345 6789 0123 or 234567890123)
    regex: /\b[2-9]\d{3}[\s]?\d{4}[\s]?\d{4}\b/g,
    confidence: 0.97,
  },
  {
    type: "PAN",
    // Indian PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    confidence: 0.99,
  },
  {
    type: "CREDIT_CARD",
    // 16-digit card numbers (also 13, 15 for Amex/Discover)
    regex: /\b(?:\d{4}[\s\-]?){3}\d{4}\b|\b\d{15,16}\b/g,
    confidence: 0.95,
    validate: luhnCheck,
  },
  {
    type: "SSN",
    regex: /\b\d{3}[\-\s]\d{2}[\-\s]\d{4}\b/g,
    confidence: 0.95,
  },
  {
    type: "IP_V4",
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    confidence: 0.90,
    validate: isValidIpv4,
  },
  {
    type: "IP_V6",
    regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    confidence: 0.90,
  },
  {
    type: "DOB",
    // dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
    regex: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g,
    confidence: 0.75,  // Low base — needs context boost
  },
  {
    type: "PASSPORT",
    // Indian passport: A-Z followed by 7 digits
    regex: /\b[A-Z][0-9]{7}\b/g,
    confidence: 0.80,
  },
  {
    type: "DRIVING_LICENSE",
    // Generic Indian DL: state code + 13 digits
    regex: /\b[A-Z]{2}[0-9]{2}[\s\-]?[0-9]{11}\b/g,
    confidence: 0.80,
  },
];

// Keywords that boost confidence for nearby detections
const CONTEXT_BOOST_KEYWORDS = {
  AADHAAR: ["aadhaar", "aadhar", "uid", "आधार"],
  PAN: ["pan", "pan no", "permanent account", "income tax"],
  DOB: ["dob", "date of birth", "जन्म तिथि", "born", "birth date"],
  CREDIT_CARD: ["card no", "card number", "credit", "debit"],
  PASSPORT: ["passport", "passport no"],
  DRIVING_LICENSE: ["dl no", "driving licence", "driving license"],
};

// Patterns that indicate the match is NOT PII (ticket IDs, order IDs, etc.)
const EXCLUSION_PATTERNS = [
  /^(?:TCK|ORD|REF|INV|CASE|TXN|ID|NO|SR)[\-\s]?\d+/i,
  /^[A-Z]{2,4}-\d{4}-\d{4,}/,  // e.g. TCK-2024-00931
];

/**
 * Detect PII entities in a text string.
 * @param {string} text
 * @returns {Array<{type, text, start, end, confidence, source}>}
 */
export function detectPII(text) {
  if (!text || typeof text !== "string") return [];

  const results = [];
  const textLower = text.toLowerCase();

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0].trim();
      const start = match.index;
      const end = start + matchText.length;

      // Skip if matches an exclusion pattern (ticket ID, order number, etc.)
      if (EXCLUSION_PATTERNS.some((ex) => ex.test(matchText))) {
        continue;
      }

      // Run custom validator if present
      if (pattern.validate && !pattern.validate(matchText)) {
        continue;
      }

      // Context window: ±60 chars around the match
      const contextStart = Math.max(0, start - 60);
      const contextEnd = Math.min(text.length, end + 60);
      const context = textLower.slice(contextStart, contextEnd);

      let confidence = pattern.confidence;

      // Context boost: if keywords are nearby, increase confidence
      const boostKeywords = CONTEXT_BOOST_KEYWORDS[pattern.type];
      if (boostKeywords) {
        const hasKeyword = boostKeywords.some((kw) => context.includes(kw));
        if (hasKeyword) {
          confidence = Math.min(0.99, confidence + 0.08);
        }
      }

      // DOB: only flag if confidence is high enough after context check
      if (pattern.type === "DOB" && confidence < 0.80) {
        continue;
      }

      results.push({
        type: pattern.type,
        text: matchText,
        start,
        end,
        confidence,
        source: "REGEX",
      });
    }
  }

  // Deduplicate: remove shorter overlapping matches
  return deduplicateEntities(results);
}

// ── Validators ──────────────────────────────────────────────────────────────

/**
 * Luhn algorithm for credit card validation.
 */
function luhnCheck(value) {
  const digits = value.replace(/[\s\-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/**
 * Basic IPv4 validity check (each octet 0-255).
 */
function isValidIpv4(value) {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

// ── Deduplication ───────────────────────────────────────────────────────────

/**
 * Remove overlapping entities, keeping the higher-confidence longer match.
 */
function deduplicateEntities(entities) {
  const sorted = [...entities].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (b.end - b.start) - (a.end - a.start);
  });

  const kept = [];
  for (const entity of sorted) {
    const overlaps = kept.some(
      (k) => entity.start < k.end && entity.end > k.start
    );
    if (!overlaps) kept.push(entity);
  }

  return kept.sort((a, b) => a.start - b.start);
}
