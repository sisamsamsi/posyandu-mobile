// components/ui/ScheduleCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Baby, Users, Clock, Calendar } from 'lucide-react-native';

interface ScheduleCardProps {
  jadwalBalitaTanggal: number | null;
  jadwalBalitaJam: string | null;
  jadwalLansiaTanggal: number | null;
  jadwalLansiaJam: string | null;
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

function getCountdownColor(daysLeft: number): string {
  if (daysLeft <= 1) return '#EF4444';
  if (daysLeft <= 3) return '#F59E0B';
  if (daysLeft <= 7) return '#0D9488';
  return '#64748B';
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function ScheduleCard({
  jadwalBalitaTanggal,
  jadwalBalitaJam,
  jadwalLansiaTanggal,
  jadwalLansiaJam,
}: ScheduleCardProps) {
  if (!jadwalBalitaTanggal && !jadwalLansiaTanggal) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Calendar size={20} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            Jadwal posyandu belum diatur. Atur di menu Pengaturan.
          </Text>
        </View>
      </View>
    );
  }

  // Find closest schedule
  let closestDays = Infinity;

  if (jadwalBalitaTanggal) {
    const { daysLeft } = getNextScheduleDate(jadwalBalitaTanggal);
    closestDays = Math.min(closestDays, daysLeft);
  }
  if (jadwalLansiaTanggal) {
    const { daysLeft } = getNextScheduleDate(jadwalLansiaTanggal);
    closestDays = Math.min(closestDays, daysLeft);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Calendar size={16} color="#0D9488" />
          <Text style={styles.headerTitle}>Jadwal Terdekat</Text>
        </View>
        {closestDays !== Infinity && (
          <View style={[styles.countdownBadge, { backgroundColor: `${getCountdownColor(closestDays)}15` }]}>
            <Clock size={12} color={getCountdownColor(closestDays)} />
            <Text style={[styles.countdownText, { color: getCountdownColor(closestDays) }]}>
              {getCountdownLabel(closestDays)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.scheduleGrid}>
        {jadwalBalitaTanggal && (
          <ScheduleItem
            icon={<Baby size={18} color="#0D9488" />}
            label="Balita"
            tanggal={jadwalBalitaTanggal}
            jam={jadwalBalitaJam || '08:00'}
            accentColor="#0D9488"
            bgColor="#F0FDFA"
          />
        )}
        {jadwalLansiaTanggal && (
          <ScheduleItem
            icon={<Users size={18} color="#6366F1" />}
            label="Lansia"
            tanggal={jadwalLansiaTanggal}
            jam={jadwalLansiaJam || '08:00'}
            accentColor="#6366F1"
            bgColor="#EEF2FF"
          />
        )}
      </View>
    </View>
  );
}

function ScheduleItem({
  icon,
  label,
  tanggal,
  jam,
  accentColor,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  tanggal: number;
  jam: string;
  accentColor: string;
  bgColor: string;
}) {
  const { date, daysLeft } = getNextScheduleDate(tanggal);
  const monthLabel = MONTHS[date.getMonth()];

  return (
    <View style={[styles.scheduleItem, { backgroundColor: bgColor, borderColor: `${accentColor}30` }]}>
      <View style={styles.scheduleItemHeader}>
        {icon}
        <Text style={[styles.scheduleLabel, { color: accentColor }]}>{label}</Text>
      </View>
      <Text style={styles.scheduleDateText}>Tgl {tanggal} {monthLabel}</Text>
      <Text style={styles.scheduleTimeText}>⏰ {jam}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    marginBottom: 16,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  emptyText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  scheduleItem: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  scheduleDateText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#191C1D',
  },
  scheduleTimeText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },
});
