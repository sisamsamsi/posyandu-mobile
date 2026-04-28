// app/(tabs)/index.tsx — Dashboard Redesign
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Baby, 
  Users, 
  Calendar, 
  FileDown, 
  FileUp, 
  Bell, 
  ChevronRight,
  BarChart3,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MessageCircle,
  TrendingUp,
  ClipboardCheck,
  Activity,
} from 'lucide-react-native';
import { DashboardService, DashboardStats } from '../../services/dashboard-service';
import { PieChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';
import { ScheduleCard } from '../../components/ui/ScheduleCard';
import { StatsGrid } from '../../components/ui/StatsGrid';
import { LansiaHealthBar } from '../../components/ui/LansiaHealthBar';
import { useServiceStore } from '../../stores/service-store';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const router = useRouter();
  const { setActiveWorkspace, activePosyanduId, activeWorkspace } = useServiceStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isNotifVisible, setIsNotifVisible] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await DashboardService.getStats(activePosyanduId);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activePosyanduId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: idLocale });
  const posyanduName = stats?.posyanduInfo?.nama_posyandu || 'Posyandu';
  const isBalita = activeWorkspace === 'balita';
  const wsColor = isBalita ? COLORS.balita : COLORS.lansia;
  const wsBg = isBalita ? COLORS.balitaLight : COLORS.lansiaLight;

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconRow}>
            <View style={styles.posyanduBadge}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={{ width: '100%', height: '100%' }} 
                resizeMode="cover" 
              />
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.posyanduNameHeader}>{posyanduName}</Text>
              <Text style={styles.dateText}>{today}</Text>
            </View>
          </View>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={{ width: 160, height: 50, marginLeft: -4, marginTop: 4, marginBottom: 4 }} 
            resizeMode="contain" 
          />
        </View>
        <View style={styles.headerRight}>
          <WorkspaceSwitcher size={22} color={COLORS.textPrimary} />
          <TouchableOpacity style={styles.notifBtn} onPress={() => setIsNotifVisible(true)}>
            <Bell size={20} color={COLORS.textPrimary} />
            {(stats?.risikoTinggiBalita || 0) > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* WORKSPACE MODE TOGGLE */}
        <TouchableOpacity 
          style={[styles.modeToggle, { backgroundColor: wsBg }]}
          onPress={() => setActiveWorkspace(isBalita ? 'lansia' : 'balita')}
          activeOpacity={0.7}
        >
          <View style={styles.modeToggleLeft}>
            <View style={[styles.modeIcon, { backgroundColor: `${wsColor}20` }]}>
              {isBalita ? <Baby size={18} color={wsColor} /> : <Users size={18} color={wsColor} />}
            </View>
            <View>
              <Text style={[styles.modeLabel, { color: wsColor }]}>
                {isBalita ? 'Mode Balita' : 'Mode Lansia'}
              </Text>
              <Text style={styles.modeDesc}>
                {isBalita ? 'Layanan pertumbuhan anak' : 'Layanan kesehatan lansia'}
              </Text>
            </View>
          </View>
          <View style={[styles.modeSwitch, { backgroundColor: `${wsColor}15` }]}>
            <Text style={[styles.modeSwitchText, { color: wsColor }]}>Ganti</Text>
          </View>
        </TouchableOpacity>

        {/* JADWAL TERDEKAT */}
        <ScheduleCard
          jadwalBalitaTanggal={stats?.posyanduInfo?.jadwal_balita_tanggal || null}
          jadwalBalitaJam={stats?.posyanduInfo?.jadwal_balita_jam || null}
          jadwalLansiaTanggal={stats?.posyanduInfo?.jadwal_lansia_tanggal || null}
          jadwalLansiaJam={stats?.posyanduInfo?.jadwal_lansia_jam || null}
        />

        {/* DAILY TIP */}
        <View style={[styles.tipContainer, { borderLeftColor: wsColor }]}>
          <View style={[styles.tipIconCircle, { backgroundColor: wsBg }]}>
            <TrendingUp size={16} color={wsColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: wsColor }]}>
              {isBalita ? 'Tips Gizi Hari Ini' : 'Tips Sehat Lansia'}
            </Text>
            <Text style={styles.tipText}>
              {isBalita 
                ? 'Pastikan balita mendapatkan imunisasi dasar lengkap sesuai jadwal di buku KIA.' 
                : 'Ingatkan lansia untuk rutin melakukan aktivitas fisik ringan 15-30 menit setiap hari.'}
            </Text>
          </View>
        </View>

        {/* STATISTIK OVERVIEW */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Statistik Bulan Ini</Text>
        </View>
        <StatsGrid
          items={isBalita ? [
            {
              label: 'Total Balita',
              value: stats?.totalBalita || 0,
              icon: <Baby size={20} color={COLORS.balita} />,
              color: COLORS.balita,
              bgColor: COLORS.balitaLight,
            },
            {
              label: 'Kunjungan',
              value: stats?.balitaVisitsThisMonth || 0,
              icon: <ClipboardCheck size={20} color={COLORS.success} />,
              color: COLORS.success,
              bgColor: COLORS.successLight,
            },
            {
              label: 'Stunting/Wasting',
              value: stats?.risikoTinggiBalita || 0,
              icon: <AlertTriangle size={20} color={COLORS.error} />,
              color: COLORS.error,
              bgColor: COLORS.errorLight,
            },
            {
              label: 'Belum Timbang',
              value: stats?.belumTimbangBalita || 0,
              icon: <Activity size={20} color={COLORS.warning} />,
              color: COLORS.warning,
              bgColor: COLORS.warningLight,
            },
          ] : [
            {
              label: 'Total Lansia',
              value: stats?.totalLansia || 0,
              icon: <Users size={20} color={COLORS.lansia} />,
              color: COLORS.lansia,
              bgColor: COLORS.lansiaLight,
            },
            {
              label: 'Pemeriksaan',
              value: stats?.lansiaVisitsThisMonth || 0,
              icon: <ClipboardCheck size={20} color={COLORS.success} />,
              color: COLORS.success,
              bgColor: COLORS.successLight,
            },
            {
              label: 'Berisiko',
              value: stats?.healthAlertStats?.find(s => s.label === 'Berisiko')?.count || 0,
              icon: <AlertCircle size={20} color={COLORS.error} />,
              color: COLORS.error,
              bgColor: COLORS.errorLight,
            },
            {
              label: 'Belum Periksa',
              value: stats?.belumPeriksaLansia || 0,
              icon: <Activity size={20} color={COLORS.warning} />,
              color: COLORS.warning,
              bgColor: COLORS.warningLight,
            },
          ]}
        />

        {/* BALITA SPECIFIC */}
        {isBalita && (
          <>
            {(stats?.belumTimbangBalita || 0) > 0 && (
              <TouchableOpacity 
                style={styles.alertCard}
                onPress={() => router.push('/monitoring/balita')}
                activeOpacity={0.7}
              >
                <View style={styles.alertIconCircle}>
                  <AlertTriangle size={18} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Penimbangan Tertunda</Text>
                  <View style={styles.alertStatsRow}>
                    <View style={styles.alertChip}>
                      <Baby size={12} color={COLORS.balita} />
                      <Text style={styles.alertChipText}>{stats?.belumTimbangBalita} balita belum ditimbang</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Status Gizi Balita</Text>
            </View>
            {stats?.nutritionStats && stats.nutritionStats.length > 0 ? (
              <Card style={styles.chartCard}>
                <PieChart
                  data={stats.nutritionStats.map(s => ({
                    name: s.label,
                    population: s.count,
                    color: s.color,
                    legendFontColor: COLORS.textSecondary,
                    legendFontSize: 11,
                  }))}
                  width={screenWidth - 64}
                  height={170}
                  chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  absolute
                />
              </Card>
            ) : (
              <Card style={styles.emptyChart}>
                <CheckCircle2 size={28} color={COLORS.surfaceBorder} />
                <Text style={styles.emptyText}>Belum ada data penimbangan bulan ini</Text>
              </Card>
            )}
          </>
        )}

        {/* LANSIA SPECIFIC */}
        {!isBalita && (
          <>
            {(stats?.belumPeriksaLansia || 0) > 0 && (
              <TouchableOpacity 
                style={[styles.alertCard, { borderLeftColor: COLORS.lansia }]}
                onPress={() => router.push('/monitoring/lansia')}
                activeOpacity={0.7}
              >
                <View style={[styles.alertIconCircle, { backgroundColor: COLORS.warningLight }]}>
                  <AlertTriangle size={18} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Pemeriksaan Tertunda</Text>
                  <View style={styles.alertStatsRow}>
                    <View style={styles.alertChip}>
                      <Users size={12} color={COLORS.lansia} />
                      <Text style={styles.alertChipText}>{stats?.belumPeriksaLansia} lansia belum diperiksa</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={16} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pemantauan Kesehatan Lansia</Text>
            </View>
            <LansiaHealthBar
              data={stats?.lansiaHealthBreakdown || { hipertensi: 0, gulaTinggi: 0, kolesterolTinggi: 0, asamUratTinggi: 0 }}
              totalLansia={stats?.totalLansia || 0}
            />
          </>
        )}

        {/* AKSI CEPAT */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        </View>
        <View style={styles.quickGrid}>
          <QuickAction
            icon={<FileUp size={20} color={COLORS.balita} />}
            label="Import Data"
            bgColor={COLORS.balitaLight}
            onPress={() => router.push('/admin/import-data')}
          />
          <QuickAction
            icon={<FileDown size={20} color={COLORS.lansia} />}
            label="Export Laporan"
            bgColor={COLORS.lansiaLight}
            onPress={() => router.push('/admin/reports')}
          />
          <QuickAction
            icon={<MessageCircle size={20} color="#16A34A" />}
            label="WA Share"
            bgColor={COLORS.successLight}
            onPress={() => router.push('/admin/whatsapp-share')}
          />
          <QuickAction
            icon={<BarChart3 size={20} color={COLORS.warning} />}
            label="Analisis"
            bgColor={COLORS.warningLight}
            onPress={() => router.push('/(tabs)/analisis')}
          />
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>AYOMI v2.0 — Rawat Tumbuhnya, Jaga Tuanya</Text>
        </View>
      </ScrollView>

      {/* NOTIFICATIONS MODAL */}
      <Modal
        visible={isNotifVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsNotifVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifikasi</Text>
              <TouchableOpacity 
                onPress={() => setIsNotifVisible(false)} 
                style={styles.modalClose}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {(stats?.risikoTinggiBalita || 0) > 0 && (
                <NotifItem 
                  icon={<AlertTriangle size={18} color={COLORS.error} />}
                  title="Perhatian Gizi"
                  desc={`${stats?.risikoTinggiBalita} balita memerlukan perhatian khusus terkait pertumbuhan.`}
                  time="Bulan ini"
                  color={COLORS.errorLight}
                />
              )}
              {(stats?.belumTimbangBalita || 0) > 0 && (
                <NotifItem 
                  icon={<AlertCircle size={18} color={COLORS.warning} />}
                  title="Penimbangan Tertunda"
                  desc={`${stats?.belumTimbangBalita} balita belum melakukan penimbangan bulan ini.`}
                  time="Bulan ini"
                  color={COLORS.warningLight}
                />
              )}
              {(stats?.lansiaHealthBreakdown?.hipertensi || 0) > 0 && (
                <NotifItem 
                  icon={<AlertCircle size={18} color={COLORS.error} />}
                  title="Hipertensi Lansia"
                  desc={`${stats?.lansiaHealthBreakdown?.hipertensi} lansia terdeteksi tekanan darah tinggi.`}
                  time="Bulan ini"
                  color={COLORS.errorLight}
                />
              )}
              {(stats?.risikoTinggiBalita || 0) === 0 && (stats?.belumTimbangBalita || 0) === 0 && (
                <NotifItem
                  icon={<CheckCircle2 size={18} color={COLORS.success} />}
                  title="Semua Baik"
                  desc="Tidak ada notifikasi khusus saat ini. Semua data normal."
                  time="Sekarang"
                  color={COLORS.successLight}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================

function QuickAction({
  icon,
  label,
  bgColor,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function NotifItem({ icon, title, desc, time, color }: { icon: any, title: string, desc: string, time: string, color: string }) {
  return (
    <View style={styles.notifItem}>
      <View style={[styles.notifIconContainer, { backgroundColor: color }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{title}</Text>
        <Text style={styles.notifDesc}>{desc}</Text>
        <Text style={styles.notifTime}>{time}</Text>
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textTertiary, fontSize: 13 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerContent: { flex: 1 },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  posyanduBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.balitaLight,
    overflow: 'hidden',
  },
  headerTextBlock: { flex: 1 },
  posyanduNameHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },

  scrollContent: { padding: 20, paddingBottom: 40 },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeDesc: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  modeSwitch: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
  },
  modeSwitchText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Section
  sectionHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },

  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.xl,
    padding: 16,
    marginTop: 16,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  alertStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  alertChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Chart
  chartCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDim,
    borderRadius: RADIUS.xl,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyText: { color: COLORS.textTertiary, fontSize: 13, fontWeight: '500' },

  // Quick Actions
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionBtn: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOW.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  footerDivider: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.surfaceBorder,
    borderRadius: 2,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Tip
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderLeftWidth: 3,
  },
  tipIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 19,
  },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15,23,42,0.4)', 
    justifyContent: 'flex-end',
  },
  modalContent: { 
    backgroundColor: COLORS.surface, 
    borderTopLeftRadius: RADIUS.xl, 
    borderTopRightRadius: RADIUS.xl, 
    maxHeight: '80%', 
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: COLORS.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { marginBottom: 16 },
  notifItem: { 
    flexDirection: 'row', 
    marginBottom: 16, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.surfaceDim,
    gap: 12,
  },
  notifIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: RADIUS.md, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  notifTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  notifDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
  notifTime: { fontSize: 11, color: COLORS.textTertiary, marginTop: 4, fontWeight: '500' },
});
