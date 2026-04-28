// lib/constants.ts

// ============================================
// DESIGN SYSTEM — AYOMI Posyandu Mobile
// ============================================
// Palette balita: Emerald/Teal — pertumbuhan, kehidupan, segar
// Palette lansia: Indigo/Violet — ketenangan, kebijaksanaan, kehangatan

export const COLORS = {
  // Core brand
  primary: '#0D9488',       // Teal 600 — main brand
  primaryDark: '#115E59',   // Teal 800
  primaryLight: '#CCFBF1',  // Teal 100

  // Balita palette (Emerald/Teal)
  balita: '#0D9488',        // Teal 600
  balitaDark: '#115E59',    // Teal 800
  balitaLight: '#F0FDFA',   // Teal 50
  balitaSoft: '#99F6E4',    // Teal 200
  balitaAccent: '#14B8A6',  // Teal 500

  // Lansia palette (Indigo/Violet)
  lansia: '#6366F1',        // Indigo 500
  lansiaDark: '#3730A3',    // Indigo 800
  lansiaLight: '#EEF2FF',   // Indigo 50
  lansiaSoft: '#C7D2FE',    // Indigo 200
  lansiaAccent: '#818CF8',  // Indigo 400

  // Neutral
  background: '#F8FAFC',    // Slate 50
  surface: '#FFFFFF',
  surfaceDim: '#F1F5F9',    // Slate 100
  surfaceBorder: '#E2E8F0', // Slate 200

  // Text
  textPrimary: '#0F172A',   // Slate 900
  textSecondary: '#475569', // Slate 600
  textTertiary: '#94A3B8',  // Slate 400
  textOnDark: '#FFFFFF',

  // Legacy compatibility
  secondary: '#6366F1',
  secondaryContainer: '#E0E7FF',
  white: '#FFFFFF',

  // Semantic
  error: '#DC2626',         // Red 600
  errorLight: '#FEF2F2',
  warning: '#F59E0B',       // Amber 500
  warningLight: '#FFFBEB',
  success: '#16A34A',       // Green 600
  successLight: '#F0FDF4',
  info: '#0EA5E9',          // Sky 500
  infoLight: '#F0F9FF',
};

export const STATUS_COLORS: Record<string, string> = {
  'Gizi Buruk': '#DC2626',
  'Gizi Kurang': '#F59E0B',
  'Gizi Baik': '#16A34A',
  'Gizi Lebih': '#0EA5E9',
  'Obesitas': '#9333EA',
  'Sangat Pendek (SP)': '#E11D48',
  'Pendek (P)': '#7C3AED',
  'Normal (N)': '#16A34A',
  'Tinggi (T)': '#0891B2',
  'BB Sangat Kurang (SK)': '#DC2626',
  'BB Kurang (K)': '#F59E0B',
  'BB Normal (N)': '#16A34A',
  'Resiko BB Lebih (RL)': '#0EA5E9',
};

export const RISK_COLORS: Record<string, string> = {
  red: '#DC2626',
  orange: '#F59E0B',
  yellow: '#EAB308',
  green: '#16A34A',
  gray: '#6B7280',
};

export const MAX_AGE_MONTHS = 60;

// Shared design tokens
export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
};

export const SHADOW = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
};
