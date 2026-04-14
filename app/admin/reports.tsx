import React, { useState } from 'react';
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
import { generateMonthlyReportHtml, generateLansiaReportHtml } from '../../services/pdf-template';
import { Card } from '../../components/ui/Card';
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
  
  const { posyandu: activePosyandu } = usePosyandu();
  const [loading, setLoading] = useState(false);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showPicker, setShowPicker] = useState(false);

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
          activePosyandu.nama_posyandu,
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
          activePosyandu.nama_posyandu,
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
      sourceFile.move(destinationFile);
      const finalUri = sourceFile.uri;
      
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan {isLansia ? 'Lansia' : 'Balita'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Hasilkan laporan PDF bulanan {isLansia ? 'Lansia' : 'Balita'} mencakup data pemeriksaan dan ringkasan indikator.
        </Text>

        <Card style={styles.selectionCard}>
          <Text style={styles.cardLabel}>Periode Laporan</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(!showPicker)}>
               <CalendarIcon size={18} color={themeColor} />
               <Text style={styles.pickerText}>{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <View style={styles.pickerList}>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                  {[2023, 2024, 2025, 2026].map(y => (
                    <TouchableOpacity 
                      key={y} 
                      style={[styles.yearBtn, selectedYear === y && { backgroundColor: themeColor }]}
                      onPress={() => setSelectedYear(y)}
                    >
                       <Text style={[styles.yearBtnText, selectedYear === y && styles.activeYearBtnText]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
               <View style={styles.monthGrid}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.monthBtn, selectedMonth === i + 1 && { backgroundColor: themeBg, borderColor: themeColor }]}
                      onPress={() => { setSelectedMonth(i + 1); setShowPicker(false); }}
                    >
                       <Text style={[styles.monthBtnText, selectedMonth === i + 1 && { color: themeColor }]}>{m.substring(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
          )}
        </Card>

        <TouchableOpacity 
          style={[styles.generateBtn, { backgroundColor: themeColor }, loading && styles.disabledBtn]} 
          onPress={handleGenerateReport}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <>
              <FileDown size={22} color="#FFF" />
              <Text style={styles.generateBtnText}>Unduh Laporan PDF</Text>
            </>
          )}
        </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, elevation: 4, shadowOpacity: 0.2, shadowRadius: 10 },
  disabledBtn: { opacity: 0.6 },
  generateBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  infoSection: { marginTop: 32 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginRight: 12 },
  infoText: { fontSize: 12, color: '#64748B' },
  alertCard: { marginTop: 32, flexDirection: 'row', padding: 16, backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' },
  alertText: { flex: 1, marginLeft: 12, fontSize: 11, color: '#4338CA', lineHeight: 18 }
});
