/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f4',
          100: '#dbeee5',
          200: '#b8decb',
          300: '#8ac5ab',
          400: '#5ba687',
          500: '#3a8767',
          600: '#2d6a4f',
          700: '#245640',
          800: '#1b4332',
          900: '#153629',
          950: '#0b1d16',
          DEFAULT: '#1B4332',
        },
        sage: {
          50: '#f5f8f6',
          100: '#ebf2ed',
          200: '#dde7e0',
          300: '#c2d5c7',
          400: '#9bb8a2',
          DEFAULT: '#ebf2ed',
        },
        offwhite: {
          50: '#ffffff',
          100: '#fafbf9',
          200: '#f8f9fa',
          300: '#f1f3f0',
          400: '#e5e8e2',
          DEFAULT: '#F8F9FA',
        },
        charcoal: {
          50: '#f6f7f7',
          100: '#e1e3e3',
          200: '#c3c7c7',
          300: '#9fa6a5',
          400: '#757f7d',
          500: '#525b59',
          600: '#3b4341',
          700: '#2c3331',
          800: '#1f2421',
          900: '#171b19',
          950: '#0b0d0c',
          DEFAULT: '#1F2421',
        },
        emeraldEco: '#2D6A4F',
        mintEco: '#52B788',
        sageLight: '#E8F5E9',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'subtle-mesh': 'radial-gradient(at 0% 0%, rgba(27, 67, 50, 0.04) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(82, 183, 136, 0.05) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
};
