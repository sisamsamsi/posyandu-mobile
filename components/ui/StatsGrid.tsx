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
    gap: 10,
  },
  cardWrapper: {
    width: '48%',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  suffix: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
