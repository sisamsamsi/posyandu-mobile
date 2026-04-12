import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { WHOReferenceRow, Penimbangan } from '../../lib/types';
import { differenceInMonths } from 'date-fns';

interface GrowthChartProps {
  standards: WHOReferenceRow[];
  data: Penimbangan[];
  indicator: 'BB' | 'TB' | 'IMT' | 'BB_TB';
  title: string;
  birthDate?: string;
}

const screenWidth = Dimensions.get('window').width;

export const GrowthChart: React.FC<GrowthChartProps> = ({ standards, data, indicator, title, birthDate }) => {
  if (standards.length === 0) return <Text style={styles.loading}>Memuat standar referensi...</Text>;

  // Find the max measurement month recorded
  const maxMonthRecorded = data.reduce((max, p) => {
    if (!birthDate) return max;
    const age = differenceInMonths(new Date(p.tanggal), new Date(birthDate));
    return Math.max(max, age);
  }, 0);

  // TRUNCATION STRATEGY:
  // To avoid the "dip to zero" and the "NaN crash" in react-native-chart-kit,
  // we truncate the entire chart (standards + balita data) to only show
  // up to the last recorded measurement month + a small margin.
  // This satisfies the user request: "untuk yang belom dilakukan (masa datang) tidak perlu digambar"
  const displayLimit = indicator === 'BB_TB' 
    ? 120 // For height based, we can show up to typical height
    : Math.min(Math.max(maxMonthRecorded + 6, 12), 60);

  const filteredStandards = indicator === 'BB_TB'
    ? standards.filter(s => s.measurement >= 45 && s.measurement <= 120)
    : standards.filter(s => s.measurement <= displayLimit);

  // Labels for X-axis (sampled for spacing)
  const labels = filteredStandards.filter((_, i) => {
    if (indicator === 'BB_TB') return i % 20 === 0;
    return i % 12 === 0 || i === filteredStandards.length - 1;
  }).map(s => `${s.measurement}${indicator === 'BB_TB' ? 'cm' : 'bln'}`);
  
  const getLine = (key: keyof WHOReferenceRow) => {
    return filteredStandards.map(s => s[key] as number);
  };

  // Plot Balita's data
  const balitaDataRaw = filteredStandards.map(s => {
    if (!birthDate && indicator !== 'BB_TB') return 0;
    
    if (indicator === 'BB_TB') {
      const match = data.find(p => Math.abs(p.tinggi_badan - s.measurement) < 0.5);
      return match ? match.berat_badan : 0;
    }

    if (s.measurement > maxMonthRecorded) return 0;

    const match = data.find(p => {
      const age = differenceInMonths(new Date(p.tanggal), new Date(birthDate!));
      return age === s.measurement;
    });

    if (match) {
      if (indicator === 'BB') return match.berat_badan;
      if (indicator === 'TB') return match.tinggi_badan;
      if (indicator === 'IMT') return (match.berat_badan / ((match.tinggi_badan / 100) ** 2));
    }
    return 0;
  });

  // Since we truncated the chart to maxMonthRecorded, 0s will only happen if there's a gap in history.
  // We'll hide all 0 points completely.
  const hideIndices = balitaDataRaw.map((v, i) => v <= 0 ? i : -1).filter(i => i !== -1);

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: getLine('minus_3sd'),
        color: (opacity = 0.5) => `rgba(239, 68, 68, ${opacity})`, 
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: getLine('minus_2sd'),
        color: (opacity = 0.5) => `rgba(245, 158, 11, ${opacity})`, 
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: getLine('median'),
        color: (opacity = 0.5) => `rgba(34, 197, 94, ${opacity})`, 
        strokeWidth: 2,
        withDots: false,
      },
      {
        data: getLine('plus_2sd'),
        color: (opacity = 0.5) => `rgba(245, 158, 11, ${opacity})`, 
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: getLine('plus_3sd'),
        color: (opacity = 0.5) => `rgba(239, 68, 68, ${opacity})`, 
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: balitaDataRaw,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, 
        strokeWidth: 3,
        withDots: false,
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
            r: '3',
            strokeWidth: '1',
            stroke: '#ffffff',
          },
          fillShadowGradient: '#ffffff',
          fillShadowGradientOpacity: 0,
        }}
        withShadow={false}
        hidePointsAtIndex={hideIndices}
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={false}
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
    marginLeft: -10, 
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
