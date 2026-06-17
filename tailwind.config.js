/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        void: '#020408',
        surface: '#080d14',
        card: '#0c1520',
        border: '#1a2535',
        'border-bright': '#243347',
        muted: '#3d5470',
        'text-muted': '#6b8aad',
        'text-dim': '#8fa8c4',
        'text-base': '#c8ddf0',
        'text-bright': '#e8f4ff',
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          glow: 'rgba(34,211,238,0.15)',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          glow: 'rgba(139,92,246,0.15)',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          glow: 'rgba(52,211,153,0.15)',
        },
        rose: {
          400: '#fb7185',
          glow: 'rgba(251,113,133,0.15)',
        },
        amber: {
          400: '#fbbf24',
          glow: 'rgba(251,191,36,0.15)',
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(26,37,53,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(26,37,53,0.4) 1px, transparent 1px)`,
        'glow-cyan': 'radial-gradient(ellipse at center, rgba(34,211,238,0.15) 0%, transparent 70%)',
        'glow-violet': 'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)',
        'hero-gradient': 'linear-gradient(135deg, #020408 0%, #040a14 50%, #020408 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34,211,238,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(34,211,238,0.6), 0 0 40px rgba(34,211,238,0.2)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34,211,238,0.3), 0 0 60px rgba(34,211,238,0.1)',
        'glow-violet': '0 0 20px rgba(139,92,246,0.3), 0 0 60px rgba(139,92,246,0.1)',
        'glow-emerald': '0 0 20px rgba(52,211,153,0.3), 0 0 60px rgba(52,211,153,0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
}
