// components/ui/LansiaHealthBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart, Droplets, Activity, Pill } from 'lucide-react-native';

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
  { key: 'hipertensi' as const, label: 'Hipertensi', color: '#EF4444', bgColor: '#FEF2F2', icon: Heart },
  { key: 'gulaTinggi' as const, label: 'Gula Darah Tinggi', color: '#F59E0B', bgColor: '#FFFBEB', icon: Droplets },
  { key: 'kolesterolTinggi' as const, label: 'Kolesterol Tinggi', color: '#8B5CF6', bgColor: '#F5F3FF', icon: Activity },
  { key: 'asamUratTinggi' as const, label: 'Asam Urat Tinggi', color: '#3B82F6', bgColor: '#EFF6FF', icon: Pill },
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
        <Text style={styles.title}>Kesehatan Lansia</Text>
        <Text style={styles.subtitle}>Kondisi yang perlu dipantau</Text>
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
                <Icon size={14} color={item.color} />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
              <Text style={[styles.barValue, { color: item.color }]}>
                {value} <Text style={styles.barPercent}>({percentage}%)</Text>
              </Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barLabel: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  barValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  barPercent: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
