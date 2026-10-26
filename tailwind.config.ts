import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const typographyPlugin = plugin(function ({ addUtilities }) {
  addUtilities({
    // DISPLAY - Landing pages & heroes
    '.text-display-xl': {
      fontSize: '4rem',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
      fontWeight: '700',
    },
    '.text-display-lg': {
      fontSize: '3.5rem',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
      fontWeight: '700',
    },
    '.text-display-md': {
      fontSize: '3rem',
      lineHeight: '1.15',
      letterSpacing: '-0.01em',
      fontWeight: '700',
    },
    // Responsive display variants
    '.sm\\:text-display-xl': {
      '@media (min-width: 640px)': {
        fontSize: '4rem',
        lineHeight: '1.1',
        letterSpacing: '-0.02em',
        fontWeight: '700',
      },
    },
    '.sm\\:text-display-lg': {
      '@media (min-width: 640px)': {
        fontSize: '3.5rem',
        lineHeight: '1.1',
        letterSpacing: '-0.02em',
        fontWeight: '700',
      },
    },
    '.sm\\:text-display-md': {
      '@media (min-width: 640px)': {
        fontSize: '3rem',
        lineHeight: '1.15',
        letterSpacing: '-0.01em',
        fontWeight: '700',
      },
    },
    // HEADING - Internal pages
    '.text-heading-xl': {
      fontSize: '2.5rem',
      lineHeight: '1.2',
      letterSpacing: '-0.01em',
      fontWeight: '700',
    },
    '.text-heading-lg': {
      fontSize: '2rem',
      lineHeight: '1.25',
      letterSpacing: '-0.01em',
      fontWeight: '700',
    },
    '.text-heading-md': {
      fontSize: '1.5rem',
      lineHeight: '1.3',
      letterSpacing: '0',
      fontWeight: '600',
    },
    '.text-heading-sm': {
      fontSize: '1.25rem',
      lineHeight: '1.4',
      letterSpacing: '0',
      fontWeight: '600',
    },
    '.text-heading-xs': {
      fontSize: '1.125rem',
      lineHeight: '1.4',
      letterSpacing: '0',
      fontWeight: '600',
    },
    // Responsive heading variants
    '.sm\\:text-heading-lg': {
      '@media (min-width: 640px)': {
        fontSize: '2rem',
        lineHeight: '1.25',
        letterSpacing: '-0.01em',
        fontWeight: '700',
      },
    },
    '.sm\\:text-heading-xl': {
      '@media (min-width: 640px)': {
        fontSize: '2.5rem',
        lineHeight: '1.2',
        letterSpacing: '-0.01em',
        fontWeight: '700',
      },
    },
    // BODY - Running text
    '.text-body-lg': {
      fontSize: '1.125rem',
      lineHeight: '1.6',
      letterSpacing: '0',
      fontWeight: '400',
    },
    '.text-body-md': {
      fontSize: '1rem',
      lineHeight: '1.6',
      letterSpacing: '0',
      fontWeight: '400',
    },
    '.text-body-sm': {
      fontSize: '0.875rem',
      lineHeight: '1.5',
      letterSpacing: '0',
      fontWeight: '400',
    },
    '.text-body-xs': {
      fontSize: '0.75rem',
      lineHeight: '1.5',
      letterSpacing: '0',
      fontWeight: '400',
    },
    // POKER - Specific poker elements
    '.text-poker-hand': {
      fontSize: '1.5rem',
      lineHeight: '1',
      letterSpacing: '0.05em',
      fontWeight: '700',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    },
    '.text-poker-card': {
      fontSize: '1.125rem',
      lineHeight: '1',
      letterSpacing: '0.05em',
      fontWeight: '700',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    },
  });
});

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Poker action colors
        poker: {
          fold: "hsl(var(--poker-fold))",
          call: "hsl(var(--poker-call))",
          raise: "hsl(var(--poker-raise))",
          allin: "hsl(var(--poker-allin))",
          early: "hsl(var(--poker-early))",
          middle: "hsl(var(--poker-middle))",
          late: "hsl(var(--poker-late))",
          blinds: "hsl(var(--poker-blinds))",
        },
        // Feedback colors
        feedback: {
          best: "hsl(var(--feedback-best))",
          correct: "hsl(var(--feedback-correct))",
          inaccuracy: "hsl(var(--feedback-inaccuracy))",
          mistake: "hsl(var(--feedback-mistake))",
          blunder: "hsl(var(--feedback-blunder))",
        },
        // Ranking position colors
        rank: {
          first: "hsl(var(--rank-first))",
          second: "hsl(var(--rank-second))",
          third: "hsl(var(--rank-third))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        "card-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(45 100% 50% / 0.3)" },
          "50%": { boxShadow: "0 0 30px hsl(45 100% 50% / 0.5)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // App: o rei sobe da borda de baixo para comentar a mão
        "rei-sobe": {
          "0%": { transform: "translateY(100%)" },
          "70%": { transform: "translateY(-4%)" },
          "100%": { transform: "translateY(0)" },
        },
        // Estrelas do fim da lição: estouram uma depois da outra
        "aviso-desce": {
          "0%": { opacity: "0", transform: "translateY(-120%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "esvazia": {
          "0%": { transform: "scaleX(1)" },
          "100%": { transform: "scaleX(0)" },
        },
        "estrela-entra": {
          "0%": { opacity: "0", transform: "scale(0) rotate(-40deg)" },
          "60%": { opacity: "1", transform: "scale(1.35) rotate(8deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0)" },
        },
        // Fogo azul atrás dos elos Diamante e Rei
        "fogo-azul": {
          "0%, 100%": { transform: "scaleY(1) translateY(0)", opacity: "0.85" },
          "50%": { transform: "scaleY(1.12) translateY(-4%)", opacity: "1" },
        },
        // Aviso do Discord: o rei pula de braços para cima e o confete cai
        "rei-comemora": {
          "0%, 100%": { transform: "translateY(0) rotate(0)" },
          "30%": { transform: "translateY(-7%) rotate(-3deg)" },
          "60%": { transform: "translateY(-3%) rotate(2deg)" },
        },
        "confete": {
          "0%": { opacity: "0", transform: "translateY(-12px) rotate(0)" },
          "15%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(180px) rotate(540deg)" },
        },
      },
      animation: {
        "rei-comemora": "rei-sobe 0.45s cubic-bezier(0.22, 1, 0.36, 1) both, rei-comemora 0.9s ease-in-out 0.45s 3",
        "confete": "confete 2.4s linear infinite",
        "rei-sobe": "rei-sobe 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "estrela-entra": "estrela-entra 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "aviso-desce": "aviso-desce 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        // Mesma duração do aviso de desafio (DURACAO_DO_AVISO)
        "esvazia": "esvazia 3.5s linear both",
        "fogo-azul": "fogo-azul 1.6s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        "card-flip": "card-flip 0.6s ease-in-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), typographyPlugin],
} satisfies Config;
