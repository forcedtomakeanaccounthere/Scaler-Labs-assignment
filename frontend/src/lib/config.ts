export const siteConfig = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME || process.env.Product_name || "RedactIQ",
  description:
    "Enterprise-grade PII detection and redaction for DOCX documents. Hybrid regex + NER pipeline with OCR-based image redaction, pseudonymization, and full audit trails.",
  tagline: "Intelligent PII Redaction Platform",
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Vercel sets VERCEL_URL automatically (e.g. my-app.vercel.app) */
function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("[config] NEXT_PUBLIC_APP_URL is not set in production");
  }
  return "http://localhost:3000";
}

function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be set in production (e.g. your Render/Railway backend URL)"
    );
  }
  return "http://localhost:5000";
}

/** Public URLs — set in .env.local (dev) or Vercel env (production) */
export const envConfig = {
  apiUrl: resolveApiUrl(),
  appUrl: resolveAppUrl(),
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  recaptchaSiteKey:
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
};

/** Backend OAuth callback — must match Google Cloud Console redirect URI */
export const googleRedirectUri = `${envConfig.apiUrl}/api/auth/google/callback`;
