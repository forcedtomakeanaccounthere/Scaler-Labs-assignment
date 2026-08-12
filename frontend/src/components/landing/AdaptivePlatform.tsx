"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/config";

const verticals = [
  {
    id: "electrical",
    label: "Electrical & Industrial",
    color: "#007AFF",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    fields: [
      { label: "Rated Control Voltage", value: "24 V DC", conf: 99 },
      { label: "Operating Current (Ie)", value: "25 A", conf: 96 },
      { label: "Switching Frequency", value: "50/60 Hz", conf: 98 },
      { label: "IP Enclosure Rating", value: "IP20", conf: 91 },
      { label: "Standard Compliance", value: "IEC 60947-4-1", conf: 94 },
    ],
    required: ["Rated Voltage", "Operating Current", "IP Rating", "IEC Standard"],
    detected: "Electrical — Low Voltage Contactors",
    confidence: "98.4%",
    document: "Siemens_3RT20_Datasheet.pdf",
  },
  {
    id: "software",
    label: "Software & IT Assets",
    color: "#A78BFA",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    fields: [
      { label: "Release Version", value: "14.2.1-LTS", conf: 99 },
      { label: "License Model", value: "Enterprise SaaS", conf: 95 },
      { label: "End of Support Date", value: "2027-12-31", conf: 92 },
      { label: "OS Compatibility", value: "RHEL, Ubuntu, Windows", conf: 97 },
      { label: "Security Patch Standard", value: "SOC2 Type II / ISO27001", conf: 89 },
    ],
    required: ["Version", "License Model", "End of Support", "Security Compliance"],
    detected: "Software / IT — Infrastructure Middleware",
    confidence: "95.2%",
    document: "RedHat_Enterprise_Spec_v14.pdf",
  },
];

export default function AdaptivePlatform() {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
        }
      },
      { threshold: 0.2 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const v = verticals[active];

  return (
    <section id="adaptive" className="section relative" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="container">
        <div ref={containerRef} className="reveal grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Information */}
          <div className="space-y-6">
            <span className="badge">ZERO-CODE ADAPTABILITY</span>

            <h2
              className="font-bold tracking-tight text-[32px] sm:text-[44px] leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              One intelligence core,{" "}
              <span className="gradient-text-blue">any industry schema</span>
            </h2>

            <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {siteConfig.name} detects your industry profile automatically upon document upload,
              dynamically loading domain-specific taxonomy, extraction prompts, and validation rules.
            </p>

            {/* Vertical Selector Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              {verticals.map((vert, idx) => (
                <button
                  key={vert.id}
                  onClick={() => setActive(idx)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200"
                  style={{
                    background: active === idx ? `${vert.color}18` : "var(--bg-elevated)",
                    border: `1px solid ${active === idx ? `${vert.color}40` : "var(--border)"}`,
                    color: active === idx ? vert.color : "var(--text-secondary)",
                    boxShadow: active === idx ? `0 0 16px ${vert.color}20` : "none",
                  }}
                >
                  {vert.icon}
                  {vert.label}
                </button>
              ))}
            </div>

            {/* Key Differentiator Checklist */}
            <div className="pt-4 space-y-3">
              {[
                "Auto-detected industry profile & taxonomy",
                "Dynamic unit conversions & physics checks",
                "ERP schema export in JSON, CSV, or GraphQL",
                "Zero manual rule configuration required",
              ].map((point) => (
                <div key={point} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${v.color}20`, color: v.color }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live Adaptive Card Preview */}
          <div className="card-bezel overflow-hidden">
            {/* Header */}
            <div
              className="p-5 border-b border-[var(--border)] flex items-center justify-between"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${v.color}20`, color: v.color }}
                >
                  {v.icon}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest mono" style={{ color: "var(--text-tertiary)" }}>
                    AUTO-DETECTED VERTICAL
                  </div>
                  <div className="text-[14px] font-bold" style={{ color: v.color }}>
                    {v.detected}
                  </div>
                </div>
              </div>

              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold mono"
                style={{
                  background: "var(--success-subtle)",
                  color: "var(--success)",
                  border: "1px solid rgba(48, 209, 88, 0.25)",
                }}
              >
                {v.confidence} Score
              </span>
            </div>

            {/* Document Reference */}
            <div className="px-5 py-2.5 border-b border-[var(--border-subtle)] text-[12px] mono flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
              <span>DOCUMENT SOURCE:</span>
              <span style={{ color: "var(--text-secondary)" }}>{v.document}</span>
            </div>

            {/* Field Rows */}
            <div className="p-5 space-y-2">
              {v.fields.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)]"
                  style={{ background: "var(--bg-base)" }}
                >
                  <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{f.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{f.value}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded mono"
                      style={{
                        background: `${v.color}15`,
                        color: v.color,
                      }}
                    >
                      {f.conf}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Required Fields for Profile */}
            <div className="p-5 pt-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="text-[10px] uppercase tracking-widest mono mb-2" style={{ color: "var(--text-tertiary)" }}>
                REQUIRED PROFILE ATTRIBUTES
              </div>
              <div className="flex flex-wrap gap-2">
                {v.required.map((req) => (
                  <span
                    key={req}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium mono"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    ✓ {req}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
