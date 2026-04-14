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
  Modal
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

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const router = useRouter();
  const { activePosyanduId, activeWorkspace } = useServiceStore();
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

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ============================= */}
      {/* HEADER                        */}
      {/* ============================= */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconRow}>
            <View style={styles.posyanduBadge}>
              <Activity size={16} color="#0D9488" />
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.posyanduNameHeader}>{posyanduName}</Text>
              <Text style={styles.dateText}>{today}</Text>
            </View>
          </View>
          <Text style={styles.greeting}>Halo, Kader! 👋</Text>
          <Text style={styles.subGreeting}>Pantau kesehatan warga hari ini</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => setIsNotifVisible(true)}>
          <Bell size={22} color="#1E293B" />
          {(stats?.risikoTinggiBalita || 0) > 0 && <View style={styles.notifDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ============================= */}
        {/* JADWAL TERDEKAT               */}
        {/* ============================= */}
        <ScheduleCard
          jadwalBalitaTanggal={stats?.posyanduInfo?.jadwal_balita_tanggal || null}
          jadwalBalitaJam={stats?.posyanduInfo?.jadwal_balita_jam || null}
          jadwalLansiaTanggal={stats?.posyanduInfo?.jadwal_lansia_tanggal || null}
          jadwalLansiaJam={stats?.posyanduInfo?.jadwal_lansia_jam || null}
        />

        {/* ============================= */}
        {/* STATISTIK OVERVIEW (4 GRID)   */}
        {/* ============================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Statistik Bulan Ini</Text>
        </View>
        <StatsGrid
          items={activeWorkspace === 'balita' ? [
            {
              label: 'Total Balita',
              value: stats?.totalBalita || 0,
              icon: <Baby size={22} color="#0D9488" />,
              color: '#0D9488',
              bgColor: '#F0FDFA',
            },
            {
              label: 'Kunjungan',
              value: stats?.balitaVisitsThisMonth || 0,
              icon: <ClipboardCheck size={22} color="#059669" />,
              color: '#059669',
              bgColor: '#ECFDF5',
            },
            {
              label: 'Stunting/Wasting',
              value: stats?.risikoTinggiBalita || 0,
              icon: <AlertTriangle size={22} color="#EF4444" />,
              color: '#EF4444',
              bgColor: '#FEF2F2',
            },
            {
              label: 'Belum Timbang',
              value: stats?.belumTimbangBalita || 0,
              icon: <Activity size={22} color="#F59E0B" />,
              color: '#F59E0B',
              bgColor: '#FFFBEB',
            },
          ] : [
            {
              label: 'Total Lansia',
              value: stats?.totalLansia || 0,
              icon: <Users size={22} color="#6366F1" />,
              color: '#6366F1',
              bgColor: '#EEF2FF',
            },
            {
              label: 'Pemeriksaan',
              value: stats?.lansiaVisitsThisMonth || 0,
              icon: <ClipboardCheck size={22} color="#059669" />,
              color: '#059669',
              bgColor: '#ECFDF5',
            },
            {
              label: 'Berisiko',
              value: stats?.healthAlertStats?.find(s => s.label === 'Berisiko')?.count || 0,
              icon: <AlertCircle size={22} color="#EF4444" />,
              color: '#EF4444',
              bgColor: '#FEF2F2',
            },
            {
              label: 'Belum Periksa',
              value: stats?.belumPeriksaLansia || 0,
              icon: <Activity size={22} color="#F59E0B" />,
              color: '#F59E0B',
              bgColor: '#FFFBEB',
            },
          ]}
        />

        {/* ==================================== */}
        {/* BALITA SPECIFIC SECTIONS             */}
        {/* ==================================== */}
        {activeWorkspace === 'balita' && (
          <>
            {/* ALERT: BELUM TIMBANG          */}
            {(stats?.belumTimbangBalita || 0) > 0 && (
              <TouchableOpacity 
                style={styles.alertCard}
                onPress={() => router.push('/monitoring/balita')}
                activeOpacity={0.7}
              >
                <View style={styles.alertIconCircle}>
                  <AlertTriangle size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Penimbangan Tertunda</Text>
                  <View style={styles.alertStatsRow}>
                    <View style={styles.alertChip}>
                      <Baby size={14} color="#0D9488" />
                      <Text style={styles.alertChipText}>{stats?.belumTimbangBalita} balita belum ditimbang</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
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
                    legendFontColor: '#64748B',
                    legendFontSize: 11,
                  }))}
                  width={screenWidth - 56}
                  height={180}
                  chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  absolute
                />
              </Card>
            ) : (
              <Card style={styles.emptyChart}>
                <CheckCircle2 size={32} color="#E2E8F0" />
                <Text style={styles.emptyText}>Belum ada data penimbangan bulan ini</Text>
              </Card>
            )}
          </>
        )}

        {/* ==================================== */}
        {/* LANSIA SPECIFIC SECTIONS             */}
        {/* ==================================== */}
        {activeWorkspace === 'lansia' && (
          <>
            {/* ALERT: BELUM PERIKSA          */}
            {(stats?.belumPeriksaLansia || 0) > 0 && (
              <TouchableOpacity 
                style={styles.alertCard}
                onPress={() => router.push('/monitoring/lansia')}
                activeOpacity={0.7}
              >
                <View style={styles.alertIconCircle}>
                  <AlertTriangle size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Pemeriksaan Tertunda</Text>
                  <View style={styles.alertStatsRow}>
                    <View style={styles.alertChip}>
                      <Users size={14} color="#6366F1" />
                      <Text style={styles.alertChipText}>{stats?.belumPeriksaLansia} lansia belum diperiksa</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
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

        {/* ============================= */}
        {/* AKSI CEPAT (4 Grid)           */}
        {/* ============================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        </View>
        <View style={styles.quickGrid}>
          <QuickAction
            icon={<FileUp size={22} color="#0D9488" />}
            label="Import Data"
            bgColor="#F0FDFA"
            onPress={() => router.push('/admin/import-data')}
          />
          <QuickAction
            icon={<FileDown size={22} color="#6366F1" />}
            label="Export Laporan"
            bgColor="#EEF2FF"
            onPress={() => router.push('/admin/reports')}
          />
          <QuickAction
            icon={<MessageCircle size={22} color="#25D366" />}
            label="WA Share"
            bgColor="#F0FDF4"
            onPress={() => router.push('/admin/whatsapp-share')}
          />
          <QuickAction
            icon={<BarChart3 size={22} color="#F59E0B" />}
            label="Analisis"
            bgColor="#FFFBEB"
            onPress={() => router.push('/(tabs)/analisis')}
          />
        </View>

        {/* ============================= */}
        {/* APP INFO FOOTER               */}
        {/* ============================= */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>Posyandu Mobile v1.1 — Digitalisasi Layanan Kesehatan Desa</Text>
        </View>
      </ScrollView>

      {/* ============================= */}
      {/* NOTIFICATIONS MODAL           */}
      {/* ============================= */}
      <Modal
        visible={isNotifVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsNotifVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifikasi Terbaru</Text>
              <TouchableOpacity onPress={() => setIsNotifVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {(stats?.risikoTinggiBalita || 0) > 0 && (
                <NotifItem 
                  icon={<AlertTriangle size={20} color="#EF4444" />}
                  title="Perhatian Gizi"
                  desc={`${stats?.risikoTinggiBalita} balita memerlukan perhatian khusus terkait pertumbuhan.`}
                  time="Bulan ini"
                />
              )}
              {(stats?.belumTimbangBalita || 0) > 0 && (
                <NotifItem 
                  icon={<AlertCircle size={20} color="#F59E0B" />}
                  title="Penimbangan Tertunda"
                  desc={`${stats?.belumTimbangBalita} balita belum melakukan penimbangan bulan ini. Kirim pengingat melalui WhatsApp.`}
                  time="Bulan ini"
                />
              )}
              {(stats?.lansiaHealthBreakdown?.hipertensi || 0) > 0 && (
                <NotifItem 
                  icon={<AlertCircle size={20} color="#EF4444" />}
                  title="Hipertensi Lansia"
                  desc={`${stats?.lansiaHealthBreakdown?.hipertensi} lansia terdeteksi tekanan darah tinggi. Disarankan kunjungan rumah.`}
                  time="Bulan ini"
                />
              )}
              {(stats?.risikoTinggiBalita || 0) === 0 && (stats?.belumTimbangBalita || 0) === 0 && (
                <NotifItem
                  icon={<CheckCircle2 size={20} color="#22C55E" />}
                  title="Semua Baik"
                  desc="Tidak ada notifikasi khusus saat ini. Semua data normal."
                  time="Sekarang"
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

function NotifItem({ icon, title, desc, time }: { icon: any, title: string, desc: string, time: string }) {
  return (
    <View style={styles.notifItem}>
      <View style={styles.notifIconContainer}>{icon}</View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 13 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 4,
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerContent: { flex: 1 },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  posyanduBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  headerTextBlock: { flex: 1 },
  posyanduNameHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '500',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },
  subGreeting: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  notifBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  scrollContent: { padding: 16, paddingBottom: 32 },

  // Section
  sectionHeader: { marginTop: 20, marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  alertStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  alertChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
  },

  // Chart
  chartCard: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    gap: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyText: { color: '#94A3B8', fontSize: 13 },

  // Quick Actions
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionBtn: {
    width: '23%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 28,
    paddingBottom: 8,
  },
  footerDivider: {
    width: 40,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  modalBody: { marginBottom: 20 },
  notifItem: { flexDirection: 'row', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  notifIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  notifDesc: { fontSize: 13, color: '#64748B', marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
});
