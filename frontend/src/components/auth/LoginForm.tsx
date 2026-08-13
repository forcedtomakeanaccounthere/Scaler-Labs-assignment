"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";
import GoogleButton from "./GoogleButton";
import { siteConfig, envConfig } from "@/lib/config";
import { useTheme } from "next-themes";
import { useAuth } from "@/providers/AuthProvider";

const RECAPTCHA_SITE_KEY = envConfig.recaptchaSiteKey;
const API_BASE_URL = envConfig.apiUrl;

export default function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { theme } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (!captchaToken) {
      setErrorMsg("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, recaptchaToken: captchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Login failed. Please check your credentials.");
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      // Commit to context + localStorage immediately
      login(data.token, data.user);
      setSuccessMsg("Welcome back! Redirecting…");
      // Use router.push so Next.js client-side nav triggers re-renders
      setTimeout(() => router.push("/redact"), 600);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect to authentication server.");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Welcome back
        </h2>
        <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>
          Sign in to your {siteConfig.name} account
        </p>
      </div>

      {/* Error / Success Feedback */}
      {errorMsg && (
        <div className="p-3 rounded-xl text-[13px] font-medium border" style={{ background: "rgba(255,59,48,0.12)", color: "#FF453A", borderColor: "rgba(255,59,48,0.25)" }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl text-[13px] font-medium border" style={{ background: "rgba(48,209,88,0.12)", color: "#30D158", borderColor: "rgba(48,209,88,0.25)" }}>
          {successMsg}
        </div>
      )}

      {/* Google OAuth */}
      <GoogleButton label="Continue with Google" />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-[12px] mono" style={{ color: "var(--text-tertiary)" }}>
          OR WITH EMAIL
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all duration-150"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
              Password
            </label>
            <a href="#" className="text-[12px] transition-colors duration-150" style={{ color: "var(--accent)" }}>
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-12 rounded-xl text-[14px] outline-none transition-all duration-150"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors duration-150"
              style={{ color: "var(--text-tertiary)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* reCAPTCHA */}
        <div className="flex justify-center my-1">
          <div style={{ transform: "scale(0.88)", transformOrigin: "center" }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              theme={theme === "light" ? "light" : "dark"}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
            />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-3.5">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Switch to signup */}
      <p className="text-center text-[13px]" style={{ color: "var(--text-secondary)" }}>
        Don&apos;t have an account?{" "}
        <button
          onClick={onSwitchToSignup}
          className="font-bold hover:underline"
          style={{ color: "var(--accent)" }}
        >
          Create one
        </button>
      </p>
    </div>
  );
}
