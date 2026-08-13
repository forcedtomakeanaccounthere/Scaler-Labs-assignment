export const siteConfig = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME || process.env.Product_name || "RedactIQ",
  description:
    "Enterprise-grade PII detection and redaction for DOCX documents. Hybrid regex + NER pipeline with OCR-based image redaction, pseudonymization, and full audit trails.",
  tagline: "Intelligent PII Redaction Platform",
};

/** Public URLs — set in .env.local (dev) or Vercel/Render env (production) */
export const envConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  recaptchaSiteKey:
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
};

/** Backend OAuth callback — must match Google Cloud Console redirect URI */
export const googleRedirectUri = `${envConfig.apiUrl}/api/auth/google/callback`;
