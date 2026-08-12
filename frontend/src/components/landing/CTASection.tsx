"use client";

import Link from "next/link";
import { siteConfig } from "@/lib/config";

export default function CTASection() {
  return (
    <section className="section relative" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="container">
        <div
          className="relative overflow-hidden rounded-[32px] p-8 sm:p-16 text-center card-bezel"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 50%, var(--accent-subtle), transparent 70%), var(--bg-surface)",
          }}
        >
          {/* Subtle Grid Pattern Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="badge mb-6">BUILT FOR UNIHACK 2025</span>

            <h2
              className="font-bold tracking-tight text-[32px] sm:text-[48px] leading-tight mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              Intelligence that earns your trust — field by field
            </h2>

            <p className="text-[16px] leading-relaxed mb-10" style={{ color: "var(--text-secondary)" }}>
              Stop guessing which catalog specs are accurate. {siteConfig.name} provides source-backed,
              confidence-scored product records ready for your commerce stack.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/auth?tab=signup" className="btn-primary text-[15px] !py-3.5 !px-8">
                Start building with {siteConfig.name}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.333 8h9.334M8.667 3.333L13.333 8l-4.666 4.667"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <a href="#features" className="btn-ghost text-[15px] !py-3.5 !px-7">
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
