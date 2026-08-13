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
      { timeout: 30000 }
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
      { timeout: 60000 }
    );

    if (response.data.success) return;
  } catch {
    // Fall through to ZIP-based fallback
  }

  // ZIP fallback: naive text replace (may corrupt complex formatting)
  applyRedactionsViaZip(filePath, entities, redactedImages, outputPath);
}

/**
 * Fallback: apply redactions by direct XML text replacement.
 * NOTE: This is best-effort — it won't preserve complex XML run formatting.
 */
function applyRedactionsViaZip(filePath, entities, redactedImages, outputPath) {
  const zip = new AdmZip(filePath);
  const xmlEntry = zip.getEntry("word/document.xml");
  if (!xmlEntry) throw new Error("Invalid DOCX");

  let xml = xmlEntry.getData().toString("utf8");

  // Sort entities by start position descending so replacements don't shift offsets
  // (text-level approach is approximate when working with XML)
  const actionableEntities = entities.filter(
    (e) => e.action !== "KEEP" && e.reviewerAction !== "REJECTED"
  );

  for (const entity of actionableEntities) {
    const escapedText = escapeRegex(entity.text);
    const replacement = getReplacementText(entity);
    // Replace in the raw XML (approximate — doesn't handle split runs)
    xml = xml.replace(new RegExp(escapedText, "g"), replacement);
  }

  zip.updateFile("word/document.xml", Buffer.from(xml, "utf8"));

  // Re-embed redacted images
  if (redactedImages && redactedImages.size > 0) {
    for (const [filename, buffer] of redactedImages) {
      zip.updateFile(`word/media/${filename}`, buffer);
    }
  }

  zip.writeZip(outputPath);
}

function getReplacementText(entity) {
  let replacement;
  switch (entity.action) {
    case "MASK":
      replacement = "█".repeat(Math.min(entity.text.length, 12));
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
  console.log(`[docxProcessor] Replacing "${entity.text?.slice(0, 20)}" (action: ${entity.action}) with "${replacement?.slice(0, 20)}"`);
  return replacement;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Lazy-load AdmZip to avoid crash if not installed
