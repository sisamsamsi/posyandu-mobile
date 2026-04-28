// components/ui/LansiaHealthBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart, Droplets, Activity, Pill } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';

interface LansiaHealthBreakdown {
  hipertensi: number;
  gulaTinggi: number;
  kolesterolTinggi: number;
  asamUratTinggi: number;
}

interface LansiaHealthBarProps {
  data: LansiaHealthBreakdown;
  totalLansia: number;
}

const healthItems = [
  { key: 'hipertensi' as const, label: 'Hipertensi', color: '#DC2626', bgColor: '#FEF2F2', icon: Heart },
  { key: 'gulaTinggi' as const, label: 'Gula Darah Tinggi', color: '#F59E0B', bgColor: '#FFFBEB', icon: Droplets },
  { key: 'kolesterolTinggi' as const, label: 'Kolesterol Tinggi', color: '#7C3AED', bgColor: '#F5F3FF', icon: Activity },
  { key: 'asamUratTinggi' as const, label: 'Asam Urat Tinggi', color: '#2563EB', bgColor: '#EFF6FF', icon: Pill },
];

export function LansiaHealthBar({ data, totalLansia }: LansiaHealthBarProps) {
  const maxValue = Math.max(
    data.hipertensi,
    data.gulaTinggi,
    data.kolesterolTinggi,
    data.asamUratTinggi,
    1
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Heart size={14} color={COLORS.lansia} />
        </View>
        <View>
          <Text style={styles.title}>Pemantauan Kesehatan</Text>
          <Text style={styles.subtitle}>Kondisi yang perlu dipantau</Text>
        </View>
      </View>

      {healthItems.map((item) => {
        const value = data[item.key];
        const percentage = totalLansia > 0 ? Math.round((value / totalLansia) * 100) : 0;
        const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const Icon = item.icon;

        return (
          <View key={item.key} style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <View style={[styles.barIconCircle, { backgroundColor: item.bgColor }]}>
                <Icon size={13} color={item.color} />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
              <View style={styles.valueContainer}>
                <Text style={[styles.barValue, { color: item.color }]}>{value}</Text>
                <Text style={styles.barPercent}>({percentage}%)</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(barWidth, 3)}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOW.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lansiaLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  barRow: {
    marginBottom: 14,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  barIconCircle: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  barValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  barPercent: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textTertiary,
  },
  barTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
