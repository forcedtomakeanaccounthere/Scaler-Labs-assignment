import express from "express";
import cors from "cors";
import helmet from "helmet";

import routes from "./routes/index.js";
import jobsRouter from "./routes/jobs.js";
import { handleGoogleCallback } from "./routes/auth.js";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/api/auth/google/callback", handleGoogleCallback);

app.use("/api", routes);
app.use("/api/jobs", jobsRouter);

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "redactiq-backend" });
});

app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "File too large" });
  }
  if (err.message?.includes("Only .docx")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.use((req, res) => {
  console.warn(`[404 NOT FOUND] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

export default app;
