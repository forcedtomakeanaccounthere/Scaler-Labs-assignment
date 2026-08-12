"use client";

import { useState, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import GoogleButton from "./GoogleButton";
import { siteConfig } from "@/lib/config";
import { useTheme } from "next-themes";

const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!firstName || !email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (!captchaToken) {
      setErrorMsg("Please complete the CAPTCHA verification.");
      return;
    }

    if (!agreed) {
      setErrorMsg("Please agree to the Terms of Service & Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          password,
          recaptchaToken: captchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Registration failed.");
        setLoading(false);
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      // Success
      if (data.token) {
        localStorage.setItem("catalogx_token", data.token);
        localStorage.setItem("catalogx_user", JSON.stringify(data.user));
      }
      setSuccessMsg("Account created successfully! Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
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
          Create your account
        </h2>
        <p className="text-[14px] mt-1" style={{ color: "var(--text-secondary)" }}>
          Start building with {siteConfig.name} today
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
      <GoogleButton label="Sign up with Google" />

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
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="first-name" className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
              First name
            </label>
            <input
              id="first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ada"
              required
              className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all duration-150"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="last-name" className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
              Last name
            </label>
            <input
              id="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Lovelace"
              required
              className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all duration-150"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-email" className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
            Work email
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ada@company.com"
            required
            className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all duration-150"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-password" className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="w-full px-4 py-3 pr-12 rounded-xl text-[14px] outline-none transition-all duration-150"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
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

        {/* Terms Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#007AFF] focus:ring-0 cursor-pointer"
          />
          <span className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            I agree to the{" "}
            <a href="#" className="underline font-medium" style={{ color: "var(--text-primary)" }}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline font-medium" style={{ color: "var(--text-primary)" }}>
              Privacy Policy
            </a>
          </span>
        </label>

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
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {/* Switch to login */}
      <p className="text-center text-[13px]" style={{ color: "var(--text-secondary)" }}>
        Already have an account?{" "}
        <button
          onClick={onSwitchToLogin}
          className="font-bold hover:underline"
          style={{ color: "var(--accent)" }}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
