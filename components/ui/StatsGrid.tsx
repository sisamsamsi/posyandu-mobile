// components/ui/StatsGrid.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  suffix?: string;
}

interface StatsGridProps {
  items: StatItem[];
}

export function StatsGrid({ items }: StatsGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View key={index} style={styles.cardWrapper}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
              {item.icon}
            </View>
            <Text style={[styles.value, { color: item.color }]}>
              {item.value}
              {item.suffix && <Text style={styles.suffix}>{item.suffix}</Text>}
            </Text>
            <Text style={styles.label}>{item.label}</Text>
            <View style={[styles.accentBar, { backgroundColor: item.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    width: '47%',
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  suffix: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
});
