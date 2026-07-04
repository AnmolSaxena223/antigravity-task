/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.15)',
          dark: 'rgba(0, 0, 0, 0.3)',
          border: 'rgba(255, 255, 255, 0.2)',
        },
        ludo: {
          red: '#ff3b30',
          green: '#34c759',
          yellow: '#ffcc00',
          blue: '#007aff',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'dice-roll': 'roll 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'token-highlight': 'pulseRing 1.5s infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        roll: {
          '0%': { transform: 'rotate(0deg) scale(0.8)' },
          '20%': { transform: 'rotate(120deg) scale(1.1)' },
          '40%': { transform: 'rotate(240deg) scale(0.9) translate(-5px, -5px)' },
          '60%': { transform: 'rotate(360deg) scale(1.1) translate(5px, 5px)' },
          '80%': { transform: 'rotate(480deg) scale(0.95)' },
          '100%': { transform: 'rotate(720deg) scale(1)' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
