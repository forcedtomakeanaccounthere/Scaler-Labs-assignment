"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/config";

const policyModes = [
  {
    id: "mask",
    label: "Opaque Masking",
    color: "#FF453A",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
    entities: [
      { type: "AADHAAR", original: "2345 6789 0123", output: "████████████", action: "MASKED" },
      { type: "PAN", original: "ABCDE1234F", output: "██████████", action: "MASKED" },
      { type: "FACE PHOTO", original: "[Image]", output: "[■ REDACTED]", action: "MASKED" },
      { type: "QR CODE", original: "[QR]", output: "[■ REDACTED]", action: "MASKED" },
    ],
    desc: "Irreversible opaque black rectangles for maximum privacy. Industry standard for legal, DoD, and compliance-sensitive workflows. No blur or pixelation — both are reversible.",
    confidence: "MAX SECURITY",
  },
  {
    id: "pseudo",
    label: "Pseudonymization",
    color: "#A78BFA",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    entities: [
      { type: "PERSON", original: "Rashi Patil", output: "John Doe", action: "REPLACED" },
      { type: "EMAIL", original: "rashi@corp.com", output: "john@redacted.io", action: "REPLACED" },
      { type: "PHONE", original: "+91 98765 43210", output: "+1 555 0199", action: "REPLACED" },
      { type: "ADDRESS", original: "123 MG Road, Pune", output: "456 Oak St, Springfield", action: "REPLACED" },
    ],
    desc: "Faker-generated replacements with per-document consistency: the same real value maps to the same fake value everywhere it appears. Auditable and reversible only by authorized users.",
    confidence: "CONSISTENT MAP",
  },
  {
    id: "generalize",
    label: "Generalization",
    color: "#FF9F0A",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    entities: [
      { type: "DOB", original: "15/03/1988", output: "1980s", action: "GENERALIZED" },
      { type: "PERSON", original: "Rashi Patil", output: "[Individual]", action: "GENERALIZED" },
      { type: "PHONE", original: "+91 98765 43210", output: "+91 XXXXX XXXXX", action: "GENERALIZED" },
      { type: "EMAIL", original: "rashi@corp.com", output: "[EMAIL REDACTED]", action: "GENERALIZED" },
    ],
    desc: "Replace specific values with general categories. DOB → decade, full name → [Individual], phone → masked format. Preserves document readability while removing identifying precision.",
    confidence: "READABLE",
  },
];

export default function AdaptivePlatform() {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const v = policyModes[active];

  return (
    <section id="adaptive" className="section relative" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="container">
        <div ref={containerRef} className="reveal grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-6">
            <span className="badge">CONFIGURABLE REDACTION POLICY</span>
            <h2 className="font-bold tracking-tight text-[32px] sm:text-[44px] leading-tight" style={{ color: "var(--text-primary)" }}>
              One platform,{" "}
              <span className="gradient-text-blue">three redaction modes</span>
            </h2>
            <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Choose per-entity-type: opaque masking for maximum security, pseudonymization
              for test data, or generalization for readable redacted documents. Configured in
              the UI, persisted per job.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              {policyModes.map((mode, idx) => (
                <button
                  key={mode.id}
                  onClick={() => setActive(idx)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200"
                  style={{
                    background: active === idx ? `${mode.color}18` : "var(--bg-elevated)",
                    border: `1px solid ${active === idx ? `${mode.color}40` : "var(--border)"}`,
                    color: active === idx ? mode.color : "var(--text-secondary)",
                    boxShadow: active === idx ? `0 0 16px ${mode.color}20` : "none",
                  }}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="pt-4 space-y-3">
              {[
                "Configurable per entity type in the UI",
                "Persisted and auditable per job ID",
                "Human-in-the-loop review for low-confidence detections",
                "Extensible: add new PII types with one class",
              ].map((point) => (
                <div key={point} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${v.color}20`, color: v.color }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Live Policy Preview Card */}
          <div className="card-bezel overflow-hidden">
            <div
              className="p-5 border-b flex items-center justify-between"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${v.color}20`, color: v.color }}>
                  {v.icon}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest mono" style={{ color: "var(--text-tertiary)" }}>ACTIVE POLICY</div>
                  <div className="text-[14px] font-bold" style={{ color: v.color }}>{v.label}</div>
                </div>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold mono"
                style={{ background: `${v.color}15`, color: v.color, border: `1px solid ${v.color}25` }}
              >
                {v.confidence}
              </span>
            </div>

            <div className="px-5 py-3 border-b text-[12px] leading-relaxed" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              {v.desc}
            </div>

            <div className="p-5 space-y-2">
              {v.entities.map((e) => (
                <div
                  key={e.type}
                  className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-[9px] font-bold mono px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: `${v.color}15`, color: v.color }}
                    >
                      {e.type}
                    </span>
                    <span className="text-[12px] mono truncate" style={{ color: "var(--text-tertiary)", textDecoration: "line-through" }}>{e.original}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[12px] mono font-semibold" style={{ color: "#30D158" }}>{e.output}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
