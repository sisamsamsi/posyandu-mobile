// components/ui/ScheduleCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Calendar } from 'lucide-react-native';

interface ScheduleCardProps {
  activeWorkspace: 'balita' | 'lansia';
  tanggal: number | null;
  jam: string | null;
  themeColor: string;
  themeTonal: string;
}

/**
 * Hitung countdown dari hari ini ke tanggal posyandu terdekat
 */
function getNextScheduleDate(tanggal: number): { date: Date; daysLeft: number } {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), tanggal);

  if (thisMonth > now) {
    const daysLeft = Math.ceil((thisMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { date: thisMonth, daysLeft };
  }

  // Sudah lewat bulan ini, ambil bulan depan
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, tanggal);
  const daysLeft = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { date: nextMonth, daysLeft };
}

function getCountdownLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'Hari ini!';
  if (daysLeft === 1) return 'Besok';
  return `${daysLeft} hari lagi`;
}

function getCountdownColor(daysLeft: number, defaultColor: string): string {
  if (daysLeft <= 1) return '#EF4444'; // Red for urgent
  if (daysLeft <= 3) return '#F59E0B'; // Yellow/Orange
  return defaultColor; // Theme primary color for relax schedules
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function ScheduleCard({
  activeWorkspace,
  tanggal,
  jam,
  themeColor,
  themeTonal,
}: ScheduleCardProps) {
  if (!tanggal) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Calendar size={18} color="#94A3B8" />
          <Text style={styles.emptyText}>
            Jadwal Posyandu {activeWorkspace === 'balita' ? 'Balita' : 'Lansia'} belum diatur.
          </Text>
        </View>
      </View>
    );
  }

  const { date, daysLeft } = getNextScheduleDate(tanggal);
  const monthLabel = MONTHS[date.getMonth()];
  const labelText = activeWorkspace === 'balita' ? 'Balita' : 'Lansia';
  const countdownCol = getCountdownColor(daysLeft, themeColor);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Left: Icon & Details */}
        <View style={styles.leftCol}>
          <View style={[styles.iconBox, { backgroundColor: themeTonal }]}>
            <Calendar size={18} color={themeColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.subLabel}>JADWAL POSYANDU {labelText.toUpperCase()}</Text>
            <Text style={styles.dateText}>
              Tgl {tanggal} {monthLabel} • {jam || '08:00'} WIB
            </Text>
          </View>
        </View>

        {/* Right: Countdown Badge */}
        <View style={[styles.countdownBadge, { backgroundColor: `${countdownCol}12` }]}>
          <Clock size={12} color={countdownCol} />
          <Text style={[styles.countdownText, { color: countdownCol }]}>
            {getCountdownLabel(daysLeft)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Compact M3
    padding: 14,
    elevation: 2,
    shadowColor: '#00A896', // Medical Teal
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  subLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 4,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
