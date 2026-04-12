import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Search, 
  Baby, 
  ChevronRight, 
  Scale, 
  Ruler, 
  Brain,
  CheckCircle2,
  Calendar
} from 'lucide-react-native';
import { useBalita } from '../../hooks/useBalita';
import { useServiceStore } from '../../stores/service-store';
import { Balita, Penimbangan } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { QuickTransition } from '../../components/ui/QuickTransition';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { ZScoreEngine } from '../../services/zscore-engine';
import { whoService } from '../../services/who-service';
import { ReportService } from '../../services/report-service';
import DateTimePicker from '@react-native-community/datetimepicker';

type Step = 'search' | 'input' | 'confirm' | 'success';

export default function BalitaServiceDesk() {
  const router = useRouter();
  const { id: initialId } = useLocalSearchParams();
  const [step, setStep] = useState<Step>('search');
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Balita[]>([]);
  const [selectedBalita, setSelectedBalita] = useState<Balita | null>(null);
  
  // Form Values
  const [berat, setBerat] = useState('');
  const [tinggi, setTinggi] = useState('');
  const [lila, setLila] = useState('');
  const [lica, setLica] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { getBalitas, loading } = useBalita();
  const { activePosyanduId, addToHistory } = useServiceStore();

  useEffect(() => {
    if (initialId && typeof initialId === 'string') {
       // If coming from Detail screen, auto select
       autoSelectBalita(initialId);
    }
  }, [initialId]);

  const autoSelectBalita = async (id: string) => {
    const { data } = await supabase.from('balitas').select('*, posyandu:posyandus(*)').eq('id', id).single();
    if (data) {
      setSelectedBalita(data as Balita);
      setStep('input');
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    const results = await getBalitas(searchQuery);
    setSearchResults(results);
  };

  const onSelectBalita = (balita: Balita) => {
    setSelectedBalita(balita);
    setStep('input');
  };

  const validateForm = () => {
    if (!berat || !tinggi) {
      Alert.alert('Error', 'Berat dan Tinggi badan harus diisi');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!selectedBalita) return;
    
    setStep('confirm');
  };

  const [lastSavedStatus, setLastSavedStatus] = useState('');

  const confirmSave = async () => {
    if (!selectedBalita) return;
    
    // Calculate Z-Scores before saving
    try {
      const ageMonths = calculateAgeMonths(selectedBalita.tanggal_lahir, tanggal);
      
      const [bbStd, tbStd, imtStd, bbtbStd] = await Promise.all([
        whoService.getStandards('bb_u', selectedBalita.jenis_kelamin),
        whoService.getStandards('tb_u', selectedBalita.jenis_kelamin),
        whoService.getStandards('imt_u', selectedBalita.jenis_kelamin),
        whoService.getStandards('bb_tb', selectedBalita.jenis_kelamin),
      ]);

      const gender = selectedBalita.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';
      const bbResult = ZScoreEngine.calculate(bbStd, gender, ageMonths, parseFloat(berat), 'BB/U');
      const tbResult = ZScoreEngine.calculate(tbStd, gender, ageMonths, parseFloat(tinggi), 'TB/U');
      
      // For BB/TB, the 'measurement' index is the height (tinggi)
      const heightValue = parseFloat(tinggi);
      const bbtbResult = ZScoreEngine.calculate(bbtbStd, gender, heightValue, parseFloat(berat), 'BB/TB');
      
      setLastSavedStatus(bbResult.status);

      const res = await supabase.from('penimbangans').insert({
        balita_id: selectedBalita.id,
        tanggal: tanggal,
        berat_badan: parseFloat(berat),
        tinggi_badan: parseFloat(tinggi),
        lingkar_kepala: parseFloat(lica) || null,
        zscore_bb_u: bbResult.zscore,
        status_bb_u: bbResult.status,
        zscore_tb_u: tbResult.zscore,
        status_tb_u: tbResult.status,
        zscore_bb_tb: bbtbResult.zscore,
        status_bb_tb: bbtbResult.status,
      });

      if (res.error) throw res.error;

      addToHistory({
        id: selectedBalita.id,
        name: selectedBalita.nama,
        type: 'balita'
      });

      setStep('success');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTanggal(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleShareWA = async () => {
    if (!selectedBalita) return;
    
    const sensitive = ReportService.getSensitiveStatus(lastSavedStatus);
    
    const message = `*LAPORAN HASIL PENIMBANGAN* 👶\n\nHalo Ayah/Bunda dari *${selectedBalita.nama}*, berikut hasil pemeriksaan hari ini:\n- BB: *${berat} kg*\n- TB: *${tinggi} cm*\n- Kondisi: *${sensitive.label}*\n\nNasihat: ${sensitive.advice}\n\n*Mari terus pantau tumbuh kembang si kecil di Posyandu!*`;

    try {
      await Share.share({
        message,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'search':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Cari Balita</Text>
            <View style={styles.searchBar}>
              <Search size={20} color="#94A3B8" />
              <TextInput 
                style={styles.searchInput}
                placeholder="Masukkan Nama atau NIK..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
            </View>
            <FlatList 
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => onSelectBalita(item)}>
                  <View style={styles.resultAvatar}>
                    <Baby size={24} color="#0D9488" />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.nama}</Text>
                    <Text style={styles.resultNik}>{item.nik}</Text>
                  </View>
                  <ChevronRight size={20} color="#CBD5E1" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                searchQuery.length > 0 && !loading ? <Text style={styles.emptyText}>Tidak ada hasil</Text> : null
              )}
            />
          </View>
        );

      case 'input':
        return (
          <ScrollView style={styles.stepContainer}>
            <View style={styles.selectedHeader}>
               <Baby size={32} color="#0D9488" />
               <View style={styles.selectedHeaderText}>
                  <Text style={styles.selectedName}>{selectedBalita?.nama}</Text>
                  <Text style={styles.selectedSub}>{selectedBalita?.nik}</Text>
               </View>
               <TouchableOpacity onPress={() => setStep('search')}><Text style={styles.changeLink}>Ganti</Text></TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Data Penimbangan & Pengukuran</Text>
            <View style={styles.form}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Berat Badan (kg)</Text>
                <View style={styles.inputGroup}>
                  <Scale size={18} color="#0D9488" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Contoh: 8.5" 
                    keyboardType="numeric"
                    value={berat}
                    onChangeText={setBerat}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tinggi / Panjang Badan (cm)</Text>
                <View style={styles.inputGroup}>
                  <Ruler size={18} color="#0D9488" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Contoh: 75.2" 
                    keyboardType="numeric"
                    value={tinggi}
                    onChangeText={setTinggi}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Lingkar Kepala (cm)</Text>
                <View style={styles.inputGroup}>
                  <Brain size={18} color="#0D9488" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Masukkan lingkar kepala..." 
                    keyboardType="numeric"
                    value={lica}
                    onChangeText={setLica}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tanggal Penimbangan</Text>
                <Pressable onPress={() => setShowDatePicker(true)}>
                  <View style={styles.inputGroup}>
                    <Calendar size={18} color="#64748B" />
                    <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14 }]}>
                      {format(new Date(tanggal), 'dd MMMM yyyy')}
                    </Text>
                  </View>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(tanggal)}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>Selesai & Analisis</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'confirm':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Konfirmasi Simpan</Text>
            <Card style={styles.confirmCard}>
               <Text style={styles.confirmLabel}>Balita</Text>
               <Text style={styles.confirmValue}>{selectedBalita?.nama}</Text>
               <View style={styles.divider} />
               <View style={styles.confirmRow}>
                  <View>
                    <Text style={styles.confirmLabel}>BB</Text>
                    <Text style={styles.confirmValue}>{berat} kg</Text>
                  </View>
                  <View>
                    <Text style={styles.confirmLabel}>TB</Text>
                    <Text style={styles.confirmValue}>{tinggi} cm</Text>
                  </View>
               </View>
            </Card>
            <TouchableOpacity style={styles.primaryButton} onPress={confirmSave}>
              <Text style={styles.primaryButtonText}>Ya, Simpan Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('input')}>
              <Text style={styles.secondaryButtonText}>Kembali Edit</Text>
            </TouchableOpacity>
          </View>
        );

      case 'success':
        return (
          <View style={[styles.stepContainer, styles.center]}>
            <CheckCircle2 size={64} color="#22C55E" />
            <Text style={styles.successTitle}>Data Berhasil Disimpan!</Text>
            <Text style={styles.successDesc}>Penimbangan untuk {selectedBalita?.nama} telah dicatat.</Text>
            
            <TouchableOpacity 
              style={[styles.primaryButton, { width: '100%', backgroundColor: '#25D366' }]} 
              onPress={handleShareWA}
            >
              <Text style={styles.primaryButtonText}>Bagikan ke WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, { width: '100%' }]} 
              onPress={() => router.replace('/(tabs)/service-desk')}
            >
              <Text style={styles.primaryButtonText}>Kembali ke Menu Utama</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.secondaryButton, { width: '100%' }]} 
              onPress={() => {
                setStep('search');
                setSelectedBalita(null);
                setBerat('');
                setTinggi('');
                setLica('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Lanjut Balita Lain</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  function calculateAgeMonths(birthDate: string, measureDate: string): number {
    const birth = new Date(birthDate);
    const measure = new Date(measureDate);
    return (measure.getFullYear() - birth.getFullYear()) * 12 + (measure.getMonth() - birth.getMonth());
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
           <Text style={styles.headerTitle}>Layanan Balita</Text>
           <QuickTransition 
              currentType="balita" 
              onSwitch={() => router.replace('/service-desk/lansia')} 
           />
        </View>

        {renderContent()}
      </KeyboardAvoidingView>
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
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
  resultNik: {
    fontSize: 13,
    color: '#94A3B8',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  selectedHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#134E4A',
  },
  selectedSub: {
    fontSize: 12,
    color: '#5EAD9D',
  },
  changeLink: {
    color: '#0D9488',
    fontWeight: 'bold',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 8,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
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
    fontSize: 16,
    color: '#1E293B',
  },
  primaryButton: {
    backgroundColor: '#0D9488',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmCard: {
    marginBottom: 32,
  },
  confirmLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  confirmValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#94A3B8',
  }
});
