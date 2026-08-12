import express from "express";
import cors from "cors";
import helmet from "helmet";

import routes from "./routes/index.js";
import { handleGoogleCallback } from "./routes/auth.js";

const app = express();

// Disable CSP & COOP headers so Google OAuth redirects & Chrome devtools work without header blocks
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Explicit top-level Google OAuth callback handler
app.get("/api/auth/google/callback", handleGoogleCallback);

// API router
app.use("/api", routes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "uni-hack-backend" });
});

// Fallback 404 handler for debugging missing routes
app.use((req, res) => {
  console.warn(`[404 NOT FOUND] ${req.method} ${req.originalUrl}`);
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});

export default app;
