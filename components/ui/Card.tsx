import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '../../lib/constants';
import { useServiceStore } from '../../stores/service-store';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { activeWorkspace } = useServiceStore();
  const isBalita = activeWorkspace !== 'lansia'; // default to balita/teal if null
  const dynamicShadowColor = isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary;

  return (
    <View style={[styles.card, { shadowColor: dynamicShadowColor }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
});
