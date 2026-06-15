import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand red — MegaHome brandbook vol.1. #DD2426 (vivid warm red) is the
        // canonical mark colour; the previous #C21A1A now serves as the 600
        // (hover/pressed) shade. Tints mirror Tailwind's red scale so every
        // former pink-* utility maps 1:1 onto brand-*.
        brand: {
          50: '#FEF2F2',
          100: '#FDE0E0',
          200: '#FAC5C6',
          300: '#F39B9C',
          400: '#EC5F61',
          500: '#DD2426',
          DEFAULT: '#DD2426',
          600: '#C21A1A',
          700: '#A11518',
          800: '#861416',
          900: '#6F1517',
          ink: '#141414',
        },
      },
      fontFamily: {
        // Brand display serif — the "MEGA HOME" wordmark is set in Charter Bold
        // (brandbook). Charter ships on many systems; Georgia is the closest
        // ubiquitous fallback so display headings stay on-brand everywhere.
        brand: ['Charter', '"Bitstream Charter"', '"Sitka Text"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        brand: '0px 0px 10px rgba(137, 142, 150, 0.50);'
      }
    },
  },
  plugins: [],
} satisfies Config;
