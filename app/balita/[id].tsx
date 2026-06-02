import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Dimensions
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
  LayoutDashboard
} from 'lucide-react-native';
import { useBalita } from '../../hooks/useBalita';
import { usePenimbangan } from '../../hooks/usePenimbangan';
import { Balita, WHOReferenceRow, RiskCalculationResult, Penimbangan } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { GrowthChart } from '../../components/charts/GrowthChart';
import { RiskSummary } from '../../components/ui/RiskSummary';
import { ZScoreEngine } from '../../services/zscore-engine';
import { whoService } from '../../services/who-service';
import { RiskPredictionService } from '../../services/risk-prediction';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { COLORS } from '../../lib/constants';

type TabType = 'profil' | 'grafik' | 'riwayat' | 'risiko';

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
             const ageAtMeasurement = RiskPredictionService.calculateAgeMonths(data.tanggal_lahir, latest.tanggal);
             
             // Repair missing Z-Scores/Statuses locally for analysis accuracy
             const repairedLatest = { ...latest };
             
             if (!repairedLatest.zscore_bb_u || !repairedLatest.status_bb_u) {
               const res = ZScoreEngine.calculate(bbStandards, genderChar, ageAtMeasurement, latest.berat_badan, 'BB/U');
               repairedLatest.zscore_bb_u = res.zscore;
               repairedLatest.status_bb_u = res.status;
             }
             
             if (!repairedLatest.zscore_tb_u || !repairedLatest.status_tb_u) {
               const res = ZScoreEngine.calculate(tbStandards, genderChar, ageAtMeasurement, latest.tinggi_badan, 'TB/U');
               repairedLatest.zscore_tb_u = res.zscore;
               repairedLatest.status_tb_u = res.status;
             }
             
             if (!repairedLatest.status_gizi_imt_u || !repairedLatest.zscore_imt_u) {
               const bmi = latest.berat_badan / ((latest.tinggi_badan / 100) ** 2);
               const res = ZScoreEngine.calculate(imtStandards, genderChar, ageAtMeasurement, bmi, 'IMT/U');
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
  }, [id]);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profil':
        return (
          <View>
            <Card style={styles.infoCard}>
              <InfoRow icon={<User size={20} color={COLORS.tealPrimary} />} label="NIK" value={balita.nik} />
              <InfoRow 
                icon={<Calendar size={20} color={COLORS.tealPrimary} />} 
                label="Tanggal Lahir" 
                value={format(new Date(balita.tanggal_lahir), 'dd MMMM yyyy', { locale: idLocale })} 
              />
              <InfoRow icon={<User size={20} color={COLORS.tealPrimary} />} label="Orang Tua" value={balita.nama_ortu} />
              <InfoRow 
                icon={<MapPin size={20} color={COLORS.tealPrimary} />} 
                label="Alamat" 
                value={`${balita.alamat} (RT ${balita.rt})`} 
                isLast 
              />
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

            {riskResult && (
               <Card style={[
                 styles.summaryCard, 
                 { backgroundColor: riskResult.risk_color === 'red' ? '#FEF2F2' : COLORS.tealTonal }
               ]}>
                 <View style={styles.summaryHeader}>
                   <TrendingUp size={20} color={COLORS.tealPrimary} />
                   <Text style={styles.summaryTitle}>Kondisi Terkini</Text>
                 </View>
                 <Text style={[
                   styles.summaryStatus,
                   { color: riskResult.risk_color === 'red' ? '#991B1B' : '#115E59' }
                 ]}>{riskResult.risk_level}</Text>
                 <Text style={styles.summaryDesc}>Berdasarkan data penimbangan terakhir : {riskResult.date ? format(new Date(riskResult.date), 'dd MMM yyyy') : '-'}</Text>
               </Card>
            )}
          </View>
        );

      case 'grafik':
        return (
          <View>
             <GrowthChart 
               standards={whoBB} 
               data={balita.penimbangans || []} 
               indicator="BB" 
               title="Grafik Berat Badan / Umur" 
               birthDate={balita.tanggal_lahir}
               bbLahir={balita.bb_lahir}
               tbLahir={balita.tb_lahir}
             />
             <View style={{ height: 20 }} />
             <GrowthChart 
               standards={whoTB} 
               data={balita.penimbangans || []} 
               indicator="TB" 
               title="Grafik Tinggi Badan / Umur" 
               birthDate={balita.tanggal_lahir}
               bbLahir={balita.bb_lahir}
               tbLahir={balita.tb_lahir}
             />
             <View style={{ height: 20 }} />
             <GrowthChart 
               standards={whoBBTB} 
               data={balita.penimbangans || []} 
               indicator="BB_TB" 
               title="Grafik Berat Badan / Tinggi Badan" 
               birthDate={balita.tanggal_lahir}
               bbLahir={balita.bb_lahir}
               tbLahir={balita.tb_lahir}
             />
          </View>
        );

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
        <Text style={styles.headerTitle}>Detail Balita</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push(`/balita/${balita.id}/edit`)} 
            style={styles.headerAction}
          >
            <Edit size={20} color={COLORS.tealPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerAction}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
             <Baby size={48} color={COLORS.tealPrimary} />
          </View>
          <Text style={styles.balitaName}>{balita.nama}</Text>
          <Text style={styles.balitaSubtitle}>{balita.jenis_kelamin} • {balita.posyandu?.nama_posyandu}</Text>
        </View>

        {/* Tab Navigator */}
        <View style={styles.tabBar}>
          <TabItem 
            active={activeTab === 'profil'} 
            label="Profil" 
            icon={<LayoutDashboard size={18} color={activeTab === 'profil' ? COLORS.tealPrimary : '#94A3B8'} />}
            onPress={() => setActiveTab('profil')} 
          />
          <TabItem 
            active={activeTab === 'grafik'} 
            label="Grafik" 
            icon={<TrendingUp size={18} color={activeTab === 'grafik' ? COLORS.tealPrimary : '#94A3B8'} />}
            onPress={() => setActiveTab('grafik')} 
          />
          <TabItem 
            active={activeTab === 'riwayat'} 
            label="Riwayat" 
            icon={<History size={18} color={activeTab === 'riwayat' ? COLORS.tealPrimary : '#94A3B8'} />}
            onPress={() => setActiveTab('riwayat')} 
          />
          <TabItem 
            active={activeTab === 'risiko'} 
            label="Analisis" 
            icon={<AlertCircle size={18} color={activeTab === 'risiko' ? COLORS.tealPrimary : '#94A3B8'} />}
            onPress={() => setActiveTab('risiko')} 
          />
        </View>

        <View style={styles.tabContent}>
           {renderTabContent()}
        </View>
      </ScrollView>

      {/* Floating Action Button for Service Desk */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push(`/service-desk/balita?id=${balita.id}`)}
      >
        <Edit size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Input Data</Text>
      </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.tealBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.tealBg,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    padding: 8,
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.tealTonal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  balitaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  balitaSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  activeTabItem: {
    backgroundColor: COLORS.tealTonal,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabLabel: {
    color: COLORS.tealPrimary,
  },
  tabContent: {
    padding: 16,
  },
  infoCard: {
    padding: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.tealTonal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.tealPrimary,
  },
  unit: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#94A3B8',
  },
  summaryCard: {
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 8,
  },
  summaryStatus: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  historyCard: {
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  historyStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.tealBg,
    borderRadius: 12,
    padding: 10,
  },
  hStat: {
    flex: 1,
    alignItems: 'center',
  },
  hLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  hValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  historyAction: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.tealTonal,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.tealBg,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.tealPrimary,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.tealPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});
