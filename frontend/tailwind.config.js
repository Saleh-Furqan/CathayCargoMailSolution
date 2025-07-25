/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cathay-teal': {
          DEFAULT: '#006564',
          50: '#f0f9f9',
          100: '#ccebea',
          200: '#99d7d6',
          300: '#66c3c1',
          400: '#33afad',
          500: '#006564',
          600: '#005150',
          700: '#003d3c',
          800: '#002928',
          900: '#001514',
          'dark': '#004d4c'
        },
        'cathay-navy': {
          DEFAULT: '#1e3a5f',
          50: '#f4f7fb',
          100: '#d7e4f0',
          200: '#b0c9e1',
          300: '#88aed2',
          400: '#6193c3',
          500: '#1e3a5f',
          600: '#182e4c',
          700: '#122239',
          800: '#0c1626',
          900: '#060b13'
        },
        'cathay-grey': {
          DEFAULT: '#6b7280',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '3xl': '0 35px 60px -12px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 20px rgba(0, 101, 100, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 101, 100, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}