/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#09090B',
        card: '#111115',
        gold: {
          50: '#FBF5B7',
          100: '#FCF6BA',
          200: '#F0E68C',
          300: '#DAA520',
          400: '#BF953F',
          500: '#B38728',
          600: '#AA771C',
          700: '#8B6914',
          800: '#6B4F0A',
          900: '#4A3600',
        },
        silver: '#C0C0C0',
        bronze: '#CD7F32',
      },
      fontFamily: {
        vazir: ['Vazirmatn', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
