import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  FlatList,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  FileUp, 
  FileDown, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  MapPin,
  ChevronRight,
  Database,
  Trash2
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ImportService } from '../../services/import-service';
import { usePosyandu } from '../../hooks/usePosyandu';
import { Posyandu } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function ImportDataScreen() {
  const router = useRouter();
  const [type, setType] = useState<'balita' | 'lansia'>('balita');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Data State
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [selectedPosyandu, setSelectedPosyandu] = useState<Posyandu | null>(null);
  const [showPosyanduPicker, setShowPosyanduPicker] = useState(false);
  const [allPosyandus, setAllPosyandus] = useState<Posyandu[]>([]);

  const { getAllPosyandus } = usePosyandu();

  useEffect(() => {
    loadPosyandus();
  }, []);

  const loadPosyandus = async () => {
    const list = await getAllPosyandus();
    setAllPosyandus(list);
    if (list.length > 0) setSelectedPosyandu(list[0]);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
      });

      if (result.canceled) return;

      setLoading(true);
      const data = await ImportService.parseExcel(result.assets[0].uri);
      setParsedData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      await ImportService.downloadTemplate(type);
    } catch (error: any) {
      Alert.alert('Error', 'Gagal mengunduh template');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedPosyandu) {
      Alert.alert('Error', 'Silakan pilih Posyandu tujuan terlebih dahulu');
      return;
    }

    if (parsedData.length === 0) {
      Alert.alert('Error', 'Tidak ada data untuk di-import');
      return;
    }

    Alert.alert(
      'Konfirmasi Import',
      `Anda akan meng-import ${parsedData.length} data ${type}. Data dengan NIK yang sudah ada akan LEWATI (SKIP). Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Ya, Import', 
          onPress: async () => {
            setImporting(true);
            const result = await ImportService.importData(type, parsedData, selectedPosyandu.id);
            setImporting(false);
            
            let message = `Berhasil: ${result.importedCount}\nLewati (Duplikat): ${result.skippedCount}`;
            if (result.errors.length > 0) {
                message += `\nError: ${result.errors.length}`;
            }

            Alert.alert('Hasil Import', message, [
                { text: 'OK', onPress: () => router.back() }
            ]);
          }
        }
      ]
    );
  };

  const renderPreviewItem = ({ item }: { item: any }) => (
    <View style={styles.previewItem}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewName}>{item.nama || 'Tanpa Nama'}</Text>
        <Text style={styles.previewNik}>{item.nik || 'No NIK'}</Text>
      </View>
      <View style={styles.previewFooter}>
        <Badge label={type === 'balita' ? item.jenis_kelamin : item.penyakit_bawaan || 'Sehat'} variant="info" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Import Data Excel</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Configuration */}
        <Text style={styles.sectionTitle}>1. Konfigurasi Dasar</Text>
        <View style={styles.typeSwitcher}>
           <TouchableOpacity 
             style={[styles.typeBtn, type === 'balita' && styles.activeTypeBtn]} 
             onPress={() => { setType('balita'); setParsedData([]); }}
           >
             <Text style={[styles.typeBtnText, type === 'balita' && styles.activeTypeBtnText]}>Balita</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[styles.typeBtn, type === 'lansia' && styles.activeTypeBtn]} 
             onPress={() => { setType('lansia'); setParsedData([]); }}
           >
             <Text style={[styles.typeBtnText, type === 'lansia' && styles.activeTypeBtnText]}>Lansia</Text>
           </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.posyanduCard}
          onPress={() => setShowPosyanduPicker(true)}
        >
          <MapPin size={20} color="#0D9488" />
          <View style={styles.posyanduInfo}>
             <Text style={styles.posyanduLabel}>Target Posyandu</Text>
             <Text style={styles.posyanduName}>{selectedPosyandu?.nama_posyandu || 'Pilih'}</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Step 2: Template */}
        <Text style={styles.sectionTitle}>2. Persiapkan File</Text>
        <Card style={styles.infoCard}>
           <Info size={20} color="#3B82F6" />
           <Text style={styles.infoText}>
             Gunakan template resmi kami agar format kolom sesuai dengan sistem.
           </Text>
           <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadTemplate}>
              <FileDown size={18} color="#FFF" />
              <Text style={styles.downloadBtnText}>Template</Text>
           </TouchableOpacity>
        </Card>

        {/* Step 3: Pick & Preview */}
        <Text style={styles.sectionTitle}>3. Pilih & Preview</Text>
        {parsedData.length === 0 ? (
          <TouchableOpacity style={styles.pickArea} onPress={handlePickFile} disabled={loading}>
            {loading ? <ActivityIndicator color="#0D9488" /> : (
              <>
                <FileUp size={40} color="#94A3B8" />
                <Text style={styles.pickTitle}>Pilih File Excel/CSV</Text>
                <Text style={styles.pickSubtitle}>Maksimal 5MB</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.previewHeaderRow}>
               <Text style={styles.previewCount}>{parsedData.length} data ditemukan</Text>
               <TouchableOpacity onPress={() => setParsedData([])}>
                  <Text style={styles.clearBtn}>Hapus</Text>
               </TouchableOpacity>
            </View>
            <FlatList 
              data={parsedData.slice(0, 5)}
              renderItem={renderPreviewItem}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
              ListFooterComponent={() => parsedData.length > 5 ? (
                <Text style={styles.moreText}>+ {parsedData.length - 5} data lainnya...</Text>
              ) : null}
            />
            
            <TouchableOpacity 
              style={styles.importBtn} 
              onPress={handleImport}
              disabled={importing}
            >
               {importing ? <ActivityIndicator color="#FFF" /> : (
                 <>
                   <Database size={20} color="#FFF" />
                   <Text style={styles.importBtnText}>Mulai Import ke Database</Text>
                 </>
               )}
            </TouchableOpacity>
          </View>
        )}

        {/* Rules Card */}
        <Card style={styles.ruleCard}>
           <Text style={styles.ruleTitle}>Aturan Import:</Text>
           <View style={styles.ruleRow}>
              <CheckCircle2 size={16} color="#22C55E" />
              <Text style={styles.ruleText}>Format NIK harus 16 digit angka.</Text>
           </View>
           <View style={styles.ruleRow}>
              <CheckCircle2 size={16} color="#22C55E" />
              <Text style={styles.ruleText}>Duplikasi NIK akan secara otomatis **dilewati**.</Text>
           </View>
           <View style={styles.ruleRow}>
              <AlertTriangle size={16} color="#F59E0B" />
              <Text style={styles.ruleText}>Pastikan kolom pengisian tidak ada yang kosong.</Text>
           </View>
        </Card>
      </ScrollView>

      {/* POSYANDU PICKER MODAL */}
      <Modal visible={showPosyanduPicker} animationType="slide" transparent>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Target Posyandu</Text>
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
                      onPress={() => { setSelectedPosyandu(item); setShowPosyanduPicker(false); }}
                    >
                       <MapPin size={18} color="#94A3B8" />
                       <Text style={styles.pickerItemText}>{item.nama_posyandu}</Text>
                       {selectedPosyandu?.id === item.id && <View style={styles.activeDot} />}
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
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12, marginTop: 8 },
  typeSwitcher: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTypeBtn: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  activeTypeBtnText: { color: '#0D9488' },
  posyanduCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  posyanduInfo: { flex: 1, marginLeft: 12 },
  posyanduLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  posyanduName: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', padding: 16, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 12, color: '#1E40AF', marginLeft: 12, marginRight: 8, lineHeight: 18 },
  downloadBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  downloadBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  pickArea: { height: 180, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  pickTitle: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginTop: 12 },
  pickSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  previewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewCount: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  clearBtn: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
  previewItem: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  previewName: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  previewNik: { fontSize: 12, color: '#94A3B8' },
  previewFooter: { alignItems: 'flex-start' },
  moreText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginVertical: 8 },
  importBtn: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 16, marginBottom: 24 },
  importBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  ruleCard: { backgroundColor: '#F8FAFC', padding: 16 },
  ruleTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ruleText: { fontSize: 12, color: '#64748B', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  closeBtn: { color: '#EF4444', fontWeight: 'bold' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItemText: { flex: 1, fontSize: 16, color: '#1E293B', marginLeft: 12 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D9488' }
});
