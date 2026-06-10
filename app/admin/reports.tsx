import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  FileDown, 
  Calendar as CalendarIcon, 
  ChevronRight,
  FileText,
  PieChart as PieChartIcon,
  AlertCircle,
  Share2
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { ReportService } from '../../services/report-service';
import { ImportService } from '../../services/import-service';
import { generateMonthlyReportHtml, generateLansiaReportHtml } from '../../services/pdf-template';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { useServiceStore } from '../../stores/service-store';
import { usePosyandu } from '../../hooks/usePosyandu';
import { format } from 'date-fns';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function ReportsScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'balita' | 'lansia' }>();
  const isLansia = type === 'lansia';
  const themeColor = isLansia ? '#6366F1' : '#0D9488';
  const themeBg = isLansia ? '#EEF2FF' : '#F0FDFA';
  
  const { activePosyanduId } = useServiceStore();
  const { getLinkedPosyandus } = usePosyandu();
  const [activePosyandu, setActivePosyandu] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [fetchingPosyandu, setFetchingPosyandu] = useState(true);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const getPosyanduInfo = async () => {
      let fallbackPosyandu: any = null;
      try {
        const linked = await getLinkedPosyandus();
        if (linked && linked.length > 0) {
          fallbackPosyandu = linked[0].posyandus;
        }
      } catch (err) {
        console.warn('Failed to load linked posyandus:', err);
      }

      if (!activePosyanduId) {
        setActivePosyandu(fallbackPosyandu);
        setFetchingPosyandu(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('posyandus')
          .select('*')
          .eq('id', activePosyanduId)
          .single();
        if (data) setActivePosyandu(data);
        else setActivePosyandu(fallbackPosyandu);
      } catch (e) {
        setActivePosyandu(fallbackPosyandu);
      } finally {
        setFetchingPosyandu(false);
      }
    };
    
    getPosyanduInfo();
  }, [activePosyanduId]);

  const resolvedPosyanduName = isLansia
    ? (activePosyandu?.nama_posyandu_lansia || activePosyandu?.nama_posyandu || 'Posyandu')
    : (activePosyandu?.nama_posyandu_balita || activePosyandu?.nama_posyandu || 'Posyandu');

  const handleGenerateReport = async () => {
    if (!activePosyandu) return;

    try {
      setLoading(true);
      
      let html = '';
      const typeLabel = isLansia ? 'Lansia' : 'Balita';
      const monthLabel = MONTHS[selectedMonth - 1];
      
      if (isLansia) {
        // Lansia Report
        const checks = await ReportService.getLansiaReportData(activePosyandu.id, selectedMonth, selectedYear);
        html = generateLansiaReportHtml(
          resolvedPosyanduName,
          monthLabel,
          selectedYear,
          checks
        );
      } else {
        // Balita Report
        const skdn = await ReportService.getMonthlySKDN(activePosyandu.id, selectedMonth, selectedYear);
        const problems = await ReportService.getProblematicGroups(activePosyandu.id, selectedMonth, selectedYear);
        const weighings = await ReportService.getMonthlyWeighingList(activePosyandu.id, selectedMonth, selectedYear);
        const nutritionSummary = await ReportService.getNutritionSummary(activePosyandu.id, selectedMonth, selectedYear);
        
        html = generateMonthlyReportHtml(
          resolvedPosyanduName,
          monthLabel,
          selectedYear,
          skdn,
          problems,
          weighings,
          nutritionSummary
        );
      }

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html });
      
      // Rename file for meaningful name using new v19 API
      const filename = `Laporan_${typeLabel}_${monthLabel}_${selectedYear}.pdf`.replace(/\s+/g, '_');
      
      // Create File instances
      const sourceFile = new File(uri);
      const destinationFile = new File(Paths.cache, filename);
      
      // Delete existing file if it already exists to prevent move failure
      if (destinationFile.exists) {
        destinationFile.delete();
      }
      
      // Move (rename) and share
      await sourceFile.move(destinationFile);
      const finalUri = destinationFile.uri; // ✅ Ambil URI dari file tujuan, bukan sumber yang sudah dipindahkan
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Info', 'PDF berhasil dibuat: ' + filename);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Gagal membuat laporan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExcel = async () => {
    if (!activePosyandu) return;
    try {
      setExportingExcel(true);
      await ImportService.exportToEPPGBM(
        activePosyandu.id,
        selectedMonth,
        selectedYear,
        resolvedPosyanduName
      );
    } catch (error: any) {
      Alert.alert('Error', 'Gagal membuat laporan Excel: ' + error.message);
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan {isLansia ? 'Lansia' : 'Balita'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.v2HeaderSection}>
           <Text style={styles.description}>
             SIMPUL SEHAT Export — Hasilkan laporan PDF bulanan untuk {isLansia ? 'Lansia' : 'Balita'} mencakup data pemeriksaan dan ringkasan indikator secara otomatis.
           </Text>
        </View>

        <Card style={styles.v2SelectionCard}>
          <Text style={styles.v2CardLabel}>Periode Laporan</Text>
          <TouchableOpacity style={styles.v2Picker} onPress={() => setShowPicker(!showPicker)}>
             <CalendarIcon size={18} color={themeColor} />
             <Text style={styles.v2PickerText}>{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
          </TouchableOpacity>

          {showPicker && (
            <View style={styles.v2PickerList}>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.v2YearScroll}>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                    <TouchableOpacity 
                      key={y} 
                      style={[styles.v2YearBtn, selectedYear === y && { backgroundColor: themeColor }]}
                      onPress={() => setSelectedYear(y)}
                    >
                       <Text style={[styles.v2YearBtnText, selectedYear === y && styles.activeYearBtnText]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
               <View style={styles.v2MonthGrid}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.v2MonthBtn, selectedMonth === i + 1 && { backgroundColor: themeBg, borderColor: themeColor }]}
                      onPress={() => { setSelectedMonth(i + 1); setShowPicker(false); }}
                    >
                       <Text style={[styles.v2MonthBtnText, selectedMonth === i + 1 && { color: themeColor }]}>{m.substring(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
          )}
        </Card>

        <TouchableOpacity 
          style={[styles.v2GenerateBtn, { backgroundColor: themeColor }, loading && styles.disabledBtn]} 
          onPress={handleGenerateReport}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <>
              <FileDown size={22} color="#FFF" />
              <Text style={styles.v2GenerateBtnText}>Generate Report PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {!isLansia && (
          <TouchableOpacity 
            style={[
              styles.v2GenerateBtn, 
              { backgroundColor: '#0D9488', marginTop: 12 }, 
              (exportingExcel || loading) && styles.disabledBtn
            ]} 
            onPress={handleGenerateExcel}
            disabled={exportingExcel || loading}
          >
            {exportingExcel ? <ActivityIndicator color="#FFF" /> : (
              <>
                <FileDown size={22} color="#FFF" />
                <Text style={styles.v2GenerateBtnText}>Export Excel (e-PPGBM)</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.infoSection}>
           <Text style={styles.infoTitle}>Daftar Isi PDF:</Text>
           {isLansia ? (
             <>
               <View style={styles.infoItem}>
                  <View style={[styles.bullet, { backgroundColor: themeColor }]} />
                  <Text style={styles.infoText}>Daftar Pemeriksaan Fisik & IMT</Text>
               </View>
               <View style={styles.infoItem}>
                  <View style={[styles.bullet, { backgroundColor: themeColor }]} />
                  <Text style={styles.infoText}>Hasil Vital Signs (Tekanan Darah)</Text>
               </View>
               <View style={styles.infoItem}>
                  <View style={[styles.bullet, { backgroundColor: themeColor }]} />
                  <Text style={styles.infoText}>Hasil Lab (Gula, Asam Urat, Kolesterol)</Text>
               </View>
             </>
           ) : (
             <>
               <View style={styles.infoItem}>
                  <View style={[styles.bullet, { backgroundColor: themeColor }]} />
                  <Text style={styles.infoText}>Ringkasan Indikator SKDN</Text>
               </View>
               <View style={styles.infoItem}>
                  <View style={[styles.bullet, { backgroundColor: themeColor }]} />
                  <Text style={styles.infoText}>Ringkasan Validasi Masalah Gizi</Text>
               </View>
               <View style={styles.infoItem}>
                  <View style={[styles.bullet, { backgroundColor: themeColor }]} />
                  <Text style={styles.infoText}>Daftar Balita Bermasalah Gizi</Text>
               </View>
               <View style={styles.infoItem}>
                  <View style={[styles.bullet, { backgroundColor: themeColor }]} />
                  <Text style={styles.infoText}>Daftar Penimbangan Keseluruhan</Text>
               </View>
             </>
           )}
        </View>

        <Card style={[styles.alertCard, isLansia && { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
            <AlertCircle size={20} color={isLansia ? '#94A3B8' : '#6366F1'} />
            <Text style={[styles.alertText, isLansia && { color: '#64748B' }]}>
              Pastikan data bulan {MONTHS[selectedMonth - 1]} sudah terinput sebelum mencetak laporan.
            </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  content: { padding: 20 },
  description: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 24 },
  selectionCard: { padding: 16, marginBottom: 24 },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase' },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  picker: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12 },
  pickerText: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginLeft: 12 },
  pickerList: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  yearScroll: { marginBottom: 12 },
  yearBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  yearBtnText: { color: '#64748B', fontWeight: 'bold' },
  activeYearBtnText: { color: '#FFF' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  monthBtn: { width: '31%', paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F8FAFC', marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  monthBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  disabledBtn: { opacity: 0.6 },
  generateBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  infoSection: { marginTop: 32 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginRight: 12 },
  infoText: { fontSize: 12, color: '#64748B' },
  alertCard: { marginTop: 32, flexDirection: 'row', padding: 16, backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' },
  alertText: { flex: 1, marginLeft: 12, fontSize: 11, color: '#4338CA', lineHeight: 18 },
  // V2 STYLES
  v2HeaderSection: {
    marginBottom: 24,
  },
  v2SelectionCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  v2CardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  v2Picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  v2PickerText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginLeft: 12,
  },
  v2PickerList: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
  },
  v2YearScroll: {
    marginBottom: 16,
  },
  v2YearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  v2YearBtnText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 13,
  },
  v2MonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  v2MonthBtn: {
    width: '31%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  v2MonthBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  v2GenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
  },
  v2GenerateBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    marginLeft: 10,
    letterSpacing: -0.3,
  },
});
