// components/ui/ScheduleCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';

interface ScheduleCardProps {
  activeWorkspace: 'balita' | 'lansia';
  tanggal: number | null;
  jam: string | null;
  themeColor: string;
  themeTonal: string;
  posyanduName: string;
}

/**
 * Hitung countdown dari hari ini ke tanggal posyandu terdekat
 */
function getNextScheduleDate(tanggal: number): { date: Date } {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), tanggal);

  if (thisMonth > now) {
    return { date: thisMonth };
  }

  // Sudah lewat bulan ini, ambil bulan depan
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, tanggal);
  return { date: nextMonth };
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function ScheduleCard({
  activeWorkspace,
  tanggal,
  jam,
  posyanduName,
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

  const { date } = getNextScheduleDate(tanggal);
  const monthLabel = MONTHS[date.getMonth()];
  const formattedDate = `${date.getDate()} ${monthLabel} ${date.getFullYear()}`;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.leftCol}>
          <View style={styles.iconBox}>
            <Calendar size={18} color="#2563EB" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.posyanduNameText}>{posyanduName}</Text>
            <Text style={styles.dateText}>
              {formattedDate} • {jam || '08.00'} WIB
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Matches bento layout
    padding: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF', // Light blue background
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  posyanduNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
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

