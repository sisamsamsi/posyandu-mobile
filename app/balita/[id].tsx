import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Baby, 
  Calendar, 
  User, 
  MapPin,
  TrendingUp,
  History,
  AlertCircle,
  LayoutDashboard,
  Syringe,
  ChevronRight,
  MessageCircle,
  MoreVertical
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useBalita } from '../../hooks/useBalita';
import { usePenimbangan } from '../../hooks/usePenimbangan';
import { ImunisasiService } from '../../services/imunisasi-service';
import { Balita, WHOReferenceRow, RiskCalculationResult, Penimbangan } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { GrowthChart } from '../../components/charts/GrowthChart';
import { RiskSummary } from '../../components/ui/RiskSummary';
import { ZScoreEngine } from '../../services/zscore-engine';
import { whoService } from '../../services/who-service';
import { RiskPredictionService } from '../../services/risk-prediction';
import { calculateAgeMonths, calculateAgeMonthsDecimal } from '../../lib/utils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { COLORS } from '../../lib/constants';

type TabType = 'profil' | 'grafik' | 'riwayat' | 'imunisasi' | 'risiko';

const { width: screenWidth } = Dimensions.get('window');

const StatusBadge = ({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }) => {
  const getStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: '#E6F4EA', // very light green
          borderColor: '#A8DAB5', // green border
          textColor: '#137333', // green text
        };
      case 'warning':
        return {
          backgroundColor: '#FEF7E0', // very light orange/yellow
          borderColor: '#FAD28F', // orange border
          textColor: '#B06000', // orange text
        };
      case 'danger':
        return {
          backgroundColor: '#FCE8E6', // very light red
          borderColor: '#F8B4AE', // red border
          textColor: '#C5221F', // red text
        };
      case 'info':
      default:
        return {
          backgroundColor: '#E8F0FE', // very light blue
          borderColor: '#ADC1FA', // blue border
          textColor: '#174EA6', // blue text
        };
    }
  };

  const colors = getStyles();

  return (
    <View style={{
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    }}>
      <Text style={{
        color: colors.textColor,
        fontSize: 10,
        fontWeight: 'bold',
      }}>
        {label}
      </Text>
    </View>
  );
};

const getStatusBadgeProps = (indicator: 'BB/U' | 'TB/U' | 'BB/TB', statusText: string | null | undefined) => {
  const text = statusText || '';
  if (indicator === 'BB/U') {
    if (text.includes('Sangat Kurang') || text.includes('Sangat Kurus') || text.includes('SK')) {
      return { label: 'BB/U Sangat Kurang', variant: 'danger' as const };
    }
    if (text.includes('Kurang') || text.includes('K')) {
      return { label: 'BB/U Kurang', variant: 'warning' as const };
    }
    if (text.includes('Normal') || text.includes('N')) {
      return { label: 'BB/U Normal', variant: 'success' as const };
    }
    if (text.includes('Lebih') || text.includes('RL')) {
      return { label: 'BB/U Risiko Lebih', variant: 'info' as const };
    }
    return { label: 'BB/U Normal', variant: 'success' as const };
  } else if (indicator === 'TB/U') {
    if (text.includes('Sangat Pendek') || text.includes('SP')) {
      return { label: 'TB/U Sangat Pendek', variant: 'danger' as const };
    }
    if (text.includes('Pendek') || text.includes('Kurang') || text.includes('P')) {
      return { label: 'TB/U Kurang', variant: 'warning' as const };
    }
    if (text.includes('Normal') || text.includes('N')) {
      return { label: 'TB/U Normal', variant: 'success' as const };
    }
    if (text.includes('Tinggi') || text.includes('T')) {
      return { label: 'TB/U Tinggi', variant: 'info' as const };
    }
    return { label: 'TB/U Normal', variant: 'success' as const };
  } else {
    // BB/TB
    if (text.includes('Buruk') || text.includes('Severely Wasted')) {
      return { label: 'BB/TB Buruk', variant: 'danger' as const };
    }
    if (text.includes('Kurang') || text.includes('Wasted')) {
      return { label: 'BB/TB Kurang', variant: 'warning' as const };
    }
    if (text.includes('Baik') || text.includes('Normal') || text.includes('N')) {
      return { label: 'BB/TB Normal', variant: 'success' as const };
    }
    if (text.includes('Lebih') || text.includes('Overweight') || text.includes('Berisiko')) {
      return { label: 'BB/TB Lebih', variant: 'info' as const };
    }
    if (text.includes('Obesitas')) {
      return { label: 'BB/TB Obesitas', variant: 'danger' as const };
    }
    return { label: 'BB/TB Normal', variant: 'success' as const };
  }
};

