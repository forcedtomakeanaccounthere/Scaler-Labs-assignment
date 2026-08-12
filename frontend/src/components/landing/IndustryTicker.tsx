"use client";

import { useEffect, useRef } from "react";

// Industry icons as SVG paths + labels
const industries = [
  {
    label: "Electrical",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    label: "Mechanical",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 2v2M12 20v2"/>
      </svg>
    ),
  },
  {
    label: "Software / IT",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    label: "Chemical",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-4 4a2 2 0 0 0 1.41 3.41H17.6A2 2 0 0 0 19 18l-4-4V3"/>
      </svg>
    ),
  },
  {
    label: "HVAC",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10M12 2c5.5 0 10 4.5 10 10S17.5 22 12 22"/>
      </svg>
    ),
  },
  {
    label: "Networking",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-4h14v4M12 12V8"/>
      </svg>
    ),
  },
  {
    label: "Manufacturing",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M17 20V8l-5 4V8l-5 4V4l-5 4v12"/>
      </svg>
    ),
  },
  {
    label: "Automation",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    label: "Safety",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    label: "Energy",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
];

// Duplicate for seamless looping
const col1 = [...industries, ...industries];
const col2 = [...industries.slice(4), ...industries, ...industries.slice(0, 4)];
const col3 = [...industries.slice(7), ...industries, ...industries.slice(0, 7)];

function IconColumn({
  items,
  duration,
  reverse = false,
}: {
  items: typeof col1;
  duration: number;
  reverse?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-3 overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}>
      <div
        ref={trackRef}
        className="flex flex-col gap-3"
        style={{
          animation: `${reverse ? "tickerUp" : "tickerDown"} ${duration}s linear infinite`,
        }}
      >
        {items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="group flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border transition-all duration-200 cursor-default"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              minWidth: "80px",
              boxShadow: "var(--shadow-xs)",
            }}
            // onMouseEnter={(e) => {
            //   e.currentTarget.style.borderColor = "var(--accent)";
            //   e.currentTarget.style.background = "var(--accent-subtle)";
            //   e.currentTarget.style.transform = "scale(1.05)";
            // }}
            // onMouseLeave={(e) => {
            //   e.currentTarget.style.borderColor = "var(--border)";
            //   e.currentTarget.style.background = "var(--bg-surface)";
            //   e.currentTarget.style.transform = "scale(1)";
            // }}
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
    <section
      className="relative py-24 overflow-hidden"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {/* CSS animations for the ticker columns */}
      <style>{`
        @keyframes tickerDown {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes tickerUp {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div className="space-y-6">
            <span className="badge">INDUSTRY COVERAGE</span>
            <h2
              className="font-bold tracking-tight text-[32px] sm:text-[44px] leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Powering every industry.
              <br />
              <span className="gradient-text-blue">Powering all catalogs.</span>
            </h2>
            <p className="text-[16px] leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
              From high-voltage electrical contactors to HVAC components, from networking gear to chemical compounds — CatalogX adapts its intelligence to any industrial vertical automatically.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {industries.slice(0, 6).map((ind) => (
                <div key={ind.label} className="flex items-center gap-2.5 text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                  >
                    {ind.icon}
                  </div>
                  {ind.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Scrolling Icon Columns */}
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
