import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Card } from '../ui/Card';

interface DistributionChartProps {
  title: string;
  data: { label: string; count: number; color: string }[];
}

const screenWidth = Dimensions.get('window').width;

export function DistributionChart({ title, data }: DistributionChartProps) {
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
    labels: data.map(d => {
       // Shorten labels for better fit
       if (d.label.length > 8) return d.label.substring(0, 8) + '..';
       return d.label;
    }),
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
        height={200}
        yAxisLabel=""
        yAxisSuffix=""
        fromZero
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
          barPercentage: 0.6,
          propsForBackgroundLines: {
            strokeDasharray: '5,5',
            stroke: '#E2E8F0',
          }
        }}
        verticalLabelRotation={30}
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
