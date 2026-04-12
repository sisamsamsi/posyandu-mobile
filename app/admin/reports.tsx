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
import { useRouter } from 'expo-router';
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
import { ReportService, SKDNStats } from '../../services/report-service';
import { generateMonthlyReportHtml } from '../../services/pdf-template';
import { Card } from '../../components/ui/Card';
import { usePosyandu } from '../../hooks/usePosyandu';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function ReportsScreen() {
  const router = useRouter();
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
      
      // 1. Fetch Data
      const skdn = await ReportService.getMonthlySKDN(activePosyandu.id, selectedMonth, selectedYear);
      const problems = await ReportService.getProblematicGroups(activePosyandu.id, selectedMonth, selectedYear);
      
      // 2. Generate HTML
      const html = generateMonthlyReportHtml(
        activePosyandu.nama_posyandu,
        MONTHS[selectedMonth - 1],
        selectedYear,
        skdn,
        problems
      );

      // 3. Create PDF
      const { uri } = await Print.printToFileAsync({ html });
      
      // 4. Share
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Info', 'PDF berhasil dibuat: ' + uri);
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
        <Text style={styles.headerTitle}>Laporan Bulanan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Hasilkan laporan PDF standar Puskesmas mencakup indikator SKDN dan daftar balita berisiko.
        </Text>

        <Card style={styles.selectionCard}>
          <Text style={styles.cardLabel}>Periode Laporan</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(!showPicker)}>
               <CalendarIcon size={18} color="#0D9488" />
               <Text style={styles.pickerText}>{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <View style={styles.pickerList}>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                  {[2023, 2024, 2025, 2026].map(y => (
                    <TouchableOpacity 
                      key={y} 
                      style={[styles.yearBtn, selectedYear === y && styles.activeYearBtn]}
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
                      style={[styles.monthBtn, selectedMonth === i + 1 && styles.activeMonthBtn]}
                      onPress={() => { setSelectedMonth(i + 1); setShowPicker(false); }}
                    >
                       <Text style={[styles.monthBtnText, selectedMonth === i + 1 && styles.activeMonthBtnText]}>{m.substring(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>
          )}
        </Card>

        <TouchableOpacity 
          style={[styles.generateBtn, loading && styles.disabledBtn]} 
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
           <Text style={styles.infoTitle}>Isi Laporan PDF:</Text>
           <View style={styles.infoItem}>
              <View style={styles.bullet} />
              <Text style={styles.infoText}>Ringkasan Indikator SKDN (S, K, D, N)</Text>
           </View>
           <View style={styles.infoItem}>
              <View style={styles.bullet} />
              <Text style={styles.infoText}>Analisis Partisipasi & Keberhasilan Program</Text>
           </View>
           <View style={styles.infoItem}>
              <View style={styles.bullet} />
              <Text style={styles.infoText}>Daftar Balita Stunting & Wasting</Text>
           </View>
           <View style={styles.infoItem}>
              <View style={styles.bullet} />
              <Text style={styles.infoText}>Identifikasi Balita 2T (Tidak Naik 2x)</Text>
           </View>
        </View>

        <Card style={styles.alertCard}>
            <AlertCircle size={20} color="#6366F1" />
            <Text style={styles.alertText}>
              Pastikan seluruh data penimbangan bulan {MONTHS[selectedMonth - 1]} sudah terinput sebelum mencetak laporan.
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
  description: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 24 },
  selectionCard: { padding: 16, marginBottom: 24 },
  cardLabel: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase' },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  picker: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12 },
  pickerText: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginLeft: 12 },
  pickerList: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  yearScroll: { marginBottom: 12 },
  yearBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  activeYearBtn: { backgroundColor: '#0D9488' },
  yearBtnText: { color: '#64748B', fontWeight: 'bold' },
  activeYearBtnText: { color: '#FFF' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  monthBtn: { width: '31%', paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F8FAFC', marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  activeMonthBtn: { backgroundColor: '#F0FDFA', borderColor: '#0D9488' },
  monthBtnText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  activeMonthBtnText: { color: '#0D9488' },
  generateBtn: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, elevation: 4, shadowColor: '#0D9488', shadowOpacity: 0.2, shadowRadius: 10 },
  disabledBtn: { opacity: 0.6 },
  generateBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  infoSection: { marginTop: 32 },
  infoTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0D9488', marginRight: 12 },
  infoText: { fontSize: 13, color: '#64748B' },
  alertCard: { marginTop: 32, flexDirection: 'row', padding: 16, backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' },
  alertText: { flex: 1, marginLeft: 12, fontSize: 12, color: '#4338CA', lineHeight: 18 }
});
