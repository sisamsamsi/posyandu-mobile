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
  const { getAllPosyandus } = usePosyandu();
  
  const [showPosyanduPicker, setShowPosyanduPicker] = useState(false);
  const [allPosyandus, setAllPosyandus] = useState<Posyandu[]>([]);
  const [activePosyanduName, setActivePosyanduName] = useState<string>('Pilih Posyandu');

  useEffect(() => {
    loadPosyandus();
  }, []);

  const loadPosyandus = async () => {
    const list = await getAllPosyandus();
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Layanan Terpadu</Text>
          <Text style={styles.headerSubtitle}>
            Modul Pemeriksaan {activeWorkspace === 'balita' ? 'Balita' : 'Lansia'}
          </Text>
        </View>
        <WorkspaceSwitcher size={28} color="#191C1D" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Posyandu Selection */}
        <TouchableOpacity 
          style={styles.posyanduCard}
          onPress={() => setShowPosyanduPicker(true)}
          activeOpacity={0.8}
        >
          <View style={styles.posyanduIcon}>
             <MapPin size={24} color={COLORS.primaryDark} />
          </View>
          <View style={styles.posyanduInfo}>
             <Text style={styles.posyanduLabel}>LOKASI POSYANDU</Text>
             <Text style={styles.posyanduName}>{activePosyanduName}</Text>
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* WORKSPACE SPECIFIC MAIN ACTION */}
        {activeWorkspace === 'balita' ? (
          <View style={{ gap: 16, marginBottom: 32 }}>
            <TouchableOpacity 
              style={[styles.mainActionCard, { backgroundColor: '#4DB6AC', marginBottom: 0 }]}
              onPress={() => router.push('/service-desk/balita')}
              activeOpacity={0.9}
            >
              <View style={styles.mainActionIconCircle}>
                <Baby size={40} color="#006A63" />
              </View>
              <Text style={styles.mainActionTitle}>Mulai Timbang & Gizi</Text>
              <Text style={styles.mainActionDesc}>Input data antropometri pertumbuhan anak hari ini (Meja 3).</Text>
              <View style={styles.arrowRow}>
                <Text style={styles.arrowText}>Proses Pelayanan</Text>
                <ArrowRight size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.mainActionCard, { backgroundColor: '#0D9488', marginBottom: 0 }]}
              onPress={() => router.push('/counseling/queue')}
              activeOpacity={0.9}
            >
              <View style={styles.mainActionIconCircle}>
                <Brain size={40} color="#0F766E" />
              </View>
              <Text style={styles.mainActionTitle}>Penyuluhan Gizi AI</Text>
              <Text style={styles.mainActionDesc}>Wawancara tumbuh kembang & rekomendasi gizi adaptif (Meja 4/5).</Text>
              <View style={styles.arrowRow}>
                <Text style={styles.arrowText}>Mulai Penyuluhan</Text>
                <ArrowRight size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.mainActionCard, { backgroundColor: '#64B5F6' }]}
            onPress={() => router.push('/service-desk/lansia')}
            activeOpacity={0.9}
          >
            <View style={styles.mainActionIconCircle}>
              <Users size={40} color="#004B75" />
            </View>
            <Text style={styles.mainActionTitle}>Pemeriksaan Fisik</Text>
            <Text style={styles.mainActionDesc}>Input data vital dan skrining kesehatan lansia.</Text>
            <View style={styles.arrowRow}>
              <Text style={styles.arrowText}>Mulai Skrining</Text>
              <ArrowRight size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* RECENT HISTORY */}
        <View style={styles.historySection}>
           <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Riwayat {activeWorkspace === 'balita' ? 'Anak' : 'Lansia'} Hari Ini</Text>
              {filteredHistory.length > 0 && <Badge label={filteredHistory.length.toString()} variant="info" />}
           </View>

           {filteredHistory.length > 0 ? (
             filteredHistory.map((item, idx) => (
               <View key={`${item.id}-${idx}`} style={styles.historyItemCard}>
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyIcon, { backgroundColor: activeWorkspace === 'balita' ? '#E0F2F1' : '#E3F2FD' }]}>
                       {activeWorkspace === 'balita' ? 
                          <Baby size={22} color={COLORS.primaryDark} /> : 
                          <UserCheck size={22} color={COLORS.secondary} />
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
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>
               </View>
             ))
           ) : (
             <View style={styles.emptyHistory}>
                <ClipboardCheck size={56} color="#CBD5E1" />
                <Text style={styles.emptyText}>Belum ada pelayanan {activeWorkspace} yang tercatat.</Text>
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
                       <MapPin size={20} color="#94A3B8" />
                       <Text style={styles.pickerItemText}>{item.nama_posyandu}</Text>
                       {activePosyanduId === item.id && <View style={styles.activeDot} />}
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#191C1D',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  posyanduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 32, // Large pill radius
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  posyanduIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  posyanduInfo: {
    flex: 1,
  },
  posyanduLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 1,
  },
  posyanduName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#191C1D',
    marginTop: 2,
  },
  
  // Big Main Action Card
  mainActionCard: {
    borderRadius: 36,
    padding: 32,
    marginBottom: 32,
    elevation: 8,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
  },
  mainActionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainActionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  mainActionDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '500',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  arrowText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // History Section
  historySection: {
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#191C1D',
  },
  historyTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  actionBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 16,
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
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#191C1D',
  },
  closeBtn: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 15,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F5',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#191C1D',
    marginLeft: 16,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  }
});
