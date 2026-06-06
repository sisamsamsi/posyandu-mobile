import React, { useState } from 'react';
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
  Pressable,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  ChevronRight, 
  Activity, 
  Droplet, 
  Thermometer,
  CheckCircle2,
  Calendar,
  Heart
} from 'lucide-react-native';
import { useLansia } from '../../hooks/useLansia';
import { usePemeriksaan } from '../../hooks/usePemeriksaan';
import { useServiceStore } from '../../stores/service-store';
import { Lansia } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { QuickTransition } from '../../components/ui/QuickTransition';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../lib/constants';

type Step = 'search' | 'input' | 'confirm' | 'success';

export default function LansiaServiceDesk() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [allLansias, setAllLansias] = useState<Lansia[]>([]);
  const [searchResults, setSearchResults] = useState<Lansia[]>([]);
  const [selectedLansia, setSelectedLansia] = useState<Lansia | null>(null);
  
  // Form Values
  const [keluhan, setKeluhan] = useState('');
  const [tdSistolik, setTdSistolik] = useState('');
  const [tdDiastolik, setTdDiastolik] = useState('');
  const [gulaDarah, setGulaDarah] = useState('');
  const [asamUrat, setAsamUrat] = useState('');
  const [kolesterol, setKolesterol] = useState('');
  const [trigliserida, setTrigliserida] = useState('');
  const [berat, setBerat] = useState('');
  const [tinggi, setTinggi] = useState('');
  const handleBeratChange = (text: string) => {
    const cleaned = text.replace(',', '.');
    if (cleaned === '' || /^\d*\.?\d{0,2}$/.test(cleaned)) {
      setBerat(text);
    }
  };
  const handleTinggiChange = (text: string) => {
    const cleaned = text.replace(',', '.');
    if (cleaned === '' || /^\d*\.?\d{0,1}$/.test(cleaned)) {
      setTinggi(text);
    }
  };
  const [lingkarPerut, setLingkarPerut] = useState('');
  const [lila, setLila] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { getLansias, loading } = useLansia();
  const { addPemeriksaan } = usePemeriksaan();
  const { addToHistory } = useServiceStore();

  // Load all Lansias on mount for real-time local search
  React.useEffect(() => {
    const fetchAllData = async () => {
      const data = await getLansias();
      setAllLansias(data);
      setSearchResults(data);
    };
    fetchAllData();
  }, []);

  // Filter search results in real-time
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(allLansias);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = allLansias.filter(l => 
        l.nama.toLowerCase().includes(lower) || 
        l.nik.includes(lower)
      );
      setSearchResults(filtered);
    }
  }, [searchQuery, allLansias]);

  const onSelectLansia = (lansia: Lansia) => {
    setSelectedLansia(lansia);
    setStep('input');
  };

  const handleSave = () => {
    if (!tdSistolik || !tdDiastolik) {
      Alert.alert('Error', 'Tekanan darah harus diisi');
      return;
    }
    setStep('confirm');
  };

  const confirmSave = async () => {
    if (!selectedLansia) return;
    
    try {
      await addPemeriksaan({
        lansia_id: selectedLansia.id,
        tanggal_periksa: tanggal,
        keluhan: keluhan || null,
        tekanan_darah: `${tdSistolik}/${tdDiastolik}`,
        berat_badan: parseFloat(berat) || null,
        tinggi_badan: parseFloat(tinggi) || null,
        gula_darah: parseFloat(gulaDarah) || null,
        asam_urat: parseFloat(asamUrat) || null,
        kolesterol: parseFloat(kolesterol) || null,
        trigliserida: parseFloat(trigliserida) || null,
        lingkar_perut: parseFloat(lingkarPerut) || null,
        lingkar_lengan: parseFloat(lila) || null,
      });

      addToHistory({
        id: selectedLansia.id,
        name: selectedLansia.nama,
        type: 'lansia'
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

  const renderContent = () => {
    switch (step) {
      case 'search':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Cari Lansia</Text>
            <View style={styles.searchBar}>
              <Search size={20} color="#94A3B8" />
              <TextInput 
                style={styles.searchInput}
                placeholder="Nama atau NIK Lansia..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <FlatList 
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => onSelectLansia(item)}>
                  <View style={styles.resultAvatar}>
                    <Users size={24} color={COLORS.indigoPrimary} />
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
          <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.selectedHeader}>
               <Users size={32} color={COLORS.indigoPrimary} />
               <View style={styles.selectedHeaderText}>
                  <Text style={styles.selectedName}>{selectedLansia?.nama}</Text>
                  <Text style={styles.selectedSub}>{selectedLansia?.nik}</Text>
               </View>
               <TouchableOpacity onPress={() => setStep('search')}><Text style={styles.changeLink}>Ganti</Text></TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Keluhan (Opsional)</Text>
            <TextInput 
              style={styles.textArea} 
              placeholder="Keluhan lansia jika ada..." 
              multiline 
              numberOfLines={3}
              value={keluhan}
              onChangeText={setKeluhan}
            />

            <Text style={styles.sectionLabel}>Vital & Fisik</Text>
            <View style={styles.row}>
               <View style={styles.fieldContainerHalf}>
                  <Text style={styles.fieldLabel}>Sistolik (Atas)</Text>
                  <View style={styles.inputGroup}>
                     <Heart size={18} color="#EF4444" />
                     <TextInput style={styles.input} placeholder="120" keyboardType="numeric" value={tdSistolik} onChangeText={setTdSistolik} />
                  </View>
               </View>
               <View style={styles.fieldContainerHalf}>
                  <Text style={styles.fieldLabel}>Diastolik (Bawah)</Text>
                  <View style={styles.inputGroup}>
                     <Heart size={18} color="#EF4444" />
                     <TextInput style={styles.input} placeholder="80" keyboardType="numeric" value={tdDiastolik} onChangeText={setTdDiastolik} />
                  </View>
               </View>
            </View>

            <View style={styles.row}>
               <View style={styles.fieldContainerHalf}>
                  <Text style={styles.fieldLabel}>Berat Badan (kg)</Text>
                  <View style={styles.inputGroup}>
                     <Activity size={18} color={COLORS.indigoPrimary} />
                     <TextInput 
                        style={styles.input} 
                        placeholder="Contoh: 60.50" 
                        keyboardType="decimal-pad" 
                        value={berat} 
                        onChangeText={handleBeratChange} 
                     />
                  </View>
               </View>
               <View style={styles.fieldContainerHalf}>
                  <Text style={styles.fieldLabel}>Tinggi Badan (cm)</Text>
                  <View style={styles.inputGroup}>
                     <Activity size={18} color={COLORS.indigoPrimary} />
                     <TextInput 
                        style={styles.input} 
                        placeholder="Contoh: 165.2" 
                        keyboardType="decimal-pad" 
                        value={tinggi} 
                        onChangeText={handleTinggiChange} 
                     />
                  </View>
               </View>
            </View>

            <View style={styles.row}>
               <View style={styles.fieldContainerHalf}>
                  <Text style={styles.fieldLabel}>L. Perut (cm)</Text>
                  <View style={styles.inputGroup}>
                     <Activity size={18} color="#64748B" />
                     <TextInput style={styles.input} placeholder="Cm" keyboardType="numeric" value={lingkarPerut} onChangeText={setLingkarPerut} />
                  </View>
               </View>
               <View style={styles.fieldContainerHalf}>
                  <Text style={styles.fieldLabel}>LiLA (cm)</Text>
                  <View style={styles.inputGroup}>
                     <Activity size={18} color="#64748B" />
                     <TextInput style={styles.input} placeholder="Cm" keyboardType="numeric" value={lila} onChangeText={setLila} />
                  </View>
               </View>
            </View>

            <Text style={styles.sectionLabel}>Pemeriksaan Darah (Opsional)</Text>
            <View style={styles.form}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tanggal Pemeriksaan</Text>
                <Pressable onPress={() => setShowDatePicker(true)}>
                  <View style={styles.inputGroup}>
                    <Calendar size={18} color="#64748B" />
                    <Text style={[styles.input, { textAlignVertical: 'center' }]}>
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

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Gula Darah (mg/dL)</Text>
                <View style={styles.inputGroup}>
                  <Droplet size={18} color="#EF4444" />
                  <TextInput style={styles.input} placeholder="Gula Darah" keyboardType="numeric" value={gulaDarah} onChangeText={setGulaDarah} />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Asam Urat (mg/dL)</Text>
                <View style={styles.inputGroup}>
                  <Thermometer size={18} color="#F59E0B" />
                  <TextInput style={styles.input} placeholder="Asam Urat" keyboardType="numeric" value={asamUrat} onChangeText={setAsamUrat} />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Kolesterol (mg/dL)</Text>
                <View style={styles.inputGroup}>
                  <Activity size={18} color="#3B82F6" />
                  <TextInput style={styles.input} placeholder="Kolesterol" keyboardType="numeric" value={kolesterol} onChangeText={setKolesterol} />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Trigliserida (mg/dL)</Text>
                <View style={styles.inputGroup}>
                  <Activity size={18} color="#8B5CF6" />
                  <TextInput style={styles.input} placeholder="Trigliserida" keyboardType="numeric" value={trigliserida} onChangeText={setTrigliserida} />
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>Selanjutnya</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'confirm':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Konfirmasi Simpan</Text>
            <Card style={styles.confirmCard}>
               <Text style={styles.confirmLabel}>Nama Lansia</Text>
               <Text style={styles.confirmValue}>{selectedLansia?.nama}</Text>
               <View style={styles.divider} />
               <Text style={styles.confirmLabel}>Tekanan Darah</Text>
               <Text style={styles.confirmValue}>{tdSistolik}/{tdDiastolik} mmHg</Text>
               {keluhan ? (
                 <>
                   <Text style={[styles.confirmLabel, {marginTop: 12}]}>Keluhan</Text>
                   <Text style={styles.confirmValue}>{keluhan}</Text>
                 </>
               ) : null}
            </Card>
            <TouchableOpacity style={styles.primaryButton} onPress={confirmSave}>
              <Text style={styles.primaryButtonText}>Ya, Simpan Pemeriksaan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('input')}>
              <Text style={styles.secondaryButtonText}>Revisi Data</Text>
            </TouchableOpacity>
          </View>
        );

      case 'success':
        const isHighBP = parseInt(tdSistolik) >= 140 || parseInt(tdDiastolik) >= 90;
        const isHighSugar = parseFloat(gulaDarah) >= 200;

        return (
          <View style={[styles.stepContainer, styles.center]}>
            <CheckCircle2 size={64} color="#22C55E" />
            <Text style={styles.successTitle}>Pemeriksaan Tersimpan!</Text>
            <Text style={styles.successDesc}>Data pemeriksaan {selectedLansia?.nama} telah dicatat.</Text>
            
            <Card style={[styles.lansiaResultCard, isHighBP || isHighSugar ? { borderColor: '#EF4444' } : {}]}>
               <Text style={styles.resultCardHeader}>Ringkasan Kesehatan:</Text>
               <View style={styles.resultGrid}>
                  <View style={styles.resultBox}>
                     <Text style={styles.boxLabel}>Tekanan Darah</Text>
                     <Text style={[styles.boxValue, isHighBP && { color: '#DC2626' }]}>{tdSistolik}/{tdDiastolik}</Text>
                     <Text style={styles.boxUnit}>mmHg</Text>
                  </View>
                  <View style={styles.resultBox}>
                     <Text style={styles.boxLabel}>Gula Darah</Text>
                     <Text style={[styles.boxValue, isHighSugar && { color: '#DC2626' }]}>{gulaDarah || '-'}</Text>
                     <Text style={styles.boxUnit}>mg/dL</Text>
                  </View>
               </View>
               {(isHighBP || isHighSugar) && (
                 <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ Terdeteksi nilai di atas normal. Segera rujuk ke Puskesmas jika ada keluhan berat.
                    </Text>
                 </View>
               )}
            </Card>

            <TouchableOpacity 
              style={[styles.primaryButton, { width: '100%', marginTop: 20 }]} 
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.primaryButtonText}>Kembali ke Menu Utama</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryButton, { width: '100%' }]} 
              onPress={() => {
                setStep('search');
                setSelectedLansia(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Lanjut Lansia Lain</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
           <Image 
             source={require('../../assets/images/logo.png')} 
             style={{ width: 160, height: 55, marginLeft: 16 }} 
             resizeMode="contain" 
           />
           <QuickTransition 
              currentType="lansia" 
              onSwitch={() => router.replace('/service-desk/balita')} 
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  stepContainer: {
    flex: 1,
    padding: 16,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.indigoTonal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
  },
  resultNik: {
    fontSize: 12,
    color: '#94A3B8',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.indigoTonal,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  selectedHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#312E81',
  },
  selectedSub: {
    fontSize: 11,
    color: '#818CF8',
  },
  changeLink: {
    color: COLORS.indigoPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 8,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  form: {
    gap: 8,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  fieldContainerHalf: {
    flex: 1,
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1E293B',
    height: '100%',
    paddingVertical: 0,
  },
  primaryButton: {
    backgroundColor: COLORS.indigoPrimary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.indigoTonal,
  },
  secondaryButtonText: {
    color: COLORS.indigoPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmCard: {
    marginBottom: 20,
  },
  confirmLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  confirmValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#94A3B8',
  },
  // LANSIA SUCCESS STYLES
  lansiaResultCard: {
    width: '100%',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  resultCardHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  resultBox: {
    flex: 1,
    backgroundColor: COLORS.indigoTonal,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 9,
    color: '#4F46E5',
    fontWeight: '700',
    marginBottom: 4,
  },
  boxValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  boxUnit: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  warningBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  warningText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
});
