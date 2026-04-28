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
  ArrowRight
} from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { usePosyandu } from '../../hooks/usePosyandu';
import { Badge } from '../../components/ui/Badge';
import { Posyandu } from '../../lib/types';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';

export default function ServiceDeskScreen() {
  const router = useRouter();
  const { activePosyanduId, setActivePosyandu, history, activeWorkspace } = useServiceStore();
  const { getAllPosyandus } = usePosyandu();
  
  const [showPosyanduPicker, setShowPosyanduPicker] = useState(false);
  const [allPosyandus, setAllPosyandus] = useState<Posyandu[]>([]);
  const [activePosyanduName, setActivePosyanduName] = useState<string>('Pilih Posyandu');

  const isBalita = activeWorkspace === 'balita';
  const wsColor = isBalita ? COLORS.balita : COLORS.lansia;
  const wsBg = isBalita ? COLORS.balitaLight : COLORS.lansiaLight;
  const wsDark = isBalita ? COLORS.balitaDark : COLORS.lansiaDark;

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

  const filteredHistory = history.filter(item => item.type === activeWorkspace);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Layanan Terpadu</Text>
          <Text style={styles.headerSubtitle}>
            Modul Pemeriksaan {isBalita ? 'Balita' : 'Lansia'}
          </Text>
        </View>
        <WorkspaceSwitcher size={22} color={COLORS.textPrimary} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Posyandu Selection */}
        <TouchableOpacity 
          style={styles.posyanduCard}
          onPress={() => setShowPosyanduPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.posyanduIcon}>
             <MapPin size={20} color={COLORS.primaryDark} />
          </View>
          <View style={styles.posyanduInfo}>
             <Text style={styles.posyanduLabel}>LOKASI POSYANDU</Text>
             <Text style={styles.posyanduName}>{activePosyanduName}</Text>
          </View>
          <View style={styles.chevronCircle}>
            <ChevronRight size={16} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* WORKSPACE SPECIFIC MAIN ACTION */}
        {isBalita ? (
          <TouchableOpacity 
            style={[styles.mainActionCard, { backgroundColor: COLORS.balitaAccent }]}
            onPress={() => router.push('/service-desk/balita')}
            activeOpacity={0.8}
          >
            <View style={styles.mainActionIconCircle}>
              <Baby size={36} color={COLORS.balitaDark} />
            </View>
            <Text style={styles.mainActionTitle}>Mulai Timbang & Gizi</Text>
            <Text style={styles.mainActionDesc}>Input data antropometri pertumbuhan anak hari ini.</Text>
            <View style={styles.arrowRow}>
              <Text style={styles.arrowText}>Proses Pelayanan</Text>
              <ArrowRight size={18} color="#FFF" />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.mainActionCard, { backgroundColor: COLORS.lansiaAccent }]}
            onPress={() => router.push('/service-desk/lansia')}
            activeOpacity={0.8}
          >
            <View style={styles.mainActionIconCircle}>
              <Users size={36} color={COLORS.lansiaDark} />
            </View>
            <Text style={styles.mainActionTitle}>Pemeriksaan Fisik</Text>
            <Text style={styles.mainActionDesc}>Input data vital dan skrining kesehatan lansia.</Text>
            <View style={styles.arrowRow}>
              <Text style={styles.arrowText}>Mulai Skrining</Text>
              <ArrowRight size={18} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* RECENT HISTORY */}
        <View style={styles.historySection}>
           <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Riwayat {isBalita ? 'Anak' : 'Lansia'} Hari Ini</Text>
              {filteredHistory.length > 0 && <Badge label={filteredHistory.length.toString()} variant="info" />}
           </View>

           {filteredHistory.length > 0 ? (
             filteredHistory.map((item, idx) => (
               <View key={`${item.id}-${idx}`} style={styles.historyItemCard}>
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyIcon, { backgroundColor: isBalita ? COLORS.balitaLight : COLORS.lansiaLight }]}>
                       {isBalita ? 
                          <Baby size={20} color={COLORS.balita} /> : 
                          <UserCheck size={20} color={COLORS.lansia} />
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
                    <ChevronRight size={16} color={COLORS.textTertiary} />
                  </TouchableOpacity>
               </View>
             ))
           ) : (
             <View style={styles.emptyHistory}>
                <ClipboardCheck size={48} color={COLORS.surfaceBorder} />
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
                       <MapPin size={18} color={COLORS.textTertiary} />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  posyanduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOW.sm,
  },
  posyanduIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.balitaLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  posyanduInfo: {
    flex: 1,
  },
  posyanduLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  posyanduName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  mainActionCard: {
    borderRadius: RADIUS.xl,
    padding: 28,
    marginBottom: 24,
    ...SHADOW.lg,
  },
  mainActionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainActionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textOnDark,
    letterSpacing: -0.3,
  },
  mainActionDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    lineHeight: 20,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textOnDark,
  },

  historySection: {
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.xl,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  actionBtn: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    color: COLORS.error,
    fontWeight: '700',
    fontSize: 14,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceDim,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  }
});
