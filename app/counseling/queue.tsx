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
  Bell,
  MessageCircle,
} from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { supabase } from '../../lib/supabase';
import { Balita, Penimbangan } from '../../lib/types';
import { COLORS } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { ZScoreEngine } from '../../services/zscore-engine';
import { whoService } from '../../services/who-service';
import { WhatsAppService } from '../../services/whatsapp-service';
import { calculateAgeMonths, isBalitaLulus } from '../../lib/utils';
import { format } from 'date-fns';

type ActiveTab = 'today' | 'absent' | 'all';

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
  const [absentQueue, setAbsentQueue] = useState<Balita[]>([]);
  const [allBalitas, setAllBalitas] = useState<Balita[]>([]);
  const [searchResults, setSearchResults] = useState<QueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');



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
      // Jika belum ditimbang, langsung arahkan ke Desk Timbang dengan pre-selected ID!
      router.push(`/service-desk/balita?id=${item.balita.id}`);
    }
  };

  const handleStartSelfReport = (balita: Balita) => {
    // Arahkan ke Desk Timbang untuk input mandiri dengan pre-selected ID!
    router.push(`/service-desk/balita?id=${balita.id}`);
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

  const renderAbsentItem = ({ item }: { item: Balita }) => {
    const ageMonths = calculateAgeMonths(item.tanggal_lahir, todayStr);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#FFFBEB' }]}>
            <Baby size={24} color="#F59E0B" />
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

        <View style={styles.absentActionsRow}>
          <TouchableOpacity
            style={styles.absentReminderBtn}
            onPress={() => handleSendWhatsAppReminder(item)}
          >
            <Bell size={14} color="#FFF" />
            <Text style={styles.absentBtnText}>Kirim Pengingat WA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.absentInputBtn}
            onPress={() => handleStartSelfReport(item)}
          >
            <Plus size={14} color="#FFF" />
            <Text style={styles.absentBtnText}>Input Hasil Mandiri</Text>
          </TouchableOpacity>
        </View>
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
            Hadir & Antre ({todayQueue.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'absent' && styles.activeTab]}
          onPress={() => {
            setActiveTab('absent');
            setSearchQuery('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'absent' && styles.activeTabText]}>
            Belum Hadir ({absentQueue.length})
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
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  absentInputBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  absentBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
