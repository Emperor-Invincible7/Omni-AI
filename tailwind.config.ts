import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        display: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Omni-AI · Nothing OS monochrome palette
        ink: {
          DEFAULT: '#000000',
          900: '#0A0A0A',
          800: '#141414',
          700: '#1F1F1F',
          600: '#2A2A2A',
          500: '#3A3A3A',
        },
        bone: {
          DEFAULT: '#FFFFFF',
          900: '#EDEDED',
          800: '#D4D4D4',
          700: '#A3A3A3',
          600: '#737373',
          500: '#525252',
          400: '#404040',
        },
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',
      },
      boxShadow: {
        none: 'none',
      },
      keyframes: {
        matrixBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        dotPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.85)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'matrix-blink': 'matrixBlink 1.2s steps(2,end) infinite',
        'dot-pulse': 'dotPulse 1.4s ease-in-out infinite',
        ticker: 'ticker 40s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
