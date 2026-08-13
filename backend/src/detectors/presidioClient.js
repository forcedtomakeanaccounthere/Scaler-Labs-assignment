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
      // The Python service is optional. Keep this short so an unavailable
      // local service never makes the document pipeline look stuck.
      { timeout: 2000 }
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

  // Company names with suffixes (must not span across newlines)
  // Enhanced to handle all-caps company names like "KSH INTERNATIONAL LIMITED"
  // Each word is matched independently and the number of leading words is
  // bounded. The previous expression used overlapping unbounded `+` groups,
  // which can cause catastrophic backtracking on a long DOCX text stream.
  const orgPattern = /\b[A-Z][A-Za-z&]*(?:[ \t]+[A-Z][A-Za-z&]*){0,8}[ \t]+(?:Pvt\.?\s?Ltd\.?|PVT\.?\s?LTD\.?|LLP|Inc\.?|INC\.?|Corp\.?|CORP\.?|Limited|LIMITED|Enterprises|ENTERPRISES|Associates|ASSOCIATES|Company|COMPANY|Co\.|CO\.|Corporation|CORPORATION|Group|GROUP)\b/g;
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

  // Proper names with titles (Mr., Mrs., Dr., etc.)
  const nameWithTitlePattern = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sir|Madam)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g;
  while ((m = nameWithTitlePattern.exec(text)) !== null) {
    results.push({
      type: "PERSON",
      text: m[0].trim(),
      start: m.index,
      end: m.index + m[0].length,
      confidence: 0.85,
      source: "NER",
    });
  }

  // Capitalized names (2-3 words, each starting with capital letter)
  // Enhanced to catch names like "Sarthak Malvadkar", "John Smith", etc.
  // Words must be separated by single spaces only (not newlines or multiple spaces)
  const capitalizedNamePattern = /\b[A-Z][a-z]{2,}(?: +[A-Z][a-z]{2,}){1,2}\b/g;
  const nameContextKeywords = [
    "name:", "contact person:", "by:", "from:", "to:", "attn:",
    "attention", "dear", "mr.", "mrs.", "ms.", "dr."
  ];
  
  // Common job titles and roles to exclude from name detection
  const jobTitles = [
    "company secretary", "compliance officer", "chief executive",
    "executive director", "managing director", "general manager",
    "senior manager", "project manager", "account manager",
    "chief financial", "chief operating", "chief technology",
    "human resources", "public relations", "customer service",
    "sales manager", "marketing manager", "business development"
  ];
  
  while ((m = capitalizedNamePattern.exec(text)) !== null) {
    const matchText = m[0].trim();
    const matchLower = matchText.toLowerCase();
    const start = m.index;
    const end = m.index + m[0].length;
    
    // Skip if it matches a common job title
    if (jobTitles.some(title => matchLower.includes(title) || title.includes(matchLower))) {
      continue;
    }
    
    // Skip common non-name patterns
    const skipWords = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December",
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
      "United States", "United Kingdom", "New York", "Los Angeles", "New Delhi",
      "Please Note", "Dear Sir", "Thank You", "Best Regards", "Yours Sincerely",
      "Red Herring", "Book Built", "Corporate Office", "Registered Office",
      "Business Centre", "Montreal Business", "Village", "Pune", "Baner", "Pallod Farms",
      "Chakan Taluka", "Khed Pune", "Tower"
    ];
    
    if (skipWords.some(skip => matchText.includes(skip))) {
      continue;
    }
    
    // Skip if it looks like a location/address (contains common address words)
    const addressWords = ["village", "tower", "centre", "farms", "taluka", "pune", "mumbai", "delhi", "city"];
    if (addressWords.some(addr => matchLower.includes(addr))) {
      continue;
    }
    
    // Check context (±80 chars around the match)
    const contextStart = Math.max(0, start - 80);
    const contextEnd = Math.min(text.length, end + 80);
    const context = text.slice(contextStart, contextEnd).toLowerCase();
    
    // Boost confidence if near name-related keywords
    const hasNameContext = nameContextKeywords.some(kw => context.includes(kw));
    
    // Higher confidence threshold required without explicit name context
    const confidence = hasNameContext ? 0.88 : 0.78;
    
    // Only include if confidence is high enough
    if (confidence >= 0.75) {
      results.push({
        type: "PERSON",
        text: matchText,
        start,
        end,
        confidence,
        source: "NER",
      });
    }
  }

  // Company names without suffixes (2-3 capitalized words, often standalone or in headers)
  // Enhanced to catch names like "Red Herring", "Apple Inc", etc.
  // Words must be separated by single spaces only (not newlines)
  const companyNamePattern = /\b(?:[A-Z][a-z]* +){1,2}[A-Z][a-z]*\b/g;
  const companyContextKeywords = [
    "company", "corporation", "firm", "business", "enterprise",
    "prospectus", "registered", "corporate", "office", "headquarters",
    "limited", "ltd", "inc", "corp"
  ];
  
  // Known company name patterns that should always be detected
  const knownCompanyPatterns = [
    /\bRed Herring\b/gi,
  ];
  
  // First, check for known company patterns
  for (const pattern of knownCompanyPatterns) {
    pattern.lastIndex = 0; // Reset regex
    while ((m = pattern.exec(text)) !== null) {
      results.push({
        type: "ORG",
        text: m[0].trim(),
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.95,
        source: "NER",
      });
    }
  }
  
  // Then generic company name detection
  while ((m = companyNamePattern.exec(text)) !== null) {
    const matchText = m[0].trim();
    const start = m.index;
    const end = m.index + m[0].length;
    
    // Skip if includes newline
    if (matchText.includes('\n') || matchText.includes('\r')) {
      continue;
    }
    
    // Skip if it's too short or already caught
    if (matchText.split(/ +/).length < 2) continue;
    
    const alreadyCaught = results.some(r => 
      (r.start <= start && r.end >= end) || 
      (start <= r.start && end >= r.end)
    );
    if (alreadyCaught) continue;
    
    // Skip common non-company patterns
    const skipCompanyWords = [
      "Please Note", "Thank You", "Best Regards", "Dear Sir",
      "United States", "United Kingdom", "New York", "Los Angeles",
      "Company Secretary", "Compliance Officer", "Chief Executive",
      "Dated December", "January", "February", "March", "April", "May", 
      "June", "July", "August", "September", "October", "November", "December",
      "Contact Person", "Email", "Telephone", "Village", "Tower",
      "Montreal Business", "Pallod Farms", "Chakan Taluka",
      "Khed Pune", "Baner Pune", "Pune"
    ];
    if (skipCompanyWords.some(skip => matchText.includes(skip))) {
      continue;
    }
    
    // Skip if it looks like a location (contains city/town names)
    const locationIndicators = /\b(pune|mumbai|delhi|bangalore|chennai|kolkata|city|town|village|district)\b/i;
    if (locationIndicators.test(matchText)) {
      continue;
    }
    
    // Check context for company-related keywords
    const contextStart = Math.max(0, start - 120);
    const contextEnd = Math.min(text.length, end + 120);
    const context = text.slice(contextStart, contextEnd).toLowerCase();
    
    const hasCompanyContext = companyContextKeywords.some(kw => context.includes(kw));
    
    // Check if it's in a header/title position (first 300 chars or after newlines)
    const isInHeader = start < 300 || (start > 0 && text[start - 1] === '\n');
    
    // Check if followed by "PROSPECTUS" or other company document keywords
    const hasDocKeywords = /prospectus|annual report|financial statement|corporate identity/i.test(
      text.slice(end, Math.min(text.length, end + 100))
    );
    
    if (hasCompanyContext || isInHeader || hasDocKeywords) {
      results.push({
        type: "ORG",
        text: matchText,
        start,
        end,
        confidence: 0.72,
        source: "NER",
      });
    }
  }

  return results;
}
