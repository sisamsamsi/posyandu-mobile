import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
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
  Settings,
  UserCheck
} from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { usePosyandu } from '../../hooks/usePosyandu';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Posyandu } from '../../lib/types';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function ServiceDeskScreen() {
  const router = useRouter();
  const { activePosyanduId, setActivePosyandu, history } = useServiceStore();
  const { posyandu: defaultPosyandu, getAllPosyandus, loading: posyanduLoading } = usePosyandu();
  
  const [showPosyanduPicker, setShowPosyanduPicker] = useState(false);
  const [allPosyandus, setAllPosyandus] = useState<Posyandu[]>([]);
  const [activePosyanduName, setActivePosyanduName] = useState<string>('Pilih Posyandu');

  useEffect(() => {
    loadPosyandus();
  }, []);

  const loadPosyandus = async () => {
    const list = await getAllPosyandus();
    setAllPosyandus(list);
    
    // Set default if none active
    if (!activePosyanduId && defaultPosyandu) {
      setActivePosyandu(defaultPosyandu.id);
      setActivePosyanduName(defaultPosyandu.nama_posyandu);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Service Desk</Text>
          <Text style={styles.headerSubtitle}>Pusat Pelayanan Terpadu</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn}>
          <Settings size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Posyandu Selection */}
        <TouchableOpacity 
          style={styles.posyanduCard}
          onPress={() => setShowPosyanduPicker(true)}
        >
          <View style={styles.posyanduIcon}>
             <MapPin size={20} color="#0D9488" />
          </View>
          <View style={styles.posyanduInfo}>
             <Text style={styles.posyanduLabel}>Posyandu Aktif</Text>
             <Text style={styles.posyanduName}>{activePosyanduName}</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Pilih Kategori Layanan</Text>
        <View style={styles.modeGrid}>
           <TouchableOpacity 
             style={[styles.modeCard, { backgroundColor: '#F0FDFA' }]}
             onPress={() => router.push('/service-desk/balita')}
           >
              <View style={[styles.modeIconCircle, { backgroundColor: '#CCFBF1' }]}>
                <Baby size={32} color="#0D9488" />
              </View>
              <Text style={styles.modeTitle}>Layanan Balita</Text>
              <Text style={styles.modeDesc}>Input Penimbangan & Gizi</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.modeCard, { backgroundColor: '#EFF6FF' }]}
             onPress={() => router.push('/service-desk/lansia')}
           >
              <View style={[styles.modeIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Users size={32} color="#2563EB" />
              </View>
              <Text style={styles.modeTitle}>Layanan Lansia</Text>
              <Text style={styles.modeDesc}>Pemeriksaan Kesehatan</Text>
           </TouchableOpacity>
        </View>

        {/* RECENT HISTORY */}
        <View style={styles.historySection}>
           <View style={styles.historyHeader}>
              <View style={styles.historyTitleRow}>
                <History size={18} color="#64748B" />
                <Text style={styles.historyTitle}>Layanan Terakhir</Text>
              </View>
              {history.length > 0 && <Badge label={history.length.toString()} variant="info" />}
           </View>

           {history.length > 0 ? (
             history.map((item, idx) => (
               <Card key={`${item.id}-${idx}`} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyIcon, { backgroundColor: item.type === 'balita' ? '#F0FDFA' : '#EFF6FF' }]}>
                       {item.type === 'balita' ? <Baby size={20} color="#0D9488" /> : <UserCheck size={20} color="#2563EB" />}
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
                    onPress={() => router.push(`/${item.type}/${item.id}`)}
                  >
                    <Text style={styles.actionBtnText}>Lihat Detail</Text>
                  </TouchableOpacity>
               </Card>
             ))
           ) : (
             <View style={styles.emptyHistory}>
                <ClipboardCheck size={48} color="#E2E8F0" />
                <Text style={styles.emptyText}>Belum ada aktivitas pelayanan hari ini.</Text>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  settingsBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  posyanduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  posyanduIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  posyanduInfo: {
    flex: 1,
  },
  posyanduLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  posyanduName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  modeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  modeCard: {
    width: '48%',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  modeDesc: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  historySection: {
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginLeft: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 10,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  historyTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: 'bold',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeBtn: {
    color: '#EF4444',
    fontWeight: '600',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
  }
});
