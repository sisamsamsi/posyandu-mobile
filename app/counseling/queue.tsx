// app/counseling/queue.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Baby,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Scale,
  Ruler,
  Brain,
  Plus,
  AlertCircle,
  HelpCircle,
  Bell,
  MessageCircle,
} from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { supabase } from '../../lib/supabase';
import { Balita, Penimbangan, WHOReferenceRow } from '../../lib/types';
import { COLORS } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { ZScoreEngine } from '../../services/zscore-engine';
import { whoService } from '../../services/who-service';
import { WhatsAppService } from '../../services/whatsapp-service';
import { calculateAgeMonths, isBalitaLulus } from '../../lib/utils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { GrowthChart } from '../../components/charts/GrowthChart';

type ActiveTab = 'today' | 'absent' | 'all';

interface QueueItem {
  balita: Balita;
  penimbangan: Penimbangan | null; // today's measurement if exists
  counselingDone: boolean;
  penyuluhanId?: string;
}

export default function CounselingQueueScreen() {
  const router = useRouter();
  const { activePosyanduId } = useServiceStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [loading, setLoading] = useState(true);
  const [doneCounselings, setDoneCounselings] = useState<Map<string, string>>(new Map());
  
  // Lists
  const [todayQueue, setTodayQueue] = useState<QueueItem[]>([]);
  const [absentQueue, setAbsentQueue] = useState<Balita[]>([]);
  const [allBalitas, setAllBalitas] = useState<Balita[]>([]);
  const [searchResults, setSearchResults] = useState<QueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Growth Trend & KMS State
  const [growthTrends, setGrowthTrends] = useState<Map<string, 'N' | 'T' | '2T' | '-'>>(new Map());
  const [kmsModalVisible, setKmsModalVisible] = useState(false);
  const [kmsBalita, setKmsBalita] = useState<Balita | null>(null);
  const [loadingKms, setLoadingKms] = useState(false);
  const [whoBB, setWhoBB] = useState<WHOReferenceRow[]>([]);
  const [whoTB, setWhoTB] = useState<WHOReferenceRow[]>([]);
  const [whoBBTB, setWhoBBTB] = useState<WHOReferenceRow[]>([]);
  const [chartIndicator, setChartIndicator] = useState<'BB' | 'TB' | 'BB_TB'>('BB');

  const handleOpenKms = async (balita: Balita) => {
    setKmsBalita(balita);
    setKmsModalVisible(true);
    setLoadingKms(true);
    setChartIndicator('BB');
    try {
      const { data: penList } = await supabase
        .from('penimbangans')
        .select('*')
        .eq('balita_id', balita.id)
        .order('tanggal', { ascending: true });

      setKmsBalita({ ...balita, penimbangans: penList || [] });

      const [bb, tb, bbtb] = await Promise.all([
        whoService.getStandards('bb_u', balita.jenis_kelamin),
        whoService.getStandards('tb_u', balita.jenis_kelamin),
        whoService.getStandards('bb_tb', balita.jenis_kelamin)
      ]);
      setWhoBB(bb);
      setWhoTB(tb);
      setWhoBBTB(bbtb);
    } catch (e) {
      console.error('KMS error:', e);
      Alert.alert('Error', 'Gagal memuat data grafik KMS.');
    } finally {
      setLoadingKms(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };




  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    if (!activePosyanduId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Ambil semua balita di Posyandu aktif
      const { data: balitasData, error: balitasErr } = await supabase
        .from('balitas')
        .select('*')
        .eq('posyandu_id', activePosyanduId)
        .order('nama', { ascending: true });

      if (balitasErr) throw balitasErr;
      const balitasList: Balita[] = balitasData || [];
      setAllBalitas(balitasList);

      if (balitasList.length === 0) {
        setTodayQueue([]);
        setLoading(false);
        return;
      }

      const balitaIds = balitasList.map(b => b.id);

      // Ambil seluruh riwayat penimbangan untuk menghitung tren T/2T
      const { data: historyData, error: historyErr } = await supabase
        .from('penimbangans')
        .select('balita_id, berat_badan, tanggal')
        .in('balita_id', balitaIds)
        .order('tanggal', { ascending: false });

      if (historyErr) throw historyErr;

      // Group history by balita_id
      const historyMap = new Map<string, { berat_badan: number; tanggal: string }[]>();
      (historyData || []).forEach(h => {
        const list = historyMap.get(h.balita_id) || [];
        list.push({ berat_badan: h.berat_badan, tanggal: h.tanggal });
        historyMap.set(h.balita_id, list);
      });

      const getGrowthTrend = (balitaId: string): 'N' | 'T' | '2T' | '-' => {
        const history = historyMap.get(balitaId) || [];
        if (history.length < 2) return '-';
        const w0 = history[0];
        const w1 = history[1];
        
        if (history.length >= 3) {
          const w2 = history[2];
          if (w0.berat_badan <= w1.berat_badan && w1.berat_badan <= w2.berat_badan) {
            return '2T';
          }
        }
        
        if (w0.berat_badan <= w1.berat_badan) {
          return 'T';
        }
        
        return 'N';
      };

      // Set growth trends map for lookup in UI
      const computedTrends = new Map<string, 'N' | 'T' | '2T' | '-'>();
      balitasList.forEach(b => {
        computedTrends.set(b.id, getGrowthTrend(b.id));
      });
      setGrowthTrends(computedTrends);

      // Hitung rentang tanggal bulan kalender saat ini
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const startOfMonthStr = format(firstDay, 'yyyy-MM-dd');
      const endOfMonthStr = format(lastDay, 'yyyy-MM-dd');

      // 2. Ambil penimbangan bulan ini
      const { data: penimbangansData, error: penimbanganErr } = await supabase
        .from('penimbangans')
        .select('*')
        .in('balita_id', balitaIds)
        .gte('tanggal', startOfMonthStr)
        .lte('tanggal', endOfMonthStr);

      if (penimbanganErr) throw penimbanganErr;
      const thisMonthPenimbangans: Penimbangan[] = penimbangansData || [];

      // 3. Ambil penyuluhan bulan ini untuk mendeteksi status done
      const { data: counselingsData, error: counselingsErr } = await supabase
        .from('penyuluhans')
        .select('id, balita_id')
        .in('balita_id', balitaIds)
        .gte('tanggal', startOfMonthStr)
        .lte('tanggal', endOfMonthStr);

      const doneMap = new Map<string, string>();
      if (counselingsData) {
        counselingsData.forEach(c => {
          doneMap.set(c.balita_id, c.id);
        });
      }
      setDoneCounselings(doneMap);

      // 4. Petakan Antrean Bulan Ini (Hanya balita yang sudah ditimbang bulan ini dan berstatus T atau 2T)
      const latestPenimbangansMap = new Map<string, Penimbangan>();
      thisMonthPenimbangans.forEach(p => {
        const existing = latestPenimbangansMap.get(p.balita_id);
        if (!existing || new Date(p.tanggal) > new Date(existing.tanggal)) {
          latestPenimbangansMap.set(p.balita_id, p);
        }
      });
      const uniquePenimbangans = Array.from(latestPenimbangansMap.values());

      const mappedTodayQueue: QueueItem[] = uniquePenimbangans
        .map(p => {
          const balita = balitasList.find(b => b.id === p.balita_id)!;
          return {
            balita,
            penimbangan: p,
            counselingDone: doneMap.has(p.balita_id),
            penyuluhanId: doneMap.get(p.balita_id),
          };
        })
        .filter(item => {
          if (!item.balita) return false;
          const trend = computedTrends.get(item.balita.id) || '-';
          const statusTbU = item.penimbangan?.status_tb_u || '';
          const isStunted = statusTbU.includes('Pendek');
          return trend === 'T' || trend === '2T' || isStunted;
        });

      setTodayQueue(mappedTodayQueue);

      // 5. Petakan Balita Belum Hadir / Absen (Belum ditimbang bulan ini)
      const absentBalitas = balitasList.filter(b => !latestPenimbangansMap.has(b.id) && !isBalitaLulus(b.tanggal_lahir));
      setAbsentQueue(absentBalitas);
    } catch (e: any) {
      console.error('Failed to load queue:', e);
      Alert.alert('Error', 'Gagal memuat data antrean.');
    } finally {
      setLoading(false);
    }
  }, [activePosyanduId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle live search
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    const filtered = allBalitas
      .filter(b => b.nama.toLowerCase().includes(searchQuery.toLowerCase()) || b.nik.includes(searchQuery))
      .map(b => {
        // Cek apakah hari ini dia ada timbangan (dari queue today)
        const inQueue = todayQueue.find(q => q.balita.id === b.id);
        return {
          balita: b,
          penimbangan: inQueue ? inQueue.penimbangan : null,
          counselingDone: doneCounselings.has(b.id),
          penyuluhanId: doneCounselings.get(b.id),
        };
      });

    setSearchResults(filtered);
  }, [searchQuery, allBalitas, todayQueue, doneCounselings]);

  const handleStartCounseling = (item: QueueItem) => {
    if (item.counselingDone && item.penyuluhanId) {
      router.push(`/counseling/summary?id=${item.penyuluhanId}`);
      return;
    }

    if (item.penimbangan) {
      // Jika sudah ditimbang hari ini, langsung ke sesi penyuluhan
      router.push({
        pathname: '/counseling/session',
        params: {
          balitaId: item.balita.id,
          penimbanganId: item.penimbangan.id,
        },
      });
    } else {
      // Jika belum ditimbang, langsung arahkan ke Desk Timbang dengan pre-selected ID!
      router.push(`/service-desk/balita?id=${item.balita.id}`);
    }
  };



  const handleSendWhatsAppReminder = async (balita: Balita) => {
    try {
      const { data: posyanduData } = await supabase
        .from('posyandus')
        .select('*')
        .eq('id', activePosyanduId)
        .maybeSingle();

      const message = WhatsAppService.generatePengingat(balita, posyanduData);
      await WhatsAppService.openWhatsApp(balita.no_hp_ortu || '', message);
    } catch (e: any) {
      Alert.alert('Error', 'Gagal mengirim pengingat WhatsApp.');
    }
  };



  const renderTrendBadge = (trend: 'N' | 'T' | '2T' | '-') => {
    switch (trend) {
      case '2T':
        return (
          <View style={[styles.trendBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Text style={[styles.trendBadgeText, { color: '#DC2626' }]}>2T</Text>
          </View>
        );
      case 'T':
        return (
          <View style={[styles.trendBadge, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
            <Text style={[styles.trendBadgeText, { color: '#D97706' }]}>T</Text>
          </View>
        );
      case 'N':
        return (
          <View style={[styles.trendBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <Text style={[styles.trendBadgeText, { color: '#15803D' }]}>N</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.trendBadge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
            <Text style={[styles.trendBadgeText, { color: '#64748B' }]}>-</Text>
          </View>
        );
    }
  };

  const renderQueueItem = ({ item }: { item: QueueItem }) => {
    const ageMonths = calculateAgeMonths(item.balita.tanggal_lahir, todayStr);
    const isWeighed = !!item.penimbangan;
    const initials = getInitials(item.balita.nama);
    const isLaki = item.balita.jenis_kelamin.toLowerCase().startsWith('l');
    const avatarBg = isLaki ? '#F0FDFA' : '#FDF2F8';
    const avatarColor = isLaki ? '#09A477' : '#DB2777';

    const trend = growthTrends.get(item.balita.id) || '-';
    const statusTbU = item.penimbangan?.status_tb_u || '';
    const isStunted = statusTbU.includes('Pendek');
    const canCounsel = trend === 'T' || trend === '2T' || isStunted;

    let buttonText = 'Mulai Penyuluhan AI';
    let buttonDisabled = false;

    if (item.counselingDone) {
      buttonText = 'Buka Riwayat Penyuluhan';
      buttonDisabled = false;
    } else if (!isWeighed) {
      buttonText = 'Belum Ditimbang (Meja 3)';
      buttonDisabled = true;
    } else if (!canCounsel) {
      buttonText = 'Tumbuh Normal (Tidak Perlu AI)';
      buttonDisabled = true;
    }

    const buttonStyle = [
      styles.actionButton,
      item.counselingDone ? styles.actionButtonDone : null,
      buttonDisabled ? styles.actionButtonDisabled : null
    ];

    const buttonTextStyle = [
      styles.actionButtonText,
      item.counselingDone ? { color: '#09A477' } : null,
      buttonDisabled ? { color: '#94A3B8' } : null
    ];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarBg }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.balita.nama}</Text>
            <Text style={styles.subText}>
              {item.balita.jenis_kelamin} • {ageMonths} bulan
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }}>
              {renderTrendBadge(trend)}
              <TouchableOpacity 
                style={styles.kmsTextLink} 
                onPress={() => handleOpenKms(item.balita)}
              >
                <Text style={styles.kmsTextLinkText}>Lihat KMS</Text>
              </TouchableOpacity>
            </View>
          </View>
          {item.counselingDone && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>Selesai AI</Text>
            </View>
          )}
        </View>

        {isWeighed ? (
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>BB</Text>
              <Text style={styles.metricValue}>{item.penimbangan?.berat_badan} kg</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>TB</Text>
              <Text style={styles.metricValue}>{item.penimbangan?.tinggi_badan} cm</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Status TB/U</Text>
              <Text style={[styles.metricStatus, { color: getStatusColor(item.penimbangan?.status_tb_u || '') }]}>
                {item.penimbangan?.status_tb_u}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.unweighedRow}>
            <AlertCircle size={16} color="#F59E0B" />
            <Text style={styles.unweighedText}>Belum ditimbang hari ini (Kader Meja 3 terlambat/absen)</Text>
          </View>
        )}

        <TouchableOpacity
          style={buttonStyle}
          onPress={() => handleStartCounseling(item)}
          disabled={buttonDisabled}
        >
          <Text style={buttonTextStyle}>{buttonText}</Text>
          {!buttonDisabled && !item.counselingDone && (
            <ChevronRight size={18} color="#FFF" />
          )}
          {item.counselingDone && (
            <ChevronRight size={18} color="#09A477" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderAbsentItem = ({ item }: { item: Balita }) => {
    const ageMonths = calculateAgeMonths(item.tanggal_lahir, todayStr);
    const initials = getInitials(item.nama);
    const isLaki = item.jenis_kelamin.toLowerCase().startsWith('l');
    const avatarBg = isLaki ? '#F0FDFA' : '#FDF2F8';
    const avatarColor = isLaki ? '#09A477' : '#DB2777';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarBg }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.nama}</Text>
            <Text style={styles.subText}>
              {item.jenis_kelamin} • {ageMonths} bulan • RT {item.rt}
            </Text>
          </View>
          <View style={styles.badgeWarning}>
            <Text style={styles.badgeWarningText}>Belum Hadir</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.absentReminderBtnFull}
          onPress={() => handleSendWhatsAppReminder(item)}
        >
          <Bell size={14} color="#C2410C" />
          <Text style={styles.absentReminderText}>Kirim Pengingat WA</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Normal') || status.includes('Baik')) return '#22C55E';
    if (
      status.includes('Sangat Kurang') || 
      status.includes('Kurang') || 
      status.includes('Buruk') ||
      status.includes('Sangat Pendek') ||
      status.includes('Pendek')
    ) return '#EF4444';
    return '#F59E0B';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Penyuluhan Gizi AI</Text>
            <Text style={styles.headerSub}>Layanan Meja 4 & Meja 5 Terpadu</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/counseling/history')} style={styles.historyBtn}>
          <ClipboardList size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'today' && styles.tabChipActive]}
            onPress={() => {
              setActiveTab('today');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabChipText, activeTab === 'today' && styles.tabChipTextActive]}>
              Hadir & Antre ({todayQueue.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'absent' && styles.tabChipActive]}
            onPress={() => {
              setActiveTab('absent');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabChipText, activeTab === 'absent' && styles.tabChipTextActive]}>
              Belum Hadir ({absentQueue.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
              Pencarian Bebas
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Search Input for Free Mode */}
      {activeTab === 'all' && (
        <View style={[styles.searchBar, searchFocused && { borderColor: '#09A477' }]}>
          <Search size={20} color={searchFocused ? '#09A477' : '#94A3B8'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Masukkan Nama atau NIK Anak..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat antrean...</Text>
        </View>
      ) : activeTab === 'today' ? (
        <FlatList
          data={todayQueue}
          keyExtractor={(item) => item.balita.id}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <ClipboardCheck size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Antrean Kosong</Text>
              <Text style={styles.emptyDesc}>
                Belum ada balita yang ditimbang di Meja 3 bulan ini, atau Anda bisa menggunakan tab 'Pencarian Bebas' untuk melakukan penyuluhan cepat.
              </Text>
            </View>
          )}
        />
      ) : activeTab === 'absent' ? (
        <FlatList
          data={absentQueue}
          keyExtractor={(item) => item.id}
          renderItem={renderAbsentItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <ClipboardCheck size={64} color="#22C55E" />
              <Text style={styles.emptyTitle}>Semua Hadir! 🎉</Text>
              <Text style={styles.emptyDesc}>
                Luar biasa! Semua balita terdaftar sudah melakukan penimbangan bulan ini.
              </Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={searchQuery.trim().length > 0 ? searchResults : []}
          keyExtractor={(item) => item.balita.id}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Search size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim().length > 0 ? 'Tidak Ditemukan' : 'Cari Balita'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery.trim().length > 0
                  ? 'Nama anak tidak terdaftar di posyandu aktif ini.'
                  : 'Silakan ketik nama anak pada kotak pencarian di atas untuk memulai penyuluhan AI.'}
              </Text>
            </View>
          )}
        />
      )}


      {/* KMS Chart Modal */}
      <Modal
        visible={kmsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setKmsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Grafik KMS Balita</Text>
                {kmsBalita && (
                  <Text style={styles.modalSubTitle}>
                    {kmsBalita.nama} ({calculateAgeMonths(kmsBalita.tanggal_lahir, todayStr)} bln)
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setKmsModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Text style={styles.closeModalBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>

            {loadingKms ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.modalLoadingText}>Memuat data grafik...</Text>
              </View>
            ) : kmsBalita ? (
              <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                {/* Tab Selector */}
                <View style={styles.chartSelectorRow}>
                  <TouchableOpacity
                    style={[styles.chartSelectorTab, chartIndicator === 'BB' && styles.chartSelectorTabActive]}
                    onPress={() => setChartIndicator('BB')}
                  >
                    <Text style={[styles.chartSelectorTabText, chartIndicator === 'BB' && styles.chartSelectorTabTextActive]}>BB/U</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chartSelectorTab, chartIndicator === 'TB' && styles.chartSelectorTabActive]}
                    onPress={() => setChartIndicator('TB')}
                  >
                    <Text style={[styles.chartSelectorTabText, chartIndicator === 'TB' && styles.chartSelectorTabTextActive]}>TB/U</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chartSelectorTab, chartIndicator === 'BB_TB' && styles.chartSelectorTabActive]}
                    onPress={() => setChartIndicator('BB_TB')}
                  >
                    <Text style={[styles.chartSelectorTabText, chartIndicator === 'BB_TB' && styles.chartSelectorTabTextActive]}>BB/TB</Text>
                  </TouchableOpacity>
                </View>

                {/* Growth Chart */}
                <View style={styles.chartContainer}>
                  <GrowthChart
                    standards={chartIndicator === 'BB' ? whoBB : chartIndicator === 'TB' ? whoTB : whoBBTB}
                    data={kmsBalita.penimbangans || []}
                    indicator={chartIndicator === 'BB' ? 'BB' : chartIndicator === 'TB' ? 'TB' : 'BB_TB'}
                    title={
                      chartIndicator === 'BB'
                        ? 'Berat Badan menurut Umur (BB/U)'
                        : chartIndicator === 'TB'
                        ? 'Tinggi Badan menurut Umur (TB/U)'
                        : 'Berat Badan menurut Tinggi Badan (BB/TB)'
                    }
                    birthDate={kmsBalita.tanggal_lahir}
                    bbLahir={kmsBalita.bb_lahir}
                    tbLahir={kmsBalita.tb_lahir}
                  />
                </View>

                {/* Table of History */}
                <View style={styles.tableCard}>
                  <Text style={styles.tableCardTitle}>Riwayat Penimbangan & Pengukuran</Text>
                  {(kmsBalita.penimbangans || []).length > 0 ? (
                    [...(kmsBalita.penimbangans || [])]
                      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                      .map((p, index) => {
                        const isLatest = index === 0;
                        let zscoreVal = '-';
                        let statusVal = '-';
                        if (chartIndicator === 'BB') {
                          zscoreVal = p.zscore_bb_u !== null ? `Z-score ${p.zscore_bb_u.toFixed(2)}` : '-';
                          statusVal = p.status_bb_u || '-';
                        } else if (chartIndicator === 'TB') {
                          zscoreVal = p.zscore_tb_u !== null ? `Z-score ${p.zscore_tb_u.toFixed(2)}` : '-';
                          statusVal = p.status_tb_u || '-';
                        } else if (chartIndicator === 'BB_TB') {
                          zscoreVal = p.zscore_bb_tb !== null ? `Z-score ${p.zscore_bb_tb.toFixed(2)}` : '-';
                          statusVal = p.status_bb_tb || '-';
                        }

                        return (
                          <View
                            key={p.id}
                            style={[
                              styles.tableRow,
                              isLatest && {
                                backgroundColor: '#E6F4EA',
                                borderRadius: 12,
                                paddingHorizontal: 8,
                                marginHorizontal: -8,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tableCell,
                                { flex: 1.5, fontWeight: '700' },
                                isLatest && { color: '#09A477' },
                              ]}
                            >
                              {format(new Date(p.tanggal), 'd MMM yyyy', { locale: idLocale })}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1 }]}>
                              {p.berat_badan} kg
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1 }]}>
                              {p.tinggi_badan} cm
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1.8, fontSize: 11, fontWeight: '600' }]}>
                              {statusVal} ({zscoreVal})
                            </Text>
                          </View>
                        );
                      })
                  ) : (
                    <Text style={styles.noDataText}>Belum ada riwayat pengukuran.</Text>
                  )}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>Data balita tidak ditemukan.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  historyBtn: {
    padding: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  tabContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabChipActive: {
    backgroundColor: '#E6F4EA',
    borderColor: '#CCFBF1',
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#09A477',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  listContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
  },
  name: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  doneBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  metricStatus: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  unweighedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  unweighedText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
    lineHeight: 16,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  actionButtonDone: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#09A477',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  modalSubTitle: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '800',
    marginTop: 2,
  },
  modalForm: {
    paddingBottom: 40,
  },
  quickInputAlert: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  quickInputAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  saveBtnModal: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnModalText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtnModal: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnModalText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeWarningText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  absentActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  absentReminderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  absentReminderText: {
    color: '#C2410C',
    fontWeight: '800',
    fontSize: 12,
  },
  absentReminderBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
    marginTop: 14,
  },
  // Growth Trend & KMS styles
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  trendBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  kmsTextLink: {
    marginLeft: 8,
    backgroundColor: '#E0F2FE', // sky-100
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  kmsTextLinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1', // sky-700
  },
  actionButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  closeModalBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  modalLoadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  noDataText: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 30,
    fontStyle: 'italic',
    fontSize: 14,
  },
  chartSelectorRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 16,
    marginTop: 8,
  },
  chartSelectorTab: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: 12, 
    backgroundColor: '#F1F5F9' 
  },
  chartSelectorTabActive: { 
    backgroundColor: '#09A477' 
  },
  chartSelectorTabText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#475569' 
  },
  chartSelectorTabTextActive: { 
    color: '#FFFFFF' 
  },
  chartContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  tableCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 16, 
    marginTop: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    elevation: 2, 
    shadowColor: '#64748B', 
    shadowOpacity: 0.05, 
    shadowRadius: 8 
  },
  tableCardTitle: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#1E293B', 
    marginBottom: 12 
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC', 
    paddingVertical: 10, 
    alignItems: 'center' 
  },
  tableCell: { 
    fontSize: 13, 
    color: '#334155', 
    fontWeight: '500' 
  },
});
