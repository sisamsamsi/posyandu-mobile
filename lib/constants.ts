// lib/constants.ts

export const COLORS = {
  // Balita Theme (Kemenkes Teal)
  tealPrimary: '#00A896',
  tealBg: '#F2F9F8', // White with mint/teal tint
  tealTonal: '#E0F2F1', // Mint/teal tonal container
  
  // Lansia Theme (Indigo)
  indigoPrimary: '#4F46E5',
  indigoBg: '#F4F5FC', // White with indigo/lavender tint
  indigoTonal: '#E8EAF6', // Indigo tonal container
  
  // Surfaces & Neutrals
  surface: '#FFFFFF', // Clean pure white card surface
  onSurface: '#1E293B',
  onSurfaceVariant: '#64748B',
  outline: '#E2E8F0',
  
  // Backward compatibility mappings (will default to Balita/Teal style)
  primary: '#00A896',
  primaryDark: '#007A6E',
  secondary: '#005691',
  secondaryContainer: '#E0F2F1',
  background: '#F2F9F8',
  surfaceDim: '#E0F2F1',
  white: '#FFFFFF',
  
  // Utility
  error: '#EF4444',
  errorBg: '#FEE2E2',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

export const STATUS_COLORS: Record<string, string> = {
  'Gizi Buruk': '#ef4444',
  'Gizi Kurang': '#f97316',
  'Gizi Baik': '#22c55e',
  'Gizi Lebih': '#0ea5e9',
  'Obesitas': '#a855f7',
  'Sangat Pendek (SP)': '#ec4899',
  'Pendek (P)': '#8b5cf6',
  'Normal (N)': '#22c55e',
  'Tinggi (T)': '#06b6d4',
  'BB Sangat Kurang (SK)': '#ef4444',
  'BB Kurang (K)': '#f97316',
  'BB Normal (N)': '#22c55e',
  'Resiko BB Lebih (RL)': '#0ea5e9',
};

export const RISK_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  gray: '#6b7280',
};

export const MAX_AGE_MONTHS = 60;

