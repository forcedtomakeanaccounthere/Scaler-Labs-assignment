"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { siteConfig } from "@/lib/config";

const features = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    title: "99.4% extraction accuracy",
    desc: "Field-level confidence scoring on every attribute",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
    title: "Full bounding-box provenance",
    desc: "Every value traced back to its exact PDF page & location",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    title: "Zero-config vertical detection",
    desc: "Auto-adapts to Electrical, IT, Mechanical & more",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    title: "Direct ERP & PIM export",
    desc: "SAP, Akeneo, Shopify — push-ready JSON in seconds",
  },
];

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"login" | "signup">(
    tabParam === "signup" ? "signup" : "login"
  );

  const switchTo = (tab: "login" | "signup") => {
    setActiveTab(tab);
    router.replace(`/auth?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    const token = searchParams.get("token");
    const userParam = searchParams.get("user");
    if (token) {
      localStorage.setItem("catalogx_token", token);
      if (userParam) localStorage.setItem("catalogx_user", userParam);
      window.location.href = "/";
      return;
    }
    const t = searchParams.get("tab");
    if (t === "signup" || t === "login") setActiveTab(t);
  }, [searchParams]);

  return (
    <div className="flex min-h-[100dvh] w-full">
      {/* ── LEFT PANEL: Animated feature showcase ───────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "#07070F" }}
      >
        {/* Background video — gradient mesh disabled in favor of looping motion */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-40"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src="/pixel_grid_motion.mp4"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(7,7,15,0.15),rgba(7,7,15,0.82))]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Brand top-left */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={siteConfig.name}
            width={48}
            height={48}
            className="object-contain"
          />
          <span className="text-[17px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
            {siteConfig.name}
          </span>
        </Link>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <div className="max-w-md">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest mb-6"
              style={{
                background: "rgba(0,122,255,0.12)",
                border: "1px solid rgba(0,122,255,0.25)",
                color: "#5BA4FF",
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse" style={{ boxShadow: "0 0 6px rgba(0,122,255,0.8)" }} />
              AI-Powered Product Intelligence
            </span>

            <h2
              className="font-bold leading-tight mb-6"
              style={{
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
                color: "rgba(255,255,255,0.94)",
                letterSpacing: "-0.035em",
              }}
            >
              Transform raw catalogs into{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #60a5fa, #007AFF, #7C3AED)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                verified intelligence
              </span>
            </h2>

            <div className="space-y-4">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(0,122,255,0.12)", color: "#5BA4FF", border: "1px solid rgba(0,122,255,0.2)" }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.90)" }}>
                      {f.title}
                    </div>
                    <div className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.46)" }}>
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Geist Mono', monospace" }}>
            Built for UniHack 2025 · Adaptive AI · Industrial Commerce
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL: Auth form ───────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col relative"
        style={{ background: "var(--bg-base)" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Mobile-only brand */}
          <Link
            href="/"
            className="flex items-center gap-2 lg:hidden text-[14px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            ← {siteConfig.name}
          </Link>

          {/* Desktop back link */}
          <Link
            href="/"
            className="hidden lg:flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-150"
            style={{
              color: "var(--text-secondary)",
              // background: "var(--bg-elevated)",
              // border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>

          <ThemeToggle />
        </div>

        {/* Form area — centered */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-8">
          <div className="w-full max-w-[400px]">
            {/* Tab switcher */}
            <div
              className="flex rounded-xl p-1 mb-7"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              {(["login", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => switchTo(tab)}
                  className="flex-1 py-2 text-[14px] font-semibold rounded-lg capitalize transition-all duration-200"
                  style={{
                    background: activeTab === tab ? "var(--bg-surface)" : "transparent",
                    color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
                    boxShadow: activeTab === tab ? "var(--shadow-xs)" : "none",
                  }}
                >
                  {tab === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {/* Form */}
            {activeTab === "login" ? (
              <LoginForm onSwitchToSignup={() => switchTo("signup")} />
            ) : (
              <SignupForm onSwitchToLogin={() => switchTo("login")} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 text-center">
          <p className="text-[11px] mono" style={{ color: "var(--text-tertiary)" }}>
            Protected by reCAPTCHA · {siteConfig.name} © 2025
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
