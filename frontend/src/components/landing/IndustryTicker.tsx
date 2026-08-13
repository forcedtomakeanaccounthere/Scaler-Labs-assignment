"use client";

import { useRef } from "react";

const useCases = [
  { label: "KYC / AML", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )},
  { label: "HR Documents", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { label: "Legal Contracts", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )},
  { label: "Medical Records", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  )},
  { label: "Bank Forms", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )},
  { label: "Insurance", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )},
  { label: "Loan Packets", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )},
  { label: "Govt ID Docs", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  )},
  { label: "Payslips", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  )},
  { label: "Compliance", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )},
];

const col1 = [...useCases, ...useCases];
const col2 = [...useCases.slice(4), ...useCases, ...useCases.slice(0, 4)];
const col3 = [...useCases.slice(7), ...useCases, ...useCases.slice(0, 7)];

function IconColumn({ items, duration, reverse = false }: { items: typeof col1; duration: number; reverse?: boolean }) {
  return (
    <div className="flex flex-col gap-3 overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}>
      <div
        className="flex flex-col gap-3"
        style={{ animation: `${reverse ? "tickerUp" : "tickerDown"} ${duration}s linear infinite` }}
      >
        {items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="group flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border transition-all duration-200 cursor-default"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", minWidth: "80px", boxShadow: "var(--shadow-xs)" }}
          >
            <div style={{ color: "var(--text-secondary)" }}>{item.icon}</div>
            <span className="text-[9px] font-semibold tracking-wide text-center mono" style={{ color: "var(--text-tertiary)" }}>
              {item.label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IndustryTicker() {
  return (
    <section className="relative py-24 overflow-hidden" style={{ borderTop: "1px solid var(--border)" }}>
      <style>{`
        @keyframes tickerDown { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes tickerUp { from { transform: translateY(-50%); } to { transform: translateY(0); } }
      `}</style>

      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div className="space-y-6">
            <span className="badge">USE CASE COVERAGE</span>
            <h2 className="font-bold tracking-tight text-[32px] sm:text-[44px] leading-tight" style={{ color: "var(--text-primary)" }}>
              Protecting sensitive data
              <br />
              <span className="gradient-text-blue">across every document type.</span>
            </h2>
            <p className="text-[16px] leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
              From KYC forms with Aadhaar cards to HR onboarding packs, from legal contracts
              to insurance documents — {" "}
              <strong style={{ color: "var(--text-primary)" }}>RedactIQ</strong> handles
              text PII and embedded images alike.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {useCases.slice(0, 6).map((uc) => (
                <div key={uc.label} className="flex items-center gap-2.5 text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                    {uc.icon}
                  </div>
                  {uc.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Scrolling columns */}
          <div className="flex gap-3 h-[420px] relative">
            <IconColumn items={col1} duration={18} />
            <IconColumn items={col2} duration={22} reverse />
            <IconColumn items={col3} duration={16} />
          </div>
        </div>
      </div>
    </section>
  );
}