export default function BalitaDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getBalitaById, deleteBalita, loading: balitaLoading } = useBalita();
  const { deletePenimbangan } = usePenimbangan();
  
  const [balita, setBalita] = useState<Balita | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profil');
  const [whoBB, setWhoBB] = useState<WHOReferenceRow[]>([]);
  const [whoTB, setWhoTB] = useState<WHOReferenceRow[]>([]);
  const [whoIMT, setWhoIMT] = useState<WHOReferenceRow[]>([]);
  const [whoBBTB, setWhoBBTB] = useState<WHOReferenceRow[]>([]);
  const [riskResult, setRiskResult] = useState<RiskCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Custom states for child profile photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);

  // State for KMS indicator selection
  const [chartIndicator, setChartIndicator] = useState<'BB' | 'TB' | 'BB_TB'>('BB');

  const loadLocalPhoto = async () => {
    try {
      const path = `${FileSystem.documentDirectory}balita_${id}.jpg`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        setPhotoUri(path);
      } else {
        setPhotoUri(null);
      }
    } catch (e) {
      console.error('Error loading photo:', e);
    }
  };

  const handleUpdatePhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Izin Diperlukan', 'Aplikasi memerlukan akses ke galeri Anda untuk mengunggah foto.');
      return;
    }

    Alert.alert(
      'Pilih Sumber Foto',
      'Silakan pilih kamera untuk mengambil foto langsung atau galeri untuk memilih foto yang sudah ada.',
      [
        {
          text: 'Kamera',
          onPress: async () => {
            const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraPerm.granted === false) {
              Alert.alert('Izin Diperlukan', 'Aplikasi memerlukan akses ke kamera untuk mengambil foto.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets[0].uri) {
              await savePhoto(result.assets[0].uri);
            }
          }
        },
        {
          text: 'Galeri',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets[0].uri) {
              await savePhoto(result.assets[0].uri);
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

  const savePhoto = async (tempUri: string) => {
    try {
      const destination = `${FileSystem.documentDirectory}balita_${id}.jpg`;
      await FileSystem.copyAsync({
        from: tempUri,
        to: destination
      });
      setPhotoRefreshKey(prev => prev + 1);
      await loadLocalPhoto();
      Alert.alert('Sukses', 'Foto balita berhasil diperbarui!');
    } catch (err) {
      console.error('Error saving photo:', err);
      Alert.alert('Error', 'Gagal menyimpan foto');
    }
  };

  const fetchAllData = async () => {
    if (typeof id !== 'string') return;
    
    setLoading(true);
    try {
      const data = await getBalitaById(id);
      if (data) {
        setBalita(data);
        
        // Fetch WHO standards
        const [bbStandards, tbStandards, imtStandards, bbtbStandards] = await Promise.all([
          whoService.getStandards('bb_u', data.jenis_kelamin),
          whoService.getStandards('tb_u', data.jenis_kelamin),
          whoService.getStandards('imt_u', data.jenis_kelamin),
          whoService.getStandards('bb_tb', data.jenis_kelamin)
        ]);
        setWhoBB(bbStandards);
        setWhoTB(tbStandards);
        setWhoIMT(imtStandards);
        setWhoBBTB(bbtbStandards);

        // Calculate Risk if there is penimbangan data
        const validPenimbangans = (data.penimbangans || []).filter(p => 
          new Date(p.tanggal).getTime() <= new Date().getTime() && 
          (p.berat_badan > 0 || p.tinggi_badan > 0)
        );
        const latest = [...validPenimbangans].sort((a,b) => 
          new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
        )[0];
        
        if (latest) {
           const genderChar = data.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';
           const ageAtMeasurementDecimal = calculateAgeMonthsDecimal(data.tanggal_lahir, latest.tanggal);
           
           // Repair missing Z-Scores/Statuses locally for analysis accuracy
           const repairedLatest = { ...latest };
           
           if (!repairedLatest.zscore_bb_u || !repairedLatest.status_bb_u) {
             const res = ZScoreEngine.calculate(bbStandards, genderChar, ageAtMeasurementDecimal, latest.berat_badan, 'BB/U');
             repairedLatest.zscore_bb_u = res.zscore;
             repairedLatest.status_bb_u = res.status;
           }
           
           if (!repairedLatest.zscore_tb_u || !repairedLatest.status_tb_u) {
             const res = ZScoreEngine.calculate(tbStandards, genderChar, ageAtMeasurementDecimal, latest.tinggi_badan, 'TB/U');
             repairedLatest.zscore_tb_u = res.zscore;
             repairedLatest.status_tb_u = res.status;
           }
           
           if (!repairedLatest.status_gizi_imt_u || !repairedLatest.zscore_imt_u) {
             const bmi = latest.berat_badan / ((latest.tinggi_badan / 100) ** 2);
             const res = ZScoreEngine.calculate(imtStandards, genderChar, ageAtMeasurementDecimal, bmi, 'IMT/U');
             repairedLatest.zscore_imt_u = res.zscore;
             repairedLatest.status_gizi_imt_u = res.status;
           }

           const history = validPenimbangans.filter(p => p.id !== latest.id);
           const risk = RiskPredictionService.calculate(data, repairedLatest, history);
           setRiskResult(risk);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    loadLocalPhoto();
  }, [id, photoRefreshKey]);

  const handleMoreActions = () => {
    Alert.alert(
      'Pilihan Aksi',
      'Pilih tindakan yang ingin Anda lakukan untuk warga ini.',
      [
        {
          text: 'Edit Data Balita',
          onPress: () => balita?.id && router.push(`/balita/${balita.id}/edit`),
        },
        {
          text: 'Hapus Warga',
          style: 'destructive',
          onPress: handleDelete,
        },
        {
          text: 'Batal',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus data balita ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            if (balita?.id) {
              const success = await deleteBalita(balita.id);
              if (success) {
                router.replace('/balita');
              }
            }
          }
        }
      ]
    );
  };
  const handleDeletePenimbangan = (pId: string) => {
    Alert.alert(
      'Hapus Data',
      'Apakah Anda yakin ingin menghapus data penimbangan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            const success = await deletePenimbangan(pId);
            if (success) {
              fetchAllData();
            }
          }
        }
      ]
    );
  };

  if (loading || balitaLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.tealPrimary} />
        <Text style={styles.loadingText}>Memuat data balita...</Text>
      </View>
    );
  }

  if (!balita) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorText}>Data tidak ditemukan</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAllData}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const calculateAgeDetail = (birthDateString: string) => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months = 12 + months;
    }
    return `${years} th ${months} bln`;
  };

  const calculateAgeDaysDetail = (birthDateString: string) => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days = prevMonth.getDate() + days;
      months--;
    }
    
    if (months < 0) {
      years--;
      months = 12 + months;
    }
    
    const parts = [];
    if (years > 0) parts.push(`${years} tahun`);
    if (months > 0) parts.push(`${months} bulan`);
    if (days > 0) parts.push(`${days} hari`);
    
    return parts.join(' ') || '0 hari';
  };

  const renderTabContent = () => {
    const validPenimbangans = (balita.penimbangans || []).filter(p => 
      new Date(p.tanggal).getTime() <= new Date().getTime() && 
      (p.berat_badan > 0 || p.tinggi_badan > 0)
    );
    const latestMeasurement = [...validPenimbangans].sort((a,b) => 
      new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    )[0];

    switch (activeTab) {
      case 'profil':
        return (
          <View>
            <Card style={styles.bentoInfoCard}>
              <Text style={styles.bentoInfoTitle}>Informasi Balita</Text>
              
              <TableRow label="Nama Lengkap" value={balita.nama} />
              <TableRow label="NIK" value={balita.nik} />
              <TableRow label="Jenis Kelamin" value={balita.jenis_kelamin} />
              <TableRow label="Tanggal Lahir" value={format(new Date(balita.tanggal_lahir), 'dd MMMM yyyy', { locale: idLocale })} />
              <TableRow label="Usia" value={calculateAgeDaysDetail(balita.tanggal_lahir)} />
              <TableRow label="Posyandu" value={balita.posyandu?.nama_posyandu || '-'} />
              <TableRow label="Alamat" value={`${balita.alamat} (RT ${balita.rt || 1})`} />
              <TableRow label="Nama Ayah" value={balita.nama_ayah || '-'} />
              <TableRow label="Nama Ibu" value={balita.nama_ortu || '-'} />
              <TableRow label="No. HP Orang Tua" value={balita.no_hp_ortu || '-'} isLast />
            </Card>

            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>BB Lahir</Text>
                <Text style={styles.statValue}>{balita.bb_lahir || '-'} <Text style={styles.unit}>kg</Text></Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>TB Lahir</Text>
                <Text style={styles.statValue}>{balita.tb_lahir || '-'} <Text style={styles.unit}>cm</Text></Text>
              </Card>
            </View>
          </View>
        );

      case 'grafik': {
        let activeStandards = whoBB;
        let chartIndicatorKey: 'BB' | 'TB' | 'IMT' | 'BB_TB' = 'BB';
        let chartTitle = 'Berat Badan menurut Umur (BB/U)';
        if (chartIndicator === 'TB') {
          activeStandards = whoTB;
          chartIndicatorKey = 'TB';
          chartTitle = 'Tinggi Badan menurut Umur (TB/U)';
        } else if (chartIndicator === 'BB_TB') {
          activeStandards = whoBBTB;
          chartIndicatorKey = 'BB_TB';
          chartTitle = 'Berat Badan menurut Tinggi Badan (BB/TB)';
        }

        return (
          <View>
            {/* Tombol Pil Horizontal Indikator */}
            <View style={styles.chartSelectorRow}>
              <TouchableOpacity 
                style={[styles.chartSelectorTab, chartIndicator === 'BB' && styles.chartSelectorTabActive]}
                onPress={() => setChartIndicator('BB')}
              >
                <Text style={[styles.chartSelectorTabText, chartIndicator === 'BB' && styles.chartSelectorTabTextActive]}>BB/U</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chartSelectorTab, chartIndicator === 'TB' && styles.chartSelectorTabActive]}
                onPress={() => setChartIndicator('TB')}
              >
                <Text style={[styles.chartSelectorTabText, chartIndicator === 'TB' && styles.chartSelectorTabTextActive]}>TB/U</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chartSelectorTab, chartIndicator === 'BB_TB' && styles.chartSelectorTabActive]}
                onPress={() => setChartIndicator('BB_TB')}
              >
                <Text style={[styles.chartSelectorTabText, chartIndicator === 'BB_TB' && styles.chartSelectorTabTextActive]}>BB/TB</Text>
              </TouchableOpacity>
            </View>

            <GrowthChart 
              standards={activeStandards} 
              data={balita.penimbangans || []} 
              indicator={chartIndicatorKey} 
              title={chartTitle} 
              birthDate={balita.tanggal_lahir}
              bbLahir={balita.bb_lahir}
              tbLahir={balita.tb_lahir}
            />

            {/* Tabel Riwayat Pengukuran */}
            <View style={styles.tableCard}>
              <Text style={styles.tableCardTitle}>Riwayat Pengukuran</Text>
              {validPenimbangans.length > 0 ? (
                [...validPenimbangans].sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((p, index) => {
                  const isLatest = index === 0;
                  let zscoreVal = '-';
                  if (chartIndicator === 'BB') {
                    zscoreVal = p.zscore_bb_u !== null ? `Z-score ${p.zscore_bb_u.toFixed(2)}` : '-';
                  } else if (chartIndicator === 'TB') {
                    zscoreVal = p.zscore_tb_u !== null ? `Z-score ${p.zscore_tb_u.toFixed(2)}` : '-';
                  } else if (chartIndicator === 'BB_TB') {
                    zscoreVal = p.zscore_bb_tb !== null ? `Z-score ${p.zscore_bb_tb.toFixed(2)}` : '-';
                  }
                  
                  return (
                    <View 
                      key={p.id} 
                      style={[
                        styles.tableRow, 
                        isLatest && { 
                          backgroundColor: '#E6F4EA', 
                          borderRadius: 12, 
                          paddingHorizontal: 8,
                          marginHorizontal: -8,
                        }
                      ]}
                    >
                      <Text style={[
                        styles.tableCell, 
                        { flex: 2.2, fontWeight: '700' },
                        isLatest && { color: '#09A477' }
                      ]}>
                        {format(new Date(p.tanggal), 'd MMM yyyy', { locale: idLocale })}
                      </Text>
                      <Text style={[
                        styles.tableCell, 
                        { flex: 1.2, textAlign: 'center', fontWeight: '600' },
                        isLatest && { color: '#09A477' }
                      ]}>
                        {p.berat_badan.toFixed(1)} kg
                      </Text>
                      <Text style={[
                        styles.tableCell, 
                        { flex: 1.2, textAlign: 'center', fontWeight: '600' },
                        isLatest && { color: '#09A477' }
                      ]}>
                        {p.tinggi_badan.toFixed(1)} cm
                      </Text>
                      <Text style={[
                        styles.tableCell, 
                        { flex: 1.8, textAlign: 'right', fontWeight: '700', color: '#64748B' },
                        isLatest && { color: '#09A477' }
                      ]}>
                        {zscoreVal}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.tableEmptyText}>Belum ada riwayat pengukuran</Text>
              )}
            </View>
          </View>
        );
      }

      case 'riwayat': {
        const sortedPenimbangansAsc = [...(balita.penimbangans || [])].sort(
          (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
        );

        const getTrendsForRecord = (pId: string) => {
          const idx = sortedPenimbangansAsc.findIndex(p => p.id === pId);
          if (idx <= 0) return { bbTrend: 'flat' as const, tbTrend: 'flat' as const };
          const prev = sortedPenimbangansAsc[idx - 1];
          const curr = sortedPenimbangansAsc[idx];
          
          let bbTrend: 'up' | 'down' | 'flat' = 'flat';
          if (curr.berat_badan > prev.berat_badan) bbTrend = 'up';
          else if (curr.berat_badan < prev.berat_badan) bbTrend = 'down';
          
          let tbTrend: 'up' | 'down' | 'flat' = 'flat';
          if (curr.tinggi_badan > prev.tinggi_badan) tbTrend = 'up';
          else if (curr.tinggi_badan < prev.tinggi_badan) tbTrend = 'down';
          
          return { bbTrend, tbTrend };
        };

        return (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Riwayat Penimbangan</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 6,
                gap: 6
              }}>
                <Calendar size={14} color="#64748B" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                  {balita.penimbangans && balita.penimbangans.length > 0
                    ? new Date(Math.max(...balita.penimbangans.map(p => new Date(p.tanggal).getTime()))).getFullYear()
                    : new Date().getFullYear()}
                </Text>
              </View>
            </View>

            {balita.penimbangans && balita.penimbangans.length > 0 ? (
              [...balita.penimbangans].sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((p) => {
                const trends = getTrendsForRecord(p.id);
                return (
                  <Card key={p.id} style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#F1F5F9',
                    elevation: 2,
                    shadowColor: '#64748B',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                  }}>
                     {/* Card Header */}
                     <View style={{
                       flexDirection: 'row',
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       marginBottom: 12,
                     }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} color="#94A3B8" />
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: '#64748B',
                          }}>
                            {format(new Date(p.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity 
                            style={{
                              padding: 6,
                              borderRadius: 8,
                              backgroundColor: COLORS.tealTonal,
                            }} 
                            onPress={() => router.push(`/service-desk/balita?id=${balita.id}&editId=${p.id}`)}
                          >
                             <Edit size={14} color={COLORS.tealPrimary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{
                              padding: 6,
                              borderRadius: 8,
                              backgroundColor: '#FEF2F2',
                            }} 
                            onPress={() => handleDeletePenimbangan(p.id)}
                          >
                             <Trash2 size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                     </View>

                     {/* Card Metrics */}
                     <View style={{
                       flexDirection: 'row',
                       gap: 20,
                       marginBottom: 12,
                       alignItems: 'center',
                     }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600', marginRight: 6 }}>BB</Text>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', marginRight: 4 }}>
                            {p.berat_badan.toFixed(1)} kg
                          </Text>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: trends.bbTrend === 'up' ? '#10B981' : trends.bbTrend === 'down' ? '#EF4444' : '#94A3B8'
                          }}>
                            {trends.bbTrend === 'up' ? '↗' : trends.bbTrend === 'down' ? '↘' : '→'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600', marginRight: 6 }}>TB</Text>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', marginRight: 4 }}>
                            {p.tinggi_badan.toFixed(1)} cm
                          </Text>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: trends.tbTrend === 'up' ? '#10B981' : trends.tbTrend === 'down' ? '#EF4444' : '#94A3B8'
                          }}>
                            {trends.tbTrend === 'up' ? '↗' : trends.tbTrend === 'down' ? '↘' : '→'}
                          </Text>
                        </View>
                     </View>

                     {/* Card Badges */}
                     <View style={{
                       flexDirection: 'row',
                       flexWrap: 'wrap',
                       gap: 6,
                     }}>
                       <StatusBadge {...getStatusBadgeProps('BB/U', p.status_bb_u)} />
                       <StatusBadge {...getStatusBadgeProps('TB/U', p.status_tb_u)} />
                       <StatusBadge {...getStatusBadgeProps('BB/TB', p.status_bb_tb)} />
                     </View>
                  </Card>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <History size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Belum ada riwayat penimbangan.</Text>
              </View>
            )}
          </View>
        );
      }

      case 'imunisasi': {
        const imunisasi = balita.imunisasi;
        const completeness = ImunisasiService.calculateCompleteness(imunisasi);
        const vaccines = [
          { key: 'hb0_date', label: 'HB0 (24 jam)' },
          { key: 'bcg_date', label: 'BCG (<2 bln)' },
          { key: 'penta_1_date', label: 'PENTA 1' },
          { key: 'penta_2_date', label: 'PENTA 2' },
          { key: 'penta_3_date', label: 'PENTA 3' },
          { key: 'ipv_1_date', label: 'IPV 1' },
          { key: 'ipv_2_date', label: 'IPV 2' },
          { key: 'ipv_3_date', label: 'IPV 3' },
          { key: 'pcv_1_date', label: 'PCV 1' },
          { key: 'pcv_2_date', label: 'PCV 2' },
          { key: 'pcv_3_date', label: 'PCV 3 (1 th)' },
          { key: 'rv_1_date', label: 'ROTAVIRUS 1' },
          { key: 'rv_2_date', label: 'ROTAVIRUS 2' },
          { key: 'rv_3_date', label: 'ROTAVIRUS 3' },
          { key: 'mr_date', label: 'MR (9 bln)' },
          { key: 'je_date', label: 'JE (10 bln)' },
          { key: 'booster_penta_date', label: 'BOOSTER PENTA (18 bln)' },
          { key: 'booster_mr_date', label: 'BOOSTER MR (18 bln)' },
        ];

        return (
          <View>
            <Card style={styles.imunisasiCompletenessCard}>
              <View style={styles.completenessHeader}>
                <Text style={styles.completenessLabel}>Kelengkapan Imunisasi</Text>
                <Text style={styles.completenessValue}>{completeness}%</Text>
              </View>
              <View style={styles.completenessBarBg}>
                <View style={[styles.completenessBarFill, { width: `${completeness}%` }]} />
              </View>
            </Card>
            
            <Card style={styles.vaccineCard}>
              <Text style={styles.vaccineCardTitle}>Daftar Vaksinasi Dasar</Text>
              {vaccines.map((v) => {
                const dateVal = imunisasi ? (imunisasi as any)[v.key] : null;
                const isCompleted = !!dateVal;
                return (
                  <View key={v.key} style={styles.vaccineRow}>
                    <View style={styles.vaccineLeft}>
                      <View style={[
                        styles.vaccineIconCircle, 
                        { backgroundColor: isCompleted ? '#E6F4EA' : '#F1F5F9' }
                      ]}>
                        <Syringe size={14} color={isCompleted ? '#10B981' : '#94A3B8'} />
                      </View>
                      <Text style={[styles.vaccineLabelText, isCompleted && { fontWeight: '700', color: '#1E293B' }]}>
                        {v.label}
                      </Text>
                    </View>
                    <Text style={styles.vaccineDateText}>
                      {isCompleted ? format(new Date(dateVal), 'dd/MM/yyyy') : 'Belum'}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>
        );
      }

      case 'risiko':
        return riskResult ? (
          <RiskSummary result={riskResult} />
        ) : (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>Data tidak cukup untuk analisis risiko.</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'grafik' ? 'Grafik KMS' : 'Detail Balita'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push(`/balita/${balita.id}/edit`)} 
            style={styles.headerAction}
          >
            <Edit size={20} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMoreActions} style={styles.headerAction}>
            <MoreVertical size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Container (Left-aligned) */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Card style={styles.profileInfoCard}>
            <View style={styles.profileInfoContainer}>
              <TouchableOpacity onPress={handleUpdatePhoto} activeOpacity={0.7} style={styles.photoContainer}>
                {photoUri ? (
                  <Image 
                    source={{ uri: `${photoUri}?k=${photoRefreshKey}` }} 
                    style={styles.avatarImage} 
                  />
                ) : (
                  <View style={styles.avatarCircleFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {balita.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraIconBadge}>
                  <Edit size={10} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.profileTextInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.balitaName} numberOfLines={1}>{balita.nama}</Text>
                  <View style={styles.aktifBadge}>
                    <Text style={styles.aktifText}>Aktif</Text>
                  </View>
                </View>
                <Text style={styles.balitaSubtitle}>
                  {balita.jenis_kelamin} • {calculateAgeDetail(balita.tanggal_lahir)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* 3-Column Metrics Card Row */}
        <View style={styles.metricsRow}>
          {/* Card 1: BB Terakhir */}
          <Card style={styles.metricItemCard}>
            <Text style={styles.metricLabel}>BB Terakhir</Text>
            {(() => {
              const validPenimbangans = (balita.penimbangans || []).filter(p => 
                new Date(p.tanggal).getTime() <= new Date().getTime() && p.berat_badan > 0
              );
              const latest = [...validPenimbangans].sort((a,b) => 
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
              )[0];
              const displayVal = latest ? `${latest.berat_badan.toFixed(1)} kg` : '-';
              const displayDate = latest ? format(new Date(latest.tanggal), 'd MMM yyyy', { locale: idLocale }) : 'Belum diukur';
              return (
                <>
                  <Text style={styles.metricValue}>{displayVal}</Text>
                  <Text style={styles.metricSubText}>{displayDate}</Text>
                </>
              );
            })()}
          </Card>
          
          {/* Card 2: TB Terakhir */}
          <Card style={styles.metricItemCard}>
            <Text style={styles.metricLabel}>TB Terakhir</Text>
            {(() => {
              const validPenimbangans = (balita.penimbangans || []).filter(p => 
                new Date(p.tanggal).getTime() <= new Date().getTime() && p.tinggi_badan > 0
              );
              const latest = [...validPenimbangans].sort((a,b) => 
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
              )[0];
              const displayVal = latest ? `${latest.tinggi_badan.toFixed(1)} cm` : '-';
              const ageMonths = latest ? calculateAgeMonths(balita.tanggal_lahir, latest.tanggal) : 0;
              const displayAge = latest ? (
                ageMonths >= 12 
                  ? `${Math.floor(ageMonths / 12)} th ${ageMonths % 12} bln`
                  : `${ageMonths} bln`
              ) : 'Belum diukur';
              return (
                <>
                  <Text style={styles.metricValue}>{displayVal}</Text>
                  <Text style={styles.metricSubText}>{displayAge}</Text>
                </>
              );
            })()}
          </Card>
          
          {/* Card 3: IMT/U */}
          <Card style={styles.metricItemCard}>
            <Text style={styles.metricLabel}>IMT/U</Text>
            {(() => {
              const validPenimbangans = (balita.penimbangans || []).filter(p => 
                new Date(p.tanggal).getTime() <= new Date().getTime() && p.status_gizi_imt_u
              );
              const latest = [...validPenimbangans].sort((a,b) => 
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
              )[0];
              
              const statusText = latest?.status_gizi_imt_u || 'Belum diukur';
              const zScoreVal = latest && latest.zscore_imt_u !== null ? `Z-score ${latest.zscore_imt_u.toFixed(2)}` : 'Z-score -';
              
              // Get color for status badge
              let bg = '#F1F5F9';
              let text = '#64748B';
              if (latest) {
                const status = statusText.toLowerCase();
                if (status.includes('normal') || status.includes('baik')) {
                  bg = '#E6F4EA';
                  text = '#137333';
                } else if (status.includes('kurang') || status.includes('pendek') || status.includes('lebih')) {
                  bg = '#FEF7E0';
                  text = '#B06000';
                } else if (status.includes('buruk') || status.includes('sangat') || status.includes('obesitas')) {
                  bg = '#FCE8E6';
                  text = '#C5221F';
                }
              }
              
              return (
                <>
                  <View style={{
                    backgroundColor: bg,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginTop: 6,
                  }}>
                    <Text style={{
                      color: text,
                      fontSize: 10,
                      fontWeight: '800',
                      textAlign: 'center',
                    }} numberOfLines={1}>
                      {statusText}
                    </Text>
                  </View>
                  <Text style={styles.metricSubText}>{zScoreVal}</Text>
                </>
              );
            })()}
          </Card>
        </View>

        {/* Tab Navigator (Centered Icon / Text below) */}
        <View style={styles.tabBarContainer}>
          <TabItem 
            active={activeTab === 'grafik'} 
            label="KMS Grafik" 
            icon={<TrendingUp size={20} color={activeTab === 'grafik' ? '#09A477' : '#94A3B8'} />}
            onPress={() => setActiveTab('grafik')} 
          />
          <TabItem 
            active={activeTab === 'riwayat'} 
            label="Riwayat" 
            icon={<History size={20} color={activeTab === 'riwayat' ? '#09A477' : '#94A3B8'} />}
            onPress={() => setActiveTab('riwayat')} 
          />
          <TabItem 
            active={activeTab === 'imunisasi'} 
            label="Imunisasi" 
            icon={<Syringe size={20} color={activeTab === 'imunisasi' ? '#09A477' : '#94A3B8'} />}
            onPress={() => setActiveTab('imunisasi')} 
          />
          <TabItem 
            active={activeTab === 'risiko'} 
            label="Catatan" 
            icon={<AlertCircle size={20} color={activeTab === 'risiko' ? '#09A477' : '#94A3B8'} />}
            onPress={() => setActiveTab('risiko')} 
          />
          <TabItem 
            active={activeTab === 'profil'} 
            label="Lainnya" 
            icon={<User size={20} color={activeTab === 'profil' ? '#09A477' : '#94A3B8'} />}
            onPress={() => setActiveTab('profil')} 
          />
        </View>

        <View style={styles.tabContent}>
           {renderTabContent()}
        </View>
      </ScrollView>

      {/* Static Bottom Action Button */}
      <View style={styles.bottomActionContainer}>
        <TouchableOpacity 
          style={styles.bottomActionButton}
          onPress={() => router.push(`/service-desk/balita?id=${balita.id}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomActionText}>+ Input Penimbangan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Sub-components
const InfoRow = ({ icon, label, value, isLast }: { icon: React.ReactNode, label: string, value: string | number, isLast?: boolean }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconContainer}>{icon}</View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const TableRow = ({ label, value, isLast }: { label: string; value: string | number; isLast?: boolean }) => (
  <View style={[styles.tableRowContainer, isLast && { borderBottomWidth: 0 }]}>
    <Text style={styles.tableRowLabel}>{label}</Text>
    <Text style={styles.tableRowValue}>{value}</Text>
  </View>
);

const TabItem = ({ active, label, icon, onPress }: { active: boolean, label: string, icon: React.ReactNode, onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.tabItem, active && styles.activeTabItem]} 
    onPress={onPress}
  >
    {icon}
    <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  backButton: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  headerActions: { flexDirection: 'row' },
  headerAction: { padding: 8, marginLeft: 8 },
  scrollContent: { paddingBottom: 100 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  profileInfoCard: { padding: 12, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  profileInfoContainer: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF' },
  photoContainer: { position: 'relative' },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9' },
  avatarCircleFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F4EA', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 20, fontWeight: '900', color: '#09A477', letterSpacing: -0.5 },
  cameraIconBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#09A477', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  profileTextInfo: { flex: 1, justifyContent: 'center' },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  balitaName: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  balitaSubtitle: { fontSize: 13, color: '#475569', fontWeight: '600', marginTop: 4 },
  balitaDateBirth: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  aktifBadge: { backgroundColor: '#E6F4EA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  aktifText: { fontSize: 10, fontWeight: '800', color: '#09A477' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, gap: 8 },
  metricItemCard: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  metricLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  metricValue: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 6 },
  metricSubText: { fontSize: 9, color: '#64748B', marginTop: 4, fontWeight: '600' },
  metricStatusText: { fontSize: 9, fontWeight: '800', marginTop: 4 },
  tabBarContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },
  activeTabLabel: { color: '#09A477' },
  tabContent: { padding: 16 },
  bentoInfoCard: { padding: 16, marginBottom: 16, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000000', shadowOpacity: 0.03, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  bentoInfoTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B', marginBottom: 12 },
  tableRowContainer: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  tableRowLabel: { width: '38%', fontSize: 13, color: '#64748B', fontWeight: '600' },
  tableRowValue: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 20 },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#09A477', marginTop: 4 },
  unit: { fontSize: 12, fontWeight: 'normal', color: '#94A3B8' },
  chartSelectorRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chartSelectorTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: '#F1F5F9' },
  chartSelectorTabActive: { backgroundColor: '#09A477' },
  chartSelectorTabText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chartSelectorTabTextActive: { color: '#FFFFFF' },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#64748B', shadowOpacity: 0.05, shadowRadius: 8 },
  tableCardTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B', marginBottom: 12 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9', paddingBottom: 8, marginBottom: 8 },
  tableHeaderCell: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingVertical: 10, alignItems: 'center' },
  tableCell: { fontSize: 13, color: '#334155', fontWeight: '500' },
  tableEmptyText: { textAlign: 'center', color: '#94A3B8', paddingVertical: 20, fontStyle: 'italic', fontSize: 13 },
  imunisasiCompletenessCard: { padding: 16, borderRadius: 24, marginBottom: 16 },
  completenessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  completenessLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  completenessValue: { fontSize: 15, fontWeight: '900', color: '#09A477' },
  completenessBarBg: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  completenessBarFill: { height: '100%', backgroundColor: '#09A477', borderRadius: 5 },
  vaccineCard: { padding: 16, borderRadius: 24, marginBottom: 16 },
  vaccineCardTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B', marginBottom: 16 },
  vaccineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  vaccineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vaccineIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  vaccineLabelText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  vaccineDateText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  bottomActionContainer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#F1F5F9' },
  bottomActionButton: { backgroundColor: '#09A477', borderRadius: 24, height: 52, justifyContent: 'center', alignItems: 'center', width: '100%', elevation: 4, shadowColor: '#09A477', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  bottomActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 14, color: '#64748B', marginTop: 12, marginBottom: 20 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#09A477', borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, color: '#94A3B8', fontSize: 13 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  infoIconContainer: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E6F4EA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  activeTabItem: {}
});
