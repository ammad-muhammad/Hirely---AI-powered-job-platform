import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sophisticated Deep Charcoal Ink Primary Brand
        brand: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#3f3f46',
          700: '#27272a',
          800: '#18181b', // Primary Ink / Button Primary
          900: '#09090b',
          950: '#040405',
        },
        // Muted Forest Teal & Warm Accent
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
        },
        // Semantic Tokens
        success: {
          DEFAULT: '#16a34a',
          light: '#f0fdf4',
          border: '#bbf7d0',
        },
        warning: {
          DEFAULT: '#d97706',
          light: '#fffbeb',
          border: '#fde68a',
        },
        danger: {
          DEFAULT: '#dc2626',
          light: '#fef2f2',
          border: '#fecaca',
        },
        info: {
          DEFAULT: '#0284c7',
          light: '#f0f9ff',
          border: '#bae6fd',
        },
        // Surface Colors
        surface: {
          light: '#ffffff',
          lightSubtle: '#fafafa',
          dark: '#09090b',
          darkSubtle: '#18181b',
          borderLight: '#e4e4e7',
          borderDark: '#27272a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        caption: ['0.6875rem', { lineHeight: '0.875rem' }],
        'body-sm': ['0.75rem', { lineHeight: '1rem' }],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem' }],
        h4: ['1rem', { lineHeight: '1.375rem' }],
        h3: ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],
        h2: ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }],
        h1: ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        display: ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
