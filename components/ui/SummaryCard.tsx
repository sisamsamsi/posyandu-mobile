import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon, color }) => {
  return (
    <Card style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        {React.cloneElement(icon as React.ReactElement<any>, { color: color, size: 24 })}
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: '#1E293B' }]}>{value}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
});
