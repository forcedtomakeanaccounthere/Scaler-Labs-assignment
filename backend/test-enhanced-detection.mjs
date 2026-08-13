/**
 * Test script for enhanced PII detection patterns
 * Tests the new improvements for detecting names, companies, phones, and URLs
 */

import { detectPII } from "./src/detectors/regexDetector.js";
import { analyzeWithPresidio } from "./src/detectors/presidioClient.js";

const testDocument = `
RED HERRING PROSPECTUS
Dated December 10, 2025

KSH INTERNATIONAL LIMITED
CORPORATE IDENTITY NUMBER: U28129PN1979PLC141032

REGISTERED OFFICE: 11/3, 11/4 and 11/5 Village Birdewadi, Chakan Taluka - Khed Pune – 410 501

CORPORATE OFFICE: 201, Tower 2, Montreal Business Centre, Off Pallod Farms, Baner Pune – 411 045

CONTACT PERSON: Sarthak Malvadkar
Company Secretary and Compliance Officer

E-MAIL AND TELEPHONE:
Email: karthik.menon@private.email
cs.connect@kshinternational.com
Telephone: +91 20 45053237

WEBSITE: www.kshinternational.com

Additional test cases:
- Phone: 9876543210
- Phone: +91-98765-43210
- URL: https://example.com/path
- URL: subdomain.example.org
`;

console.log("=" .repeat(80));
console.log("ENHANCED PII DETECTION TEST");
console.log("=" .repeat(80));

// Test regex patterns
console.log("\n📋 REGEX DETECTOR RESULTS:\n");
const regexResults = detectPII(testDocument);

const groupedRegex = {};
for (const entity of regexResults) {
  if (!groupedRegex[entity.type]) groupedRegex[entity.type] = [];
  groupedRegex[entity.type].push(entity);
}

for (const [type, entities] of Object.entries(groupedRegex)) {
  console.log(`\n  ${type}:`);
  for (const e of entities) {
    console.log(`    ✓ "${e.text}" (confidence: ${e.confidence.toFixed(2)})`);
  }
}

// Test NER fallback
console.log("\n\n📋 NER FALLBACK DETECTOR RESULTS:\n");
const nerResults = await analyzeWithPresidio(testDocument);

const groupedNer = {};
for (const entity of nerResults) {
  if (!groupedNer[entity.type]) groupedNer[entity.type] = [];
  groupedNer[entity.type].push(entity);
}

for (const [type, entities] of Object.entries(groupedNer)) {
  console.log(`\n  ${type}:`);
  for (const e of entities) {
    console.log(`    ✓ "${e.text}" (confidence: ${e.confidence.toFixed(2)})`);
  }
}

// Summary
console.log("\n\n" + "=" .repeat(80));
console.log("SUMMARY");
console.log("=" .repeat(80));

const expectedDetections = {
  "Email addresses": ["karthik.menon@private.email", "cs.connect@kshinternational.com"],
  "Phone numbers": ["+91 20 45053237", "9876543210"],
  "Websites": ["www.kshinternational.com", "https://example.com/path"],
  "Person names": ["Sarthak Malvadkar"],
  "Company names": ["Red Herring", "KSH International Limited"],
};

console.log("\nExpected Detections:");
for (const [category, items] of Object.entries(expectedDetections)) {
  console.log(`  ${category}:`);
  for (const item of items) {
    console.log(`    - ${item}`);
  }
}

console.log("\n✅ Test complete! Review the results above to verify all expected entities are detected.\n");
