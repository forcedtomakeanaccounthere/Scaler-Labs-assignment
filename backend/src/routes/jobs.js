import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

import { requireAuth } from "../middleware/auth.js";
import Job from "../models/Job.js";
import { addJob } from "../queues/redactionQueue.js";

const router = Router();

// ── Upload directory ───────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer — single file ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, `${uuidv4()}.docx`),
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".docx")
      return cb(new Error("Only .docx files are supported"));
    cb(null, true);
  },
});

// Multer — up to 5 files for batch
const uploadBatch = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".docx")
      return cb(new Error("Only .docx files are supported"));
    cb(null, true);
  },
});

// ── In-memory SSE clients registry  { jobId → Set<res> } ──────────────────
const sseClients = new Map();

export function broadcastProgress(jobId, event) {
  const clients = sseClients.get(jobId.toString());
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
  if (event.percent >= 100) {
    // Send "done" event then close all
    const done = `event: done\ndata: {}\n\n`;
    for (const res of clients) {
      try { res.write(done); res.end(); } catch {}
    }
    sseClients.delete(jobId.toString());
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const RETENTION_HOURS = parseInt(process.env.RETENTION_HOURS) || 24;

function buildJob(userId, file, policy, defaultAction, isGuest = false) {
  return new Job({
    userId,
    status: "pending",
    originalFilename: file.originalname,
    inputFilePath: file.path,
    policy: new Map(Object.entries(policy)),
    defaultAction,
    isGuest,
    purgeAt: new Date(Date.now() + RETENTION_HOURS * 3600 * 1000),
    auditLog: [{
      actor: userId?.toString() || "guest",
      action: "FILE_UPLOADED",
      detail: `${file.originalname} (${file.size} bytes)`,
    }],
  });
}

function sanitizeJob(job) {
  const obj = job.toObject ? job.toObject() : { ...job };
  delete obj.inputFilePath;
  delete obj.outputFilePath;
  return { ...obj, hasOutput: !!(job.outputFilePath || obj.outputFilePath) };
}

// ── Optional auth middleware — allows guest (no token) ────────────────────
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) { req.user = null; return next(); }
  try {
    const { requireAuth: _ra } = await import("../middleware/auth.js");
    return _ra(req, res, next);
  } catch {
    req.user = null;
    next();
  }
}

// ── POST /api/jobs — single file ──────────────────────────────────────────
router.post("/", upload.single("file"), async (req, res) => {
  // Attempt to auth; guest allowed
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader) {
    try {
      const jwt = await import("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "redactiq_super_secret_jwt_key_2025";
      const decoded = jwt.default.verify(authHeader.replace("Bearer ", ""), JWT_SECRET);
      userId = decoded.id;
    } catch { /* ignore */ }
  }

  const isGuest = !userId;

  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let policy = {};
    try { policy = JSON.parse(req.body.policy || "{}"); } catch {}
    const defaultAction = req.body.defaultAction || "MASK";

    const job = buildJob(userId || "guest", req.file, policy, defaultAction, isGuest);
    if (!isGuest) job.userId = userId;
    await job.save();

    await addJob("process-docx", { jobId: job._id.toString() }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      priority: isGuest ? 5 : 1,
    });

    return res.status(201).json({ message: "Job queued", job: sanitizeJob(job) });
  } catch (err) {
    console.error("Job creation error:", err);
    return res.status(500).json({ error: err.message || "Failed to create job" });
  }
});

// ── POST /api/jobs/batch — up to 5 files ─────────────────────────────────
router.post("/batch", requireAuth, uploadBatch.array("files", 5), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    let policy = {};
    try { policy = JSON.parse(req.body.policy || "{}"); } catch {}
    const defaultAction = req.body.defaultAction || "MASK";

    const jobs = [];
    for (const file of files) {
      const job = buildJob(req.user._id, file, policy, defaultAction, false);
      await job.save();
      await addJob("process-docx", { jobId: job._id.toString() }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      });
      jobs.push(sanitizeJob(job));
    }

    return res.status(201).json({ message: `${jobs.length} jobs queued`, jobs });
  } catch (err) {
    console.error("Batch job error:", err);
    return res.status(500).json({ error: err.message || "Batch upload failed" });
  }
});

