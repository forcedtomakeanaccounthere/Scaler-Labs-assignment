import {
  envOrDev,
  resolvePublicBackendUrl,
  resolvePublicFrontendUrl,
} from "./env.js";

const port = parseInt(process.env.PORT || "5000", 10);
const isProd = process.env.NODE_ENV === "production";

const backendUrl = resolvePublicBackendUrl(port);
const frontendUrl = resolvePublicFrontendUrl();

if (isProd && !backendUrl) {
  throw new Error("BACKEND_URL (or RENDER_EXTERNAL_URL) must be set in production");
}
if (isProd && !frontendUrl) {
  throw new Error("FRONTEND_URL must be set in production");
}

export const appConfig = {
  port,
  backendUrl: backendUrl || `http://localhost:${port}`,
  frontendUrl: frontendUrl || "http://localhost:3000",
  uploadDir: envOrDev("UPLOAD_DIR", "uploads"),
  pythonServiceUrl: envOrDev("PYTHON_SERVICE_URL", "http://localhost:8000"),
  jwtSecret: envOrDev("JWT_SECRET", "redactiq_super_secret_jwt_key_2026"),
};
