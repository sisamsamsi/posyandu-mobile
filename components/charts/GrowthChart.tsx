import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { WHOReferenceRow, Penimbangan } from '../../lib/types';
import { differenceInMonths } from 'date-fns';

interface GrowthChartProps {
  standards: WHOReferenceRow[];
  data: Penimbangan[];
  indicator: 'BB' | 'TB';
  title: string;
  birthDate?: string;
}

const screenWidth = Dimensions.get('window').width;

export const GrowthChart: React.FC<GrowthChartProps> = ({ standards, data, indicator, title, birthDate }) => {
  if (standards.length === 0) return <Text style={styles.loading}>Memuat standar referensi...</Text>;

  // Labels for X-axis (Months 0-60, sampled every 12 months for better spacing)
  const labels = standards.filter((_, i) => i % 12 === 0).map(s => `${s.measurement}bln`);
  
  const getLine = (key: keyof WHOReferenceRow) => {
    return standards.map(s => s[key] as number);
  };

  // Plot Balita's data
  // We need to find the Y value for each age (month) present in standards
  const balitaData = standards.map(s => {
    if (!birthDate) return 0;
    
    // Find penimbangan that matches this month
    const match = data.find(p => {
      const age = differenceInMonths(new Date(p.tanggal), new Date(birthDate));
      return age === s.measurement;
    });

    if (match) {
      return indicator === 'BB' ? match.berat_badan : match.tinggi_badan;
    }
    return 0; // chart-kit uses 0 as 'no data' or we could use null if supported (it's tricky)
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: getLine('minus_3sd'),
        color: (opacity = 0.5) => `rgba(239, 68, 68, ${opacity})`, // Red (-3SD)
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: getLine('minus_2sd'),
        color: (opacity = 0.5) => `rgba(245, 158, 11, ${opacity})`, // Orange (-2SD)
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: getLine('median'),
        color: (opacity = 0.5) => `rgba(34, 197, 94, ${opacity})`, // Green (Median)
        strokeWidth: 2,
        withDots: false,
      },
      {
        data: getLine('plus_2sd'),
        color: (opacity = 0.5) => `rgba(245, 158, 11, ${opacity})`, // Orange (+2SD)
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: getLine('plus_3sd'),
        color: (opacity = 0.5) => `rgba(239, 68, 68, ${opacity})`, // Red (+3SD)
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: balitaData,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Black Line for Balita (High Contrast)
        strokeWidth: 4,
        withDots: true,
      },
    ],
    legend: [title]
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={240}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: '#ffffff',
          },
          fillShadowGradient: '#ffffff',
          fillShadowGradientOpacity: 0,
        }}
        withShadow={false}
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={false} // Better for height charts
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>Ideal</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>Normal</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Risiko</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#000000' }]} /><Text style={styles.legendText}>Balita</Text></View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 4,
    borderRadius: 16,
    marginLeft: -10, // Adjust for Y-axis labels
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  loading: {
    textAlign: 'center',
    padding: 20,
    color: '#94A3B8',
    fontStyle: 'italic',
  }
});
