import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Design system colors
        "surface-1": "#111118",
        "surface-2": "#1C1C26",
        "surface-3": "#252532",
      },
      borderRadius: {
        xl: "20px",
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,122,255,0.12), transparent), radial-gradient(ellipse 40% 30% at 80% 110%, rgba(124,58,237,0.08), transparent)",
        "cta-glow":
          "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(0,122,255,0.15), transparent)",
        "card-gradient":
          "linear-gradient(145deg, rgba(28,28,38,0.8), rgba(17,17,24,0.9))",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,122,255,0)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0,122,255,0.1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 500ms cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 400ms cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scale-in 350ms cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 3s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
      boxShadow: {
        "glow-blue": "0 0 0 1px rgba(0,122,255,0.3), 0 4px 24px rgba(0,122,255,0.2)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "inner-highlight": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
