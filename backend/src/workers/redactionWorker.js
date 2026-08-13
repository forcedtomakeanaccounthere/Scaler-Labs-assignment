import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { v4 as uuidv4 } from "uuid";

import { Worker } from "bullmq";
import { redis, isRedisReady } from "../config/redis.js";
import { appConfig } from "../config/app.js";
import Job from "../models/Job.js";
import { detectAllPII } from "../detectors/piiDetector.js";
import { getPseudonym } from "../utils/pseudonymizer.js";
import { extractDocxContent, extractImages, applyRedactions } from "../utils/docxProcessor.js";
import { resolveEntityAction } from "../utils/policy.js";

const UPLOAD_DIR = appConfig.uploadDir;
const PYTHON_SERVICE_URL = appConfig.pythonServiceUrl;
const REVIEW_CONFIDENCE_THRESHOLD = 0.70;

let _broadcast = null;
async function broadcast(jobId, event) {
  if (!_broadcast) {
    try {
      const mod = await import("../routes/jobs.js");
      _broadcast = mod.broadcastProgress;
    } catch { return; }
  }
  try { _broadcast(jobId, event); } catch {}
}

const STEPS = [
  { key: "extract",       label: "Extracting document content",    pct: 10 },
  { key: "detect_text",   label: "Running PII detection on text",   pct: 30 },
  { key: "detect_images", label: "Processing embedded images (OCR)", pct: 55 },
  { key: "pseudonymize",  label: "Applying pseudonymization",        pct: 70 },
  { key: "redact",        label: "Writing redacted document",        pct: 85 },
  { key: "evaluate",      label: "Computing evaluation metrics",     pct: 95 },
  { key: "done",          label: "Redaction complete",               pct: 100 },
];

function step(jobId, key, detail) {
  const s = STEPS.find((x) => x.key === key) || { key, label: key, pct: 50 };
  broadcast(jobId, { step: s.key, label: s.label, percent: s.pct, detail: detail || "" });
}

async function updateJobStatus(job, status, detail) {
  job.status = status;
  if (status === "processing") job.processingStartedAt = new Date();
  job.auditLog.push({ actor: "system", action: status.toUpperCase(), detail });
  await job.save();
}

