import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Card } from '../ui/Card';

interface DistributionChartProps {
  title: string;
  data: { label: string; count: number; color: string }[];
  color?: string;
}

const screenWidth = Dimensions.get('window').width;

// Label mapping for pruning
const LABEL_MAP: Record<string, string> = {
  'Gizi Buruk': 'Buruk',
  'Gizi Kurang': 'Kurang',
  'Gizi Baik': 'Baik',
  'Gizi Lebih': 'Lebih',
  'Obesitas': 'Obesitas',
  'Sangat Pendek (SP)': 'SP (Sgt Pdk)',
  'Pendek (P)': 'P (Pendek)',
  'Normal (N)': 'Normal',
  'Tinggi (T)': 'Tinggi',
  'BB Sangat Kurang (SK)': 'Sgt Kurang',
  'BB Kurang (K)': 'Kurang',
  'BB Normal (N)': 'Normal',
  'Resiko BB Lebih (RL)': 'Resiko LB',
  'Gizi Buruk (Severely Wasted)': 'Buruk',
  'Gizi Kurang (Wasted)': 'Kurus',
  'Berisiko Gizi Lebih': 'Risiko LB',
  'Gizi Lebih (Overweight)': 'Lebih',
};

export function DistributionChart({ title, data, color = '#0D9488' }: DistributionChartProps) {
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

  const chartData = {
    labels: data.map(d => LABEL_MAP[d.label] || (d.label.length > 10 ? d.label.substring(0, 8) + '..' : d.label)),
    datasets: [{
      data: data.map(d => d.count)
    }]
  };

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 72}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        fromZero
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => color === '#0D9488' ? `rgba(13, 148, 136, ${opacity})` : `rgba(99, 102, 241, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
          barPercentage: 0.7,
          propsForBackgroundLines: {
            strokeDasharray: '4,4',
            stroke: '#F1F5F9',
          }
        }}
        verticalLabelRotation={45}
        showValuesOnTopOfBars
        style={styles.chart}
      />
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
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
