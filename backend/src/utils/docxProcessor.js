/**
 * DocxProcessor — extracts text and images from a .docx file,
 * applies redaction, and produces a redacted .docx output.
 *
 * Architecture:
 * - Uses the 'python-docx' equivalent via a child-process call to Python
 *   for OOXML manipulation (preserves run-level formatting).
 * - If Python is unavailable, uses a basic ZIP-level approach as fallback.
 *
 * Image pipeline:
 * - Extracts all images from word/media/ regardless of z-order/visibility
 * - Sends each image to the Python image-pipeline service for OCR+masking
 * - Re-embeds redacted images at original relationship IDs
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import AdmZip from "adm-zip";
import axios from "axios";
import { appConfig } from "../config/app.js";

const execFileAsync = promisify(execFile);

const PYTHON_SERVICE_URL = appConfig.pythonServiceUrl;

/**
 * Extract all paragraphs (with run-level text spans) from a .docx.
 * Returns structured data the detector can work with.
 *
 * @param {string} filePath
 * @returns {{ paragraphs: Array<{text, runs}>, fullText: string }}
 */
export async function extractDocxContent(filePath) {
  // Try Python service first
  try {
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/extract`,
      { file_path: path.resolve(filePath) },
      // The Python service is optional; fall back promptly when it is not
      // running instead of holding the UI at the extraction stage.
      { timeout: 2000 }
    );
    return response.data;
  } catch {
    // Python service unavailable — use ZIP fallback
    return extractViaZip(filePath);
  }
}

/**
 * Fallback: extract text by parsing the raw XML inside the DOCX ZIP.
 */
function extractViaZip(filePath) {
  const zip = new AdmZip(filePath);
  const xmlEntry = zip.getEntry("word/document.xml");
  if (!xmlEntry) throw new Error("Invalid DOCX: missing word/document.xml");

  const xml = xmlEntry.getData().toString("utf8");

  // Strip XML tags, decode entities
  const fullText = xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return {
    paragraphs: [{ text: fullText, runs: [{ text: fullText, start: 0, end: fullText.length }] }],
    fullText,
    rawXml: xml,
  };
}

/**
 * Extract all embedded images from a .docx file.
 * Returns array of { relationshipId, filename, buffer }.
 */
export function extractImages(filePath) {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  const images = [];
  for (const entry of entries) {
    if (entry.entryName.startsWith("word/media/")) {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"].includes(ext)) {
        images.push({
          filename: entry.name,
          entryName: entry.entryName,
          buffer: entry.getData(),
        });
      }
    }
  }

  return images;
}

/**
 * Apply text redactions and return a new .docx buffer.
 *
 * @param {string} filePath - Path to original .docx
 * @param {Array} entities - Detected entities with action + fakeValue
 * @param {Map<string,Buffer>} redactedImages - Map of filename → redacted image buffer
 * @param {string} outputPath - Where to write the output
 */
export async function applyRedactions(filePath, entities, redactedImages, outputPath) {
  console.log(`[docxProcessor] Applying redactions: ${entities.length} entities`);
  const actionBreakdown = entities.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1;
    return acc;
  }, {});
  console.log(`[docxProcessor] Action breakdown:`, actionBreakdown);
  
  // Try Python service for proper run-level XML manipulation
  try {
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/redact`,
      {
        file_path: path.resolve(filePath),
        output_path: path.resolve(outputPath),
        entities: entities.map((e) => ({
          type: e.type,
          text: e.text,
          action: e.action,
          fake_value: e.fakeValue || null,
          generalized_value: e.generalizedValue || null,
          start: e.start,
          end: e.end,
        })),
        redacted_images: Object.fromEntries(
          [...(redactedImages || new Map())].map(([k, v]) => [
            k,
            v.toString("base64"),
          ])
        ),
      },
      // As above, ZIP redaction is the supported fallback when Python is off.
      { timeout: 2000 }
    );

    if (response.data.success) {
      console.log(`[docxProcessor] Python service succeeded`);
      return;
    }
  } catch (err) {
    console.log(`[docxProcessor] Python service unavailable, using ZIP fallback: ${err.message}`);
    // Fall through to ZIP-based fallback
  }

  // ZIP fallback: naive text replace (may corrupt complex formatting)
  console.log(`[docxProcessor] Using ZIP fallback method`);
  applyRedactionsViaZip(filePath, entities, redactedImages, outputPath);
}

/**
 * Fallback: apply redactions by direct XML text replacement.
 * NOTE: This is best-effort — it won't preserve complex XML run formatting.
 */
function applyRedactionsViaZip(filePath, entities, redactedImages, outputPath) {
  console.log(`[applyRedactionsViaZip] Processing ${entities.length} entities`);
  const zip = new AdmZip(filePath);
  const xmlEntry = zip.getEntry("word/document.xml");
  if (!xmlEntry) throw new Error("Invalid DOCX: missing word/document.xml");

  let xml = xmlEntry.getData().toString("utf8");

  // Filter actionable entities (not KEEP or REJECTED)
  const actionableEntities = entities.filter(
    (e) => e.action !== "KEEP" && e.reviewerAction !== "REJECTED"
  );
  
  console.log(`[applyRedactionsViaZip] ${actionableEntities.length} actionable entities`);

  // Sort by text length descending to replace longer matches first (prevents partial replacements)
  actionableEntities.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));

  const replacementsByText = new Map();
  for (const entity of actionableEntities) {
    if (!entity.text) continue;
    // The same source text can be detected more than once. Preserve the first
    // (longest-first) action, which is also how the former replacement loop
    // behaved after it had replaced every matching occurrence.
    if (!replacementsByText.has(entity.text)) {
      replacementsByText.set(entity.text, getReplacementText(entity));
    }
  }

  let replacementCount = 0;
  if (replacementsByText.size > 0) {
    // One pass through document.xml replaces every candidate. Previously this
    // scanned the complete XML once per entity, which is especially expensive
    // for a long prospectus with hundreds of detected names and organisations.
    const sourceTexts = [...replacementsByText.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex);
    const replacementRegex = new RegExp(sourceTexts.join("|"), "g");
    xml = xml.replace(replacementRegex, (matched) => {
      replacementCount += 1;
      return replacementsByText.get(matched);
    });
  }

  console.log(`[applyRedactionsViaZip] Total replacements made: ${replacementCount}`);
  zip.updateFile("word/document.xml", Buffer.from(xml, "utf8"));

  // Re-embed redacted images
  if (redactedImages && redactedImages.size > 0) {
    console.log(`[applyRedactionsViaZip] Replacing ${redactedImages.size} images`);
    for (const [filename, buffer] of redactedImages) {
      const fullPath = `word/media/${filename}`;
      try {
        zip.updateFile(fullPath, buffer);
      } catch (err) {
        console.warn(`[applyRedactionsViaZip] Failed to replace image ${filename}:`, err.message);
      }
    }
  }

  zip.writeZip(outputPath);
  console.log(`[applyRedactionsViaZip] Saved to: ${outputPath}`);
}

function getReplacementText(entity) {
  let replacement;
  switch (entity.action) {
    case "MASK":
      // Use black square characters that will appear as solid blocks
      replacement = "■".repeat(Math.min(entity.text.length, 12));
      break;
    case "PSEUDONYMIZE":
      replacement = entity.fakeValue || "[REDACTED]";
      break;
    case "GENERALIZE":
      replacement = entity.generalizedValue || "[REDACTED]";
      break;
    default:
      replacement = "[REDACTED]";
  }
  return replacement;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Lazy-load AdmZip to avoid crash if not installed
