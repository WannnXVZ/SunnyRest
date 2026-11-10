/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#202522',
          muted: '#737075',
        },
        paper: {
          DEFAULT: '#F5F4EF',
          light: '#FAF9F6',
        },
        surface: '#FFFFFF',
        forest: {
          DEFAULT: '#315C4B',
          hover: '#274B3D',
          light: '#EBF1ED',
          border: '#3D6F5B',
        },
        sage: {
          DEFAULT: '#E5ECE6',
          text: '#2F4E38',
          border: '#CAD7CC',
        },
        brass: {
          DEFAULT: '#B28A4A',
          light: '#F8F3EA',
          border: '#D9C195',
          text: '#7A5B27',
        },
        border: {
          DEFAULT: '#E7E7E0',
          dark: '#D5D5CC',
        },
        status: {
          warning: '#94713A',
          warningBg: '#FBF5EB',
          danger: '#A64F3D',
          dangerBg: '#FDF1EF',
          success: '#315C4B',
          successBg: '#EBF1ED',
          infoBg: '#EDF2F0',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        btn: '8px',
        card: '12px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(32, 37, 34, 0.05)',
        card: '0 2px 8px rgba(32, 37, 34, 0.04)',
      }
    },
  },
  plugins: [],
}

