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
  bbLahir?: number | null;
  tbLahir?: number | null;
}

const screenWidth = Dimensions.get('window').width;

export const GrowthChart: React.FC<GrowthChartProps> = ({ 
  standards, 
  data, 
  indicator, 
  title, 
  birthDate,
  bbLahir,
  tbLahir
}) => {
  if (standards.length === 0) return <Text style={styles.loading}>Memuat standar referensi...</Text>;

  // Filter valid data points to avoid zero values
  const validData = data.filter(p => p.berat_badan > 0 || p.tinggi_badan > 0);

  // Find the max measurement month recorded
  const maxMonthRecorded = validData.reduce((max, p) => {
    if (!birthDate) return max;
    const age = differenceInMonths(new Date(p.tanggal), new Date(birthDate));
    return Math.max(max, age);
  }, 0);

  // Set display limit: stop exactly at the last visit to avoid flatlining into the future
  const displayLimit = indicator === 'BB_TB' 
    ? 120 
    : Math.min(Math.max(maxMonthRecorded, 12), 60);

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

  // Extract actual visit points with index mapping
  const actualVisits = filteredStandards.map((s, idx) => {
    if (!birthDate && indicator !== 'BB_TB') return null;
    
    if (indicator === 'BB_TB') {
      const match = validData.find(p => Math.abs(p.tinggi_badan - s.measurement) < 0.5);
      return match ? { x: s.measurement, y: match.berat_badan, idx } : null;
    }
    
    // Inject birth measurements at month 0 if available
    if (s.measurement === 0) {
      if (indicator === 'BB' && bbLahir) {
        return { x: 0, y: bbLahir, idx };
      }
      if (indicator === 'TB' && tbLahir) {
        return { x: 0, y: tbLahir, idx };
      }
      if (indicator === 'IMT' && bbLahir && tbLahir && tbLahir > 0) {
        const imtLahir = bbLahir / ((tbLahir / 100) ** 2);
        return { x: 0, y: imtLahir, idx };
      }
    }
    
    const match = validData.find(p => {
      const age = differenceInMonths(new Date(p.tanggal), new Date(birthDate!));
      return age === s.measurement;
    });
    
    if (match) {
      let val = 0;
      if (indicator === 'BB') val = match.berat_badan;
      else if (indicator === 'TB') val = match.tinggi_badan;
      else if (indicator === 'IMT') val = (match.berat_badan / ((match.tinggi_badan / 100) ** 2));
      return val > 0 ? { x: s.measurement, y: val, idx } : null;
    }
    return null;
  }).filter((v): v is { x: number; y: number; idx: number } => v !== null);

  // If no data recorded yet, return a message
  if (actualVisits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Belum ada data penimbangan untuk grafik ini.</Text>
        </View>
      </View>
    );
  }

  // Generate child data array with linear interpolation for missing intermediate months
  const balitaDataRaw = filteredStandards.map((s, idx) => {
    // Exact match
    const exact = actualVisits.find(v => v.idx === idx);
    if (exact) return exact.y;
    
    // Before the first recorded point
    if (idx < actualVisits[0].idx) {
      return actualVisits[0].y;
    }
    
    // After the last recorded point
    if (idx > actualVisits[actualVisits.length - 1].idx) {
      return actualVisits[actualVisits.length - 1].y;
    }
    
    // Interpolate between surrounding points
    const nextIdx = actualVisits.findIndex(v => v.idx > idx);
    const prev = actualVisits[nextIdx - 1];
    const next = actualVisits[nextIdx];
    
    const ratio = (idx - prev.idx) / (next.idx - prev.idx);
    return prev.y + ratio * (next.y - prev.y);
  });

  // Hide circular dots for interpolated fake points, only display dots on actual visits
  const actualIndices = new Set(actualVisits.map(v => v.idx));
  const hideIndices = filteredStandards.map((_, idx) => actualIndices.has(idx) ? -1 : idx).filter(idx => idx !== -1);

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: getLine('minus_3sd'),
        color: () => '#EF4444', // Solid Red
        strokeWidth: 2,
        withDots: false,
      },
      {
        data: getLine('minus_2sd'),
        color: () => '#F59E0B', // Solid Orange/Yellow
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: getLine('median'),
        color: () => '#10B981', // Solid Green (Kemenkes)
        strokeWidth: 3,
        withDots: false,
      },
      {
        data: getLine('plus_2sd'),
        color: () => '#F59E0B', // Solid Orange/Yellow
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: getLine('plus_3sd'),
        color: () => '#EF4444', // Solid Red
        strokeWidth: 2,
        withDots: false,
      },
      {
        data: balitaDataRaw,
        color: () => '#4F46E5', // Premium Royal Indigo for child's curve
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
            r: '4',
            strokeWidth: '1.5',
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
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>Ideal (Median)</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>Batas Normal (±2 SD)</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Risiko (±3 SD)</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#4F46E5' }]} /><Text style={styles.legendText}>Pertumbuhan Balita</Text></View>
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
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  }
});
