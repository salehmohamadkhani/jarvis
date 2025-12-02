// Design System Tokens
// Extracted from existing App.css CSS variables and hardcoded values

export const colors = {
  // Light theme base colors (from CSS variables)
  bg: '#f4f6fb',
  bgGradient: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 50%, #f4f6fb 100%)',
  surface: '#ffffff',
  outline: '#e2e8f0',
  
  // Dark card backgrounds (used in .today-card)
  bgElevated: 'rgba(15, 23, 42, 0.85)',
  bgElevatedSubtle: 'rgba(2, 6, 23, 0.45)',
  bgElevatedMuted: 'rgba(2, 6, 23, 0.3)',
  
  // Text colors
  textPrimary: '#0f172a',
  textSecondary: '#e5e7eb',
  textMuted: '#94a3b8',
  textMutedLight: '#9ca3af',
  textMutedDark: '#cbd5e1',
  
  // Accent colors
  accent: '#0ea5e9',
  accentDark: '#0284c7',
  accentSoft: 'rgba(56, 189, 248, 0.15)',
  
  // Status colors
  success: 'rgba(34, 197, 94, 0.5)',
  successText: '#86efac',
  successBg: '#ffe5e5',
  successTextDark: '#d7263d',
  
  warning: 'rgba(248, 113, 113, 0.6)',
  warningText: '#fca5a5',
  warningBorder: 'rgba(248, 113, 113, 0.45)',
  
  danger: 'rgba(239, 68, 68, 0.7)',
  dangerText: '#f97373',
  
  // Info/Project colors
  info: 'rgba(59, 130, 246, 0.5)',
  
  // Border colors
  borderSubtle: 'rgba(148, 163, 184, 0.35)',
  borderMedium: 'rgba(148, 163, 184, 0.4)',
  borderLight: 'rgba(148, 163, 184, 0.25)',
  borderWhite: 'rgba(255, 255, 255, 0.6)',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
}

// Map to CSS variable values where applicable
export const radiusCSS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  pill: '999px',
  // From CSS variables
  card: '20px', // --radius-lg
  cardMd: '14px', // --radius-md
}

export const shadow = {
  soft: '0 18px 40px rgba(15, 23, 42, 0.7)',
  card: '0 16px 40px rgba(15, 23, 42, 0.08)', // --shadow-card
  cardDark: '0 14px 34px rgba(15, 23, 42, 0.6)',
  nav: '0 20px 50px rgba(15, 23, 42, 0.15)',
  sheet: '0 14px 34px rgba(15, 23, 42, 0.6)',
}

export const typography = {
  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: {
    xs: '0.75rem',
    sm: '0.8125rem',
    md: '0.875rem',
    base: '0.95rem',
    lg: '1.5rem',
    xl: '1.6rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
}

// Z-index scale
export const zIndex = {
  base: 1,
  dropdown: 10,
  nav: 12,
  modal: 20,
  tooltip: 30,
}

