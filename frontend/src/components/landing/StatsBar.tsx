"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: 99.4, suffix: "%", label: "Extraction Accuracy", sub: "Verified against source" },
  { value: 2.5, prefix: "<", suffix: "s", label: "Processing Time", sub: "Per multi-page catalog" },
  { value: 100, suffix: "%", label: "Audit Provenance", sub: "Every field linked to page" },
  { value: 50, suffix: "k+", label: "Attributes Structured", sub: "Across all verticals" },
];

// Pre-defined star positions to avoid hydration mismatch
const STARS = [
  [8, 12, 1.5, 0.9], [18, 4, 1, 0.6], [31, 18, 2, 0.8], [44, 7, 1, 0.5],
  [55, 3, 1.5, 0.7], [67, 11, 1, 0.6], [79, 5, 2, 0.9], [88, 14, 1, 0.5],
  [94, 8, 1.5, 0.7], [3, 22, 1, 0.6], [14, 30, 2, 0.8], [26, 25, 1, 0.5],
  [37, 35, 1.5, 0.9], [48, 28, 1, 0.6], [59, 19, 2, 0.7], [70, 33, 1, 0.5],
  [81, 22, 1.5, 0.8], [91, 28, 1, 0.6], [6, 42, 2, 0.9], [17, 48, 1, 0.5],
  [28, 40, 1.5, 0.7], [39, 52, 1, 0.6], [51, 44, 2, 0.8], [62, 38, 1, 0.5],
  [73, 48, 1.5, 0.9], [84, 42, 1, 0.6], [95, 36, 2, 0.7], [11, 56, 1, 0.5],
  [22, 60, 1.5, 0.8], [33, 53, 1, 0.9], [74, 58, 1.5, 0.6], [85, 52, 1, 0.7],
  [96, 48, 2, 0.8], [4, 68, 1, 0.5], [16, 72, 1.5, 0.9], [27, 65, 1, 0.6],
  [38, 70, 2, 0.7], [49, 62, 1, 0.5], [60, 68, 1.5, 0.8], [71, 65, 1, 0.6],
  [82, 72, 2, 0.9], [93, 60, 1, 0.5],
];

export default function StatsBar() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      stats.forEach((stat, i) => {
        const el = numberRefs.current[i];
        if (!el) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: stat.value,
          duration: 2.4,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none none",
          },
          onUpdate: () => {
            if (el) {
              el.innerText =
                stat.value % 1 !== 0
                  ? obj.val.toFixed(1)
                  : Math.floor(obj.val).toString();
            }
          },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      // Always dark — like Juspay — creates dramatic contrast
      style={{ background: "#040B18" }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {STARS.map(([left, top, size, opacity], i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: "white",
              opacity,
              boxShadow: size >= 1.5 ? `0 0 ${size * 3}px rgba(255,255,255,0.5)` : "none",
            }}
          />
        ))}
      </div>

      {/* Top separator line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(30,100,255,0.3), transparent)" }}
      />

      {/* Stats grid */}
      <div className="relative z-10 container pt-20 pb-10">
        <div className="text-center mb-12">
          <span
            className="text-[10px] font-bold tracking-widest uppercase mono px-3 py-1 rounded-full"
            style={{
              background: "rgba(30,100,255,0.12)",
              border: "1px solid rgba(30,100,255,0.2)",
              color: "rgba(100,160,255,0.9)",
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            BY THE NUMBERS
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          {stats.map((stat, idx) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <div
                className="flex items-baseline justify-center gap-0.5 font-bold mono"
                style={{
                  color: "#EAEFFF",
                  fontSize: "clamp(2rem, 4vw, 2.8rem)",
                  letterSpacing: "-0.04em",
                }}
              >
                {stat.prefix && (
                  <span className="text-[1.2rem]" style={{ color: "rgba(100,160,255,0.8)" }}>
                    {stat.prefix}
                  </span>
                )}
                <span ref={(el) => { numberRefs.current[idx] = el; }}>0</span>
                <span style={{ color: "rgba(100,160,255,0.9)" }}>{stat.suffix}</span>
              </div>
              <div
                className="text-[12px] font-semibold mt-1.5"
                style={{ color: "#4EA3FF" }}
              >
                {stat.label}
              </div>
              <div
                className="text-[11px] mono mt-0.5"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tagline above globe */}
      <div className="relative z-10 text-center pb-6 px-4">
        <h3
          className="font-bold tracking-tight"
          style={{
            fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
            color: "#E8EFFF",
            letterSpacing: "-0.035em",
          }}
        >
          Where product data connects
        </h3>
        <p
          className="mt-2 text-[13px]"
          style={{ color: "rgba(255,255,255,0.32)" }}
        >
          Trusted by teams across 10+ countries
        </p>
      </div>

      {/* Globe — CSS sphere, cut off at bottom */}
      <div className="relative flex justify-center" style={{ height: "340px" }}>
        {/* Outer ambient bloom */}
        <div
          className="absolute"
          style={{
            width: "900px",
            height: "900px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 50% 50%, rgba(10,60,180,0.14) 0%, transparent 70%)",
            bottom: "-480px",
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />

        {/* The planet sphere */}
        <div
          style={{
            position: "absolute",
            width: "clamp(560px, 80vw, 900px)",
            height: "clamp(560px, 80vw, 900px)",
            borderRadius: "50%",
            bottom: "-460px",
            left: "50%",
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse at 38% 28%, #1B3468 0%, #0C1C3E 28%, #060E22 55%, #030813 80%, #020610 100%)",
            // Atmospheric rim glow
            boxShadow:
              "0 0 0 1px rgba(40,100,255,0.08), 0 0 60px rgba(20,80,220,0.18), 0 0 120px rgba(10,50,180,0.10)",
          }}
        >
          {/* Subtle surface sheen — highlight at top-left */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at 32% 22%, rgba(80,140,255,0.10) 0%, transparent 55%)",
            }}
          />
          {/* Thin atmospheric rim */}
          <div
            style={{
              position: "absolute",
              inset: "-1px",
              borderRadius: "50%",
              background: "transparent",
              boxShadow: "inset 0 0 40px rgba(40,100,255,0.08)",
            }}
          />
        </div>

        {/* Horizon glow line */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(320px, 55vw, 580px)",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(40,100,255,0.35), transparent)",
            pointerEvents: "none",
          }}
        />
      </div>
    </section>
  );
}
