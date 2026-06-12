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
  Pressable,
  Image
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
  Calendar,
  Activity
} from 'lucide-react-native';
import { useBalita } from '../../hooks/useBalita';
import { usePenimbangan } from '../../hooks/usePenimbangan';
import { useServiceStore } from '../../stores/service-store';
import { Balita, Penimbangan } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { QuickTransition } from '../../components/ui/QuickTransition';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { ZScoreEngine } from '../../services/zscore-engine';
import { whoService } from '../../services/who-service';
import { ReportService } from '../../services/report-service';
import { WhatsAppService } from '../../services/whatsapp-service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../lib/constants';
import { calculateAgeMonths, calculateAgeMonthsDecimal } from '../../lib/utils';

type Step = 'search' | 'input' | 'confirm' | 'success';

export default function BalitaServiceDesk() {
  const router = useRouter();
  const { id: initialId, editId } = useLocalSearchParams();
  const [step, setStep] = useState<Step>('search');
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [allBalitas, setAllBalitas] = useState<Balita[]>([]);
  const [searchResults, setSearchResults] = useState<Balita[]>([]);
  const [selectedBalita, setSelectedBalita] = useState<Balita | null>(null);
  
  // Form Values
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
  const [lila, setLila] = useState('');
  const [lica, setLica] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Live Z-Score States
  const [standards, setStandards] = useState<{ bb: any[]; tb: any[]; imt: any[]; bbtb: any[] } | null>(null);
  const [loadingStandards, setLoadingStandards] = useState(false);
  const [liveResult, setLiveResult] = useState<any>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [previousPenimbangan, setPreviousPenimbangan] = useState<Penimbangan | null>(null);

  const { getBalitas, loading } = useBalita();
  const { updatePenimbangan, addPenimbangan } = usePenimbangan();
  const { activePosyanduId, addToHistory } = useServiceStore();

  useEffect(() => {
    if (initialId && typeof initialId === 'string') {
       autoSelectBalita(initialId);
    }
  }, [initialId]);

  useEffect(() => {
    if (editId && typeof editId === 'string') {
       fetchEditData(editId);
    }
  }, [editId]);

  // Fetch all Balitas on mount for real-time local search
  useEffect(() => {
    const fetchAllData = async () => {
      const data = await getBalitas();
      setAllBalitas(data);
      setSearchResults(data);
    };
    fetchAllData();
  }, []);

  // Filter search results in real-time as searchQuery or allBalitas change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(allBalitas);
    } else {
      const lower = searchQuery.toLowerCase();
      const filtered = allBalitas.filter(b => 
        b.nama.toLowerCase().includes(lower) || 
        b.nik.includes(lower)
      );
      setSearchResults(filtered);
    }
  }, [searchQuery, allBalitas]);

  const fetchEditData = async (eId: string) => {
    const { data } = await supabase.from('penimbangans').select('*').eq('id', eId).single();
    if (data) {
      setBerat(data.berat_badan.toString());
      setTinggi(data.tinggi_badan.toString());
      setLica(data.lingkar_kepala?.toString() || '');
      setLila(data.lingkar_lengan?.toString() || '');
      setTanggal(data.tanggal);
      autoSelectBalita(data.balita_id);
    }
  };

  const autoSelectBalita = async (id: string) => {
    const { data } = await supabase.from('balitas').select('*, posyandu:posyandus(*)').eq('id', id).single();
    if (data) {
      setSelectedBalita(data as Balita);
      setStep('input');
    }
  };

  const onSelectBalita = (balita: Balita) => {
    setSelectedBalita(balita);
    setStep('input');
  };

  // Load standards whenever selectedBalita changes
  useEffect(() => {
    if (selectedBalita) {
      const fetchStandardsForBalita = async () => {
        try {
          setLoadingStandards(true);
          const [bbStd, tbStd, imtStd, bbtbStd] = await Promise.all([
            whoService.getStandards('bb_u', selectedBalita.jenis_kelamin),
            whoService.getStandards('tb_u', selectedBalita.jenis_kelamin),
            whoService.getStandards('imt_u', selectedBalita.jenis_kelamin),
            whoService.getStandards('bb_tb', selectedBalita.jenis_kelamin),
          ]);
          setStandards({ bb: bbStd, tb: tbStd, imt: imtStd, bbtb: bbtbStd });
        } catch (error) {
          console.error("Failed to load WHO standards:", error);
        } finally {
          setLoadingStandards(false);
        }
      };
      fetchStandardsForBalita();
    } else {
      setStandards(null);
    }
  }, [selectedBalita]);

  // Load previous penimbangan for validation
  useEffect(() => {
    if (selectedBalita) {
      const fetchPreviousPenimbangan = async () => {
        try {
          let query = supabase
            .from('penimbangans')
            .select('*')
            .eq('balita_id', selectedBalita.id)
            .order('tanggal', { ascending: false });
            
          if (editId) {
            query = query.neq('id', editId);
          }
          
          const { data, error } = await query.limit(1);
          if (!error && data && data.length > 0) {
            setPreviousPenimbangan(data[0] as Penimbangan);
          } else {
            setPreviousPenimbangan(null);
          }
        } catch (err) {
          console.error('Failed to fetch previous penimbangan:', err);
        }
      };
      fetchPreviousPenimbangan();
    } else {
      setPreviousPenimbangan(null);
    }
  }, [selectedBalita, editId]);

  // Recalculate Z-scores on the fly
  useEffect(() => {
    if (!selectedBalita || !standards || !berat || !tinggi) {
      setLiveResult(null);
      return;
    }

    const cleanedBerat = berat.replace(',', '.');
    const cleanedTinggi = tinggi.replace(',', '.');
    const weightVal = parseFloat(cleanedBerat);
    const heightVal = parseFloat(cleanedTinggi);

    if (isNaN(weightVal) || weightVal <= 0 || isNaN(heightVal) || heightVal <= 0) {
      setLiveResult(null);
      return;
    }

    const ageMonths = calculateAgeMonths(selectedBalita.tanggal_lahir, tanggal);
    const ageMonthsDecimal = calculateAgeMonthsDecimal(selectedBalita.tanggal_lahir, tanggal);
    
    // Automatically assume standard measurement:
    // - Recumbent length for <24 months
    // - Standing height for >=24 months
    // Therefore, adjustedHeight equals heightVal without correction.
    const adjustedHeight = heightVal;
    const gender = selectedBalita.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';

    const bbResult = ZScoreEngine.calculate(standards.bb, gender, ageMonthsDecimal, weightVal, 'BB/U');
    const tbResult = ZScoreEngine.calculate(standards.tb, gender, ageMonthsDecimal, adjustedHeight, 'TB/U');
    const bmiVal = weightVal / ((adjustedHeight / 100) ** 2);
    const imtResult = ZScoreEngine.calculate(standards.imt, gender, ageMonthsDecimal, bmiVal, 'IMT/U');
    const bbtbResult = ZScoreEngine.calculate(standards.bbtb, gender, adjustedHeight, weightVal, 'BB/TB', ageMonthsDecimal);

    setLiveResult({
      bb_u: bbResult,
      tb_u: tbResult,
      imt_u: imtResult,
      bb_tb: bbtbResult,
      bmi: bmiVal,
      adjustedHeight,
      weightVal,
      heightVal
    });
  }, [berat, tinggi, tanggal, standards, selectedBalita]);

  const validationWarnings = React.useMemo(() => {
    const list: { type: 'error' | 'warning'; message: string }[] = [];
    if (!selectedBalita) return list;

    const cleanedBerat = berat.replace(',', '.');
    const cleanedTinggi = tinggi.replace(',', '.');
    const wVal = parseFloat(cleanedBerat);
    const hVal = parseFloat(cleanedTinggi);

    // 1. Check for extreme values (typos)
    if (!isNaN(wVal)) {
      if (wVal < 1.5 || wVal > 30) {
        list.push({
          type: 'error',
          message: `Berat badan (${wVal} kg) di luar batas wajar balita (1.5 - 30 kg). Periksa kembali kemungkinan typo.`
        });
      }
    }
    if (!isNaN(hVal)) {
      if (hVal < 35 || hVal > 130) {
        list.push({
          type: 'error',
          message: `Tinggi badan (${hVal} cm) di luar batas wajar balita (35 - 130 cm). Periksa kembali kemungkinan typo.`
        });
      }
    }

    // 2. Check against previous measurement
    if (previousPenimbangan) {
      const prevDateStr = format(new Date(previousPenimbangan.tanggal), 'dd MMM yyyy');
      if (!isNaN(hVal) && hVal < previousPenimbangan.tinggi_badan) {
        list.push({
          type: 'error',
          message: `Tinggi badan saat ini (${hVal} cm) lebih rendah dari tinggi sebelumnya (${previousPenimbangan.tinggi_badan} cm pada ${prevDateStr}). Balita tidak seharusnya menyusut.`
        });
      }
      if (!isNaN(wVal)) {
        const diffWeight = previousPenimbangan.berat_badan - wVal;
        if (diffWeight > 1.5) {
          list.push({
            type: 'warning',
            message: `Berat badan turun drastis sebesar ${diffWeight.toFixed(2)} kg dibanding sebelumnya (${previousPenimbangan.berat_badan} kg pada ${prevDateStr}). Periksa apakah sudah benar.`
          });
        }
      }
    }

    // 3. Check for Z-score health abnormalities
    if (liveResult) {
      const abnormalStatuses: string[] = [];
      
      // BB/U anomalies
      if (liveResult.bb_u.status.includes('Kurang') || liveResult.bb_u.status.includes('Sangat Kurang')) {
        abnormalStatuses.push(`BB/U: ${liveResult.bb_u.status} (${liveResult.bb_u.zscore.toFixed(2)})`);
      }
      
      // TB/U anomalies (Stunting / Pendek)
      if (liveResult.tb_u.status.includes('Pendek') || liveResult.tb_u.status.includes('Sangat Pendek')) {
        abnormalStatuses.push(`TB/U: ${liveResult.tb_u.status} (${liveResult.tb_u.zscore.toFixed(2)} - Indikasi Stunting)`);
      }
      
      // BB/TB anomalies (Wasted / Obesitas)
      if (liveResult.bb_tb.status.includes('Wasted') || liveResult.bb_tb.status.includes('Kurang') || liveResult.bb_tb.status.includes('Buruk') || liveResult.bb_tb.status.includes('Obesitas') || liveResult.bb_tb.status.includes('Lebih')) {
        abnormalStatuses.push(`BB/TB: ${liveResult.bb_tb.status} (${liveResult.bb_tb.zscore.toFixed(2)})`);
      }

      if (abnormalStatuses.length > 0) {
        list.push({
          type: 'warning',
          message: `Hasil Z-Score menunjukkan kondisi tidak normal:\n` + abnormalStatuses.map(s => `• ${s}`).join('\n')
        });
      }
    }

    return list;
  }, [berat, tinggi, liveResult, previousPenimbangan, selectedBalita]);

  const [lastSavedStatus, setLastSavedStatus] = useState('');
  const [calculatedResult, setCalculatedResult] = useState<any>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<any>(null);

  const handleSave = async () => {
    if (!selectedBalita || !liveResult) {
      Alert.alert('Error', 'Data berat dan tinggi badan belum valid.');
      return;
    }
    
    // If there are validation warnings, show a warning prompt listing them
    if (validationWarnings.length > 0) {
      const messages = validationWarnings.map((w, i) => `${i + 1}. ${w.message}`).join('\n\n');
      Alert.alert(
        '⚠️ Peringatan Validasi Data',
        `Ditemukan peringatan pada data yang dimasukkan:\n\n${messages}\n\nApakah Anda yakin data ini sudah benar dan ingin menyimpannya?`,
        [
          {
            text: 'Cek Kembali',
            style: 'cancel'
          },
          {
            text: 'Ya, Simpan',
            onPress: () => executeSave()
          }
        ]
      );
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    if (!selectedBalita || !liveResult) return;

    try {
      setLastSavedStatus(liveResult.bb_u.status);
      const resultData = {
        bb_u: liveResult.bb_u,
        tb_u: liveResult.tb_u,
        imt_u: liveResult.imt_u,
        bb_tb: liveResult.bb_tb
      };
      setCalculatedResult(resultData);

      const payload = {
        balita_id: selectedBalita.id,
        tanggal: tanggal,
        berat_badan: liveResult.weightVal,
        tinggi_badan: liveResult.heightVal,
        lingkar_kepala: parseFloat(lica) || null,
        lingkar_lengan: parseFloat(lila) || null,
        bmi: liveResult.bmi,
        zscore_bb_u: liveResult.bb_u.zscore,
        status_bb_u: liveResult.bb_u.status,
        zscore_tb_u: liveResult.tb_u.zscore,
        status_tb_u: liveResult.tb_u.status,
        zscore_imt_u: liveResult.imt_u.zscore,
        status_gizi_imt_u: liveResult.imt_u.status,
        zscore_bb_tb: liveResult.bb_tb.zscore,
        status_bb_tb: liveResult.bb_tb.status,
      };

      let res;
      if (editId) {
        const success = await updatePenimbangan(editId as string, payload);
        res = { error: !success ? new Error('Gagal update data') : null, data: null };
      } else {
        try {
          const inserted = await addPenimbangan(payload);
          res = { error: null, data: inserted };
        } catch (e: any) {
          res = { error: e, data: null };
        }
      }

      if (res.error) throw res.error;

      setLastSavedRecord(editId ? { id: editId, ...payload } : res.data);

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
    if (!selectedBalita || !lastSavedRecord) return;
    
    const message = WhatsAppService.generateHasilPenimbangan(
       selectedBalita,
       lastSavedRecord,
       selectedBalita.posyandu
    );

    if (selectedBalita.no_hp_ortu) {
       await WhatsAppService.openWhatsApp(selectedBalita.no_hp_ortu, message);
    } else {
      try {
        await Share.share({ message });
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
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
                onSubmitEditing={() => {}}
              />
            </View>
            <FlatList 
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => onSelectBalita(item)}>
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>
                      {item.nama ? item.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'B'}
                    </Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.nama}</Text>
                    <Text style={styles.resultNik}>NIK: {item.nik}</Text>
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

      case 'input': {
        const ageMonths = selectedBalita ? calculateAgeMonths(selectedBalita.tanggal_lahir, tanggal) : 0;
        const formattedAge = selectedBalita ? `${Math.floor(ageMonths / 12)} th ${ageMonths % 12} bln` : '';

        return (
          <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            {/* Premium Profil Ringkas Balita */}
            <View style={styles.premiumProfileCard}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarLargeText}>
                  {selectedBalita?.nama ? selectedBalita.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'B'}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileNameLarge}>{selectedBalita?.nama}</Text>
                <Text style={styles.profileNikText}>NIK: {selectedBalita?.nik}</Text>
                <View style={styles.profileBadgesRow}>
                  <View style={styles.profileBadgeMint}>
                    <Text style={styles.profileBadgeMintText}>{selectedBalita?.jenis_kelamin}</Text>
                  </View>
                  <View style={styles.profileBadgeMint}>
                    <Text style={styles.profileBadgeMintText}>{formattedAge}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.changeBalitaBtn} onPress={() => setStep('search')}>
                <Text style={styles.changeBalitaBtnText}>Ganti</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Data Penimbangan & Pengukuran</Text>
            <View style={styles.form}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Berat Badan (kg)</Text>
                <View style={[styles.inputGroup, focusedField === 'berat' && styles.inputGroupFocused]}>
                  <Scale size={18} color={focusedField === 'berat' ? '#09A477' : '#94A3B8'} />
                  <TextInput 
                     style={styles.input} 
                     placeholder="Contoh: 8.50" 
                     keyboardType="decimal-pad"
                     value={berat}
                     onChangeText={handleBeratChange}
                     onFocus={() => setFocusedField('berat')}
                     onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
 
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tinggi / Panjang Badan (cm)</Text>
                <View style={[styles.inputGroup, focusedField === 'tinggi' && styles.inputGroupFocused]}>
                  <Ruler size={18} color={focusedField === 'tinggi' ? '#09A477' : '#94A3B8'} />
                  <TextInput 
                     style={styles.input} 
                     placeholder="Contoh: 75.2" 
                     keyboardType="decimal-pad"
                     value={tinggi}
                     onChangeText={handleTinggiChange}
                     onFocus={() => setFocusedField('tinggi')}
                     onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Lingkar Kepala (cm) (Opsional)</Text>
                <View style={[styles.inputGroup, focusedField === 'lica' && styles.inputGroupFocused]}>
                  <Brain size={18} color={focusedField === 'lica' ? '#09A477' : '#94A3B8'} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Contoh: 35.00" 
                    keyboardType="decimal-pad"
                    value={lica}
                    onChangeText={setLica}
                    onFocus={() => setFocusedField('lica')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>LiLA (Lingkar Lengan Atas) (cm) (Opsional)</Text>
                <View style={[styles.inputGroup, focusedField === 'lila' && styles.inputGroupFocused]}>
                  <Activity size={18} color={focusedField === 'lila' ? '#09A477' : '#94A3B8'} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Contoh: 12.55" 
                    keyboardType="decimal-pad"
                    value={lila}
                    onChangeText={setLila}
                    onFocus={() => setFocusedField('lila')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tanggal Penimbangan</Text>
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
            </View>

            {/* Live Calculation Results Panel */}
            {loadingStandards && (
              <View style={styles.loadingStandardsBox}>
                <ActivityIndicator size="small" color="#09A477" />
                <Text style={styles.loadingStandardsText}>Memuat referensi WHO...</Text>
              </View>
            )}

            {liveResult && (
              <View style={styles.liveCalculationBox}>
                <Text style={styles.liveCalculationTitle}>Hasil Perhitungan Instan</Text>
                <View style={styles.liveGrid}>
                  <ResultCardV2 
                    label="BB/U" 
                    status={liveResult.bb_u.status} 
                    zscore={liveResult.bb_u.zscore} 
                    indicator="berat"
                  />
                  <ResultCardV2 
                    label="TB/U" 
                    status={liveResult.tb_u.status} 
                    zscore={liveResult.tb_u.zscore} 
                    indicator="tinggi"
                  />
                  <ResultCardV2 
                    label="BB/TB" 
                    status={liveResult.bb_tb.status} 
                    zscore={liveResult.bb_tb.zscore} 
                    indicator="proportional"
                  />
                </View>
                <Text style={styles.disclaimerText}>
                  * Perhitungan berdasarkan standar pertumbuhan WHO Anthro 2005. Status gizi bersifat indikatif untuk kader kesehatan.
                </Text>
              </View>
            )}

            {validationWarnings.length > 0 && (
              <View style={styles.warningBoxContainer}>
                <Text style={styles.warningBoxTitle}>⚠️ Validasi & Peringatan Pengukuran</Text>
                {validationWarnings.map((warning, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.warningItem, 
                      warning.type === 'error' ? styles.warningItemError : styles.warningItemWarning
                    ]}
                  >
                    <Text style={[
                      styles.warningText, 
                      warning.type === 'error' ? styles.warningTextError : styles.warningTextWarning
                    ]}>
                      {warning.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, (!liveResult || loadingStandards) && styles.primaryButtonDisabled]} 
              onPress={handleSave}
              disabled={!liveResult || loadingStandards}
            >
              <Text style={styles.primaryButtonText}>Simpan Data</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        );
      }

      case 'confirm':
        return null;

      case 'success':
        return (
          <View style={[styles.stepContainer, styles.center]}>
            <CheckCircle2 size={64} color="#09A477" />
            <Text style={styles.successTitle}>Data Berhasil {editId ? 'Diperbarui' : 'Disimpan'}!</Text>
            <Text style={styles.successDesc}>Penimbangan untuk {selectedBalita?.nama} telah dicatat.</Text>
            
            {calculatedResult && (
              <View style={styles.v2ResultContainer}>
                <Text style={styles.cardResultTitle}>Hasil Analisis Gizi:</Text>
                <View style={styles.v2ResultGrid}>
                  <ResultCardV2 
                    label="BB/U" 
                    status={calculatedResult.bb_u.status} 
                    zscore={calculatedResult.bb_u.zscore} 
                    indicator="berat"
                  />
                  <ResultCardV2 
                    label="TB/U" 
                    status={calculatedResult.tb_u.status} 
                    zscore={calculatedResult.tb_u.zscore} 
                    indicator="tinggi"
                  />
                  <ResultCardV2 
                    label="BB/TB" 
                    status={calculatedResult.bb_tb.status} 
                    zscore={calculatedResult.bb_tb.zscore} 
                    indicator="proportional"
                  />
                </View>
                
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackText}>
                    {calculatedResult.bb_u.status.includes('Normal') 
                      ? '✅ Pertumbuhan anak sesuai dengan usianya. Tetap berikan nutrisi seimbang.' 
                      : '⚠️ Perlu perhatian khusus pada asupan gizi anak. Konsultasikan dengan petugas kesehatan.'}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, { width: '100%', backgroundColor: '#25D366' }]} 
              onPress={handleShareWA}
            >
              <Text style={styles.primaryButtonText}>Bagikan ke WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, { width: '100%', backgroundColor: '#09A477', marginTop: 8 }]} 
              onPress={() => {
                setBerat('');
                setTinggi('');
                setLila('');
                setLica('');
                setSearchQuery('');
                setSelectedBalita(null);
                setLiveResult(null);
                setStep('search');
              }}
            >
              <Text style={styles.primaryButtonText}>Balita Selanjutnya</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryButton, { width: '100%', borderWidth: 0, marginTop: 8 }]} 
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.secondaryButtonText}>Selesai</Text>
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
           <View style={styles.headerLeftContainer}>
             <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
             <Text style={styles.headerTitle}>Layanan Balita</Text>
           </View>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.5,
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
    color: '#0F172A',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#09A477',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  resultNik: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  premiumProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  profileAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarLargeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#09A477',
  },
  profileDetails: {
    flex: 1,
  },
  profileNameLarge: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  profileNikText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  profileBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  profileBadgeMint: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#CCFBF1',
  },
  profileBadgeMintText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#09A477',
  },
  changeBalitaBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeBalitaBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  form: {
    gap: 12,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  inputGroupFocused: {
    borderColor: '#09A477',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
    paddingVertical: 0,
  },
  loadingStandardsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  loadingStandardsText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '500',
  },
  liveCalculationBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 20,
  },
  liveCalculationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  liveGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 15,
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: '#09A477',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  secondaryButtonText: {
    color: '#09A477',
    fontSize: 15,
    fontWeight: 'bold',
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
    color: '#0F172A',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
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
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.5,
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
  cardResultTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  v2ResultContainer: {
    width: '100%',
    marginBottom: 20,
  },
  v2ResultGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  v2Item: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 96,
    borderWidth: 1,
  },
  v2Label: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  v2Status: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
    marginVertical: 4,
  },
  v2ZRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  v2ZLabel: {
    fontSize: 8,
    fontWeight: '600',
  },
  v2ZValue: {
    fontSize: 9,
    fontWeight: '800',
  },
  feedbackBox: {
    backgroundColor: '#F0FDFA',
    padding: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#CCFBF1',
  },
  feedbackText: {
    fontSize: 12,
    color: '#0F766E',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  warningBoxContainer: {
    backgroundColor: '#FFF8F6',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  warningBoxTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991B1B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningItem: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  warningItemError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  warningItemWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  warningTextError: {
    color: '#991B1B',
  },
  warningTextWarning: {
    color: '#92400E',
  },
});

const ResultCardV2 = ({ label, status, zscore, indicator }: { label: string, status: string, zscore: number, indicator: string }) => {
  const isNormal = status.includes('Normal') || status.includes('Baik');
  const isWarning = status.includes('Batas') || status.includes('Resiko') || status.includes('Kurang');
  
  const getColors = () => {
    if (isNormal) return { bg: '#F0FDFA', border: '#CCFBF1', text: '#0F766E', z: '#09A477' };
    if (isWarning) return { bg: '#FFFBEB', border: '#FEF3C7', text: '#B45309', z: '#F59E0B' };
    return { bg: '#FEF2F2', border: '#FEE2E2', text: '#B91C1C', z: '#EF4444' };
  };

  const colors = getColors();

  return (
    <View style={[styles.v2Item, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.v2Label, { color: colors.z }]}>{label}</Text>
      <Text style={[styles.v2Status, { color: colors.text }]}>{status}</Text>
      <View style={styles.v2ZRow}>
        <Text style={[styles.v2ZLabel, { color: colors.z }]}>Z-Score</Text>
        <Text style={[styles.v2ZValue, { color: colors.text }]}>{zscore.toFixed(2)}</Text>
      </View>
    </View>
  );
};

