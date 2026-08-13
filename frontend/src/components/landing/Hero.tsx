"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { siteConfig } from "@/lib/config";
import BlinkingSquares from "@/components/ui/BlinkingSquares";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!headlineRef.current) return;
      const lines = headlineRef.current.querySelectorAll(".headline-line");
      gsap.to(lines, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.9,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.15,
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100dvh] flex flex-col justify-center pt-28 pb-16 overflow-hidden"
    >
      {/* Blinking Squares background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, transparent 18%, rgba(0,0,0,0.3) 38%, black 65%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, transparent 18%, rgba(0,0,0,0.3) 38%, black 65%, black 100%)",
        }}
      >
        <BlinkingSquares />
      </div>

      {/* Subtle radial dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: "radial-gradient(var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 30% 50%, black 10%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 30% 50%, black 10%, transparent 80%)",
        }}
      />

      {/* Content */}
      <div className="container relative z-10 max-w-[1340px] px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT: Text + CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Eyebrow badge */}
            <div className="anim-eyebrow mb-6">
              <span className="badge">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse"
                  style={{ boxShadow: "0 0 8px rgba(0,122,255,0.8)" }}
                />
                AI-Powered PII Redaction
              </span>
            </div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="font-bold tracking-tight leading-[1.06] mb-6 w-full"
              style={{ fontSize: "clamp(2.3rem, 3.6vw + 0.5rem, 4.3rem)" }}
            >
              <span
                className="headline-line block"
                style={{
                  opacity: 0,
                  transform: "translateY(30px)",
                  filter: "blur(6px)",
                  color: "var(--text-primary)",
                }}
              >
                Detect, redact &amp; audit
              </span>
              <span
                className="headline-line block gradient-text-blue mt-1"
                style={{ opacity: 0, transform: "translateY(30px)", filter: "blur(6px)" }}
              >
                every PII — including images
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="anim-subtext leading-relaxed mb-8 text-[16px] sm:text-[18px] max-w-xl"
              style={{ color: "var(--text-secondary)" }}
            >
              Upload a <strong style={{ color: "var(--text-primary)" }}>.docx</strong> document.{" "}
              {siteConfig.name} runs hybrid regex + NER detection, OCR-based image redaction,
              and produces a clean redacted file with a machine-readable audit report — all traceable.
            </p>

            {/* CTAs */}
            <div className="anim-cta flex flex-wrap items-center gap-4">
              <Link href="/redact" className="btn-primary">
                Start redacting free
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.333 8h9.334M8.667 3.333L13.333 8l-4.666 4.667"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <a href="#how-it-works" className="btn-ghost">
                See how it works
              </a>
            </div>

            {/* PII type pill strip */}
            <div
              className="anim-subtext mt-8 flex flex-wrap items-center gap-2 text-[12px] mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span>DETECTS:</span>
              {["Names", "Aadhaar / PAN", "Emails & Phones", "Faces & QR codes", "Addresses"].map(
                (item, idx, arr) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                      {item}
                    </span>
                    {idx < arr.length - 1 && <span>•</span>}
                  </span>
                )
              )}
            </div>
          </div>

          {/* RIGHT: Decorative mock (visible on large screens) */}
          <div className="lg:col-span-6 hidden lg:flex items-center justify-center h-[480px]" aria-hidden="true">
            <RedactionMock />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Animated before/after doc preview mock */
function RedactionMock() {
  const lines = [
    { label: "Name", before: "Rashi Patil", after: "John Doe", type: "PERSON" },
    { label: "Aadhaar", before: "2345 6789 0123", after: "████████████", type: "AADHAAR" },
    { label: "Email", before: "rashi@example.com", after: "fake1@redacted.io", type: "EMAIL" },
    { label: "Phone", before: "+91 98765 43210", after: "+91 XXXXX XXXXX", type: "PHONE" },
    { label: "PAN", before: "ABCDE1234F", after: "██████████", type: "PAN" },
  ];

  return (
    <div
      className="w-full max-w-[480px] rounded-3xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg), var(--inner-highlight)",
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,122,255,0.15)", color: "#5BA4FF" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            KYC_Form_Rashi.docx
          </span>
        </div>
        <span
          className="text-[10px] font-bold mono px-2.5 py-1 rounded-full"
          style={{ background: "rgba(48,209,88,0.12)", color: "#30D158", border: "1px solid rgba(48,209,88,0.25)" }}
        >
          5 PII found
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid grid-cols-3 gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest mono"
        style={{ color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)" }}
      >
        <span>Field</span>
        <span>Original</span>
        <span>Redacted</span>
      </div>

      {/* Rows */}
      <div className="p-4 space-y-2.5">
        {lines.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-3 gap-2 items-center px-3 py-2.5 rounded-xl"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-bold mono px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,122,255,0.10)", color: "#5BA4FF" }}
              >
                {row.type}
              </span>
            </div>
            <span
              className="text-[12px] mono truncate"
              style={{ color: "rgba(255,80,80,0.85)", textDecoration: "line-through" }}
            >
              {row.before}
            </span>
            <span
              className="text-[12px] mono font-semibold truncate"
              style={{ color: "#30D158" }}
            >
              {row.after}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3 border-t text-[11px] mono flex items-center justify-between"
        style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}
      >
        <span>Precision: 100% · Recall: 100%</span>
        <span style={{ color: "#30D158" }}>✓ Redacted</span>
      </div>
    </div>
  );
}
