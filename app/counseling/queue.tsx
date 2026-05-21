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
  Scale,
  Ruler,
  Brain,
  Plus,
  AlertCircle,
  HelpCircle,
} from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { supabase } from '../../lib/supabase';
import { Balita, Penimbangan } from '../../lib/types';
import { COLORS } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { ZScoreEngine } from '../../services/zscore-engine';
import { whoService } from '../../services/who-service';
import { format } from 'date-fns';

type ActiveTab = 'today' | 'all';

interface QueueItem {
  balita: Balita;
  penimbangan: Penimbangan | null; // today's measurement if exists
  counselingDone: boolean;
}

export default function CounselingQueueScreen() {
  const router = useRouter();
  const { activePosyanduId } = useServiceStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [loading, setLoading] = useState(true);
  
  // Lists
  const [todayQueue, setTodayQueue] = useState<QueueItem[]>([]);
  const [allBalitas, setAllBalitas] = useState<Balita[]>([]);
  const [searchResults, setSearchResults] = useState<QueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Input Modal States
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [selectedBalita, setSelectedBalita] = useState<Balita | null>(null);
  const [berat, setBerat] = useState('');
  const [tinggi, setTinggi] = useState('');
  const [lica, setLica] = useState('');
  const [lila, setLila] = useState('');
  const [savingQuickInput, setSavingQuickInput] = useState(false);

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

      // Hitung rentang tanggal bulan kalender saat ini
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const startOfMonthStr = format(firstDay, 'yyyy-MM-dd');
      const endOfMonthStr = format(lastDay, 'yyyy-MM-dd');

      // 2. Ambil penimbangan bulan ini
      const balitaIds = balitasList.map(b => b.id);
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
        .select('balita_id')
        .in('balita_id', balitaIds)
        .gte('tanggal', startOfMonthStr)
        .lte('tanggal', endOfMonthStr);

      const doneBalitaIds = new Set((counselingsData || []).map(c => c.balita_id));

      // 4. Petakan Antrean Bulan Ini (Hanya balita yang sudah ditimbang bulan ini)
      // Jika anak ditimbang beberapa kali di bulan yang sama, ambil penimbangan terbaru
      const latestPenimbangansMap = new Map<string, Penimbangan>();
      thisMonthPenimbangans.forEach(p => {
        const existing = latestPenimbangansMap.get(p.balita_id);
        if (!existing || new Date(p.tanggal) > new Date(existing.tanggal)) {
          latestPenimbangansMap.set(p.balita_id, p);
        }
      });
      const uniquePenimbangans = Array.from(latestPenimbangansMap.values());

      const mappedTodayQueue: QueueItem[] = uniquePenimbangans.map(p => {
        const balita = balitasList.find(b => b.id === p.balita_id)!;
        return {
          balita,
          penimbangan: p,
          counselingDone: doneBalitaIds.has(p.balita_id),
        };
      }).filter(item => item.balita !== undefined); // safe check

      setTodayQueue(mappedTodayQueue);
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
          counselingDone: inQueue ? inQueue.counselingDone : false,
        };
      });

    setSearchResults(filtered);
  }, [searchQuery, allBalitas, todayQueue]);

  const handleStartCounseling = (item: QueueItem) => {
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
      // Jika belum ditimbang, buka modal Quick Input Timbangan Cepat
      setSelectedBalita(item.balita);
      setBerat('');
      setTinggi('');
      setLica('');
      setLila('');
      setShowQuickInput(true);
    }
  };

  const handleSaveQuickInput = async () => {
    if (!selectedBalita) return;
    if (!berat || !tinggi) {
      Alert.alert('Error', 'Berat dan Tinggi badan harus diisi untuk analisis Z-Score.');
      return;
    }

    setSavingQuickInput(true);
    try {
      const ageMonths = calculateAgeMonths(selectedBalita.tanggal_lahir, todayStr);
      
      // Fetch WHO Standards
      const [bbStd, tbStd, bbtbStd] = await Promise.all([
        whoService.getStandards('bb_u', selectedBalita.jenis_kelamin),
        whoService.getStandards('tb_u', selectedBalita.jenis_kelamin),
        whoService.getStandards('bb_tb', selectedBalita.jenis_kelamin),
      ]);

      const gender = selectedBalita.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';
      const bbResult = ZScoreEngine.calculate(bbStd, gender, ageMonths, parseFloat(berat), 'BB/U');
      const tbResult = ZScoreEngine.calculate(tbStd, gender, ageMonths, parseFloat(tinggi), 'TB/U');
      const bbtbResult = ZScoreEngine.calculate(bbtbStd, gender, parseFloat(tinggi), parseFloat(berat), 'BB/TB');

      const payload = {
        balita_id: selectedBalita.id,
        tanggal: todayStr,
        berat_badan: parseFloat(berat),
        tinggi_badan: parseFloat(tinggi),
        lingkar_kepala: parseFloat(lica) || null,
        lingkar_lengan: parseFloat(lila) || null,
        zscore_bb_u: bbResult.zscore,
        status_bb_u: bbResult.status,
        zscore_tb_u: tbResult.zscore,
        status_tb_u: tbResult.status,
        zscore_bb_tb: bbtbResult.zscore,
        status_bb_tb: bbtbResult.status,
      };

      const { data, error } = await supabase.from('penimbangans').insert(payload).select().single();
      if (error) throw error;

      setShowQuickInput(false);
      Alert.alert('Sukses', 'Data timbangan cepat berhasil disimpan. Memulai penyuluhan AI...', [
        {
          text: 'Lanjut',
          onPress: () => {
            router.push({
              pathname: '/counseling/session',
              params: {
                balitaId: selectedBalita.id,
                penimbanganId: data.id,
              },
            });
          }
        }
      ]);
      loadData();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Gagal menyimpan data penimbangan cepat.');
    } finally {
      setSavingQuickInput(false);
    }
  };

  const calculateAgeMonths = (birthDate: string, measureDate: string): number => {
    const birth = new Date(birthDate);
    const measure = new Date(measureDate);
    return (measure.getFullYear() - birth.getFullYear()) * 12 + (measure.getMonth() - birth.getMonth());
  };

  const renderQueueItem = ({ item }: { item: QueueItem }) => {
    const ageMonths = calculateAgeMonths(item.balita.tanggal_lahir, todayStr);
    const isWeighed = !!item.penimbangan;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Baby size={24} color={COLORS.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.balita.nama}</Text>
            <Text style={styles.subText}>
              {item.balita.jenis_kelamin} • {ageMonths} bulan
            </Text>
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
              <Text style={styles.metricLabel}>Status BB/U</Text>
              <Text style={[styles.metricStatus, { color: getStatusColor(item.penimbangan?.status_bb_u || '') }]}>
                {item.penimbangan?.status_bb_u}
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
          style={[
            styles.actionButton,
            !isWeighed && { backgroundColor: '#F59E0B' },
            item.counselingDone && { backgroundColor: '#E2E8F0' }
          ]}
          onPress={() => handleStartCounseling(item)}
        >
          <Text style={[styles.actionButtonText, item.counselingDone && { color: '#64748B' }]}>
            {item.counselingDone 
              ? 'Buka Riwayat Penyuluhan' 
              : isWeighed 
                ? 'Mulai Penyuluhan AI' 
                : 'Input Timbangan Cepat & Mulai'
            }
          </Text>
          <ChevronRight size={18} color={item.counselingDone ? '#64748B' : '#FFF'} />
        </TouchableOpacity>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Normal') || status.includes('Baik')) return '#22C55E';
    if (status.includes('Sangat Kurang') || status.includes('Kurang') || status.includes('Buruk')) return '#EF4444';
    return '#F59E0B';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Penyuluhan Gizi AI</Text>
          <Text style={styles.headerSub}>Layanan Meja 4 & Meja 5 Terpadu</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.activeTab]}
          onPress={() => {
            setActiveTab('today');
            setSearchQuery('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>
            Antrean Bulan Ini ({todayQueue.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            Pencarian Bebas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input for Free Mode */}
      {activeTab === 'all' && (
        <View style={styles.searchBar}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Masukkan Nama atau NIK Anak..."
            value={searchQuery}
            onChangeText={setSearchQuery}
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

      {/* Quick Input Modal */}
      <Modal visible={showQuickInput} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => !savingQuickInput && setShowQuickInput(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Input Timbangan Cepat</Text>
                <Text style={styles.modalSubTitle}>{selectedBalita?.nama}</Text>
              </View>
              <HelpCircle size={22} color={COLORS.primary} />
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <View style={styles.quickInputAlert}>
                <AlertCircle size={18} color="#92400E" />
                <Text style={styles.quickInputAlertText}>
                  Petugas Meja 3 belum mencatat data hari ini. Silakan input cepat metrik fisik anak untuk memicu kecerdasan gizi AI.
                </Text>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Berat Badan (kg)</Text>
                <View style={styles.inputGroup}>
                  <Scale size={18} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 10.20"
                    keyboardType="decimal-pad"
                    value={berat}
                    onChangeText={setBerat}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tinggi / Panjang Badan (cm)</Text>
                <View style={styles.inputGroup}>
                  <Ruler size={18} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 82.50"
                    keyboardType="decimal-pad"
                    value={tinggi}
                    onChangeText={setTinggi}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Lingkar Kepala (cm) - Opsional</Text>
                <View style={styles.inputGroup}>
                  <Brain size={18} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 44.0"
                    keyboardType="decimal-pad"
                    value={lica}
                    onChangeText={setLica}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Lingkar Lengan Atas (LiLA) (cm) - Opsional</Text>
                <View style={styles.inputGroup}>
                  <Plus size={18} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 14.5"
                    keyboardType="decimal-pad"
                    value={lila}
                    onChangeText={setLila}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtnModal, savingQuickInput && { opacity: 0.7 }]}
                onPress={handleSaveQuickInput}
                disabled={savingQuickInput}
              >
                {savingQuickInput ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnModalText}>Simpan & Analisis AI</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtnModal}
                onPress={() => setShowQuickInput(false)}
                disabled={savingQuickInput}
              >
                <Text style={styles.cancelBtnModalText}>Batal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
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
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
});
