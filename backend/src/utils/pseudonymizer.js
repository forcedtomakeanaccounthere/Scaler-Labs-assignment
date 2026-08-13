/**
 * Pseudonymizer — generates consistent fake replacement values.
 *
 * Per-document consistency: the same real value always maps to the same
 * fake value within a job. Uses SHA-256(originalValue + jobId) as the
 * lookup key so we never store the raw PII.
 *
 * NOTE: We use deterministic fake-value generation (seeded from the hash)
 * so the mapping is reproducible from the hash alone — no raw PII needed
 * in the database.
 */

import crypto from "crypto";
import PseudoMap from "../models/PseudoMap.js";

// Fake data pools — extended with more realistic variety
const FAKE_NAMES = [
  "Arjun Sharma", "Priya Nair", "Rohan Mehta", "Deepika Singh",
  "Vikram Patel", "Anjali Gupta", "Siddharth Kumar", "Kavya Reddy",
  "Rahul Verma", "Pooja Joshi", "Nikhil Agarwal", "Sunita Rao",
  "Manish Tiwari", "Swati Mishra", "Aakash Khanna", "Ritika Desai",
  "Amit Malhotra", "Neha Kapoor", "Rajesh Pillai", "Shruti Iyer",
  "Karthik Menon", "Divya Krishnan", "Sandeep Bose", "Meera Kulkarni",
  "Aditya Goswami", "Ritu Sinha", "Harish Narayanan", "Lakshmi Venkat",
  "Tarun Chopra", "Ananya Banerjee", "Vivek Saxena", "Sneha Jain",
];

const FAKE_DOMAINS = [
  "redacted.io", "example.org", "masked.net", "noreply.com",
  "private.email", "anonymous.io", "secure.dev", "temp.mail"
];

const FAKE_PHONE_PREFIXES = [
  "+91 70000", "+91 80000", "+91 90000", "+91 95000",
  "+91 98000", "+91 85000", "+1 555 0", "+44 20 7946"
];

const FAKE_AADHAAR_PREFIX = ["9999", "8888", "7777", "6666", "5555"];

const FAKE_PAN_CHARS = "XYZQWMNKJABCDPRTL";

const FAKE_ADDRESSES = [
  "123 Redacted Street, Anonymized City, 560001",
  "456 Privacy Lane, Data Town, 400001",
  "789 Secure Road, Protected District, 110001",
  "321 Confidential Avenue, Safe Harbor, 600001",
  "654 Anonymous Boulevard, Hidden Valley, 500001",
  "987 Masked Plaza, Secret Springs, 700001",
];

const FAKE_ORG_NAMES = [
  "Redacted Corp Ltd", "Anonymous Industries", "Confidential Enterprises",
  "Private Solutions Inc", "Secure Systems Pvt Ltd", "Protected Tech Ltd"
];

const FAKE_PASSPORT_PREFIX = ["X", "Y", "Z", "A", "B"];



/**
 * Get or create a pseudonymized value for a given entity.
 *
 * @param {string} jobId
 * @param {string} entityType
 * @param {string} originalText
 * @returns {Promise<string>} fake replacement value
 */
export async function getPseudonym(jobId, entityType, originalText) {
  const hash = sha256(`${originalText}::${jobId}`);

  // Check DB cache first (per-document consistency)
  const existing = await PseudoMap.findOne({
    jobId,
    originalHash: hash,
  }).lean();

  if (existing) return existing.fakeValue;

  // Generate deterministic fake value seeded from hash
  const fakeValue = generateFakeValue(entityType, hash);

  // Store in DB (upsert to handle race conditions)
  await PseudoMap.findOneAndUpdate(
    { jobId, originalHash: hash },
    { jobId, entityType, originalHash: hash, fakeValue },
    { upsert: true, new: true }
  );

  return fakeValue;
}

/**
 * Generate a fake value deterministically from a hash seed.
 * Uses the hash bytes to pick from pools — same hash always produces same output.
 */
function generateFakeValue(type, hash) {
  // Use first 8 hex chars as a numeric seed
  const seed = parseInt(hash.slice(0, 8), 16);

  const pick = (arr) => arr[seed % arr.length];

  switch (type) {
    case "PERSON":
      return pick(FAKE_NAMES);

    case "EMAIL": {
      const name = pick(FAKE_NAMES).toLowerCase().replace(/\s+/, ".");
      const domain = pick(FAKE_DOMAINS);
      return `${name}@${domain}`;
    }

    case "PHONE_IN":
    case "PHONE_INTL":
    case "PHONE": {
      const prefix = pick(FAKE_PHONE_PREFIXES);
      const suffix = String((seed % 99999)).padStart(5, "0");
      return `${prefix}${suffix}`;
    }

    case "AADHAAR": {
      const p = pick(FAKE_AADHAAR_PREFIX);
      const mid = String((seed % 9999)).padStart(4, "0");
      const end = String((seed >> 4) % 9999).padStart(4, "0");
      return `${p} ${mid} ${end}`;
    }

    case "PAN": {
      const letters = FAKE_PAN_CHARS;
      const l = (i) => letters[(seed + i) % letters.length];
      const digits = String((seed % 9999) + 1000).slice(-4);
      return `${l(0)}${l(1)}${l(2)}${l(3)}${l(4)}${digits}${l(5)}`;
    }

    case "CREDIT_CARD": {
      // Generate a Luhn-valid fake card number
      const prefix = ["4000", "5100", "3714"][seed % 3];
      const mid1 = String((seed % 9999) + 1000).slice(-4);
      const mid2 = String((seed >> 2) % 9999 + 1000).slice(-4);
      return `${prefix} ${mid1} ${mid2} ${luhnComplete(prefix + mid1 + mid2)}`;
    }

    case "DOB": {
      const year = 1960 + (seed % 40);
      const month = String((seed % 12) + 1).padStart(2, "0");
      const day = String((seed % 28) + 1).padStart(2, "0");
      return `${day}/${month}/${year}`;
    }

    case "ADDRESS":
      return pick(FAKE_ADDRESSES);

    case "ORG":
      return pick(FAKE_ORG_NAMES);
    
    case "PASSPORT": {
      const prefix = pick(FAKE_PASSPORT_PREFIX);
      const num = String((seed % 9999999) + 1000000).slice(-7);
      return `${prefix}${num}`;
    }

    case "IP_V4": {
      const o1 = 192;
      const o2 = 168;
      const o3 = seed % 255;
      const o4 = (seed >> 4) % 255;
      return `${o1}.${o2}.${o3}.${o4}`;
    }

    default:
      return "[REDACTED]";
  }
}

/**
 * Complete a partial card number with a valid Luhn check digit.
 */
function luhnComplete(partial) {
  const digits = partial.replace(/\D/g, "");
  // Calculate what last digit needs to be
  let sum = 0;
  let isEven = true; // we're adding one more digit (at end), so start from isEven=true
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
