"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    step: "01",
    title: "Upload Your DOCX Document",
    desc: "Drag and drop any .docx file — KYC forms, onboarding packets, HR documents, legal agreements. The job is queued in BullMQ and processed asynchronously so large documents never block the UI.",
    accent: "#007AFF",
    tag: "INGESTION",
    visual: (
      <div className="space-y-3">
        {[
          { name: "KYC_Form_Rashi_Patil.docx", size: "1.4 MB · 8 Pages", status: "PROCESSING", color: "#007AFF" },
          { name: "Employee_Onboarding_2026.docx", size: "3.2 MB · 22 Pages", status: "QUEUED", color: "#FF9F0A" },
          { name: "Loan_Agreement_Draft.docx", size: "0.9 MB · 5 Pages", status: "DONE", color: "#30D158" },
        ].map((f) => (
          <div
            key={f.name}
            className="flex items-center gap-3 p-3 rounded-xl border"
            style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
          >
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(0,122,255,0.10)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{f.name}</div>
              <div className="text-[10px] mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>{f.size}</div>
            </div>
            <span className="text-[10px] font-bold mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${f.color}18`, color: f.color, border: `1px solid ${f.color}30` }}>
              {f.status}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: "02",
    title: "Detect & Review PII Entities",
    desc: "Hybrid regex + NER pipeline identifies every PII entity with confidence score, source detector, and character span. Low-confidence detections surface in a review UI for accept/reject. Every decision is logged.",
    accent: "#7C3AED",
    tag: "DETECTION",
    visual: (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] mono pb-2 mb-1" style={{ color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)" }}>
          <span>DETECTED ENTITIES</span>
          <span style={{ color: "#7C3AED" }}>7 PII FOUND</span>
        </div>
        {[
          { text: "Rashi Patil", type: "PERSON", conf: 94, source: "NER", color: "#FF9F0A" },
          { text: "2345 6789 0123", type: "AADHAAR", conf: 99, source: "REGEX", color: "#FF453A" },
          { text: "rashi@corp.com", type: "EMAIL", conf: 99, source: "REGEX", color: "#007AFF" },
          { text: "ABCDE1234F", type: "PAN", conf: 99, source: "REGEX", color: "#7C3AED" },
        ].map((e) => (
          <div key={e.text} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
              <span className="text-[11px] mono truncate" style={{ color: "var(--text-secondary)", textDecoration: "line-through" }}>{e.text}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[9px] mono px-1.5 py-0.5 rounded" style={{ background: `${e.color}15`, color: e.color }}>{e.type}</span>
              <span className="text-[9px] mono" style={{ color: "var(--text-tertiary)" }}>{e.conf}%</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: "03",
    title: "Download Redacted DOCX + Evaluation Report",
    desc: "Receive the redacted .docx with preserved formatting and a JSON/HTML evaluation report showing Precision, Recall, F1 per entity type. The consistency map ensures the same fake name appears everywhere the original did.",
    accent: "#30D158",
    tag: "OUTPUT",
    visual: (
      <div className="space-y-2.5">
        <div className="p-3 rounded-xl flex items-center justify-between border" style={{ background: "var(--bg-base)", borderColor: "rgba(48,209,88,0.25)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(48,209,88,0.15)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>KYC_Form_Rashi_REDACTED.docx</div>
              <div className="text-[10px] mono" style={{ color: "var(--text-tertiary)" }}>7 entities redacted · Layout preserved</div>
            </div>
          </div>
          <span className="text-[10px] mono px-2 py-1 rounded-md" style={{ background: "rgba(48,209,88,0.12)", color: "#30D158" }}>READY</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Precision", value: "99.4%" },
            { label: "Recall", value: "98.7%" },
            { label: "F1 Score", value: "99.0%" },
          ].map((m) => (
            <div key={m.label} className="p-2.5 rounded-xl border text-center" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              <div className="text-[13px] font-bold mono" style={{ color: "var(--text-primary)" }}>{m.value}</div>
              <div className="text-[9px] mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-xl border text-[11px] mono" style={{ background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-tertiary)" }}>
          evaluation_report_job_A7F2.json · 4KB
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

      gsap.set(cards[0], { yPercent: 0, scale: 1, zIndex: 1 });
      gsap.set(cards[1], { yPercent: 115, scale: 1, zIndex: 2 });
      gsap.set(cards[2], { yPercent: 115, scale: 1, zIndex: 3 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trigger,
          start: "top top+=100",
          end: "+=2200",
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
        },
      });

      tl.to(cards[0], { scale: 0.96, yPercent: -1.5, ease: "power1.inOut" }, "step1")
        .to(cards[1], { yPercent: 0, ease: "power1.out" }, "step1")
        .to(cards[1], { scale: 0.98, yPercent: -1.5, ease: "power1.inOut" }, "step2")
        .to(cards[2], { yPercent: 0, ease: "power1.out" }, "step2");
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" ref={sectionRef} style={{ borderTop: "1px solid var(--border)" }}>
      <div ref={triggerRef} className="py-12 flex flex-col justify-center min-h-[90vh]">
        <div className="container text-center mb-10">
          <span className="badge mb-3">WORKFLOW</span>
          <h2 className="font-bold tracking-tight text-[28px] sm:text-[40px] leading-tight" style={{ color: "var(--text-primary)" }}>
            Three steps from raw document
            <br />to fully redacted output
          </h2>
          <p className="mt-3 text-[15px]" style={{ color: "var(--text-secondary)" }}>
            Upload, detect, review, download — with a full evaluation report every time.
          </p>
        </div>

        <div className="relative max-w-3xl mx-auto w-full px-4 sm:px-8 h-[380px] sm:h-[340px]">
          {steps.map((item, idx) => (
            <div
              key={item.step}
              ref={(el) => { cardsRef.current[idx] = el; }}
              className="absolute inset-0 w-full h-full"
              style={{ transformOrigin: "top center", willChange: "transform" }}
            >
              <div
                className="card-bezel overflow-hidden h-full flex flex-col justify-between"
                style={{
                  boxShadow: idx > 0
                    ? "0 -16px 40px rgba(0,0,0,0.20), var(--shadow-md), var(--inner-highlight)"
                    : "var(--shadow-md), var(--inner-highlight)",
                }}
              >
                <div className="h-[2px] w-full" style={{ background: item.accent }} />
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[14px] mono flex-shrink-0"
                        style={{ background: `${item.accent}18`, color: item.accent, border: `1px solid ${item.accent}30` }}
                      >
                        {item.step}
                      </span>
                      <span
                        className="text-[9px] font-bold tracking-widest uppercase mono px-2.5 py-1 rounded-full"
                        style={{ background: `${item.accent}12`, color: item.accent, border: `1px solid ${item.accent}22` }}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
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
