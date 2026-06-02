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
  Sparkles,
  RefreshCw,
  Settings,
} from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { DashboardService, DashboardStats } from '../../services/dashboard-service';
import { Card } from '../../components/ui/Card';
import { ScheduleCard } from '../../components/ui/ScheduleCard';
import { StatsGrid } from '../../components/ui/StatsGrid';
import { useServiceStore } from '../../stores/service-store';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';
import { COLORS } from '../../lib/constants';

const screenWidth = Dimensions.get('window').width;

// ============================================
// HELPERS
// ============================================
function GiziRow({ label, count, percent, color }: { label: string; count: number; percent: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{percent}</Text>
        <Text style={{ fontSize: 11, color: '#64748B' }}>({count})</Text>
      </View>
    </View>
  );
}

function PressableRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }} 
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
          {icon}
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{label}</Text>
      </View>
      <ChevronRight size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { setActiveWorkspace, activePosyanduId, activeWorkspace } = useServiceStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isNotifVisible, setIsNotifVisible] = useState(false);

  // OTA Updates States
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  // Dynamic Theme Selection based on Active Workspace
  const isBalita = activeWorkspace === 'balita';
  const theme = {
    primary: isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary,
    background: isBalita ? COLORS.tealBg : COLORS.indigoBg,
    tonal: isBalita ? COLORS.tealTonal : COLORS.indigoTonal,
  };

  const checkOtaUpdate = async () => {
    // skip checking in expo go / development mode
    if (__DEV__ || !Updates.isEnabled) {
      console.log('[OTA Check] Updates disabled in development mode or not configured.');
      return;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true);
      }
    } catch (e) {
      console.error('[OTA Check] Gagal memeriksa update:', e);
    }
  };

  const handleDownloadAndReload = async () => {
    try {
      setIsDownloadingUpdate(true);
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      console.error('[OTA Fetch] Gagal mengunduh update:', e);
      setIsDownloadingUpdate(false);
      alert('Gagal mengunduh pembaruan. Silakan coba beberapa saat lagi.');
    }
  };

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
    checkOtaUpdate();
  }, [activePosyanduId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    checkOtaUpdate();
  };

  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: idLocale });
  const posyanduName = stats?.posyanduInfo?.nama_posyandu || 'Posyandu';

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00A896" />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ============================= */}
      {/* HEADER                        */}
      {/* ============================= */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Row 1: Logo & Status + Actions */}
          <View style={styles.headerRow}>
            <View style={styles.headerLogoContainer}>
              <View style={[styles.logoBadge, { backgroundColor: theme.tonal }]}>
                <Activity size={12} color={theme.primary} />
                <Text style={[styles.headerLogoText, { color: theme.primary }]}>AYOMI</Text>
              </View>
              <View style={styles.headerDivider} />
              <Text style={styles.kaderLabel}>KADER</Text>
            </View>
            <View style={styles.headerRight}>
              <WorkspaceSwitcher size={18} color="#1E293B" />
              <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/settings')}>
                <Settings size={18} color="#1E293B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.notifBtn} onPress={() => setIsNotifVisible(true)}>
                <Bell size={18} color="#1E293B" />
                {(stats?.risikoTinggiBalita || 0) > 0 && <View style={styles.notifDot} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Posyandu Name & Date */}
          <View style={styles.headerTextBlock}>
            <Text style={styles.posyanduNameHeader}>{posyanduName}</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ==================================== */}
        {/* M3 SEGMENTED CONTROL SWITCHER (TOP)  */}
        {/* ==================================== */}
        <View style={[styles.switcherContainer, { backgroundColor: theme.tonal }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveWorkspace('balita')}
            style={[
              styles.switcherTab,
              isBalita && styles.switcherTabActive,
            ]}
          >
            <Baby size={16} color={isBalita ? theme.primary : '#64748B'} />
            <Text style={[styles.switcherTabText, isBalita && { color: theme.primary, fontWeight: '800' }]}>
              Layanan Balita
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveWorkspace('lansia')}
            style={[
              styles.switcherTab,
              !isBalita && styles.switcherTabActive,
            ]}
          >
            <Users size={16} color={!isBalita ? theme.primary : '#64748B'} />
            <Text style={[styles.switcherTabText, !isBalita && { color: theme.primary, fontWeight: '800' }]}>
              Layanan Lansia
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================= */}
        {/* OTA UPDATE BANNER PENDING     */}
        {/* ============================= */}
        {updateAvailable && (
          <TouchableOpacity 
            style={styles.otaBannerContainer}
            onPress={() => setUpdateDismissed(false)}
            activeOpacity={0.9}
          >
            <View style={styles.otaBannerContent}>
              <View style={styles.otaBannerIconContainer}>
                <Sparkles size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.otaBannerTitle}>Pembaruan Sistem Tersedia!</Text>
                <Text style={styles.otaBannerDesc}>
                  Klik di sini untuk memasang perbaikan klinis penting & enkripsi RLS terbaru secara instan.
                </Text>
              </View>
              <View style={styles.otaBannerAction}>
                <RefreshCw size={14} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ==================================== */}
        {/* STATISTIK OVERVIEW (CLINICAL BENTO)  */}
        {/* ==================================== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Statistik Bulan Ini</Text>
        </View>
        <StatsGrid
          items={isBalita ? [
            {
              label: 'Total Balita',
              value: stats?.totalBalita || 0,
              icon: <Baby size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/balita'),
            },
            {
              label: 'Kunjungan',
              value: stats?.balitaVisitsThisMonth || 0,
              icon: <ClipboardCheck size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/monitoring/balita'),
            },
            {
              label: 'Stunting / Wasting',
              value: stats?.risikoTinggiBalita || 0,
              icon: <AlertTriangle size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/monitoring/balita'),
            },
            {
              label: 'Belum Timbang',
              value: stats?.belumTimbangBalita || 0,
              icon: <Activity size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/monitoring/balita'),
            },
          ] : [
            {
              label: 'Total Lansia',
              value: stats?.totalLansia || 0,
              icon: <Users size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/lansia'),
            },
            {
              label: 'Pemeriksaan',
              value: stats?.lansiaVisitsThisMonth || 0,
              icon: <ClipboardCheck size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/monitoring/lansia'),
            },
            {
              label: 'Berisiko',
              value: stats?.healthAlertStats?.find(s => s.label === 'Berisiko')?.count || 0,
              icon: <AlertCircle size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/monitoring/lansia'),
            },
            {
              label: 'Belum Periksa',
              value: stats?.belumPeriksaLansia || 0,
              icon: <Activity size={18} color={theme.primary} />,
              color: theme.primary,
              bgColor: theme.tonal,
              onPress: () => router.push('/monitoring/lansia'),
            },
          ]}
        />

        {/* ============================= */}
        {/* JADWAL TERDEKAT (CONTEXTUAL)  */}
        {/* ============================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Agenda Posyandu</Text>
        </View>
        <ScheduleCard
          activeWorkspace={activeWorkspace || 'balita'}
          tanggal={(isBalita ? stats?.posyanduInfo?.jadwal_balita_tanggal : stats?.posyanduInfo?.jadwal_lansia_tanggal) ?? null}
          jam={(isBalita ? stats?.posyanduInfo?.jadwal_balita_jam : stats?.posyanduInfo?.jadwal_lansia_jam) ?? null}
          themeColor={theme.primary}
          themeTonal={theme.tonal}
        />

        {/* ==================================== */}
        {/* BALITA SPECIFIC SECTIONS             */}
        {/* ==================================== */}
        {isBalita && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Status Gizi Balita</Text>
            </View>
            <Card style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <GiziRow 
                label="Normal" 
                count={stats?.nutritionStats?.find(s => s.label === 'Normal' || s.label === 'Gizi Baik')?.count || 0} 
                percent={stats?.nutritionStats?.find(s => s.label === 'Normal' || s.label === 'Gizi Baik')?.count 
                  ? `${Math.round((stats.nutritionStats.find(s => s.label === 'Normal' || s.label === 'Gizi Baik')!.count / (stats.totalBalita || 1)) * 100)}%` 
                  : '0%'} 
                color={theme.primary} 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Stunting / Wasting" 
                count={stats?.risikoTinggiBalita || 0} 
                percent={stats?.risikoTinggiBalita 
                  ? `${Math.round((stats.risikoTinggiBalita / (stats.totalBalita || 1)) * 100)}%` 
                  : '0%'} 
                color={COLORS.error} 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Overweight" 
                count={stats?.nutritionStats?.find(s => s.label === 'Overweight' || s.label === 'Gizi Lebih' || s.label === 'Obesitas')?.count || 0} 
                percent={stats?.nutritionStats?.find(s => s.label === 'Overweight' || s.label === 'Gizi Lebih' || s.label === 'Obesitas')?.count 
                  ? `${Math.round((stats.nutritionStats.find(s => s.label === 'Overweight' || s.label === 'Gizi Lebih' || s.label === 'Obesitas')!.count / (stats.totalBalita || 1)) * 100)}%` 
                  : '0%'} 
                color={COLORS.warning} 
              />
            </Card>
          </>
        )}

        {/* ==================================== */}
        {/* LANSIA SPECIFIC SECTIONS             */}
        {/* ==================================== */}
        {!isBalita && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pemantauan Kesehatan Lansia</Text>
            </View>
            <Card style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <GiziRow 
                label="Hipertensi" 
                count={stats?.lansiaHealthBreakdown?.hipertensi || 0} 
                percent="Tekanan Darah Tinggi" 
                color={theme.primary} 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Gula Darah Tinggi" 
                count={stats?.lansiaHealthBreakdown?.gulaTinggi || 0} 
                percent="Kadar Gula > 200 mg/dL" 
                color={theme.primary} 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Kolesterol Tinggi" 
                count={stats?.lansiaHealthBreakdown?.kolesterolTinggi || 0} 
                percent="Kolesterol > 200 mg/dL" 
                color={theme.primary} 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Asam Urat Tinggi" 
                count={stats?.lansiaHealthBreakdown?.asamUratTinggi || 0} 
                percent="Asam Urat > 7.0 mg/dL" 
                color={theme.primary} 
              />
            </Card>
          </>
        )}

        {/* ============================= */}
        {/* AKSI CEPAT (OPTION A LINEAR)  */}
        {/* ============================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        </View>
        <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
          <PressableRow 
            icon={<FileUp size={16} color={theme.primary} />} 
            label="Import Data Balita/Lansia" 
            onPress={() => router.push('/admin/import-data')} 
          />
          <View style={styles.divider} />
          <PressableRow 
            icon={<FileDown size={16} color={theme.primary} />} 
            label="Export Laporan Bulanan" 
            onPress={() => router.push(`/admin/reports?type=${activeWorkspace}`)} 
          />
          <View style={styles.divider} />
          <PressableRow 
            icon={<MessageCircle size={16} color={theme.primary} />} 
            label="Kirim Undangan WhatsApp" 
            onPress={() => router.push('/admin/whatsapp-share')} 
          />
          <View style={styles.divider} />
          <PressableRow 
            icon={<BarChart3 size={16} color={theme.primary} />} 
            label="Analisis & Grafik Gizi" 
            onPress={() => router.push('/(tabs)/analisis')} 
          />
          <View style={styles.divider} />
          <PressableRow 
            icon={<Syringe size={16} color={theme.primary} />} 
            label="Jadwal & Catatan Imunisasi" 
            onPress={() => router.push('/imunisasi')} 
          />
        </Card>

        {/* ============================= */}
        {/* APP INFO FOOTER               */}
        {/* ============================= */}
        <View style={styles.footer}>
          <View style={[styles.footerDivider, { backgroundColor: theme.tonal }]} />
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

      {/* ============================= */}
      {/* OTA UPDATE DIALOG             */}
      {/* ============================= */}
      <Modal
        visible={updateAvailable && !updateDismissed}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUpdateDismissed(true)}
      >
        <View style={styles.otaOverlay}>
          <View style={styles.otaGlassCard}>
            <View style={styles.otaSparkleContainer}>
              <Sparkles size={120} color="rgba(20, 184, 166, 0.05)" />
            </View>
            
            <View style={styles.otaGlassHeaderBadge}>
              <Sparkles size={32} color="#0D9488" />
            </View>
            
            <Text style={styles.otaTitle}>Pembaruan Sistem AYOMI</Text>
            <Text style={styles.otaSubtitle}>
              Versi terbaru telah siap! Pembaruan ini mencakup perbaikan klinis penting & enkripsi tenant baru.
            </Text>

            <View style={styles.otaFeaturesList}>
              <View style={styles.otaFeatureItem}>
                <View style={styles.otaFeatureDot} />
                <Text style={styles.otaFeatureText}>Optimalisasi kalkulasi Z-score asimetris WHO.</Text>
              </View>
              <View style={styles.otaFeatureItem}>
                <View style={styles.otaFeatureDot} />
                <Text style={styles.otaFeatureText}>Akurasi tekanan darah & status KBM/KMS.</Text>
              </View>
              <View style={styles.otaFeatureItem}>
                <View style={styles.otaFeatureDot} />
                <Text style={styles.otaFeatureText}>Perbaikan kebocoran data multi-tenant (RLS).</Text>
              </View>
              <View style={styles.otaFeatureItem}>
                <View style={styles.otaFeatureDot} />
                <Text style={styles.otaFeatureText}>Perbaikan PDF export & navigasi kalender.</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.otaBtnDownload, isDownloadingUpdate && { opacity: 0.8 }]} 
              onPress={handleDownloadAndReload}
              disabled={isDownloadingUpdate}
              activeOpacity={0.8}
            >
              {isDownloadingUpdate ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.otaBtnDownloadText}>Memasang Pembaruan...</Text>
                </>
              ) : (
                <>
                  <RefreshCw size={20} color="#FFFFFF" />
                  <Text style={styles.otaBtnDownloadText}>Unduh & Muat Ulang</Text>
                </>
              )}
            </TouchableOpacity>

            {!isDownloadingUpdate && (
              <TouchableOpacity 
                style={styles.otaBtnDismiss} 
                onPress={() => setUpdateDismissed(true)}
              >
                <Text style={styles.otaBtnDismissText}>Nanti Saja</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================



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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 13 },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00A896',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerContent: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  headerLogoText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },
  kaderLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  headerTextBlock: {
    marginTop: 6,
  },
  posyanduNameHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    fontWeight: '600',
  },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Section
  sectionHeader: { marginTop: 20, marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Switcher
  switcherContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 22,
    marginVertical: 12,
    alignItems: 'center',
    height: 44,
  },
  switcherTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
    borderRadius: 18,
  },
  switcherTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#00A896',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  switcherTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
    gap: 12,
    elevation: 2,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    gap: 8,
    marginTop: 4,
  },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  alertChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },

  // Tip Styles
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginTop: 12,
    gap: 12,
    elevation: 2,
    shadowColor: '#00A896',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
  },
  tipIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tipText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  footerDivider: {
    width: 36,
    height: 3,
    borderRadius: 2,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(25,28,29,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#191C1D', letterSpacing: -0.5 },
  modalBody: { marginBottom: 20 },
  notifItem: { flexDirection: 'row', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F5' },
  notifIconContainer: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifTitle: { fontSize: 15, fontWeight: '800', color: '#191C1D' },
  notifDesc: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: '600' },

  // OTA Modal Styles (Glassmorphism & Teal theme)
  otaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Elegant Slate-900 transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  otaGlassCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 36,
    padding: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 148, 136, 0.25)', // Teal semi-transparent border
    elevation: 20,
    shadowColor: '#0D9488',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  otaSparkleContainer: {
    position: 'absolute',
    top: -24,
    right: -24,
    opacity: 0.08,
  },
  otaGlassHeaderBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
  },
  otaTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },
  otaSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '500',
  },
  otaFeaturesList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  otaFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 6,
  },
  otaFeatureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
    marginTop: 6,
  },
  otaFeatureText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
  otaBtnDownload: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#0D9488',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  otaBtnDownloadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  otaBtnDismiss: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  otaBtnDismissText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },

  // OTA Banner Styles
  otaBannerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 148, 136, 0.2)',
    elevation: 4,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  otaBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  otaBannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  otaBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  otaBannerDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  otaBannerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
