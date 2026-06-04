import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { WHOReferenceRow, Penimbangan } from '../../lib/types';
import { differenceInMonths } from 'date-fns';
import { Info } from 'lucide-react-native';

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

  const maxHeightRecorded = validData.reduce((max, p) => {
    return Math.max(max, p.tinggi_badan);
  }, 0);

  // Set display limit: stop exactly at the last visit to avoid flatlining into the future
  const displayLimit = Math.min(Math.max(maxMonthRecorded, 12), 30); // Show up to 30 months as in the reference mockup
  const displayLimitHeight = Math.min(Math.max(Math.ceil(maxHeightRecorded), 85), 120);

  const filteredStandards = indicator === 'BB_TB'
    ? standards.filter(s => s.measurement >= 45 && s.measurement <= displayLimitHeight)
    : standards.filter(s => s.measurement <= displayLimit);

  // Labels for X-axis (sampled for spacing - e.g. every 6 months)
  const labels = filteredStandards.filter((_, i) => {
    if (indicator === 'BB_TB') return i % 20 === 0;
    return i % 6 === 0 || i === filteredStandards.length - 1;
  }).map(s => `${s.measurement}`);
  
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
        <Text style={styles.chartTitleText}>{title}</Text>
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
        color: () => '#EF4444', // -3 SD Red
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: getLine('minus_2sd'),
        color: () => '#F97316', // -2 SD Orange
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: getLine('minus_1sd'),
        color: () => '#EAB308', // -1 SD Yellow
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: getLine('median'),
        color: () => '#09A477', // Median Green (Kemenkes)
        strokeWidth: 2.5,
        withDots: false,
      },
      {
        data: getLine('plus_1sd'),
        color: () => '#EAB308', // 1 SD Yellow
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: getLine('plus_2sd'),
        color: () => '#F97316', // 2 SD Orange
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: getLine('plus_3sd'),
        color: () => '#EF4444', // 3 SD Red
        strokeWidth: 1.5,
        withDots: false,
      },
      {
        data: balitaDataRaw,
        color: () => '#0F766E', // Child Curve Dark Teal
        strokeWidth: 3.5,
        withDots: true,
      },
    ],
  };

  // Dynamic labels and titles
  const getChartMetadata = () => {
    switch (indicator) {
      case 'TB':
        return {
          chartTitle: 'Tinggi Badan menurut Umur (TB/U)',
          yLabel: 'Tinggi Badan (cm)',
          xLabel: 'Umur (bulan)'
        };
      case 'IMT':
        return {
          chartTitle: 'Indeks Massa Tubuh menurut Umur (IMT/U)',
          yLabel: 'IMT (kg/m²)',
          xLabel: 'Umur (bulan)'
        };
      case 'BB_TB':
        return {
          chartTitle: 'Berat Badan menurut Tinggi Badan (BB/TB)',
          yLabel: 'Berat Badan (kg)',
          xLabel: 'Tinggi Badan (cm)'
        };
      case 'BB':
      default:
        return {
          chartTitle: 'Berat Badan menurut Umur (BB/U)',
          yLabel: 'Berat Badan (kg)',
          xLabel: 'Umur (bulan)'
        };
    }
  };

  const metadata = getChartMetadata();

  return (
    <View style={styles.container}>
      {/* Chart Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.chartTitleText}>{metadata.chartTitle}</Text>
          <Info size={14} color="#64748B" style={{ marginLeft: 6 }} />
        </View>
        <Text style={styles.referenceText}>WHO Antro 2005</Text>
      </View>

      {/* Y-Axis Label */}
      <Text style={styles.yAxisLabel}>{metadata.yLabel}</Text>

      {/* Chart */}
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
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
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={false}
      />

      {/* X-Axis Label */}
      <Text style={styles.xAxisLabel}>{metadata.xLabel}</Text>

      {/* Custom Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>-3 SD</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendText}>-2 SD</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.legendText}>-1 SD</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#09A477' }]} />
            <Text style={styles.legendText}>Median</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.legendText}>1 SD</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendText}>2 SD</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>3 SD</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#0F766E' }]} />
            <Text style={styles.legendText}>Hasil Pengukuran</Text>
          </View>
        </View>
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
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chartTitleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
  },
  referenceText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  yAxisLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    marginBottom: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  chart: {
    marginVertical: 4,
    borderRadius: 16,
    marginLeft: -15,
  },
  legendContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
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
