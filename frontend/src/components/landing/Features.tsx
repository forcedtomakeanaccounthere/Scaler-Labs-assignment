"use client";

import { useEffect, useRef } from "react";
import { siteConfig } from "@/lib/config";

/* ── Schema Preview Visual ─────────────────────────────────────────────── */
function SchemaVisual() {
  const fields = [
    { name: "rated_voltage", val: "24V DC", pct: 99, status: "ok" },
    { name: "current_rating", val: "25A", pct: 96, status: "ok" },
    { name: "ip_code", val: "IP20", pct: 88, status: "ok" },
    { name: "switching_freq", val: "Resolving…", pct: 52, status: "warn" },
  ];
  return (
    <div className="mt-8 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,122,255,0.18)" }}>
      <div
        className="flex items-center justify-between px-4 py-2.5 text-[10px] mono"
        style={{ background: "rgba(0,122,255,0.08)", borderBottom: "1px solid rgba(0,122,255,0.12)" }}
      >
        <span style={{ color: "rgba(0,122,255,0.85)" }}>SCHEMA PROFILE</span>
        <span style={{ color: "rgba(0,122,255,0.7)" }}>ELECTRICAL_SPECS_V2 ●</span>
      </div>
      <div className="p-3 space-y-2" style={{ background: "var(--bg-base)" }}>
        {fields.map((f) => (
          <div
            key={f.name}
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: f.status === "ok" ? "#30D158" : "#FF9F0A" }}
              />
              <span className="text-[11px] mono truncate" style={{ color: "var(--text-secondary)" }}>{f.name}</span>
            </div>
            <div className="flex items-center gap-3 ml-2 flex-shrink-0">
              <span className="text-[11px] font-semibold mono" style={{ color: "var(--text-primary)" }}>{f.val}</span>
              <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: f.status === "ok" ? "#30D158" : "#FF9F0A" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Confidence Bar Visual ─────────────────────────────────────────────── */
function ConfidenceVisual() {
  return (
    <div className="mt-6 relative">
      <svg viewBox="0 0 200 120" className="w-full" fill="none">
        {/* Circular gauge background */}
        <circle cx="100" cy="95" r="70" stroke="rgba(48,209,88,0.12)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray="220 440" strokeDashoffset="-110" />
        {/* Gauge fill — 99.4% */}
        <circle cx="100" cy="95" r="70" stroke="#30D158" strokeWidth="12" strokeLinecap="round"
          strokeDasharray="219 440" strokeDashoffset="-110"
          style={{ filter: "drop-shadow(0 0 8px rgba(48,209,88,0.6))" }} />
        <text x="100" y="91" textAnchor="middle" fontFamily="'Geist Mono', monospace" fontSize="22" fontWeight="700" fill="rgba(0,122,255,0.85)">98.4%</text>
        <text x="100" y="105" textAnchor="middle" fontFamily="'Geist', sans-serif" fontSize="9" fill="rgba(0,122,255,0.85)" letterSpacing="0.05em">FIELD ACCURACY</text>
      </svg>
    </div>
  );
}

/* ── Provenance Visual ─────────────────────────────────────────────────── */
function ProvenanceVisual() {
  return (
    <div className="mt-6">
      <div
        className="rounded-xl p-3 text-[10px] mono space-y-2.5"
        style={{ background: "var(--bg-base)", border: "1px solid rgba(167,139,250,0.2)" }}
      >
        {[
          { field: "rated_voltage", page: "pg.12", coords: "x:184 y:320 w:48" },
          { field: "contact_rating", page: "pg.12", coords: "x:184 y:355 w:52" },
          { field: "ip_code", page: "pg.15", coords: "x:220 y:180 w:40" },
        ].map((p) => (
          <div key={p.field} className="flex items-start justify-between gap-2">
            <span style={{ color: "#A78BFA" }}>{p.field}</span>
            <div className="text-right" style={{ color: "var(--text-tertiary)" }}>
              <div>{p.page}</div>
              <div style={{ fontSize: "9px" }}>{p.coords}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Export Visual ─────────────────────────────────────────────────────── */
function ExportVisual() {
  const targets = [
    { name: "SAP", color: "#0070D2" },
    { name: "Akeneo", color: "#9B4DCA" },
    { name: "Shopify", color: "#5C6AC4" },
    { name: "JSON", color: "#38BDF8" },
  ];
  return (
    <div className="mt-6 space-y-2">
      {targets.map((t) => (
        <div
          key={t.name}
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: "var(--bg-base)", border: `1px solid ${t.color}22` }}
        >
          <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{t.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] mono" style={{ color: t.color }}>PUSH READY</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 6px ${t.color}` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const cards = [
  {
    id: "adaptive-schema",
    span: "md:col-span-7",
    accent: "#007AFF",
    tag: "CORE INNOVATION",
    title: "Adaptive Industry Schema Engine",
    desc: "Detects Electrical, IT, Mechanical, Chemical vertical from document context and applies exact attribute schemas automatically — zero config.",
    visual: <SchemaVisual />,
    gradient: "linear-gradient(135deg, rgba(0,122,255,0.14) 0%, transparent 60%)",
  },
  {
    id: "confidence",
    span: "md:col-span-5",
    accent: "#30D158",
    tag: "QUALITY ASSURANCE",
    title: "Field-Level Confidence Scoring",
    desc: "Per-attribute confidence with physics-based validation catches impossible values before they hit your ERP.",
    visual: <ConfidenceVisual />,
    gradient: "linear-gradient(135deg, rgba(48,209,88,0.10) 0%, transparent 60%)",
  },
  {
    id: "provenance",
    span: "md:col-span-4",
    accent: "#A78BFA",
    tag: "AUDITABILITY",
    title: "Bounding Box Provenance",
    desc: "Every value links to exact PDF page coordinates. No black-box guessing.",
    visual: <ProvenanceVisual />,
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, transparent 60%)",
  },
  {
    id: "rules",
    span: "md:col-span-4",
    accent: "#FF9F0A",
    tag: "ZERO HALLUCINATION",
    title: "Deterministic Validation Rules",
    desc: "Cross-checks voltage, current, dimensions against physics and standards. Invalid values are rejected — not guessed.",
    visual: null,
    gradient: "linear-gradient(135deg, rgba(255,159,10,0.10) 0%, transparent 60%)",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF9F0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  },
  {
    id: "export",
    span: "md:col-span-4",
    accent: "#38BDF8",
    tag: "INTEGRATION",
    title: "ERP & Commerce API Sync",
    desc: "Clean normalized JSON to SAP, Akeneo, Shopify with unified unit formats (mm→in, kW→HP).",
    visual: <ExportVisual />,
    gradient: "linear-gradient(135deg, rgba(56,189,248,0.10) 0%, transparent 60%)",
  },
];

export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll(".feature-card");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.12 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="features" className="section relative" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="badge mb-4">ENGINEERED FOR DATA TRUST</span>
          <h2 className="font-bold tracking-tight text-[32px] sm:text-[44px] leading-tight" style={{ color: "var(--text-primary)" }}>
            Built to eliminate manual entry &amp; AI guesswork
          </h2>
          <p className="mt-4 text-[16px]" style={{ color: "var(--text-secondary)" }}>
            {siteConfig.name} provides deterministic, explainable intelligence for every single field.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`feature-card reveal ${card.span} relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-between group cursor-default`}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm), var(--inner-highlight)",
                "--card-accent": card.accent,
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${card.accent}40`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `var(--shadow-md), 0 0 0 1px ${card.accent}30, var(--inner-highlight)`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm), var(--inner-highlight)";
              }}
            >
              {/* Gradient tint on hover */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: card.gradient }}
              />

              {/* Corner accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)` }}
              />

              <div className="relative z-10">
                {/* Tag row */}
                <div className="flex items-start justify-between mb-5">
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase mono px-2.5 py-1 rounded-full"
                    style={{
                      background: `${card.accent}12`,
                      color: card.accent,
                      border: `1px solid ${card.accent}25`,
                    }}
                  >
                    {card.tag}
                  </span>
                  {card.icon && (
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ml-3 transition-transform duration-300 group-hover:scale-105"
                      style={{ background: `${card.accent}10`, border: `1px solid ${card.accent}22` }}
                    >
                      {card.icon}
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-[19px] font-bold tracking-tight mb-2.5" style={{ color: "var(--text-primary)" }}>
                  {card.title}
                </h3>

                {/* Desc */}
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {card.desc}
                </p>

                {/* Visual */}
                {card.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
