// app/imunisasi.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  Baby, 
  Search, 
  Filter, 
  ChevronRight, 
  MessageCircle, 
  Download,
  AlertCircle,
  CheckCircle2,
  Syringe
} from 'lucide-react-native';
import { useServiceStore } from '../stores/service-store';
import { ImunisasiService } from '../services/imunisasi-service';
import { ExportImunisasiService } from '../services/export-imunisasi-service';
import { Balita, Imunisasi } from '../lib/types';
import { COLORS } from '../lib/constants';
import { SearchBar } from '../components/ui/SearchBar';
import ImunisasiForm from '../components/ImunisasiForm';

export default function ImunisasiScreen() {
  const router = useRouter();
  const { activePosyanduId, history } = useServiceStore();
  
  const [loading, setLoading] = useState(true);
  const [balitas, setBalitas] = useState<Balita[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBalita, setSelectedBalita] = useState<Balita | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await ImunisasiService.getBalitaByBirthYear(activePosyanduId, selectedYear);
      setBalitas(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal memuat data imunisasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activePosyanduId, selectedYear]);

  const filteredBalitas = balitas.filter(b => 
    b.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.nik.includes(searchQuery)
  );

  const handleExport = async () => {
    if (filteredBalitas.length === 0) {
      Alert.alert('Info', 'Tidak ada data untuk diekspor');
      return;
    }
    try {
      const activePosyandu = history.find(h => h.id === activePosyanduId);
      const posyanduName = activePosyandu?.name || 'Posyandu';
      await ExportImunisasiService.exportToExcel(filteredBalitas, selectedYear, posyanduName);
    } catch (e) {
      Alert.alert('Error', 'Gagal mengekspor data');
    }
  };

  const handleOpenForm = (balita: Balita) => {
    setSelectedBalita(balita);
    setFormVisible(true);
  };

  const handleSendWA = (balita: Balita) => {
    const missing = ImunisasiService.getMissingVaccines(balita.imunisasi);
    if (missing.length === 0) {
      Alert.alert('Info', 'Imunisasi sudah lengkap!');
      return;
    }

    const message = `Halo Bapak/Ibu orang tua dari Ananda ${balita.nama},\n\nKami dari Posyandu ingin mengingatkan terkait kelengkapan data imunisasi Ananda. Berdasarkan catatan kami, masih ada beberapa data imunisasi yang belum terisi/dilakukan:\n\n${missing.map(m => `- ${m}`).join('\n')}\n\nMohon segera dilengkapi atau disetorkan datanya ke petugas Posyandu. Terima kasih.`;
    
    const phone = balita.no_hp_ortu || '';
    if (!phone) {
      Alert.alert('Error', 'Nomor HP orang tua tidak tersedia');
      return;
    }

    const url = `whatsapp://send?phone=${phone.startsWith('0') ? '62' + phone.slice(1) : phone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp tidak terpasang di perangkat ini');
      }
    });
  };

  const renderItem = ({ item }: { item: Balita }) => {
    const completeness = ImunisasiService.calculateCompleteness(item.imunisasi);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleOpenForm(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.babyIconContainer}>
            <Baby size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.babyName}>{item.nama}</Text>
            <Text style={styles.babyInfo}>NIK: {item.nik} • RT: {item.rt}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => handleSendWA(item)}
            style={styles.waBtn}
          >
            <MessageCircle size={20} color="#25D366" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Kelengkapan Imunisasi</Text>
            <Text style={[
              styles.progressValue, 
              { color: completeness === 100 ? '#059669' : COLORS.primary }
            ]}>
              {completeness}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${completeness}%` }]} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>Klik untuk detail & input data</Text>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Data Imunisasi</Text>
          <Text style={styles.subtitle}>Pemantauan Vaksin Dasar Lengkap</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Download size={20} color="#FFF" />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
          {years.map(year => (
            <TouchableOpacity 
              key={year}
              style={[styles.yearTab, selectedYear === year && styles.yearTabActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.yearTabText, selectedYear === year && styles.yearTabTextActive]}>
                Lahir {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.searchBar}>
          <SearchBar 
            placeholder="Cari nama balita..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBalitas}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#E2E8F0" />
              <Text style={styles.emptyText}>Tidak ada data balita kelahiran {selectedYear}</Text>
            </View>
          }
        />
      )}

      {selectedBalita && (
        <ImunisasiForm 
          visible={formVisible}
          onClose={() => {
            setFormVisible(false);
            fetchData();
          }}
          balita={selectedBalita}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24,
    backgroundColor: '#FFF'
  },
  title: { fontSize: 24, fontWeight: '900', color: '#191C1D' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  exportBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 12,
    gap: 8
  },
  exportText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  
  filterSection: { backgroundColor: '#FFF', paddingBottom: 16 },
  yearScroll: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  yearTab: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  yearTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  yearTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  yearTabTextActive: { color: '#FFF' },
  searchBar: { marginHorizontal: 20 },

  listContent: { padding: 20, gap: 16 },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  babyIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    backgroundColor: '#F0FDFA', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  babyName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  babyInfo: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  waBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F0FDF4', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  progressSection: { marginTop: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  progressValue: { fontSize: 12, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },

  cardFooter: { 
    marginTop: 16, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 14, textAlign: 'center' }
});
