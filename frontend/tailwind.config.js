/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        // Brand palette — deep navy + electric cyan
        ink: {
          50:  '#f6f8fb',
          100: '#eceff5',
          200: '#d5dae6',
          300: '#aeb6c8',
          400: '#828ca6',
          500: '#5f6a87',
          600: '#4a5470',
          700: '#3b455c',
          800: '#27304a',  // primary surface
          900: '#1a2238',  // navbar
          950: '#0e1424',  // root background
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        accent: {
          DEFAULT: '#00e0c7',
          dark:    '#00b8a3',
        },
      },
      boxShadow: {
        'glow-cyan':   '0 0 0 1px rgba(34,211,238,0.25), 0 8px 24px -8px rgba(34,211,238,0.45)',
        'glow-accent': '0 0 0 1px rgba(0,224,199,0.25), 0 8px 24px -8px rgba(0,224,199,0.45)',
        'card':        '0 2px 8px -2px rgba(13,16,28,0.35), 0 12px 32px -8px rgba(13,16,28,0.45)',
      },
      backgroundImage: {
        'grid-faint':
          "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
        'aurora':
          "radial-gradient(60% 50% at 20% 0%, rgba(34,211,238,0.18), transparent 70%), radial-gradient(50% 40% at 90% 10%, rgba(0,224,199,0.14), transparent 70%)",
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(0.9)', opacity: 0.7 },
          '80%, 100%': { transform: 'scale(1.5)', opacity: 0 },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.4s ease-out',
        'shimmer':    'shimmer 2.5s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
}
