// Design System Tokens — JARVIS Premium Dark UI (Lasyareddy26/JARVIS theme)
// Aligned with App.css CSS variables

export const colors = {
  // Dark theme base
  bg: '#0a0a0f',
  bgSecondary: '#0f0f18',
  surface: '#12121c',
  surfaceHover: '#1a1a2a',
  surfaceElevated: '#161625',
  outline: 'rgba(255, 255, 255, 0.08)',
  bgElevated: 'rgba(18, 18, 28, 0.6)',
  bgElevatedSubtle: 'rgba(18, 18, 28, 0.6)',
  bgElevatedMuted: 'rgba(99, 102, 241, 0.08)',

  // Text
  textPrimary: '#eef0f6',
  textSecondary: '#8b8fa3',
  textMuted: '#555770',
  textMutedLight: '#8b8fa3',
  textMutedDark: '#eef0f6',

  // Primary — Indigo/Violet
  accent: '#6366f1',
  accentDark: '#4f46e5',
  accentHover: '#818cf8',
  accentSoft: 'rgba(99, 102, 241, 0.12)',
  gradientPrimary: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)',

  // Status
  success: '#10b981',
  successText: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  successTextDark: '#10b981',
  warning: '#f59e0b',
  warningText: '#f59e0b',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  danger: '#ef4444',
  dangerText: '#ef4444',
  info: '#3b82f6',

  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderMedium: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',
  borderWhite: 'rgba(255, 255, 255, 0.06)',
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
  soft: '0 4px 16px rgba(0, 0, 0, 0.4)',
  card: '0 4px 16px rgba(0, 0, 0, 0.4)',
  cardDark: '0 8px 32px rgba(0, 0, 0, 0.5)',
  nav: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.15)',
  sheet: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.15)',
  glow: '0 0 20px rgba(99, 102, 241, 0.15)',
  glowStrong: '0 0 40px rgba(99, 102, 241, 0.25)',
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

