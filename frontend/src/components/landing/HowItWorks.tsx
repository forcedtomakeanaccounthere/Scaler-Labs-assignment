"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    step: "01",
    title: "Ingest Unstructured Documents",
    desc: "Drag & drop PDF catalogs, scanned supplier datasheets, or Excel price lists. CatalogX processes high-res multi-page documents — complex tables, multi-column layouts, rotated text — without any manual clipping or preprocessing.",
    accent: "#007AFF",
    tag: "INGESTION",
    visual: (
      <div className="space-y-3">
        {[
          { name: "Siemens_Contactor_Catalog_2025.pdf", size: "14.2 MB · 48 Pages", status: "INGESTED", color: "#30D158" },
          { name: "ABB_Motor_Specs_EU.pdf", size: "8.7 MB · 32 Pages", status: "PROCESSING", color: "#007AFF" },
          { name: "Schneider_PLC_Datasheet.pdf", size: "22.1 MB · 96 Pages", status: "QUEUED", color: "#FF9F0A" },
        ].map((f) => (
          <div
            key={f.name}
            className="flex items-center gap-3 p-3 rounded-xl border"
            style={{
              background: "var(--bg-base)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: "rgba(0,122,255,0.10)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{f.name}</div>
              <div className="text-[10px] mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>{f.size}</div>
            </div>
            <span
              className="text-[10px] font-bold mono px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: `${f.color}18`,
                color: f.color,
                border: `1px solid ${f.color}30`,
              }}
            >
              {f.status}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: "02",
    title: "Adaptive Extraction & Validation",
    desc: "The AI automatically matches the detected industry profile and applies the exact attribute schema and validation rules — running unit conversions and physics-based range checks in real time.",
    accent: "#7C3AED",
    tag: "EXTRACTION",
    visual: (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] mono pb-2 mb-1" style={{ color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)" }}>
          <span>EXTRACTION PROGRESS</span>
          <span style={{ color: "#7C3AED" }}>92.4% CONFIDENCE</span>
        </div>
        {[
          { label: "Rated Voltage", value: "24 V DC", pct: 99, ok: true },
          { label: "Rated Current", value: "25 A", pct: 96, ok: true },
          { label: "IP Rating", value: "IP20", pct: 88, ok: true },
          { label: "Switching Frequency", value: "Resolving…", pct: 54, ok: false },
        ].map((f) => (
          <div
            key={f.label}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border"
            style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.ok ? "#30D158" : "#FF9F0A" }} />
              <span className="text-[12px] truncate" style={{ color: "var(--text-secondary)" }}>{f.label}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[12px] font-semibold mono" style={{ color: "var(--text-primary)" }}>{f.value}</span>
              <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: f.ok ? "#30D158" : "#FF9F0A" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: "03",
    title: "Review, Approve & ERP Export",
    desc: "High-confidence fields auto-approve with bounding-box provenance links. Ambiguous fields surface in a structured review queue. Push clean, normalized JSON directly to SAP, Akeneo, Pimcore, or Shopify.",
    accent: "#30D158",
    tag: "EXPORT",
    visual: (
      <div className="space-y-2.5">
        <div className="p-3 rounded-xl flex items-center justify-between border" style={{ background: "var(--bg-base)", borderColor: "rgba(48,209,88,0.25)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(48,209,88,0.15)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>Record Auto-Approved</div>
              <div className="text-[10px] mono" style={{ color: "var(--text-tertiary)" }}>Confidence 96.4% · 5 fields</div>
            </div>
          </div>
          <span className="text-[10px] mono px-2 py-1 rounded-md" style={{ background: "rgba(48,209,88,0.12)", color: "#30D158" }}>96.4%</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["SAP S/4HANA", "Akeneo PIM", "JSON API"].map((t) => (
            <div key={t} className="p-2.5 rounded-xl border text-center" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              <div className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>{t}</div>
              <div className="text-[9px] mono mt-0.5" style={{ color: "#30D158" }}>READY</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const trigger = triggerRef.current;
      const cards = cardsRef.current;

      if (!trigger || cards.length === 0) return;

      // Set initial positions cleanly: Card 0 is in place; Card 1 and 2 start below view
      gsap.set(cards[0], { yPercent: 0, scale: 1, zIndex: 1 });
      gsap.set(cards[1], { yPercent: 115, scale: 1, zIndex: 2 });
      gsap.set(cards[2], { yPercent: 115, scale: 1, zIndex: 3 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trigger,
          start: "top top+=100",
          end: "+=2200",
          pin: true,
          scrub: 0.5, // tight scrub for crisp lag-free interaction
          anticipatePin: 1,
        },
      });

      // Step 1: Card 2 slides up to overlay Card 1 cleanly without darkening Card 1
      tl.to(cards[0], { scale: 0.96, yPercent: -1.5, ease: "power1.inOut" }, "step1")
        .to(cards[1], { yPercent: 0, ease: "power1.out" }, "step1")

      // Step 2: Card 3 slides up to overlay Card 2 cleanly
        .to(cards[1], { scale: 0.98, yPercent: -1.5, ease: "power1.inOut" }, "step2")
        .to(cards[2], { yPercent: 0, ease: "power1.out" }, "step2");

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div ref={triggerRef} className="py-12 flex flex-col justify-center min-h-[90vh]">
        {/* Section Header */}
        <div className="container text-center mb-10">
          <span className="badge mb-3">WORKFLOW</span>
          <h2
            className="font-bold tracking-tight text-[28px] sm:text-[40px] leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Three steps from raw document
            <br />
            to commerce-ready data
          </h2>
          <p className="mt-3 text-[15px]" style={{ color: "var(--text-secondary)" }}>
            Fully automated extraction with precision human-in-the-loop review.
          </p>
        </div>

        {/* Pinned Card Stack Container */}
        <div className="relative max-w-3xl mx-auto w-full px-4 sm:px-8 h-[380px] sm:h-[340px]">
          {steps.map((item, idx) => (
            <div
              key={item.step}
              ref={(el) => { cardsRef.current[idx] = el; }}
              className="absolute inset-0 w-full h-full"
              style={{
                transformOrigin: "top center",
                willChange: "transform",
              }}
            >
              <div
                className="card-bezel overflow-hidden h-full flex flex-col justify-between"
                style={{
                  // Subtle top shadow on incoming cards so they cast realistic soft shadow onto card underneath
                  boxShadow: idx > 0
                    ? "0 -16px 40px rgba(0, 0, 0, 0.20), var(--shadow-md), var(--inner-highlight)"
                    : "var(--shadow-md), var(--inner-highlight)",
                }}
              >
                {/* Colored accent bar */}
                <div className="h-[2px] w-full" style={{ background: item.accent }} />

                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1">
                  {/* Left: text */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[14px] mono flex-shrink-0"
                        style={{
                          background: `${item.accent}18`,
                          color: item.accent,
                          border: `1px solid ${item.accent}30`,
                        }}
                      >
                        {item.step}
                      </span>
                      <span
                        className="text-[9px] font-bold tracking-widest uppercase mono px-2.5 py-1 rounded-full"
                        style={{
                          background: `${item.accent}12`,
                          color: item.accent,
                          border: `1px solid ${item.accent}22`,
                        }}
                      >
                        {item.tag}
                      </span>
                    </div>

                    <h3
                      className="text-[18px] sm:text-[20px] font-bold tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.title}
                    </h3>

                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {item.desc}
                    </p>
                  </div>

                  {/* Right: visual mock */}
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {item.visual}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
