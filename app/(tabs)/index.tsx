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
  Syringe,
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
            <View style={[styles.posyanduBadge, { padding: 0, overflow: 'hidden' }]}>
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
            style={{ width: 180, height: 60, marginLeft: -8, marginTop: 4, marginBottom: 8 }} 
            resizeMode="contain" 
          />
        </View>
        <View style={styles.headerRight}>
          <WorkspaceSwitcher size={24} color="#1E293B" />
          <TouchableOpacity style={styles.notifBtn} onPress={() => setIsNotifVisible(true)}>
            <Bell size={22} color="#1E293B" />
            {(stats?.risikoTinggiBalita || 0) > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
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

        {/* ==================================== */}
        {/* TOGGLE LAYANAN (UNTUK ADMIN)         */}
        {/* ==================================== */}
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginVertical: 12, justifyContent: 'space-between' }}
          onPress={() => setActiveWorkspace(activeWorkspace === 'balita' ? 'lansia' : 'balita')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {activeWorkspace === 'balita' ? <Baby size={20} color="#0D9488" /> : <Users size={20} color="#6366F1" />}
            <Text style={{ fontWeight: '700', color: '#1E293B' }}>
              Mode: {activeWorkspace === 'balita' ? 'Layanan Balita' : 'Layanan Lansia'}
            </Text>
          </View>
          <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Ganti Mode</Text>
          </View>
        </TouchableOpacity>

        {/* ==================================== */}
        {/* DAILY TIP (WORKSPACE AWARE)          */}
        {/* ==================================== */}
        <View style={styles.tipContainer}>
          <View style={styles.tipIconCircle}>
            <TrendingUp size={18} color="#0D9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>
              {activeWorkspace === 'balita' ? 'Tips Gizi Hari Ini' : 'Tips Sehat Lansia'}
            </Text>
            <Text style={styles.tipText}>
              {activeWorkspace === 'balita' 
                ? 'Pastikan balita mendapatkan imunisasi dasar lengkap sesuai jadwal di buku KIA.' 
                : 'Ingatkan lansia untuk rutin melakukan aktivitas fisik ringan 15-30 menit setiap hari.'}
            </Text>
          </View>
        </View>

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
          <QuickAction
            icon={<Syringe size={22} color="#EF4444" />}
            label="Imunisasi"
            bgColor="#FEF2F2"
            onPress={() => router.push('/imunisasi')}
          />
        </View>

        {/* ============================= */}
        {/* APP INFO FOOTER               */}
        {/* ============================= */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>AYOMI v2.0 — Rawat Tumbuhnya, Jaga Tuanya</Text>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 13 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 8,
    shadowColor: '#006A63',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  headerContent: { flex: 1 },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  posyanduBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextBlock: { flex: 1 },
  posyanduNameHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: '#006A63',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: '#64B5F6',
    marginTop: 2,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '900',
    color: '#191C1D',
    letterSpacing: -1,
  },
  subGreeting: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 22,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  notifBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ba1a1a',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  scrollContent: { padding: 24, paddingBottom: 40 },

  // Section
  sectionHeader: { marginTop: 24, marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#191C1D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 32, // Serene Guardian radius
    padding: 24,
    marginTop: 16,
    gap: 16,
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  alertIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
  },
  alertStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  alertChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350F',
  },

  // Chart
  chartCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  emptyChart: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#F3F4F5',
    borderRadius: 32,
    gap: 12,
  },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },

  // Quick Actions (No lines, ambient shadows)
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionBtn: {
    width: '47%', // Making them bigger and fewer per row for premium feel
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#191C1D',
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 16,
  },
  footerDivider: {
    width: 48,
    height: 4,
    backgroundColor: '#E0F2F1', // Using teal subtle
    borderRadius: 2,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Tip Styles
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 32,
    marginTop: 20,
    gap: 16,
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  tipIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2F1', // teal light
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#006A63',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tipText: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(25,28,29,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, maxHeight: '85%', padding: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#191C1D', letterSpacing: -0.5 },
  modalBody: { marginBottom: 24 },
  notifItem: { flexDirection: 'row', marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F5' },
  notifIconContainer: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  notifTitle: { fontSize: 16, fontWeight: '800', color: '#191C1D' },
  notifDesc: { fontSize: 14, color: '#64748B', marginTop: 4, lineHeight: 20 },
  notifTime: { fontSize: 12, color: '#94A3B8', marginTop: 8, fontWeight: '600' },
});
