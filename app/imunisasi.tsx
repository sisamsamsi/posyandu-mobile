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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  Baby, 
  ChevronRight, 
  MessageCircle, 
  Download,
  AlertCircle,
  ArrowLeft
} from 'lucide-react-native';
import { useServiceStore } from '../stores/service-store';
import { ImunisasiService } from '../services/imunisasi-service';
import { ExportImunisasiService } from '../services/export-imunisasi-service';
import { WhatsAppService } from '../services/whatsapp-service';
import { Balita } from '../lib/types';
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
    const activePosyandu = history.find(h => h.id === activePosyanduId);
    const posyanduName = activePosyandu?.name || 'Posyandu';

    Alert.alert(
      'Ekspor Laporan Imunisasi',
      'Pilih format laporan yang ingin diekspor:',
      [
        {
          text: `Tahun Lahir ${selectedYear} Saja`,
          onPress: async () => {
            if (filteredBalitas.length === 0) {
              Alert.alert('Info', `Tidak ada data imunisasi untuk tahun lahir ${selectedYear}`);
              return;
            }
            try {
              setLoading(true);
              await ExportImunisasiService.exportToExcel(filteredBalitas, selectedYear, posyanduName);
            } catch (e) {
              Alert.alert('Error', 'Gagal mengekspor data');
            } finally {
              setLoading(false);
            }
          }
        },
        {
          text: 'Semua Tahun Lahir (Multi-Sheet)',
          onPress: async () => {
            try {
              setLoading(true);
              await ExportImunisasiService.exportAllYearsToExcel(activePosyanduId, years, posyanduName);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Gagal mengekspor seluruh data');
            } finally {
              setLoading(false);
            }
          }
        },
        {
          text: 'Batal',
          style: 'cancel'
        }
      ]
    );
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

    WhatsAppService.openWhatsApp(phone, message);
  };

  const renderItem = ({ item }: { item: Balita }) => {
    const completeness = ImunisasiService.calculateCompleteness(item.imunisasi);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleOpenForm(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.babyIconContainer, { backgroundColor: COLORS.tealTonal }]}>
            <Baby size={20} color={COLORS.tealPrimary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.babyName} numberOfLines={1}>{item.nama}</Text>
            <Text style={styles.babyInfo}>NIK: {item.nik} • RT: {item.rt}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => handleSendWA(item)}
            style={styles.waBtn}
            activeOpacity={0.7}
          >
            <MessageCircle size={20} color="#10B981" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressSection}>
          {item.imunisasi?.alasan_tidak_imunisasi ? (
            <View style={styles.refusedContainer}>
              <Text style={styles.refusedText}>
                ⚠️ Sama Sekali Tidak Imunisasi ({item.imunisasi.alasan_tidak_imunisasi})
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Kelengkapan Imunisasi</Text>
                <Text style={[
                  styles.progressValue, 
                  { color: completeness === 100 ? '#10B981' : COLORS.tealPrimary }
                ]}>
                  {completeness}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[
                  styles.progressBarFill, 
                  { width: `${completeness}%`, backgroundColor: completeness === 100 ? '#10B981' : COLORS.tealPrimary }
                ]} />
              </View>
            </>
          )}
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
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={{ marginRight: 8, padding: 4 }} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Data Imunisasi</Text>
            <Text style={styles.subtitle}>Pemantauan Vaksin Dasar Lengkap</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.exportBtn, { backgroundColor: COLORS.tealPrimary }]} 
          onPress={handleExport}
          activeOpacity={0.8}
        >
          <Download size={18} color="#FFF" />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
          {years.map(year => (
            <TouchableOpacity 
              key={year}
              style={[
                styles.yearTab, 
                selectedYear === year && [styles.yearTabActive, { backgroundColor: COLORS.tealPrimary, borderColor: COLORS.tealPrimary }]
              ]}
              onPress={() => setSelectedYear(year)}
              activeOpacity={0.7}
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

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.tealPrimary} />
        </View>
      ) : (
        <FlatList
          data={filteredBalitas}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#CBD5E1" />
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
  container: { 
    flex: 1, 
    backgroundColor: COLORS.tealBg 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00A896',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 12, 
    color: '#64748B', 
    marginTop: 3,
    fontWeight: '600',
  },
  exportBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 14,
    gap: 6
  },
  exportText: { 
    color: '#FFF', 
    fontWeight: '800', 
    fontSize: 13 
  },
  filterSection: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 2,
    shadowColor: '#00A896',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  yearScroll: { 
    paddingHorizontal: 20, 
    gap: 8, 
    marginVertical: 14 
  },
  yearTab: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 14, 
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0'
  },
  yearTabActive: {},
  yearTabText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#64748B' 
  },
  yearTabTextActive: { 
    color: '#FFFFFF' 
  },
  searchBar: { 
    marginHorizontal: 20 
  },
  listContent: { 
    padding: 20, 
    gap: 12,
    paddingBottom: 100 
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#00A896',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  babyIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  babyName: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#0F172A' 
  },
  babyInfo: { 
    fontSize: 12, 
    color: '#94A3B8', 
    marginTop: 4,
    fontWeight: '600'
  },
  waBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#E6F4EA', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  progressSection: { 
    marginTop: 14 
  },
  progressHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  progressLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: { 
    fontSize: 12, 
    fontWeight: '800' 
  },
  progressBarBg: { 
    height: 8, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 4, 
    overflow: 'hidden' 
  },
  progressBarFill: { 
    height: '100%', 
    borderRadius: 4 
  },
  cardFooter: { 
    marginTop: 14, 
    paddingTop: 14, 
    borderTopWidth: 1.5, 
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerText: { 
    fontSize: 12, 
    color: '#94A3B8', 
    fontWeight: '600' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 80, 
    gap: 10 
  },
  emptyText: { 
    color: '#94A3B8', 
    fontSize: 13, 
    textAlign: 'center',
    fontWeight: '600',
  },
  refusedContainer: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEE2E2',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refusedText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '800',
    textAlign: 'center',
  }
});
