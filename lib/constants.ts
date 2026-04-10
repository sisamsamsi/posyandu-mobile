// lib/constants.ts

export const COLORS = {
  primary: '#0d9488', // Teal
  secondary: '#0f172a', // Slate-900
  background: '#f8fafc', // Slate-50
  white: '#ffffff',
  error: '#ef4444',
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
