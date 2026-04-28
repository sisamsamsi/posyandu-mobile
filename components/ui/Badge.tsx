import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../../lib/constants';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'balita' | 'lansia';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary' }) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: '#E0F2F1', text: COLORS.balita },
    secondary: { bg: COLORS.surfaceDim, text: COLORS.textSecondary },
    success: { bg: COLORS.successLight, text: COLORS.success },
    warning: { bg: COLORS.warningLight, text: '#B45309' },
    danger: { bg: COLORS.errorLight, text: COLORS.error },
    info: { bg: COLORS.infoLight, text: COLORS.info },
    balita: { bg: COLORS.balitaLight, text: COLORS.balita },
    lansia: { bg: COLORS.lansiaLight, text: COLORS.lansia },
  };

  const colors = colorMap[variant] || colorMap.primary;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
