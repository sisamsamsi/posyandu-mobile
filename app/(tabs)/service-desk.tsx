import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Baby, 
  Users, 
  History, 
  MapPin, 
  ChevronRight, 
  ClipboardCheck,
  UserCheck,
  ArrowRight,
  Brain
} from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { usePosyandu } from '../../hooks/usePosyandu';
import { Badge } from '../../components/ui/Badge';
import { Posyandu } from '../../lib/types';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { COLORS } from '../../lib/constants';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';

export default function ServiceDeskScreen() {
  const router = useRouter();
  const { activePosyanduId, setActivePosyandu, history, activeWorkspace } = useServiceStore();
  const { getLinkedPosyandus } = usePosyandu();
  
  const [showPosyanduPicker, setShowPosyanduPicker] = useState(false);
  const [allPosyandus, setAllPosyandus] = useState<Posyandu[]>([]);
  const [activePosyanduName, setActivePosyanduName] = useState<string>('Pilih Posyandu');

  useEffect(() => {
    loadPosyandus();
  }, []);

  const loadPosyandus = async () => {
    const rels = await getLinkedPosyandus();
    const list = rels.map(r => r.posyandus);
    setAllPosyandus(list);
    
    if (!activePosyanduId && list.length > 0) {
      setActivePosyandu(list[0].id);
      setActivePosyanduName(list[0].nama_posyandu);
    } else if (activePosyanduId) {
      const active = list.find(p => p.id === activePosyanduId);
      if (active) setActivePosyanduName(active.nama_posyandu);
    }
  };

  const handleSelectPosyandu = (p: Posyandu) => {
    setActivePosyandu(p.id);
    setActivePosyanduName(p.nama_posyandu);
    setShowPosyanduPicker(false);
  };

  // Filter history based on active workspace
  const filteredHistory = history.filter(item => item.type === activeWorkspace);

  // Dynamic theme colors
  const isBalita = activeWorkspace === 'balita';
  const theme = {
    primary: isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary,
    background: isBalita ? COLORS.tealBg : COLORS.indigoBg,
    tonal: isBalita ? COLORS.tealTonal : COLORS.indigoTonal,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Layanan Terpadu</Text>
          <Text style={styles.headerSubtitle}>
            Modul Pelayanan Posyandu {isBalita ? 'Balita' : 'Lansia'}
          </Text>
        </View>
        <WorkspaceSwitcher size={20} color="#1E293B" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Posyandu Selection */}
        <TouchableOpacity 
          style={styles.posyanduCard}
          onPress={() => setShowPosyanduPicker(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.posyanduIcon, { backgroundColor: theme.tonal }]}>
             <MapPin size={18} color={theme.primary} />
          </View>
          <View style={styles.posyanduInfo}>
             <Text style={styles.posyanduLabel}>LOKASI POSYANDU</Text>
             <Text style={styles.posyanduName}>{activePosyanduName}</Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </TouchableOpacity>

        {/* WORKSPACE SPECIFIC MAIN ACTIONS (M3 FILLED CARDS) */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {isBalita ? (
            <>
              <TouchableOpacity 
                style={styles.mainActionM3Card}
                onPress={() => router.push('/service-desk/balita')}
                activeOpacity={0.7}
              >
                <View style={[styles.mainActionIconCircleM3, { backgroundColor: theme.tonal }]}>
                  <Baby size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mainActionTitleM3}>Timbang & Ukur Gizi</Text>
                  <Text style={styles.mainActionDescM3}>Input data antropometri pertumbuhan anak hari ini (Meja 3).</Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.mainActionM3Card}
                onPress={() => router.push('/counseling/queue')}
                activeOpacity={0.7}
              >
                <View style={[styles.mainActionIconCircleM3, { backgroundColor: theme.tonal }]}>
                  <Brain size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mainActionTitleM3}>Penyuluhan Gizi AI</Text>
                  <Text style={styles.mainActionDescM3}>Wawancara tumbuh kembang & rekomendasi gizi adaptif (Meja 4/5).</Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.mainActionM3Card}
              onPress={() => router.push('/service-desk/lansia')}
              activeOpacity={0.7}
            >
              <View style={[styles.mainActionIconCircleM3, { backgroundColor: theme.tonal }]}>
                <Users size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mainActionTitleM3}>Pemeriksaan Fisik Lansia</Text>
                <Text style={styles.mainActionDescM3}>Skrining kesehatan lansia, tensi, gula darah, & asam urat.</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* RECENT HISTORY */}
        <View style={styles.historySection}>
            <View style={styles.historyHeader}>
               <Text style={styles.historyTitle}>Riwayat Pelayanan Hari Ini</Text>
               {filteredHistory.length > 0 && <Badge label={filteredHistory.length.toString()} variant="info" />}
            </View>

            {filteredHistory.length > 0 ? (
              filteredHistory.map((item, idx) => (
                <View key={`${item.id}-${idx}`} style={styles.historyItemCard}>
                   <View style={styles.historyLeft}>
                     <View style={[styles.historyIcon, { backgroundColor: theme.tonal }]}>
                        {isBalita ? 
                           <Baby size={18} color={theme.primary} /> : 
                           <UserCheck size={18} color={theme.primary} />
                        }
                     </View>
                     <View>
                       <Text style={styles.historyName}>{item.name}</Text>
                       <Text style={styles.historyTime}>
                         {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: idLocale })}
                       </Text>
                     </View>
                   </View>
                   <TouchableOpacity 
                     style={styles.actionBtn}
                     onPress={() => router.push(`/${activeWorkspace}/${item.id}`)}
                   >
                     <ChevronRight size={16} color="#94A3B8" />
                   </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                 <ClipboardCheck size={44} color="#CBD5E1" />
                 <Text style={styles.emptyText}>Belum ada pelayanan {isBalita ? 'balita' : 'lansia'} yang tercatat.</Text>
              </View>
            )}
        </View>
      </ScrollView>

      {/* POSYANDU PICKER MODAL */}
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
                       {activePosyanduId === item.id && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
                    </TouchableOpacity>
                  )}
               />
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#00A896',
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  posyanduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#00A896',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
  },
  posyanduIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  posyanduInfo: {
    flex: 1,
  },
  posyanduLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '800',
    letterSpacing: 1,
  },
  posyanduName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  
  // Compact M3 Main Actions
  mainActionM3Card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    gap: 12,
    elevation: 2,
    shadowColor: '#00A896',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
  },
  mainActionIconCircleM3: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionTitleM3: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  mainActionDescM3: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },

  // History Section
  historySection: {
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  historyTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  actionBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 12,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 28, 29, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
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
  }
});
