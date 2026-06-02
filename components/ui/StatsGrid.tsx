// components/ui/StatsGrid.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../lib/constants';

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  suffix?: string;
  onPress?: () => void; // Click handler
}

interface StatsGridProps {
  items: StatItem[];
}

export function StatsGrid({ items }: StatsGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => {
        const Component = item.onPress ? TouchableOpacity : View;
        return (
          <View key={index} style={styles.cardWrapper}>
            <Component 
              style={styles.card} 
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                {item.icon}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.value}>
                  {item.value}
                  {item.suffix && <Text style={styles.suffix}>{item.suffix}</Text>}
                </Text>
                <Text style={styles.label}>{item.label}</Text>
              </View>
            </Component>
          </View>
        );
      })}
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
    width: '47%',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, 
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: COLORS.tealPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10, // Squircle icon
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  suffix: {
    fontSize: 10,
    fontWeight: '600',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
});
