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
      {/* ── Blinking Squares — full section background, fades left-to-right ── */}
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

      {/* ── Subtle radial dot grid ── */}
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

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="container relative z-10 max-w-[1340px] px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* ── LEFT COLUMN: Text Content & CTAs ────────────────────────── */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Eyebrow Badge */}
            {/* <div className="anim-eyebrow mb-6">
              <span className="badge">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse"
                  style={{ boxShadow: "0 0 8px rgba(0,122,255,0.8)" }}
                />
                {siteConfig.name} — Next-Gen Product Intelligence
              </span>
            </div> */}

            {/* Headline with initial opacity: 0 style to prevent initial FOUT render flicker */}
            <h1
              ref={headlineRef}
              className="font-bold tracking-tight leading-[1.06] mb-6 w-full mt-16"
              style={{
                fontSize: "clamp(2.3rem, 3.6vw + 0.5rem, 4.3rem)",
              }}
            >
              {/* Line 1: Guaranteed single line, starts hidden for smooth GSAP entry */}
              <span
                className="headline-line block whitespace-nowrap"
                style={{
                  opacity: 0,
                  transform: "translateY(30px)",
                  filter: "blur(6px)",
                  color: "var(--text-primary)",
                }}
              >
                Turn scattered data into
              </span>
              {/* Line 2: Gradient highlighted text, starts hidden for smooth GSAP entry */}
              <span
                className="headline-line block gradient-text-blue mt-1"
                style={{
                  opacity: 0,
                  transform: "translateY(30px)",
                  filter: "blur(6px)",
                }}
              >
                trusted product intelligence
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="anim-subtext leading-relaxed mb-8 text-[16px] sm:text-[18px] max-w-xl"
              style={{ color: "var(--text-secondary)" }}
            >
              An adaptive platform that learns your vertical, extracts schema automatically,
              and turns raw PDFs, catalogs, and spec sheets into verified, ERP-ready records
              with full source provenance.
            </p>

            {/* Action Buttons */}
            <div className="anim-cta flex flex-wrap items-center gap-4">
              <Link href="/auth?tab=signup" className="btn-primary">
                Start for free
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

            {/* Industry Pill Strip */}
            <div
              className="anim-subtext mt-8 flex flex-wrap items-center gap-2 text-[12px] mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span>SUPPORTED VERTICALS:</span>
              {["Electrical", "Software/IT", "Mechanical", "Chemical"].map(
                (item, idx) => (
                  <span key={item} className="flex items-center gap-2">
                    <span
                      className="font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item}
                    </span>
                    {idx < 3 && <span>•</span>}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="lg:col-span-6 hidden lg:block h-[480px]" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
