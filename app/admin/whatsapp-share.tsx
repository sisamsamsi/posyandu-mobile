// app/admin/whatsapp-share.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MessageCircle,
  Bell,
  Baby,
  Send,
  Copy,
  Search,
  Phone,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Balita, Penimbangan, Posyandu } from '../../lib/types';
import { WhatsAppService } from '../../services/whatsapp-service';
import { useServiceStore } from '../../stores/service-store';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { isBalitaLulus } from '../../lib/utils';

type TabType = 'hasil' | 'pengingat';

export default function WhatsAppShareScreen() {
  const router = useRouter();
  const { activePosyanduId } = useServiceStore();
  const [activeTab, setActiveTab] = useState<TabType>('hasil');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [balitasDenganPenimbangan, setBalitasDenganPenimbangan] = useState<
    { balita: Balita; penimbangan: Penimbangan; rekomendasi?: string | null }[]
  >([]);
  const [balitasBelumTimbang, setBalitasBelumTimbang] = useState<Balita[]>([]);
  const [posyandu, setPosyandu] = useState<Posyandu | null>(null);

  // Preview modal state
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [previewBalita, setPreviewBalita] = useState<Balita | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = startOfMonth(now).toISOString().split('T')[0];
      const end = endOfMonth(now).toISOString().split('T')[0];

      // Fetch posyandu info
      if (activePosyanduId) {
        const { data: posData } = await supabase
          .from('posyandus')
          .select('*')
          .eq('id', activePosyanduId)
          .single();
        setPosyandu(posData as Posyandu);
      }

      if (activeTab === 'hasil') {
        // Fetch penimbangan bulan ini, hanya untuk balita di posyandu aktif
        const { data: penimbanganData } = await supabase
          .from('penimbangans')
          .select('*, balita:balitas!inner(*)')
          .eq('balita.posyandu_id', activePosyanduId)
          .gte('tanggal', start)
          .lte('tanggal', end)
          .order('tanggal', { ascending: false });

        // Fetch penyuluhans for this month
        const balitaIds = (penimbanganData || []).map((p: any) => p.balita_id);
        const safeIds = balitaIds.length > 0 ? balitaIds : ['00000000-0000-0000-0000-000000000000'];
        const { data: penyuluhansData } = await supabase
          .from('penyuluhans')
          .select('balita_id, rekomendasi')
          .in('balita_id', safeIds)
          .gte('tanggal', start)
          .lte('tanggal', end);

        const penyuluhanMap = new Map((penyuluhansData || []).map(p => [p.balita_id, p.rekomendasi]));

        const merged = (penimbanganData || [])
          .filter((p: any) => p.balita)
          .map((p: any) => ({
            balita: p.balita as Balita,
            penimbangan: {
              id: p.id,
              balita_id: p.balita_id,
              tanggal: p.tanggal,
              berat_badan: p.berat_badan,
              tinggi_badan: p.tinggi_badan,
              lingkar_kepala: p.lingkar_kepala,
              lingkar_lengan: p.lingkar_lengan,
              bmi: p.bmi,
              zscore_imt_u: p.zscore_imt_u,
              status_gizi_imt_u: p.status_gizi_imt_u,
              zscore_tb_u: p.zscore_tb_u,
              status_tb_u: p.status_tb_u,
              zscore_bb_u: p.zscore_bb_u,
              status_bb_u: p.status_bb_u,
              zscore_bb_tb: p.zscore_bb_tb,
              status_bb_tb: p.status_bb_tb,
              catatan: p.catatan,
              created_at: p.created_at,
            } as Penimbangan,
            rekomendasi: penyuluhanMap.get(p.balita_id) || null
          }));

        setBalitasDenganPenimbangan(merged);
      } else {
        // Fetch balita milik posyandu aktif saja
        const { data: allBalita } = await supabase
          .from('balitas')
          .select('*')
          .eq('posyandu_id', activePosyanduId)
          .order('nama', { ascending: true });

        // Fetch balita IDs yang sudah ditimbang bulan ini (filter posyandu via join)
        const { data: penimbanganIds } = await supabase
          .from('penimbangans')
          .select('balita_id, balita:balitas!inner(posyandu_id)')
          .eq('balita.posyandu_id', activePosyanduId)
          .gte('tanggal', start)
          .lte('tanggal', end);

        const timbangSet = new Set((penimbanganIds || []).map((p: any) => p.balita_id));
        const belum = (allBalita || [])
          .filter((b: any) => !timbangSet.has(b.id))
          .filter((b: any) => !isBalitaLulus(b.tanggal_lahir));
        
        setBalitasBelumTimbang(belum as Balita[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendHasil = (balita: Balita, penimbangan: Penimbangan, rekomendasi?: string | null) => {
    const message = rekomendasi
      ? WhatsAppService.generateHasilUnified(balita, penimbangan, rekomendasi, posyandu)
      : WhatsAppService.generateHasilPenimbangan(balita, penimbangan, posyandu);

    if (!balita.no_hp_ortu) {
      // No phone number — show preview and let user input/copy
      setPreviewMessage(message);
      setPreviewBalita(balita);
      return;
    }

    WhatsAppService.openWhatsApp(balita.no_hp_ortu, message);
  };

  const handleSendPengingat = (balita: Balita) => {
    const message = WhatsAppService.generatePengingat(balita, posyandu);

    if (!balita.no_hp_ortu) {
      setPreviewMessage(message);
      setPreviewBalita(balita);
      return;
    }

    WhatsAppService.openWhatsApp(balita.no_hp_ortu, message);
  };

  const handleCopyMessage = async () => {
    if (previewMessage) {
      await ExpoClipboard.setStringAsync(previewMessage);
      Alert.alert('Berhasil', 'Pesan berhasil disalin ke clipboard.');
    }
  };

  // Filter by search
  const filteredHasil = balitasDenganPenimbangan.filter((item) =>
    item.balita.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.balita.nama_ortu.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBelum = balitasBelumTimbang.filter((b) =>
    b.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.nama_ortu.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.v2BackBtn}>
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>SIMPUL SEHAT Share</Text>
          <Text style={styles.headerSub}>Komunikasi Digital Sanctuary</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.v2TabBar}>
        <TouchableOpacity
          style={[styles.v2Tab, activeTab === 'hasil' && styles.v2TabActive]}
          onPress={() => setActiveTab('hasil')}
        >
          <MessageCircle size={16} color={activeTab === 'hasil' ? '#09A477' : '#64748B'} />
          <Text style={[styles.v2TabText, activeTab === 'hasil' && styles.v2TabTextActive]}>
            Hasil Periksa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.v2Tab, activeTab === 'pengingat' && styles.v2TabActiveReminder]}
          onPress={() => setActiveTab('pengingat')}
        >
          <Bell size={16} color={activeTab === 'pengingat' ? '#D97706' : '#64748B'} />
          <Text style={[styles.v2TabText, activeTab === 'pengingat' && styles.v2TabTextActiveReminder]}>
            Reminder ({balitasBelumTimbang.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.v2SearchContainer, searchFocused && { borderColor: '#09A477' }]}>
        <Search size={18} color={searchFocused ? '#09A477' : '#94A3B8'} />
        <TextInput
          style={styles.v2SearchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama balita atau orang tua..."
          placeholderTextColor="#CBD5E1"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loaderText}>Memuat data...</Text>
          </View>
        ) : activeTab === 'hasil' ? (
          <>
            {filteredHasil.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={48} color="#E2E8F0" />}
                text="Belum ada penimbangan bulan ini."
              />
            ) : (
              filteredHasil.map((item) => (
                <BalitaHasilCard
                  key={item.penimbangan.id}
                  balita={item.balita}
                  penimbangan={item.penimbangan}
                  onSend={() => handleSendHasil(item.balita, item.penimbangan, item.rekomendasi)}
                />
              ))
            )}
          </>
        ) : (
          <>
            {filteredBelum.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={48} color="#22C55E" />}
                text="Semua balita sudah ditimbang bulan ini! 🎉"
              />
            ) : (
              <>
                <View style={styles.reminderBanner}>
                  <AlertTriangle size={18} color="#92400E" />
                  <Text style={styles.reminderBannerText}>
                    {filteredBelum.length} balita belum ditimbang. Kirim pengingat agar orang tua menyetorkan BB & TB.
                  </Text>
                </View>
                {filteredBelum.map((balita) => (
                  <BalitaPengingatCard
                    key={balita.id}
                    balita={balita}
                    onSend={() => handleSendPengingat(balita)}
                  />
                ))}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Preview Modal (simple inline) */}
      {previewMessage && (
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>
              📱 Preview Pesan {previewBalita?.no_hp_ortu ? '' : '(Nomor HP belum diisi)'}
            </Text>
            <ScrollView style={styles.previewScroll}>
              <Text style={styles.previewText}>{previewMessage}</Text>
            </ScrollView>

            {!previewBalita?.no_hp_ortu && (
              <View style={styles.noPhoneWarning}>
                <Phone size={14} color="#92400E" />
                <Text style={styles.noPhoneText}>
                  Nomor HP orang tua belum diisi untuk {previewBalita?.nama}. 
                  Anda bisa menyalin pesan dan mengirim manual.
                </Text>
              </View>
            )}

            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyMessage}>
                <Copy size={16} color="#0D9488" />
                <Text style={styles.copyBtnText}>Salin Pesan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closePreviewBtn}
                onPress={() => {
                  setPreviewMessage(null);
                  setPreviewBalita(null);
                }}
              >
                <Text style={styles.closePreviewText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================

function BalitaHasilCard({
  balita,
  penimbangan,
  onSend,
}: {
  balita: Balita;
  penimbangan: Penimbangan;
  onSend: () => void;
}) {
  const router = useRouter();
  const tanggal = format(new Date(penimbangan.tanggal), 'd MMM yyyy', { locale: idLocale });
  const isBoy = balita.jenis_kelamin === 'Laki-laki';
  const avatarBg = isBoy ? '#E0F2FE' : '#FCE7F3';
  const avatarText = isBoy ? '#0284C7' : '#DB2777';
  const initials = balita.nama ? balita.nama.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'B';

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => router.push(`/balita/${balita.id}`)}
    >
      <Card style={styles.v2BalitaCard}>
        <View style={styles.v2CardTop}>
          <View style={[styles.avatarSquircle, { backgroundColor: avatarBg }]}>
            <Text style={[styles.avatarText, { color: avatarText }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.v2BalitaName}>{balita.nama}</Text>
            <Text style={styles.v2BalitaSub}>
              Ortu: {balita.nama_ortu} • {tanggal}
            </Text>
          </View>
          {balita.no_hp_ortu ? (
            <Badge label="Active" variant="success" />
          ) : (
            <Badge label="Missing HP" variant="warning" />
          )}
        </View>
        <View style={styles.v2StatsRow}>
          <View style={styles.v2StatItem}>
            <Text style={styles.v2StatVal}>{penimbangan.berat_badan.toFixed(2)} kg</Text>
            <Text style={styles.v2StatLab}>BERAT</Text>
          </View>
          <View style={styles.v2StatDiv} />
          <View style={styles.v2StatItem}>
            <Text style={styles.v2StatVal}>{penimbangan.tinggi_badan.toFixed(1)} cm</Text>
            <Text style={styles.v2StatLab}>TINGGI</Text>
          </View>
          <View style={styles.v2StatDiv} />
          <View style={styles.v2StatItem}>
            <Text style={styles.v2StatVal}>{penimbangan.status_bb_u || 'N/A'}</Text>
            <Text style={styles.v2StatLab}>HASIL</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.v2SendBtn} onPress={onSend}>
          <MessageCircle size={18} color="#0D9488" />
          <Text style={styles.v2SendBtnText}>Share Ke WhatsApp</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

function BalitaPengingatCard({
  balita,
  onSend,
}: {
  balita: Balita;
  onSend: () => void;
}) {
  const router = useRouter();
  const isBoy = balita.jenis_kelamin === 'Laki-laki';
  const avatarBg = isBoy ? '#E0F2FE' : '#FCE7F3';
  const avatarText = isBoy ? '#0284C7' : '#DB2777';
  const initials = balita.nama ? balita.nama.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'B';

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => router.push(`/balita/${balita.id}`)}
    >
      <Card style={styles.v2BalitaCard}>
        <View style={styles.v2CardTop}>
          <View style={[styles.avatarSquircle, { backgroundColor: avatarBg }]}>
            <Text style={[styles.avatarText, { color: avatarText }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.v2BalitaName}>{balita.nama}</Text>
            <Text style={styles.v2BalitaSub}>
              Ortu: {balita.nama_ortu} • RT {balita.rt}
            </Text>
          </View>
          {balita.no_hp_ortu ? (
            <Badge label="Ready" variant="success" />
          ) : (
            <Badge label="No HP" variant="warning" />
          )}
        </View>
        <TouchableOpacity style={styles.v2SendBtnReminder} onPress={onSend}>
          <Bell size={18} color="#D97706" />
          <Text style={styles.v2SendBtnTextReminder}>Kirim Pengingat WA</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0D9488', fontWeight: '800' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    fontSize: 14,
    color: '#1E293B',
  },

  content: { paddingHorizontal: 20 },
  loader: { padding: 80, alignItems: 'center' },
  loaderText: { color: '#64748B', marginTop: 12, fontSize: 13 },

  // Balita Card
  balitaCard: { padding: 16, marginBottom: 12 },
  balitaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balitaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balitaName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  balitaSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  balitaStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  statChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  statChipLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  statChipValue: { fontSize: 13, color: '#0F172A', fontWeight: '700' },

  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  sendBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Reminder Banner
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reminderBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    color: '#94A3B8',
    fontSize: 14,
  },

  // Preview
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  previewCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  previewScroll: {
    maxHeight: 300,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  previewText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  noPhoneWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  noPhoneText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  copyBtnText: { color: '#0D9488', fontWeight: '700', fontSize: 14 },
  closePreviewBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
  },
  closePreviewText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  // V2 STYLES
  v2BackBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  v2TabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  v2Tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  v2TabActive: {
    backgroundColor: '#E6F4EA',
    borderColor: '#CCFBF1',
  },
  v2TabTextActive: {
    color: '#09A477',
    fontWeight: '900',
  },
  v2TabActiveReminder: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  v2TabTextActiveReminder: {
    color: '#D97706',
    fontWeight: '900',
  },
  v2TabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  v2SearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  v2SearchInput: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  v2BalitaCard: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  v2CardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  v2BalitaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  v2BalitaName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  v2BalitaSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  v2StatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  v2StatItem: {
    flex: 1,
    alignItems: 'center',
  },
  v2StatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  v2StatLab: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 2,
  },
  v2StatDiv: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  v2SendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  v2SendBtnText: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 14,
  },
  v2SendBtnReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  v2SendBtnTextReminder: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 14,
  },
  avatarSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
