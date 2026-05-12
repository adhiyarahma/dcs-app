import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dcc: {
          950: '#0a1628',
          900: '#0f2044',
          800: '#1a3a6e',
          700: '#1e4d9b',
          600: '#2563eb',
          500: '#3b82f6',
          active: '#16a34a',
          revisi: '#d97706',
          obsolete: '#dc2626',
        },
      },
      fontFamily: {
        // 'sans' akan menimpa font default Tailwind
        sans: ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        // 'mono' akan menimpa font mono default Tailwind
        mono: ['var(--font-dm-mono)', 'DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;