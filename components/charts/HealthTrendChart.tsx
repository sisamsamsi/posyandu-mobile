import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';

interface SeriesData {
  data: number[];
  color: (opacity?: number) => string;
  strokeWidth: number;
}

interface HealthTrendChartProps {
  labels: string[];
  datasets: SeriesData[];
  title: string;
  legend?: string[];
}

const screenWidth = Dimensions.get('window').width;

export const HealthTrendChart: React.FC<HealthTrendChartProps> = ({ labels, datasets, title, legend }) => {
  if (labels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Data tidak mencukupi untuk grafik.</Text>
      </View>
    );
  }

  // Ensure data has at least 2 points for a line chart to render properly
  const displayLabels = labels.length === 1 ? ['', labels[0]] : labels;
  const displayDatasets = datasets.map(ds => ({
    ...ds,
    data: ds.data.length === 1 ? [ds.data[0], ds.data[0]] : ds.data
  }));

  const chartData = {
    labels: displayLabels.slice(-6), // Show only last 6 points
    datasets: displayDatasets.map(ds => ({
      ...ds,
      data: ds.data.slice(-6)
    })),
    legend: legend
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: '#ffffff',
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 4,
    borderRadius: 16,
    marginLeft: -10,
  },
  emptyContainer: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  }
});
