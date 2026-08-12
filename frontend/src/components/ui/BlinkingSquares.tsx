"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

// ── Constants ──────────────────────────────────────────────────────────────
const SQ = 8;       // Square size in pixels
const GAP = 4;      // Gap between squares
const STEP = SQ + GAP;
const LERP = 0.022; // Smooth transition speed (lower = smoother/slower)
const FLICKER_RATE = 0.0035; // Per-frame probability a square picks a new target

// Blue / cyan / dark-blue palette for dark mode
const DARK_COLORS = [
  "#007AFF", // iOS blue
  "#0A84FF", // Bright blue
  "#0055D4", // Medium blue
  "#4169E1", // Royal blue
  "#1E90FF", // Dodger blue
  "#00BFFF", // Cyan-blue
  "#38BDF8", // Sky blue
  "#00CED1", // Dark turquoise / cyan
  "#003080", // Dark navy (appears near-black)
  "#001A60", // Very dark navy (appears black)
];

// Higher saturation blues for visibility on light backgrounds
const LIGHT_COLORS = [
  "#005FCC",
  "#0047AB", // Cobalt blue
  "#2563EB", // Bright blue
  "#3A5ECC", // Royal-ish
  "#1877CC",
  "#0070C0",
  "#0090B8", // Teal-blue
  "#00A8C0", // Cyan (muted for light mode readability)
  "#003EA0",
  "#001F80", // Very dark navy
];

interface Square {
  opacity: number;
  target: number;
  colorIdx: number;
}

interface BlinkingSquaresProps {
  className?: string;
}

export default function BlinkingSquares({ className = "" }: BlinkingSquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const gridRef = useRef<Square[][]>([]);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef<string | undefined>(resolvedTheme);

  // Keep theme ref in sync for use inside RAF
  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // ── Init grid ──────────────────────────────────────────────────────────
    const initGrid = () => {
      const cols = Math.ceil(canvas.width / STEP) + 1;
      const rows = Math.ceil(canvas.height / STEP) + 1;
      gridRef.current = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
          opacity: 0,
          target: 0,
          colorIdx: Math.floor(Math.random() * 10),
        }))
      );
      // Seed some initial squares so the grid isn't empty on first frame
      gridRef.current.forEach((row, _r) => {
        row.forEach((sq, c) => {
          const density = c / cols;
          if (Math.random() < density * 0.6) {
            sq.opacity = Math.random() * density * 0.8;
            sq.target = sq.opacity;
          }
        });
      });
    };

    // ── Resize handling ────────────────────────────────────────────────────
    const resize = () => {
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      initGrid();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    // ── Draw loop ──────────────────────────────────────────────────────────
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !gridRef.current.length) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const isDark = themeRef.current !== "light";
      const COLORS = isDark ? DARK_COLORS : LIGHT_COLORS;
      const cols = gridRef.current[0]?.length || 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      gridRef.current.forEach((row, _r) => {
        row.forEach((sq, c) => {
          // Stochastically set a new blink target
          if (Math.random() < FLICKER_RATE) {
            const density = c / cols;
            // Squares on the right are denser and brighter
            sq.target =
              Math.random() < density * 0.88 + 0.06
                ? Math.random() * density * 0.9 + 0.08
                : 0;
            sq.colorIdx = Math.floor(Math.random() * 10);
          }

          // Interpolate toward target
          sq.opacity += (sq.target - sq.opacity) * LERP;

          if (sq.opacity > 0.01) {
            ctx.globalAlpha = sq.opacity;
            ctx.fillStyle = COLORS[sq.colorIdx];
            ctx.fillRect(c * STEP, _r * STEP, SQ, SQ);
          }
        });
      });

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
    />
  );
}