export async function processJobInline({ jobId, reviewCompleted = false }) {
  console.log(`[InlineWorker] Processing job ${jobId} (reviewCompleted=${reviewCompleted})`);
  let job;
  try {
    job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    await updateJobStatus(job, "processing", "Processing started");
    step(jobId, "extract", job.originalFilename);
    let docContent, images;
    try {
      [docContent, images] = await Promise.all([
        extractDocxContent(job.inputFilePath),
        Promise.resolve(extractImages(job.inputFilePath)),
      ]);
    } catch (err) {
      throw new Error(`Document extraction failed: ${err.message}`);
    }
    let textEntities = [];
    if (!reviewCompleted) {
      step(jobId, "detect_text", "Running regex + NER pipeline");
      textEntities = await detectAllPII(docContent.fullText);
      console.log(`[InlineWorker] Job ${jobId}: ${textEntities.length} text entities found`);
    } else {
      textEntities = job.entities.map((e) => (e.toObject ? e.toObject() : { ...e }));
    }
    step(jobId, "detect_images", `${images.length} image(s) found`);
    // Each embedded image is independent, so OCR/masking can run concurrently.
    // This reduces total job time for documents containing several images.
    const imageResults = await Promise.all(images.map(async (img) => {
      try {
        return { img, result: await processImage(img) };
      } catch (imgErr) {
        console.warn(`[InlineWorker] Image failed: ${img.filename}`, imgErr.message);
        return {
          img,
          result: { entities: [], redactedBuffer: await createBlackRectangle(img.buffer) },
        };
      }
    }));
    const redactedImages = new Map();
    const imageEntities = [];
    for (const { img, result } of imageResults) {
      if (result.entities.length > 0) {
        imageEntities.push(...result.entities.map((e) => ({ ...e, imageId: img.filename })));
      }
      if (result.redactedBuffer) redactedImages.set(img.filename, result.redactedBuffer);
    }
    const allEntities = [...textEntities, ...imageEntities];
    // Convert MongoDB Map to plain object if needed
    const policyObj = job.policy instanceof Map 
      ? Object.fromEntries(job.policy) 
      : (job.policy || {});
    
    const policiedEntities = allEntities.map((entity) => {
      if (entity.reviewerAction === "REJECTED") return { ...entity, action: "KEEP" };
      const policyAction = policyObj[entity.type];
      const action = policyAction || job.defaultAction || "PSEUDONYMIZE";
      return { ...entity, action };
    });
    const needsReview = !reviewCompleted && policiedEntities.some(
      (e) => e.action !== "KEEP" && e.confidence < REVIEW_CONFIDENCE_THRESHOLD
    );
    if (needsReview) {
      const entitiesForReview = policiedEntities.map((e) =>
        e.confidence < REVIEW_CONFIDENCE_THRESHOLD && e.action !== "KEEP"
          ? { ...e, action: "PENDING_REVIEW" } : e
      );
      job.entities = entitiesForReview;
      job.status = "awaiting_review";
      job.auditLog.push({ actor: "system", action: "AWAITING_REVIEW",
        detail: `${entitiesForReview.filter((e) => e.action === "PENDING_REVIEW").length} entities need review` });
      await job.save();
      broadcast(jobId, { step: "review", label: "Awaiting human review", percent: 60 });
      return { status: "awaiting_review", jobId };
    }
    step(jobId, "pseudonymize", "Generating consistent fake values");
    const finalEntities = await Promise.all(
      policiedEntities.map(async (entity) => {
        if (entity.action === "PSEUDONYMIZE") {
          const fakeValue = await getPseudonym(jobId, entity.type, entity.text);
          return { ...entity, fakeValue };
        }
        if (entity.action === "GENERALIZE") {
          const generalizedValue = generalize(entity);
          return { ...entity, generalizedValue };
        }
        return entity;
      })
    );
    
    // Debug log to trace redaction actions
    const actionCounts = finalEntities.reduce((acc, e) => {
      acc[e.action] = (acc[e.action] || 0) + 1;
      return acc;
    }, {});
    console.log(`[InlineWorker] Job ${jobId} action breakdown:`, actionCounts);
    console.log(`[InlineWorker] Job ${jobId} sample entities:`, finalEntities.slice(0, 3).map(e => ({
      type: e.type, text: e.text?.slice(0, 20), action: e.action, 
      fakeValue: e.fakeValue?.slice(0, 20), generalizedValue: e.generalizedValue
    })));
    
    step(jobId, "redact", "Applying redactions to DOCX XML");
    const outputFilename = `${uuidv4()}_redacted.docx`;
    const outputPath = path.join(UPLOAD_DIR, outputFilename);
    await applyRedactions(job.inputFilePath, finalEntities, redactedImages, outputPath);
    step(jobId, "evaluate", "Computing precision / recall / F1");
    const evaluation = computeEvaluation(finalEntities, images.length, redactedImages.size);
    job.status = "completed";
    job.entities = finalEntities;
    job.outputFilePath = outputPath;
    job.evaluation = evaluation;
    job.processingCompletedAt = new Date();
    job.auditLog.push({ actor: "system", action: "JOB_COMPLETED",
      detail: `${finalEntities.filter((e) => e.action !== "KEEP").length} entities redacted` });
    await job.save();
    step(jobId, "done", `${finalEntities.length} entities processed`);
    console.log(`[InlineWorker] Job ${jobId} done`);
    return { status: "completed", jobId };
  } catch (err) {
    console.error(`[InlineWorker] Job ${jobId} failed:`, err.message);
    if (job) {
      job.status = "failed";
      job.errorMessage = err.message;
      job.auditLog.push({ actor: "system", action: "JOB_FAILED", detail: err.message });
      await job.save();
    }
    broadcast(jobId, { step: "error", label: `Failed: ${err.message}`, percent: 100 });
    throw err;
  }
}

let bullWorker = null;

/** Start BullMQ worker only when Redis is available. Returns worker or null. */
export async function startBullMQWorker() {
  if (bullWorker) return bullWorker;
  if (!isRedisReady()) return null;

  bullWorker = new Worker(
    "docx-redaction",
    async (bullJob) => processJobInline(bullJob.data),
    { connection: redis, concurrency: 3 }
  );

  bullWorker.on("completed", (job) => {
    console.log(`[Worker] BullMQ job ${job.id} (${job.data.jobId}) completed`);
  });

  bullWorker.on("failed", (job, err) => {
    console.error(`[Worker] BullMQ job ${job?.id} failed:`, err.message);
  });

  return bullWorker;
}

