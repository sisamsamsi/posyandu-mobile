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
  ScrollView
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
import { useServiceStore } from '../../stores/service-store';
import { Lansia } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { QuickTransition } from '../../components/ui/QuickTransition';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

type Step = 'search' | 'input' | 'confirm' | 'success';

export default function LansiaServiceDesk() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
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
  const [lingkarPerut, setLingkarPerut] = useState('');
  const [lila, setLila] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { getLansias, loading } = useLansia();
  const { addToHistory } = useServiceStore();

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    const results = await getLansias(searchQuery);
    setSearchResults(results);
  };

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
      const { error } = await supabase.from('pemeriksaan_lansias').insert({
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

      if (error) throw error;

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
                onSubmitEditing={handleSearch}
              />
            </View>
            <FlatList 
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => onSelectLansia(item)}>
                  <View style={styles.resultAvatar}>
                    <Users size={24} color="#0D9488" />
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
               <Users size={32} color="#0D9488" />
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
               <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Heart size={18} color="#64748B" />
                  <TextInput style={styles.input} placeholder="Sistolik" keyboardType="numeric" value={tdSistolik} onChangeText={setTdSistolik} />
               </View>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Heart size={18} color="#64748B" />
                  <TextInput style={styles.input} placeholder="Diastolik" keyboardType="numeric" value={tdDiastolik} onChangeText={setTdDiastolik} />
               </View>
            </View>

            <View style={styles.row}>
               <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Activity size={18} color="#64748B" />
                  <TextInput style={styles.input} placeholder="BB (kg)" keyboardType="numeric" value={berat} onChangeText={setBerat} />
               </View>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Activity size={18} color="#64748B" />
                  <TextInput style={styles.input} placeholder="TB (cm)" keyboardType="numeric" value={tinggi} onChangeText={setTinggi} />
               </View>
            </View>

            <View style={styles.row}>
               <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Activity size={18} color="#64748B" />
                  <TextInput style={styles.input} placeholder="L. Perut (cm)" keyboardType="numeric" value={lingkarPerut} onChangeText={setLingkarPerut} />
               </View>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Activity size={18} color="#64748B" />
                  <TextInput style={styles.input} placeholder="LiLA (cm)" keyboardType="numeric" value={lila} onChangeText={setLila} />
               </View>
            </View>

            <Text style={styles.sectionLabel}>Pemeriksaan Darah (Opsional)</Text>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Droplet size={18} color="#EF4444" />
                <TextInput style={styles.input} placeholder="Gula Darah (mg/dL)" keyboardType="numeric" value={gulaDarah} onChangeText={setGulaDarah} />
              </View>
              <View style={styles.inputGroup}>
                <Thermometer size={18} color="#F59E0B" />
                <TextInput style={styles.input} placeholder="Asam Urat (mg/dL)" keyboardType="numeric" value={asamUrat} onChangeText={setAsamUrat} />
              </View>
              <View style={styles.inputGroup}>
                <Activity size={18} color="#3B82F6" />
                <TextInput style={styles.input} placeholder="Kolesterol (mg/dL)" keyboardType="numeric" value={kolesterol} onChangeText={setKolesterol} />
              </View>
              <View style={styles.inputGroup}>
                <Activity size={18} color="#8B5CF6" />
                <TextInput style={styles.input} placeholder="Trigliserida (mg/dL)" keyboardType="numeric" value={trigliserida} onChangeText={setTrigliserida} />
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
        return (
          <View style={[styles.stepContainer, styles.center]}>
            <CheckCircle2 size={64} color="#22C55E" />
            <Text style={styles.successTitle}>Pemeriksaan Tersimpan!</Text>
            <Text style={styles.successDesc}>Data pemeriksaan {selectedLansia?.nama} telah dicatat.</Text>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => router.replace('/(tabs)/service-desk')}
            >
              <Text style={styles.primaryButtonText}>Kembali ke Menu Utama</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryButton} 
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
           <Text style={styles.headerTitle}>Layanan Lansia</Text>
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
    marginTop: 16,
  },
  textArea: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  form: {
    gap: 12,
    marginBottom: 32,
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
    fontSize: 15,
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
    marginTop: 12,
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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
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
