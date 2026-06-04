import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';
import { useServiceStore } from '../../stores/service-store';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary' }) => {
  const { activeWorkspace } = useServiceStore();
  const isBalita = activeWorkspace !== 'lansia';
  const primaryThemeColor = isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary;

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return primaryThemeColor;
      case 'secondary': return '#64748B';
      case 'success': return '#22C55E';
      case 'warning': return '#F59E0B';
      case 'danger': return '#EF4444';
      case 'info': return '#06B6D4';
      default: return primaryThemeColor;
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