// ── GET /api/jobs/:id/progress — SSE stream ───────────────────────────────
router.get("/:id/progress", async (req, res) => {
  const jobId = req.params.id;

  // Verify token from query param or header
  const token = req.query.token || (req.headers.authorization || "").replace("Bearer ", "");
  let userId = null;
  if (token) {
    try {
      const jwt = await import("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "redactiq_super_secret_jwt_key_2025";
      const decoded = jwt.default.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch { /* guest */ }
  }

  // Check job exists
  const job = await Job.findById(jobId).lean();
  if (!job) return res.status(404).json({ error: "Job not found" });

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Register client
  if (!sseClients.has(jobId)) sseClients.set(jobId, new Set());
  sseClients.get(jobId).add(res);

  // If job already completed, send immediately
  if (job.status === "completed") {
    res.write(`data: ${JSON.stringify({ step: "done", label: "Completed", percent: 100 })}\n\n`);
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
    sseClients.get(jobId)?.delete(res);
    return;
  }

  // Send initial status
  res.write(`data: ${JSON.stringify({ step: "queued", label: "Queued for processing", percent: 2 })}\n\n`);

  // Keep-alive ping
  const ping = setInterval(() => {
    try { res.write(`:ping\n\n`); } catch { clearInterval(ping); }
  }, 15000);

  req.on("close", () => {
    clearInterval(ping);
    sseClients.get(jobId)?.delete(res);
  });
});

// ── GET /api/jobs — list ──────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const [jobs, total] = await Promise.all([
      Job.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Job.countDocuments({ userId: req.user._id }),
    ]);
    return res.json({ jobs: jobs.map(sanitizeJob), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ error: "Failed to list jobs" });
  }
});

// ── GET /api/jobs/:id — single job ────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });
    return res.json({ job: sanitizeJob(job) });
  } catch {
    return res.status(500).json({ error: "Failed to fetch job" });
  }
});

// ── GET /api/jobs/:id/download ────────────────────────────────────────────
router.get("/:id/download", async (req, res) => {
  try {
    const token = req.query.token || (req.headers.authorization || "").replace("Bearer ", "");
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "completed" || !job.outputFilePath)
      return res.status(400).json({ error: "Redacted file not ready" });
    if (!fs.existsSync(job.outputFilePath))
      return res.status(410).json({ error: "File purged per retention policy" });

    const filename = `${path.basename(job.originalFilename, ".docx")}_REDACTED.docx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return res.sendFile(path.resolve(job.outputFilePath));
  } catch {
    return res.status(500).json({ error: "Download failed" });
  }
});

// ── GET /api/jobs/:id/report ──────────────────────────────────────────────
router.get("/:id/report", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "completed") return res.status(400).json({ error: "Job not completed" });
    return res.json({
      jobId: job._id,
      filename: job.originalFilename,
      completedAt: job.processingCompletedAt,
      entities: (job.entities || []).map((e) => ({
        type: e.type, confidence: e.confidence, source: e.source,
        action: e.action, imageId: e.imageId || null, reviewerAction: e.reviewerAction,
      })),
      evaluation: job.evaluation || null,
      auditLog: (job.auditLog || []),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ── PATCH /api/jobs/:id/review ────────────────────────────────────────────
router.patch("/:id/review", requireAuth, async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user._id });
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "awaiting_review")
      return res.status(400).json({ error: "Job is not awaiting review" });

    const { decisions } = req.body;
    if (!Array.isArray(decisions)) return res.status(400).json({ error: "decisions must be an array" });

    for (const d of decisions) {
      const eidStr = String(d.entityId);
      let entity = null;
      if (typeof job.entities.id === "function") {
        try { entity = job.entities.id(d.entityId); } catch {}
      }
      if (!entity && Array.isArray(job.entities)) {
        entity = job.entities.find(e => {
          const id = e._id?.toString ? e._id.toString() : String(e._id);
          return id === eidStr;
        }) || null;
      }
      if (entity) {
        entity.reviewerAction = d.action;
        if (d.action === "REJECTED") entity.action = "KEEP";
      }
    }
    job.auditLog.push({ actor: req.user._id.toString(), action: "REVIEW_SUBMITTED", detail: `${decisions.length} entities reviewed` });
    job.status = "pending";
    await job.save();

    await addJob("finalize-docx", { jobId: job._id.toString(), reviewCompleted: true }, {
      attempts: 3, backoff: { type: "exponential", delay: 1000 },
    });

    return res.json({ message: "Review submitted", job: sanitizeJob(job) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit review" });
  }
});

export default router;
