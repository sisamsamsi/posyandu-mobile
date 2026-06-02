import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';

interface DistributionChartProps {
  title: string;
  data: { label: string; count: number; color: string }[];
  color?: string;
  onPress?: (status: string) => void;
}

export function DistributionChart({ title, data, color = '#0D9488', onPress }: DistributionChartProps) {
  if (data.length === 0) {
    return (
      <Card style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tidak ada data</Text>
        </View>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.listContainer}>
        {data.map((item, index) => {
          const percentage = (item.count / maxCount) * 100;
          
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.itemRow}
              onPress={() => onPress?.(item.label)}
              activeOpacity={0.7}
            >
              <View style={styles.labelRow}>
                <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.itemCount}>{item.count}</Text>
              </View>
              
              <View style={styles.barBackground}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      width: `${percentage}%`, 
                      backgroundColor: item.color || color 
                    }
                  ]} 
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    gap: 16,
  },
  itemRow: {
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    marginRight: 8,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  barBackground: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  }
});
