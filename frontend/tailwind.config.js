/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shared brand orange palette mapped to forest for seamless unified identity across existing code
        forest: {
          50: '#FFF3EB',   // Subtle tinted surfaces
          100: '#FFE6D5',  // Subtle tinted borders / chips
          200: '#FECCA9',
          300: '#FDA772',
          400: '#FF7028',  // Primary brand orange
          500: '#F45D16',  // High-contrast primary accent
          600: '#E05310',
          700: '#D94B0B',  // Accent hover / deep orange
          800: '#B83A05',
          900: '#912711',
          950: '#171717',
          DEFAULT: '#F45D16',
        },
        // Clean neutral section background in light mode
        sage: {
          50: '#F5F5F5',
          100: '#F5F5F5',
          200: '#E3E5E8',
          300: '#E3E5E8',
          400: '#62676D',
          DEFAULT: '#F5F5F5',
        },
        // Main page background and card surfaces in light mode
        offwhite: {
          50: '#FFFFFF',
          100: '#F5F5F5',
          200: '#F5F5F5',
          300: '#E3E5E8',
          400: '#E3E5E8',
          DEFAULT: '#FFFFFF',
        },
        // Primary and secondary text in light mode
        charcoal: {
          50: '#F5F5F5',
          100: '#E3E5E8',
          200: '#D1D5DB',
          300: '#9CA3AF',
          400: '#62676D',  // Secondary text
          500: '#62676D',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2421',
          900: '#171717',  // Primary text
          950: '#0A0A0A',
          DEFAULT: '#171717',
        },
        brand: {
          primary: '#FF7028',
          hover: '#F45D16',
          deep: '#D94B0B',
          tint: '#FFF3EB',
        },
        emeraldEco: '#F45D16',
        mintEco: '#FF7028',
        sageLight: '#FFF3EB',
        darkBg: '#0A0A0A',
        darkNav: '#101010',
        darkSection: '#202326',
        darkCard: '#292D31',
        darkBorder: '#3A3E43',
        darkText: '#F5F5F5',
        darkMuted: '#B8BDC3',
        orangeEco: {
          DEFAULT: '#FF7028',
          hover: '#F45D16',
          50: '#FFF3EB',
          100: '#FFE6D5',
          200: '#FECCA9',
          300: '#FDA772',
          400: '#FF7028',
          500: '#F45D16',
          600: '#E05310',
          700: '#D94B0B',
          800: '#B83A05',
          900: '#912711',
          950: '#171717',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'subtle-mesh': 'radial-gradient(at 0% 0%, rgba(244, 93, 22, 0.04) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(255, 112, 40, 0.05) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
};
