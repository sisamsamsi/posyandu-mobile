// lib/constants.ts

export const COLORS = {
  primary: '#4DB6AC', // Light Teal
  primaryDark: '#006A63', 
  secondary: '#64B5F6', // Light Blue
  secondaryContainer: '#cde5ff',
  background: '#f8f9fa', 
  surface: '#ffffff',
  surfaceDim: '#f3f4f5',
  white: '#ffffff',
  error: '#ba1a1a',
  warning: '#f97316',
  success: '#22c55e',
  info: '#0ea5e9',
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
