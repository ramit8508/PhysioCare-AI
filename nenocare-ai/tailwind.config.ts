import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        cardForeground: "hsl(var(--card-foreground) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        primaryForeground: "hsl(var(--primary-foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        mutedForeground: "hsl(var(--muted-foreground) / <alpha-value>)",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      boxShadow: {
        glow: "0 0 30px rgba(16, 185, 129, 0.35)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseGlow: {
          "0%": { boxShadow: "0 0 0 rgba(16, 185, 129, 0)" },
          "70%": { boxShadow: "0 0 40px rgba(16, 185, 129, 0.4)" },
          "100%": { boxShadow: "0 0 0 rgba(16, 185, 129, 0)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 1.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
