/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
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
        // Clinical Sanctuary accent colors
        clay: "hsl(var(--clay))",
        sage: "hsl(var(--sage))",
        cream: "hsl(var(--cream))",
        ink: "hsl(var(--ink))",
        rust: "hsl(var(--rust))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        // Core motion
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",

        // The signature: 4-7-8 breathing rhythm (19s total cycle)
        "breath": "breath 19s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "breath-fast": "breath 6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "breath-dot": "breathDot 4s cubic-bezier(0.4, 0, 0.2, 1) infinite",

        // Stagger support
        "stagger-1": "fadeIn 0.5s ease-out 80ms both",
        "stagger-2": "fadeIn 0.5s ease-out 160ms both",
        "stagger-3": "fadeIn 0.5s ease-out 240ms both",
        "stagger-4": "fadeIn 0.5s ease-out 320ms both",
        "stagger-5": "fadeIn 0.5s ease-out 400ms both",

        // Loading
        "shimmer": "shimmer 2s linear infinite",
        "pulse-gentle": "pulseGentle 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // 4-7-8 breathing: scale up 4s, hold 7s, scale down 8s
        breath: {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "21%": { transform: "scale(1.12)", opacity: "1" },       // 4s of 19s = 21%
          "58%": { transform: "scale(1.12)", opacity: "1" },       // 4+7=11s of 19s = 58%
          "100%": { transform: "scale(1)", opacity: "0.4" },       // exhale for remaining 8s
        },
        breathDot: {
          "0%": { transform: "scale(0.8)", opacity: "0.3" },
          "50%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(0.8)", opacity: "0.3" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
