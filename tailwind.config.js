/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
        serif: ['Playfair Display', 'serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            fontSize: '1.125rem',
            lineHeight: '1.8',
            color: '#475569',
            p: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
              fontSize: '1.125rem',
              lineHeight: '1.8',
            },
            a: {
              color: '#4f46e5',
              fontWeight: '500',
              '&:hover': {
                color: '#4338ca',
              },
              textDecoration: 'none',
            },
            'h1, h2, h3, h4, h5, h6': {
              fontWeight: '700',
              color: '#0f172a',
              letterSpacing: '-0.025em',
            },
            h1: {
              fontSize: '2.5rem',
              marginTop: '0',
              marginBottom: '1em',
              lineHeight: '1.2',
            },
            h2: {
              fontSize: '2rem',
              marginTop: '2em',
              marginBottom: '1em',
              lineHeight: '1.3',
            },
            h3: {
              fontSize: '1.5rem',
              marginTop: '1.6em',
              marginBottom: '0.6em',
              lineHeight: '1.4',
            },
            strong: {
              color: '#0f172a',
              fontWeight: '600',
            },
            code: {
              color: '#4f46e5',
              backgroundColor: '#eef2ff',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              fontWeight: '500',
              fontSize: '0.9em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginTop: '2em',
              marginBottom: '2em',
              overflow: 'auto',
            },
            'pre code': {
              backgroundColor: 'transparent',
              color: 'inherit',
              padding: '0',
              fontSize: '0.875rem',
            },
            blockquote: {
              fontStyle: 'italic',
              borderLeftColor: '#e2e8f0',
              borderLeftWidth: '4px',
              paddingLeft: '1.5rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              marginTop: '2em',
              marginBottom: '2em',
              color: '#64748b',
              fontSize: '1.05rem',
            },
            'blockquote p': {
              marginTop: '0',
              marginBottom: '0',
            },
            img: {
              borderRadius: '1rem',
              marginTop: '2em',
              marginBottom: '2em',
            },
            'ul, ol': {
              marginTop: '1.5em',
              marginBottom: '1.5em',
            },
            li: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-x': 'gradientX 15s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        gradientX: {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
