// components/ui/StatsGrid.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
          <View style={[styles.card, { borderBottomWidth: 3, borderBottomColor: item.color }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
              {item.icon}
            </View>
            <Text style={[styles.value, { color: item.color }]}>
              {item.value}
              {item.suffix && <Text style={styles.suffix}>{item.suffix}</Text>}
            </Text>
            <Text style={styles.label}>{item.label}</Text>
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
    gap: 16,
  },
  cardWrapper: {
    width: '47%',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32, // Upgraded radius
    padding: 24, // Generous whitespace
    alignItems: 'center',
    borderWidth: 0, // No line rule
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  value: {
    fontSize: 32, // Big typography
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  suffix: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