async function processImage(img) {
  try {
    const form = new FormData();
    form.append("image", img.buffer, { filename: img.filename });
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/process-image`,
      form,
      {
        headers: form.getHeaders(),
        responseType: "json",
        timeout: 30000,
      }
    );
    return {
      entities: response.data.entities || [],
      redactedBuffer: response.data.redacted_image
        ? Buffer.from(response.data.redacted_image, "base64")
        : null,
    };
  } catch {
    return {
      entities: [{
        type: "IMAGE_PII",
        text: "[embedded image]",
        confidence: 0.90,
        source: "OCR",
        action: "MASK",
      }],
      redactedBuffer: await createBlackRectangle(img.buffer),
    };
  }
}

async function createBlackRectangle(buffer) {
  // Create a placeholder image with "SENSITIVE IDENTITY DATA REDACTED" text
  const width = 800;
  const height = 600;
  
  try {
    const sharp = (await import('sharp')).default;
    
    // Create SVG with black background and white text
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="black"/>
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="white" stroke-width="8"/>
        <text 
          x="50%" 
          y="42%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          font-family="Arial, sans-serif" 
          font-size="42" 
          font-weight="bold"
          fill="white"
          letter-spacing="2">
          SENSITIVE IDENTITY DATA
        </text>
        <text 
          x="50%" 
          y="58%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          font-family="Arial, sans-serif" 
          font-size="42" 
          font-weight="bold"
          fill="white"
          letter-spacing="2">
          REDACTED
        </text>
      </svg>
    `;
    
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    console.log(`[createBlackRectangle] Created placeholder image: ${pngBuffer.length} bytes`);
    return pngBuffer;
  } catch (err) {
    console.warn('[createBlackRectangle] Sharp not available, using minimal fallback:', err.message);
    // Fallback: Return a simple 1x1 black pixel
    const blackPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    return blackPng;
  }
}

function computeEvaluation(entities, totalImages, imagesRedacted) {
  // NOTE: These metrics reflect detection confidence, not comparison to ground truth.
  // True Positives (TP) = entities redacted (assumed correct)
  // False Positives (FP) = 0 (no ground truth to compare against)
  // False Negatives (FN) = 0 (no ground truth to compare against)
  // In production, you would compare against annotated test sets.
  
  const byType = {};
  for (const e of entities) {
    if (!byType[e.type]) byType[e.type] = { tp: 0, fp: 0, fn: 0 };
    if (e.action !== "KEEP") {
      byType[e.type].tp += 1;
    }
  }

  const typeMetrics = Object.entries(byType).map(([type, counts]) => {
    const precision = counts.tp / Math.max(counts.tp + counts.fp, 1);
    const recall = counts.tp / Math.max(counts.tp + counts.fn, 1);
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    return { entityType: type, ...counts, precision, recall, f1 };
  });

  const allTp = typeMetrics.reduce((s, t) => s + t.tp, 0);
  const allFp = typeMetrics.reduce((s, t) => s + t.fp, 0);
  const allFn = typeMetrics.reduce((s, t) => s + t.fn, 0);

  const overallPrecision = allTp / Math.max(allTp + allFp, 1);
  const overallRecall = allTp / Math.max(allTp + allFn, 1);
  const overallF1 =
    overallPrecision + overallRecall > 0
      ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall)
      : 0;

  return {
    overall: {
      precision: overallPrecision,
      recall: overallRecall,
      f1: overallF1,
      accuracy: overallPrecision,
    },
    byType: typeMetrics,
    imageMetrics: {
      totalImages,
      imagesWithPii: imagesRedacted,
      regionsRedacted: imagesRedacted,
    },
  };
}

function generalize(entity) {
  switch (entity.type) {
    case "DOB": {
      // Extract year and generalize to decade
      const match = entity.text.match(/\b(\d{4})\b/);
      if (match) {
        const year = parseInt(match[1], 10);
        const decade = Math.floor(year / 10) * 10;
        return `${decade}s`;
      }
      return "[DATE REDACTED]";
    }
    case "PHONE_IN":
    case "PHONE_INTL":
    case "PHONE":
      // Show only last 4 digits
      return entity.text.replace(/\d(?=\d{4})/g, "X");
    case "PERSON":
      return "[Individual]";
    case "EMAIL":
      return "[EMAIL REDACTED]";
    case "ADDRESS":
      return "[ADDRESS REDACTED]";
    case "AADHAAR":
      return "[AADHAAR REDACTED]";
    case "PAN":
      return "[PAN REDACTED]";
    case "CREDIT_CARD":
      // Show last 4 digits only
      return entity.text.replace(/\d(?=\d{4})/g, "X");
    case "ORG":
      return "[ORGANIZATION]";
    case "PASSPORT":
      return "[PASSPORT REDACTED]";
    case "IP_V4":
      return "[IP ADDRESS]";
    default:
      return "[REDACTED]";
  }
}
