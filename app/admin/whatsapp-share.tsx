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

type TabType = 'hasil' | 'pengingat';

export default function WhatsAppShareScreen() {
  const router = useRouter();
  const { activePosyanduId } = useServiceStore();
  const [activeTab, setActiveTab] = useState<TabType>('hasil');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [balitasDenganPenimbangan, setBalitasDenganPenimbangan] = useState<
    { balita: Balita; penimbangan: Penimbangan }[]
  >([]);
  const [balitasBelumTimbang, setBalitasBelumTimbang] = useState<Balita[]>([]);
  const [posyandu, setPosyandu] = useState<Posyandu | null>(null);

  // Preview modal state
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [previewBalita, setPreviewBalita] = useState<Balita | null>(null);

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
        // Fetch balitas with this month's penimbangan
        const { data: penimbanganData } = await supabase
          .from('penimbangans')
          .select('*, balita:balitas(*)')
          .gte('tanggal', start)
          .lte('tanggal', end)
          .order('tanggal', { ascending: false });

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
          }));

        setBalitasDenganPenimbangan(merged);
      } else {
        // Fetch all balita
        const { data: allBalita } = await supabase
          .from('balitas')
          .select('*')
          .order('nama', { ascending: true });

        // Fetch balita IDs that already have penimbangan this month
        const { data: penimbanganIds } = await supabase
          .from('penimbangans')
          .select('balita_id')
          .gte('tanggal', start)
          .lte('tanggal', end);

        const timbangSet = new Set((penimbanganIds || []).map((p: any) => p.balita_id));
        const belum = (allBalita || []).filter((b: any) => !timbangSet.has(b.id));
        setBalitasBelumTimbang(belum as Balita[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendHasil = (balita: Balita, penimbangan: Penimbangan) => {
    const message = WhatsAppService.generateHasilPenimbangan(balita, penimbangan, posyandu);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>WhatsApp Share</Text>
          <Text style={styles.headerSub}>Kirim pesan ke orang tua</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'hasil' && styles.tabActive]}
          onPress={() => setActiveTab('hasil')}
        >
          <MessageCircle size={16} color={activeTab === 'hasil' ? '#0D9488' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'hasil' && styles.tabTextActive]}>
            Hasil Penimbangan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pengingat' && styles.tabActive]}
          onPress={() => setActiveTab('pengingat')}
        >
          <Bell size={16} color={activeTab === 'pengingat' ? '#F59E0B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'pengingat' && styles.tabTextActive]}>
            Pengingat ({balitasBelumTimbang.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama balita atau orang tua..."
          placeholderTextColor="#CBD5E1"
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
                  onSend={() => handleSendHasil(item.balita, item.penimbangan)}
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
  const tanggal = format(new Date(penimbangan.tanggal), 'd MMM yyyy', { locale: idLocale });

  return (
    <Card style={styles.balitaCard}>
      <View style={styles.balitaCardTop}>
        <View style={styles.balitaIconCircle}>
          <Baby size={20} color="#0D9488" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.balitaName}>{balita.nama}</Text>
          <Text style={styles.balitaSub}>
            Ortu: {balita.nama_ortu} • {tanggal}
          </Text>
        </View>
        {balita.no_hp_ortu ? (
          <Badge label="HP ✓" variant="success" />
        ) : (
          <Badge label="No HP" variant="warning" />
        )}
      </View>
      <View style={styles.balitaStats}>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>BB</Text>
          <Text style={styles.statChipValue}>{penimbangan.berat_badan} kg</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>TB</Text>
          <Text style={styles.statChipValue}>{penimbangan.tinggi_badan} cm</Text>
        </View>
        {penimbangan.status_bb_u && (
          <View style={[styles.statChip, { backgroundColor: '#F0FDFA' }]}>
            <Text style={[styles.statChipValue, { color: '#0D9488', fontSize: 11 }]}>
              {penimbangan.status_bb_u}
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
        <Send size={16} color="#FFF" />
        <Text style={styles.sendBtnText}>Kirim via WA</Text>
      </TouchableOpacity>
    </Card>
  );
}

function BalitaPengingatCard({
  balita,
  onSend,
}: {
  balita: Balita;
  onSend: () => void;
}) {
  return (
    <Card style={styles.balitaCard}>
      <View style={styles.balitaCardTop}>
        <View style={[styles.balitaIconCircle, { backgroundColor: '#FFFBEB' }]}>
          <Bell size={20} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.balitaName}>{balita.nama}</Text>
          <Text style={styles.balitaSub}>
            Ortu: {balita.nama_ortu} • RT {balita.rt}
          </Text>
        </View>
        {balita.no_hp_ortu ? (
          <Badge label="HP ✓" variant="success" />
        ) : (
          <Badge label="No HP" variant="warning" />
        )}
      </View>
      <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#F59E0B' }]} onPress={onSend}>
        <Bell size={16} color="#FFF" />
        <Text style={styles.sendBtnText}>Kirim Pengingat</Text>
      </TouchableOpacity>
    </Card>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
});
