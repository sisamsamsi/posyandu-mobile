import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary' }) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return '#0D9488'; // Teal 600
      case 'secondary': return '#64748B';
      case 'success': return '#22C55E';
      case 'warning': return '#F59E0B';
      case 'danger': return '#EF4444';
      case 'info': return '#06B6D4';
      default: return '#0D9488';
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
