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
  Image,
  FlatList
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
  ChevronDown,
  ChevronUp,
  LayoutGrid,
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
  Brain,
  MapPin,
  Flower
} from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';
import * as Updates from 'expo-updates';
import { DashboardService, DashboardStats } from '../../services/dashboard-service';
import { Card } from '../../components/ui/Card';
import { ScheduleCard } from '../../components/ui/ScheduleCard';
import { StatsGrid } from '../../components/ui/StatsGrid';
import { useServiceStore } from '../../stores/service-store';
import { useAuthStore } from '../../stores/auth-store';
import { usePosyandu } from '../../hooks/usePosyandu';
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
  const { setActiveWorkspace, activePosyanduId, setActivePosyandu, activeWorkspace } = useServiceStore();
  const { user } = useAuthStore();
  const { getLinkedPosyandus } = usePosyandu();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isNotifVisible, setIsNotifVisible] = useState(false);

  // Posyandu selection states
  const [showPosyanduPicker, setShowPosyanduPicker] = useState(false);
  const [allPosyandus, setAllPosyandus] = useState<any[]>([]);
  const [activePosyanduName, setActivePosyanduName] = useState<string>('Pilih Posyandu');

  // OTA Updates States
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const loadPosyandus = async () => {
    const rels = await getLinkedPosyandus();
    const list = rels.map(r => r.posyandus).filter(Boolean);
    setAllPosyandus(list);
    
    if (activePosyanduId) {
      const active = list.find(p => p.id === activePosyanduId);
      if (active) setActivePosyanduName(active.nama_posyandu);
    } else if (list.length > 0) {
      setActivePosyandu(list[0].id);
      setActivePosyanduName(list[0].nama_posyandu);
    }
  };

  const handleSelectPosyandu = (p: any) => {
    setActivePosyandu(p.id);
    setActivePosyanduName(p.nama_posyandu);
    setShowPosyanduPicker(false);
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
    loadPosyandus();
    fetchStats();
    checkOtaUpdate();
  }, [activePosyanduId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosyandus();
    fetchStats();
    checkOtaUpdate();
  };

  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: idLocale });
  const kaderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kader';

  const nutritionBreakdown = React.useMemo(() => {
    if (!stats || !stats.nutritionStats) return [];
    
    let baik = 0;
    let normal = 0;
    let kurang = 0;
    let buruk = 0;

    stats.nutritionStats.forEach(item => {
      const label = item.label;
      if (label.includes('Baik') || label.includes('Lebih') || label.includes('RL')) {
        baik += item.count;
      } else if (label.includes('Normal') || (label.includes('N') && !label.includes('Kurang'))) {
        normal += item.count;
      } else if (label.includes('Kurang') || (label.includes('K') && !label.includes('Sangat'))) {
        kurang += item.count;
      } else if (label.includes('Buruk') || label.includes('Sangat') || label.includes('SK')) {
        buruk += item.count;
      } else {
        normal += item.count;
      }
    });

    const total = baik + normal + kurang + buruk || 1;

    return [
      { label: 'Baik', count: baik, percent: Math.round((baik / total) * 100), color: '#3B82F6' },
      { label: 'Normal', count: normal, percent: Math.round((normal / total) * 100), color: '#10B981' },
      { label: 'Kurang', count: kurang, percent: Math.round((kurang / total) * 100), color: '#F59E0B' },
      { label: 'Buruk', count: buruk, percent: Math.round((buruk / total) * 100), color: '#EF4444' },
    ];
  }, [stats]);

  const pieData = React.useMemo(() => {
    return nutritionBreakdown.map(item => ({
      name: item.label,
      population: item.count || 0.0001,
      color: item.color,
      legendFontColor: '#64748B',
      legendFontSize: 12
    }));
  }, [nutritionBreakdown]);

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00A896" />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  const fullQuickActions = isBalita ? [
    {
      label: 'Data Balita',
      icon: <Users size={18} color="#2563EB" />,
      bgColor: '#EFF6FF',
      onPress: () => router.push('/(tabs)/data'),
    },
    {
      label: 'Imunisasi',
      icon: <Syringe size={18} color="#2563EB" />,
      bgColor: '#EFF6FF',
      onPress: () => router.push('/imunisasi'),
    },
    {
      label: 'Laporan',
      icon: <FileDown size={18} color="#16A34A" />,
      bgColor: '#F0FDF4',
      onPress: () => router.push(`/admin/reports?type=balita`),
    },
    {
      label: 'Penimbangan',
      icon: <Activity size={18} color="#7C3AED" />,
      bgColor: '#F5F3FF',
      onPress: () => router.push('/service-desk/balita'),
    },
    {
      label: 'Pengguna',
      icon: <Users size={18} color="#2563EB" />,
      bgColor: '#EFF6FF',
      onPress: () => router.push('/settings'),
    },
    {
      label: 'Pengaturan',
      icon: <Settings size={18} color="#475569" />,
      bgColor: '#F8FAFC',
      onPress: () => router.push('/settings'),
    },
    {
      label: 'Konseling AI',
      icon: <Brain size={18} color="#EC4899" />,
      bgColor: '#FDF2F8',
      onPress: () => router.push('/counseling/queue'),
    },
    {
      label: 'Kirim WA',
      icon: <MessageCircle size={18} color="#22C55E" />,
      bgColor: '#F0FDF4',
      onPress: () => router.push('/admin/whatsapp-share'),
    },
    {
      label: 'Monitoring',
      icon: <ClipboardCheck size={18} color="#F97316" />,
      bgColor: '#FFF7ED',
      onPress: () => router.push('/monitoring/balita'),
    },
    {
      label: 'Import Data',
      icon: <FileUp size={18} color="#0EA5E9" />,
      bgColor: '#E0F2FE',
      onPress: () => router.push('/admin/import-data'),
    },
  ] : [
    {
      label: 'Data Lansia',
      icon: <Users size={18} color="#4F46E5" />,
      bgColor: '#EEF2FF',
      onPress: () => router.push('/(tabs)/data'),
    },
    {
      label: 'Tensi Fisik',
      icon: <Activity size={18} color="#DC2626" />,
      bgColor: '#FEE2E2',
      onPress: () => router.push('/service-desk/lansia'),
    },
    {
      label: 'Monitoring',
      icon: <ClipboardCheck size={18} color="#F97316" />,
      bgColor: '#FFF7ED',
      onPress: () => router.push('/monitoring/lansia'),
    },
    {
      label: 'Laporan',
      icon: <FileDown size={18} color="#16A34A" />,
      bgColor: '#F0FDF4',
      onPress: () => router.push(`/admin/reports?type=lansia`),
    },
    {
      label: 'Kirim WA',
      icon: <MessageCircle size={18} color="#22C55E" />,
      bgColor: '#F0FDF4',
      onPress: () => router.push('/admin/whatsapp-share'),
    },
    {
      label: 'Pengaturan',
      icon: <Settings size={18} color="#475569" />,
      bgColor: '#F8FAFC',
      onPress: () => router.push('/settings'),
    },
    {
      label: 'Import Data',
      icon: <FileUp size={18} color="#0EA5E9" />,
      bgColor: '#E0F2FE',
      onPress: () => router.push('/admin/import-data'),
    },
  ];

  const quickActions = !isExpanded && fullQuickActions.length > 8
    ? [
        ...fullQuickActions.slice(0, 7),
        {
          label: 'Lainnya',
          icon: <LayoutGrid size={18} color="#475569" />,
          bgColor: '#F1F5F9',
          onPress: () => setIsExpanded(true),
        }
      ]
    : isExpanded
      ? [
          ...fullQuickActions,
          {
            label: 'Sembunyikan',
            icon: <ChevronUp size={18} color="#64748B" />,
            bgColor: '#F1F5F9',
            onPress: () => setIsExpanded(false),
          }
        ]
      : fullQuickActions;

  return (
    <SafeAreaView style={styles.container}>
      {/* ============================= */}
      {/* HEADER                        */}
      {/* ============================= */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Row 1: Dropdown Posyandu & Profile Avatar */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.posyanduDropdown}
              onPress={() => setShowPosyanduPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.posyanduLogoCircle}>
                <Flower size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.dropdownText} numberOfLines={1}>
                {activePosyanduName}
              </Text>
              <ChevronDown size={14} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => router.push('/settings')}
                activeOpacity={0.7}
              >
                <Image 
                  source={require('../../assets/images/kader_avatar.png')} 
                  style={styles.profileImage} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Sapaan & Date */}
          <View style={styles.sapaanSection}>
            <Text style={styles.sapaanGreeting}>Hai, Kader {kaderName}</Text>
            <Text style={styles.sapaanSub}>{today}</Text>
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
        <View style={[styles.switcherContainer, { backgroundColor: '#F1F5F9' }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveWorkspace('balita')}
            style={[
              styles.switcherTab,
              isBalita && styles.switcherTabActive,
            ]}
          >
            <Baby size={16} color={isBalita ? '#09A477' : '#64748B'} />
            <Text style={[styles.switcherTabText, isBalita && { color: '#09A477', fontWeight: '800' }]}>
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
            <Users size={16} color={!isBalita ? '#4F46E5' : '#64748B'} />
            <Text style={[styles.switcherTabText, !isBalita && { color: '#4F46E5', fontWeight: '800' }]}>
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
                <Sparkles size={18} color="#0D9488" />
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

        {/* ============================= */}
        {/* AKSI CEPAT GRID 4x2           */}
        {/* ============================= */}
        <View style={styles.quickActionHeader}>
          <Text style={styles.quickActionTitle}>Aksi Cepat</Text>
        </View>
        
        <View style={styles.quickActionGrid}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionBtn}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionSquircle}>
                <View style={[styles.quickActionIconCircle, { backgroundColor: action.bgColor }]}>
                  {action.icon}
                </View>
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ==================================== */}
        {/* RINGKASAN HARI INI (SOLID GREEN CARD) */}
        {/* ==================================== */}
        <View style={[styles.ringkasanCard, { backgroundColor: isBalita ? '#09A477' : '#4F46E5' }]}>
          <Text style={styles.ringkasanTitleInside}>Ringkasan Hari Ini</Text>
          <View style={styles.ringkasanRow}>
            {/* Column 1: Total */}
            <View style={styles.ringkasanCol}>
              <Text style={styles.ringkasanValue}>
                {isBalita ? (stats?.totalBalita || 0) : (stats?.totalLansia || 0)}
              </Text>
              <Text style={styles.ringkasanLabel} numberOfLines={2}>
                {isBalita ? 'Total Balita' : 'Total Lansia'}
              </Text>
            </View>
            
            {/* Column 2: Aktif / Kunjungan */}
            <View style={styles.ringkasanCol}>
              <Text style={styles.ringkasanValue}>
                {isBalita ? (stats?.balitaVisitsThisMonth || 0) : (stats?.lansiaVisitsThisMonth || 0)}
              </Text>
              <Text style={styles.ringkasanLabel} numberOfLines={2}>
                {isBalita ? 'Balita Aktif' : 'Lansia Aktif'}
              </Text>
            </View>
            
            {/* Column 3: Imunisasi / Risiko */}
            <View style={styles.ringkasanCol}>
              <Text style={styles.ringkasanValue}>
                {isBalita 
                  ? (stats?.imunisasiCount || 0) 
                  : (stats?.healthAlertStats?.find(s => s.label === 'Berisiko')?.count || 0)}
              </Text>
              <Text style={styles.ringkasanLabel} numberOfLines={2}>
                {isBalita ? 'Imunisasi' : 'Berisiko'}
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================== */}
        {/* BALITA SPECIFIC SECTIONS             */}
        {/* ==================================== */}
        {isBalita && (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Distribusi Status Gizi</Text>
              <TouchableOpacity onPress={() => router.push('/penimbangan')}>
                <Text style={styles.cardLink}>Lihat Semua</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bentoCard}>
              <View style={styles.chartLegendContainer}>
                {/* Left side: Donut Chart wrapper */}
                <View style={styles.chartWrapper}>
                  <PieChart
                    data={pieData}
                    width={130}
                    height={130}
                    chartConfig={{
                      backgroundColor: 'transparent',
                      backgroundGradientFrom: 'transparent',
                      backgroundGradientTo: 'transparent',
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="32"
                    hasLegend={false}
                  />
                  <View style={styles.donutHole} />
                </View>

                {/* Right side: Custom Legend Table */}
                <View style={styles.legendWrapper}>
                  {nutritionBreakdown.map((item, idx) => (
                    <View key={idx} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.legendValue}>
                        {item.count} <Text style={styles.legendPercent}>({item.percent}%)</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

        {/* ==================================== */}
        {/* LANSIA SPECIFIC SECTIONS             */}
        {/* ==================================== */}
        {!isBalita && (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Pemantauan Kesehatan Lansia</Text>
              <TouchableOpacity onPress={() => router.push('/pemeriksaan')}>
                <Text style={styles.cardLink}>Lihat Semua</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bentoCard}>
              <GiziRow 
                label="Hipertensi" 
                count={stats?.lansiaHealthBreakdown?.hipertensi || 0} 
                percent="Tekanan Darah Tinggi" 
                color="#4F46E5" 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Gula Darah Tinggi" 
                count={stats?.lansiaHealthBreakdown?.gulaTinggi || 0} 
                percent="Kadar Gula > 200 mg/dL" 
                color="#4F46E5" 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Kolesterol Tinggi" 
                count={stats?.lansiaHealthBreakdown?.kolesterolTinggi || 0} 
                percent="Kolesterol > 200 mg/dL" 
                color="#4F46E5" 
              />
              <View style={styles.divider} />
              <GiziRow 
                label="Asam Urat Tinggi" 
                count={stats?.lansiaHealthBreakdown?.asamUratTinggi || 0} 
                percent="Asam Urat > 7.0 mg/dL" 
                color="#4F46E5" 
              />
            </View>
          </>
        )}

        {/* ============================= */}
        {/* JADWAL TERDEKAT (CONTEXTUAL)  */}
        {/* ============================= */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Kegiatan Terdekat</Text>
          <TouchableOpacity onPress={() => router.push(isBalita ? '/monitoring/balita' : '/monitoring/lansia')}>
            <Text style={styles.cardLink}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        <ScheduleCard
          activeWorkspace={activeWorkspace || 'balita'}
          tanggal={(isBalita ? stats?.posyanduInfo?.jadwal_balita_tanggal : stats?.posyanduInfo?.jadwal_lansia_tanggal) ?? null}
          jam={(isBalita ? stats?.posyanduInfo?.jadwal_balita_jam : stats?.posyanduInfo?.jadwal_lansia_jam) ?? null}
          themeColor={theme.primary}
          themeTonal={theme.tonal}
          posyanduName={activePosyanduName}
        />

        {/* ============================= */}
        {/* APP INFO FOOTER               */}
        {/* ============================= */}
        <View style={styles.footer}>
          <View style={[styles.footerDivider, { backgroundColor: '#E2E8F0' }]} />
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

      {/* ============================= */}
      {/* POSYANDU PICKER MODAL         */}
      {/* ============================= */}
      <Modal visible={showPosyanduPicker} animationType="slide" transparent>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Pilih Posyandu</Text>
                  <TouchableOpacity onPress={() => setShowPosyanduPicker(false)}>
                     <Text style={styles.closeBtn}>Batal</Text>
                  </TouchableOpacity>
               </View>
               <FlatList 
                  data={allPosyandus}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.pickerItem}
                      onPress={() => handleSelectPosyandu(item)}
                    >
                       <MapPin size={18} color="#94A3B8" />
                       <Text style={styles.pickerItemText}>{item.nama_posyandu}</Text>
                       {activePosyanduId === item.id && <View style={[styles.activeDot, { backgroundColor: isBalita ? '#09A477' : '#4F46E5' }]} />}
                    </TouchableOpacity>
                  )}
               />
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 13 },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
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
  posyanduDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 8,
    maxWidth: '75%',
  },
  posyanduLogoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#09A477',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  avatarContainer: {
    marginLeft: 4,
  },
  sapaanSection: {
    marginTop: 16,
  },
  sapaanGreeting: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  sapaanSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Section / Bento Card Title Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB', // Blue link "Lihat Semua"
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

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
    borderColor: 'rgba(13, 148, 136, 0.25)',
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
  
  // Ringkasan Hari Ini Card
  ringkasanCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  ringkasanTitleInside: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
  },
  ringkasanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringkasanCol: {
    flex: 1,
    alignItems: 'center',
  },
  ringkasanValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  ringkasanLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },

  // Quick Action Grid Styles
  quickActionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginVertical: 12,
  },
  quickActionBtn: {
    width: '25%', // 4 columns grid
    alignItems: 'center',
    marginVertical: 10,
  },
  quickActionSquircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
  },

  // Bento Card Layout
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
  },
  chartLegendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  chartWrapper: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutHole: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  legendWrapper: {
    flex: 1,
    paddingLeft: 16,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  legendPercent: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // Picker Modal Styles
  closeBtn: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F5',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
