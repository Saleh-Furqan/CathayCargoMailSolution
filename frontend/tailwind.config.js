/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cathay Pacific Brand Colors - Logo Colors
        'cathay-logo-brand-default': '#005D63',
        'cathay-logo-monotone-dark': '#2D2D2D',
        'cathay-logo-monotone-white': '#FFFFFF',
        
        // Primary Brand Colors - Dark Cyan/Teal (Main Brand)
        'cathay-primary-darkcyan': {
          DEFAULT: '#367878',
          'active': '#163230',
          'light': '#F1F4F1'
        },
        'cathay-primary-darkgreen': {
          DEFAULT: '#2C4036',
          'active': '#002527',
          'light': '#D7E5E4'
        },
        
        // Secondary Brand Colors
        'cathay-secondary-gold': {
          DEFAULT: '#886521',
          'active': '#36280D',
          'light': '#E7E0D2'
        },
        'cathay-secondary-lightgrey': '#F9F9F9',
        'cathay-secondary-lightorange': {
          DEFAULT: '#F3EEBF',
          'light': '#F9F8F7'
        },
        'cathay-secondary-lightyellow': '#F7E6F1',
        
        // Neutral Colors
        'cathay-neutral-darkgrey': '#2D2D2D',
        'cathay-neutral-darkgreyishblue': '#66686A',
        'cathay-neutral-greyishblue': '#8C8EC0',
        'cathay-neutral-lightgrey': '#E6E6E6',
        
        // Legacy colors for backward compatibility
        'cathay-teal': {
          DEFAULT: '#367878',
          50: '#f0f9f9',
          100: '#ccebea',
          200: '#99d7d6',
          300: '#66c3c1',
          400: '#33afad',
          500: '#367878',
          600: '#2C4036',
          700: '#163230',
          800: '#002527',
          900: '#001514',
          'dark': '#163230'
        },
        'cathay-navy': {
          DEFAULT: '#2D2D2D',
          50: '#f4f7fb',
          100: '#d7e4f0',
          200: '#b0c9e1',
          300: '#88aed2',
          400: '#6193c3',
          500: '#2D2D2D',
          600: '#66686A',
          700: '#8C8EC0',
          800: '#1f2937',
          900: '#111827'
        },
        'cathay-grey': {
          DEFAULT: '#66686A',
          50: '#f9fafb',
          100: '#F9F9F9',
          200: '#E6E6E6',
          300: '#8C8EC0',
          400: '#66686A',
          500: '#66686A',
          600: '#2D2D2D',
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