/**
 * EcoCycle Unified Theme Design Tokens
 * 
 * Single source of truth for both Light and Dark themes, establishing
 * a coherent modern black/charcoal/vibrant-orange visual identity.
 */

// Core Brand Orange Tokens
export const BRAND_TOKENS = {
  primary: '#FF7028',      // Primary vibrant brand orange
  lightAccent: '#F45D16',  // High-contrast primary accent for light surfaces
  hover: '#F45D16',        // Hover / pressed state for primary orange
  deep: '#D94B0B',         // Deep accent for emphasis & light hover
  tint: '#FFF3EB',         // Subtle warm tinted surface in light mode
  tintBorder: '#FFE6D5',   // Subtle tinted border in light mode
};

// Coherent Light Theme Tokens
export const LIGHT_THEME = {
  bg: '#FFFFFF',           // Main page background
  section: '#F5F5F5',      // Secondary section background
  card: '#FFFFFF',         // Cards and elevated surfaces
  tint: '#FFF3EB',         // Subtle tinted surfaces
  border: '#E3E5E8',       // Borders and dividers
  text: '#171717',         // Primary text
  muted: '#62676D',        // Secondary text
  accent: '#F45D16',       // Primary brand accent
  accentHover: '#D94B0B',  // Accent hover
};

// Coherent Dark Theme Tokens
export const DARK_THEME = {
  bg: '#0A0A0A',           // Main page background (deep black)
  nav: '#101010',          // Navigation and deepest surfaces
  section: '#202326',      // Secondary sections / wells / inputs
  card: '#292D31',         // Cards and elevated panels / modals
  border: '#3A3E43',       // Borders and dividers (charcoal grey)
  text: '#F5F5F5',         // Primary text (near white)
  muted: '#B8BDC3',        // Secondary text (muted grey)
  accent: '#FF7028',       // Brand accent (vibrant orange)
  accentHover: '#F45D16',  // Accent hover (deeper orange)
};

// Semantic Status Tokens (strictly isolated from brand orange)
export const STATUS_TOKENS = {
  success: {
    label: 'Verified / Recycled / Complete',
    light: '#16A34A',
    dark: '#34D399',
    bgLight: '#F0FDF4',
    bgDark: 'rgba(6, 78, 59, 0.4)',
    borderLight: '#BBF7D0',
    borderDark: '#065F46',
  },
  warning: {
    label: 'Awaiting / Review / Pending',
    light: '#D97706',
    dark: '#FBBF24',
    bgLight: '#FFFBEB',
    bgDark: 'rgba(120, 53, 15, 0.4)',
    borderLight: '#FDE68A',
    borderDark: '#78350F',
  },
  danger: {
    label: 'Error / Cancelled / Decommission',
    light: '#DC2626',
    dark: '#F87171',
    bgLight: '#FEF2F2',
    bgDark: 'rgba(127, 29, 29, 0.4)',
    borderLight: '#FECACA',
    borderDark: '#991B1B',
  },
  info: {
    label: 'In Transit / Logistics / System',
    light: '#2563EB',
    dark: '#60A5FA',
    bgLight: '#EFF6FF',
    bgDark: 'rgba(30, 58, 138, 0.4)',
    borderLight: '#BFDBFE',
    borderDark: '#1E3A8A',
  },
  proposal: {
    label: 'Proposed / Channel',
    light: '#7C3AED',
    dark: '#A78BFA',
    bgLight: '#F5F3FF',
    bgDark: 'rgba(76, 29, 149, 0.4)',
    borderLight: '#DDD6FE',
    borderDark: '#5B21B6',
  },
};

// Unified Chart Palettes for both Light and Dark themes
export const CHART_PALETTES = {
  // Vibrant orange as dominant highlight, with complementary charcoal, muted orange & neutral tones
  dark: [
    '#FF7028', // Primary vibrant orange (dominant / highlight)
    '#FDA772', // Muted warm orange
    '#6B7280', // Medium charcoal neutral
    '#F45D16', // Deep accent orange
    '#9CA3AF', // Light silver charcoal
    '#4B5563', // Dark charcoal
    '#E5E7EB', // Near-white neutral
  ],
  light: [
    '#F45D16', // Primary brand orange (high contrast on light)
    '#FDA772', // Muted warm orange
    '#4B5563', // Charcoal
    '#D94B0B', // Deep burnt orange
    '#6B7280', // Medium neutral
    '#9CA3AF', // Soft grey
    '#171717', // Dark charcoal accent
  ],
};

// Category-to-Color mappings for consistent cross-chart coloring
export const CATEGORY_COLORS = {
  computing: {
    dark: '#FF7028',
    light: '#F45D16',
  },
  mobile: {
    dark: '#FDA772',
    light: '#FDA772',
  },
  battery: {
    dark: '#F45D16',
    light: '#D94B0B',
  },
  peripherals: {
    dark: '#9CA3AF',
    light: '#6B7280',
  },
  appliances: {
    dark: '#6B7280',
    light: '#4B5563',
  },
  other: {
    dark: '#4B5563',
    light: '#9CA3AF',
  },
  // Logistics Methods (Pickup vs Drop-off)
  pickup: {
    dark: '#FF7028',
    light: '#F45D16',
  },
  dropoff: {
    dark: '#6B7280',
    light: '#4B5563',
  },
};
