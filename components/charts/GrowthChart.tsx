import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
  standards: rawStandards, 
  data, 
  indicator, 
  title, 
  birthDate,
  bbLahir,
  tbLahir
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Unique standards by measurement to avoid length_cm and height_cm duplicate rows
  const standards = React.useMemo(() => {
    const unique = [];
    const seen = new Set();
    for (const s of rawStandards) {
      if (!seen.has(s.measurement)) {
        seen.add(s.measurement);
        unique.push(s);
      }
    }
    return unique;
  }, [rawStandards]);

  if (standards.length === 0) return <Text style={styles.loading}>Memuat standar referensi...</Text>;

  // Filter valid data points based on indicator requirements
  const validData = React.useMemo(() => {
    return data.filter(p => {
      if (indicator === 'BB') return p.berat_badan && p.berat_badan > 0;
      if (indicator === 'TB') return p.tinggi_badan && p.tinggi_badan > 0;
      // IMT and BB_TB require both weight and height to be valid and non-zero
      return p.berat_badan && p.berat_badan > 0 && p.tinggi_badan && p.tinggi_badan > 0;
    });
  }, [data, indicator]);

  // Find the max and min measurement month/height recorded
  const maxMonthRecorded = validData.reduce((max, p) => {
    if (!birthDate) return max;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return max;
    const age = differenceInMonths(new Date(p.tanggal), birth);
    return isNaN(age) ? max : Math.max(max, age);
  }, 0);

  const minMonthRecorded = validData.reduce((min, p) => {
    if (!birthDate) return min;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return min;
    const age = differenceInMonths(new Date(p.tanggal), birth);
    if (isNaN(age)) return min;
    return min === -1 ? age : Math.min(min, age);
  }, -1);

  const maxHeightRecorded = validData.reduce((max, p) => {
    return Math.max(max, p.tinggi_badan || 0);
  }, 0);

  const minHeightRecorded = validData.reduce((min, p) => {
    const val = p.tinggi_badan || 0;
    return min === 0 ? val : Math.min(min, val);
  }, 0);

  // Set display limit: stop exactly at the last visit to avoid flatlining into the future
  const displayLimit = Math.min(Math.max(maxMonthRecorded, 12), 60); // Show up to 60 months (5 years) for standard KMS scope
  const displayLimitHeight = Math.min(Math.max(Math.ceil(maxHeightRecorded), 85), 120);

  // Determine filtered standards based on zoom state
  let filteredStandards = standards;
  if (indicator === 'BB_TB') {
    const minH = isZoomed ? Math.max(45, Math.floor(minHeightRecorded) - 2) : 45;
    const maxH = isZoomed ? Math.min(120, Math.ceil(maxHeightRecorded) + 2) : displayLimitHeight;
    filteredStandards = standards.filter(s => s.measurement >= minH && s.measurement <= maxH);
  } else {
    const minM = isZoomed ? Math.max(0, minMonthRecorded - 1) : 0;
    const maxM = isZoomed ? Math.min(60, maxMonthRecorded + 1) : displayLimit;
    filteredStandards = standards.filter(s => s.measurement >= minM && s.measurement <= maxM);
  }

  if (filteredStandards.length === 0) {
    filteredStandards = indicator === 'BB_TB'
      ? standards.filter(s => s.measurement >= 45 && s.measurement <= displayLimitHeight)
      : standards.filter(s => s.measurement <= displayLimit);
  }

  // Labels for X-axis (must match the length of filteredStandards to align correctly in react-native-chart-kit)
  const labels = filteredStandards.map((s, i) => {
    if (indicator === 'BB_TB') {
      const step = isZoomed ? 4 : 10;
      return i % step === 0 || i === filteredStandards.length - 1 ? `${Math.round(s.measurement)}` : '';
    }
    const step = isZoomed ? 2 : 6;
    return i % step === 0 || i === filteredStandards.length - 1 ? `${s.measurement}` : '';
  });
  
  const getLine = (key: keyof WHOReferenceRow) => {
    return filteredStandards.map(s => {
      const val = s[key] as number;
      return (typeof val === 'number' && !isNaN(val) && isFinite(val)) ? val : 0;
    });
  };

  // Extract actual visit points with index mapping
  const actualVisits = filteredStandards.map((s, idx) => {
    if (!birthDate && indicator !== 'BB_TB') return null;
    const birth = birthDate ? new Date(birthDate) : null;
    const isBirthValid = birth && !isNaN(birth.getTime());
    
    if (indicator === 'BB_TB') {
      const match = validData.find(p => Math.abs(p.tinggi_badan - s.measurement) < 0.5);
      if (match) {
        const age = isBirthValid ? differenceInMonths(new Date(match.tanggal), birth) : 0;
        return { x: s.measurement, y: match.berat_badan, idx, age };
      }
      return null;
    }
    
    // Inject birth measurements at month 0 if available
    if (s.measurement === 0) {
      if (indicator === 'BB' && bbLahir && bbLahir > 0) {
        return { x: 0, y: bbLahir, idx, age: 0 };
      }
      if (indicator === 'TB' && tbLahir && tbLahir > 0) {
        return { x: 0, y: tbLahir, idx, age: 0 };
      }
      if (indicator === 'IMT' && bbLahir && bbLahir > 0 && tbLahir && tbLahir > 0) {
        const imtLahir = bbLahir / ((tbLahir / 100) ** 2);
        return { x: 0, y: imtLahir, idx, age: 0 };
      }
    }
    
    const match = validData.find(p => {
      if (!isBirthValid) return false;
      const age = differenceInMonths(new Date(p.tanggal), birth);
      return age === s.measurement;
    });
    
    if (match) {
      let val = 0;
      if (indicator === 'BB') val = match.berat_badan;
      else if (indicator === 'TB') val = match.tinggi_badan;
      else if (indicator === 'IMT') {
        const tb = match.tinggi_badan;
        val = (tb && tb > 0) ? (match.berat_badan / ((tb / 100) ** 2)) : 0;
      }
      return val > 0 ? { x: s.measurement, y: val, idx, age: s.measurement } : null;
    }
    return null;
  }).filter((v): v is { x: number; y: number; idx: number; age: number } => 
    v !== null && typeof v.y === 'number' && !isNaN(v.y) && isFinite(v.y)
  );

  const visitIndexMap = new Map(actualVisits.map(v => [v.idx, v]));

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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.zoomBtn, isZoomed && styles.zoomBtnActive]} 
            onPress={() => setIsZoomed(!isZoomed)}
            activeOpacity={0.7}
          >
            <Text style={[styles.zoomBtnText, isZoomed && styles.zoomBtnTextActive]}>
              {isZoomed ? 'Zoom Out' : 'Zoom In'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.referenceText}>WHO Antro 2005</Text>
        </View>
      </View>

      {/* Y-Axis Label */}
      <Text style={styles.yAxisLabel}>{metadata.yLabel}</Text>

      {/* Chart */}
      {isZoomed ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true} 
          nestedScrollEnabled={true}
          overScrollMode="always"
          contentContainerStyle={{ paddingBottom: 8, paddingRight: 20 }}
        >
          <View pointerEvents="none">
            <LineChart
              data={chartData}
              width={(screenWidth - 40) * 1.8}
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
          </View>
        </ScrollView>
      ) : (
        <View pointerEvents="none">
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
        </View>
      )}

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
  },
  zoomBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginRight: 8,
  },
  zoomBtnActive: {
    backgroundColor: '#09A477',
    borderColor: '#09A477',
  },
  zoomBtnText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#09A477',
  },
  zoomBtnTextActive: {
    color: '#FFFFFF',
  },
});
