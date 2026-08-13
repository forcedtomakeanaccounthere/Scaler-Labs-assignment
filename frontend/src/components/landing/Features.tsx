"use client";

import { useEffect, useRef } from "react";
import { siteConfig } from "@/lib/config";

/* ── Entity Detection Visual ─────────────────────────────────────────── */
function DetectionVisual() {
  const entities = [
    { text: "Rashi Patil", type: "PERSON", conf: 97, color: "#FF9F0A" },
    { text: "2345 6789 0123", type: "AADHAAR", conf: 99, color: "#FF453A" },
    { text: "rashi@corp.com", type: "EMAIL", conf: 99, color: "#007AFF" },
    { text: "+91 98765 43210", type: "PHONE", conf: 96, color: "#30D158" },
  ];
  return (
    <div className="mt-8 space-y-2.5">
      {entities.map((e) => (
        <div
          key={e.text}
          className="flex items-center justify-between rounded-xl px-3 py-2.5 border"
          style={{ background: "var(--bg-base)", borderColor: `${e.color}25` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-[9px] font-bold mono px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${e.color}15`, color: e.color, border: `1px solid ${e.color}30` }}
            >
              {e.type}
            </span>
            <span className="text-[12px] mono truncate" style={{ color: "var(--text-secondary)", textDecoration: "line-through" }}>
              {e.text}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full" style={{ width: `${e.conf}%`, background: e.color }} />
            </div>
            <span className="text-[10px] mono" style={{ color: e.color }}>{e.conf}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Image Redaction Visual ──────────────────────────────────────────── */
function ImageRedactionVisual() {
  return (
    <div className="mt-6">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,69,58,0.2)" }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 text-[10px] mono"
          style={{ background: "rgba(255,69,58,0.08)", borderBottom: "1px solid rgba(255,69,58,0.12)" }}
        >
          <span style={{ color: "rgba(255,120,110,0.9)" }}>AADHAAR_CARD.jpg</span>
          <span style={{ color: "rgba(255,120,110,0.7)" }}>4 regions masked</span>
        </div>
        <div className="p-3 space-y-2" style={{ background: "var(--bg-base)" }}>
          {[
            { region: "Face photo", method: "Opaque mask", icon: "👤" },
            { region: "QR code", method: "Opaque mask", icon: "⬛" },
            { region: "Aadhaar number", method: "Opaque mask", icon: "🔢" },
            { region: "Name / DOB", method: "Opaque mask", icon: "📝" },
          ].map((r) => (
            <div
              key={r.region}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{r.icon}</span>
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{r.region}</span>
              </div>
              <span
                className="text-[9px] font-bold mono px-2 py-0.5 rounded-full"
                style={{ background: "rgba(48,209,88,0.12)", color: "#30D158", border: "1px solid rgba(48,209,88,0.25)" }}
              >
                {r.method}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Pseudonymization Visual ─────────────────────────────────────────── */
function PseudoVisual() {
  return (
    <div className="mt-6">
      <div
        className="rounded-xl p-3 text-[10px] mono space-y-2.5"
        style={{ background: "var(--bg-base)", border: "1px solid rgba(167,139,250,0.2)" }}
      >
        <div className="text-[9px] uppercase tracking-widest mb-3" style={{ color: "rgba(167,139,250,0.7)" }}>
          CONSISTENCY MAP · JOB #A7F2
        </div>
        {[
          { real: "Rashi Patil", fake: "John Doe", type: "NAME" },
          { real: "rashi@corp.com", fake: "john@redacted.io", type: "EMAIL" },
          { real: "+91 98765 43210", fake: "+1 555 0199", type: "PHONE" },
        ].map((m) => (
          <div key={m.real} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[8px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA" }}
              >
                {m.type}
              </span>
              <span className="truncate" style={{ color: "rgba(255,80,80,0.8)", textDecoration: "line-through" }}>{m.real}</span>
            </div>
            <span className="flex-shrink-0" style={{ color: "#30D158" }}>→ {m.fake}</span>
          </div>
        ))}
        <div className="pt-1.5 border-t" style={{ borderColor: "rgba(167,139,250,0.15)", color: "rgba(167,139,250,0.5)" }}>
          Same name maps identically across all occurrences
        </div>
      </div>
    </div>
  );
}

/* ── Audit Trail Visual ──────────────────────────────────────────────── */
function AuditVisual() {
  return (
    <div className="mt-6 space-y-2">
      {[
        { action: "File uploaded", time: "10:32:01", status: "ok" },
        { action: "Text PII scan complete", time: "10:32:04", status: "ok" },
        { action: "Image extraction + OCR", time: "10:32:08", status: "ok" },
        { action: "Redacted .docx generated", time: "10:32:11", status: "ok" },
      ].map((e) => (
        <div
          key={e.action}
          className="flex items-center justify-between rounded-xl px-3 py-2.5"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#30D158" }} />
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{e.action}</span>
          </div>
          <span className="text-[10px] mono flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>{e.time}</span>
        </div>
      ))}
    </div>
  );
}

const cards = [
  {
    id: "detection",
    span: "md:col-span-7",
    accent: "#007AFF",
    tag: "HYBRID DETECTION",
    title: "Regex + NER + Presidio Pipeline",
    desc: "Structured formats (Aadhaar, PAN, email, phone, credit card with Luhn check) via regex. Unstructured entities (names, addresses, org names) via spaCy / Presidio NER. Context boosting near keywords like DOB, PAN No.",
    visual: <DetectionVisual />,
    gradient: "linear-gradient(135deg, rgba(0,122,255,0.14) 0%, transparent 60%)",
  },
  {
    id: "images",
    span: "md:col-span-5",
    accent: "#FF453A",
    tag: "IMAGE REDACTION",
    title: "OCR-Backed Image Masking",
    desc: "Every embedded image extracted and processed independently. OCR with bounding boxes, structural field detection for Aadhaar/PAN. Opaque black masks — no reversible blur.",
    visual: <ImageRedactionVisual />,
    gradient: "linear-gradient(135deg, rgba(255,69,58,0.10) 0%, transparent 60%)",
  },
  {
    id: "pseudo",
    span: "md:col-span-4",
    accent: "#A78BFA",
    tag: "PSEUDONYMIZATION",
    title: "Consistent Fake-Value Mapping",
    desc: "Faker-generated replacements with per-document consistency: the same real name maps to the same fake name every time. Stored in MongoDB per job, auditable, reversible only by authorized users.",
    visual: <PseudoVisual />,
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, transparent 60%)",
  },
  {
    id: "precision",
    span: "md:col-span-4",
    accent: "#FF9F0A",
    tag: "PRECISION CONTROL",
    title: "Low False-Positive Design",
    desc: "Order/ticket IDs (e.g. TCK-2024-00931) are deliberately excluded. Sequential internal IDs, numeric codes without PII context are suppressed. Every exclusion is documented in the evaluation report.",
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
    id: "audit",
    span: "md:col-span-4",
    accent: "#30D158",
    tag: "AUDIT TRAIL",
    title: "Immutable Job Log & Evaluation Report",
    desc: "Per-job log: upload, detection results, reviewer actions, redacted output. Evaluation report with per-entity-type Precision / Recall / F1. Trends across document types over time.",
    visual: <AuditVisual />,
    gradient: "linear-gradient(135deg, rgba(48,209,88,0.10) 0%, transparent 60%)",
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
          <span className="badge mb-4">ENGINEERED FOR COMPLIANCE</span>
          <h2 className="font-bold tracking-tight text-[32px] sm:text-[44px] leading-tight" style={{ color: "var(--text-primary)" }}>
            Every redaction is traceable,<br />scored, and reproducible
          </h2>
          <p className="mt-4 text-[16px]" style={{ color: "var(--text-secondary)" }}>
            {siteConfig.name} combines pattern matching, NER, and OCR into a defensible pipeline with full audit support.
          </p>
        </div>

        {/* Bento Grid */}
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
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: card.gradient }} />
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)` }} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase mono px-2.5 py-1 rounded-full"
                    style={{ background: `${card.accent}12`, color: card.accent, border: `1px solid ${card.accent}25` }}
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
                <h3 className="text-[19px] font-bold tracking-tight mb-2.5" style={{ color: "var(--text-primary)" }}>{card.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{card.desc}</p>
                {card.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
