// components/ui/ScheduleCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Baby, Users, Clock, Calendar } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';

interface ScheduleCardProps {
  jadwalBalitaTanggal: number | null;
  jadwalBalitaJam: string | null;
  jadwalLansiaTanggal: number | null;
  jadwalLansiaJam: string | null;
}

function getNextScheduleDate(tanggal: number): { date: Date; daysLeft: number } {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), tanggal);

  if (thisMonth > now) {
    const daysLeft = Math.ceil((thisMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { date: thisMonth, daysLeft };
  }

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
  if (daysLeft <= 1) return COLORS.error;
  if (daysLeft <= 3) return COLORS.warning;
  if (daysLeft <= 7) return COLORS.balita;
  return COLORS.textTertiary;
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
          <Calendar size={20} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>
            Jadwal posyandu belum diatur. Atur di menu Pengaturan.
          </Text>
        </View>
      </View>
    );
  }

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
          <View style={styles.calendarIcon}>
            <Calendar size={14} color={COLORS.balita} />
          </View>
          <Text style={styles.headerTitle}>Jadwal Terdekat</Text>
        </View>
        {closestDays !== Infinity && (
          <View style={[styles.countdownBadge, { backgroundColor: `${getCountdownColor(closestDays)}15` }]}>
            <Clock size={11} color={getCountdownColor(closestDays)} />
            <Text style={[styles.countdownText, { color: getCountdownColor(closestDays) }]}>
              {getCountdownLabel(closestDays)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.scheduleGrid}>
        {jadwalBalitaTanggal && (
          <ScheduleItem
            icon={<Baby size={16} color={COLORS.balita} />}
            label="Balita"
            tanggal={jadwalBalitaTanggal}
            jam={jadwalBalitaJam || '08:00'}
            accentColor={COLORS.balita}
            bgColor={COLORS.balitaLight}
          />
        )}
        {jadwalLansiaTanggal && (
          <ScheduleItem
            icon={<Users size={16} color={COLORS.lansia} />}
            label="Lansia"
            tanggal={jadwalLansiaTanggal}
            jam={jadwalLansiaJam || '08:00'}
            accentColor={COLORS.lansia}
            bgColor={COLORS.lansiaLight}
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
    <View style={[styles.scheduleItem, { backgroundColor: bgColor }]}>
      <View style={styles.scheduleItemHeader}>
        {icon}
        <Text style={[styles.scheduleLabel, { color: accentColor }]}>{label}</Text>
      </View>
      <Text style={styles.scheduleDateBig}>{tanggal}</Text>
      <Text style={styles.scheduleDateMonth}>{monthLabel}</Text>
      <View style={styles.scheduleTimeRow}>
        <Clock size={10} color={COLORS.textTertiary} />
        <Text style={styles.scheduleTimeText}>{jam}</Text>
      </View>
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
    marginBottom: 12,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textTertiary,
    lineHeight: 18,
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
  calendarIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.balitaLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.lg,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleItem: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleDateBig: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  scheduleDateMonth: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  scheduleTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
