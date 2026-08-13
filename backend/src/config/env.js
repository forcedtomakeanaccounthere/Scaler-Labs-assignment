/**
 * Resolve an env var with a dev-only fallback.
 * In production, missing vars log a warning instead of silently using localhost.
 */
export function envOrDev(name, devDefault) {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    console.warn(`[env] ${name} is not set (required in production)`);
  }
  return devDefault;
}

/** Render sets RENDER_EXTERNAL_URL; Railway sets RAILWAY_PUBLIC_DOMAIN */
export function resolvePublicBackendUrl(port) {
  return (
    process.env.BACKEND_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined) ||
    (process.env.NODE_ENV === "production" ? undefined : `http://localhost:${port}`)
  );
}

export function resolvePublicFrontendUrl() {
  const fromEnv = process.env.FRONTEND_URL?.trim();
  if (fromEnv) return fromEnv;

  const vercelHost = process.env.VERCEL_URL?.trim()?.replace(/^https?:\/\//, "");
  if (vercelHost) return `https://${vercelHost}`;

  if (process.env.NODE_ENV === "production") return undefined;
  return "http://localhost:3000";
}
