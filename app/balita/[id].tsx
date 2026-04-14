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

type TabType = 'profil' | 'grafik' | 'riwayat' | 'risiko';

const { width: screenWidth } = Dimensions.get('window');

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
        <ActivityIndicator size="large" color="#0D9488" />
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
              <InfoRow icon={<User size={20} color="#0D9488" />} label="NIK" value={balita.nik} />
              <InfoRow 
                icon={<Calendar size={20} color="#0D9488" />} 
                label="Tanggal Lahir" 
                value={format(new Date(balita.tanggal_lahir), 'dd MMMM yyyy', { locale: idLocale })} 
              />
              <InfoRow icon={<User size={20} color="#0D9488" />} label="Orang Tua" value={balita.nama_ortu} />
              <InfoRow 
                icon={<MapPin size={20} color="#0D9488" />} 
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
               <Card style={[styles.summaryCard, { borderColor: riskResult.risk_color === 'red' ? '#FCA5A5' : '#E2E8F0' }]}>
                 <View style={styles.summaryHeader}>
                   <TrendingUp size={20} color="#0D9488" />
                   <Text style={styles.summaryTitle}>Kondisi Terkini</Text>
                 </View>
                 <Text style={styles.summaryStatus}>{riskResult.risk_level}</Text>
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
             />
             <View style={{ height: 20 }} />
             <GrowthChart 
               standards={whoTB} 
               data={balita.penimbangans || []} 
               indicator="TB" 
               title="Grafik Tinggi Badan / Umur" 
               birthDate={balita.tanggal_lahir}
             />
             <View style={{ height: 20 }} />
             <GrowthChart 
               standards={whoBBTB} 
               data={balita.penimbangans || []} 
               indicator="BB_TB" 
               title="Grafik Berat Badan / Tinggi Badan" 
               birthDate={balita.tanggal_lahir}
             />
             <View style={{ height: 20 }} />
             <GrowthChart 
               standards={whoIMT} 
               data={balita.penimbangans || []} 
               indicator="IMT" 
               title="Grafik IMT / Umur" 
               birthDate={balita.tanggal_lahir}
             />
          </View>
        );

      case 'riwayat':
        return (
          <View>
            <Text style={styles.sectionTitle}>Semua Penimbangan</Text>
            {balita.penimbangans && balita.penimbangans.length > 0 ? (
              [...balita.penimbangans].sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((p, idx) => (
                <Card key={p.id} style={styles.historyCard}>
                   <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>{format(new Date(p.tanggal), 'dd MMMM yyyy', { locale: idLocale })}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Badge 
                          label={p.status_bb_tb || 'N/A'} 
                          variant={p.status_bb_tb?.includes('Gizi Buruk') || p.status_bb_tb?.includes('Gizi Kurang') ? 'danger' : 'success'} 
                        />
                        <TouchableOpacity style={styles.historyAction} onPress={() => router.push(`/service-desk/balita?id=${balita.id}&editId=${p.id}`)}>
                           <Edit size={16} color="#0D9488" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.historyAction} onPress={() => handleDeletePenimbangan(p.id)}>
                           <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                   </View>
                   <View style={styles.historyStats}>
                      <View style={styles.hStat}>
                        <Text style={styles.hLabel}>BB</Text>
                        <Text style={styles.hValue}>{p.berat_badan} kg</Text>
                      </View>
                      <View style={styles.hStat}>
                        <Text style={styles.hLabel}>TB</Text>
                        <Text style={styles.hValue}>{p.tinggi_badan} cm</Text>
                      </View>
                      <View style={styles.hStat}>
                        <Text style={styles.hLabel}>Z-BB/TB</Text>
                        <Text style={styles.hValue}>{p.zscore_bb_tb?.toFixed(2) || '-'}</Text>
                      </View>
                   </View>
                </Card>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <History size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Belum ada riwayat penimbangan.</Text>
              </View>
            )}
          </View>
        );

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
            <Edit size={20} color="#0D9488" />
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
             <Baby size={48} color="#0D9488" />
          </View>
          <Text style={styles.balitaName}>{balita.nama}</Text>
          <Text style={styles.balitaSubtitle}>{balita.jenis_kelamin} • {balita.posyandu?.nama_posyandu}</Text>
        </View>

        {/* Tab Navigator */}
        <View style={styles.tabBar}>
          <TabItem 
            active={activeTab === 'profil'} 
            label="Profil" 
            icon={<LayoutDashboard size={18} color={activeTab === 'profil' ? '#0D9488' : '#94A3B8'} />}
            onPress={() => setActiveTab('profil')} 
          />
          <TabItem 
            active={activeTab === 'grafik'} 
            label="Grafik" 
            icon={<TrendingUp size={18} color={activeTab === 'grafik' ? '#0D9488' : '#94A3B8'} />}
            onPress={() => setActiveTab('grafik')} 
          />
          <TabItem 
            active={activeTab === 'riwayat'} 
            label="Riwayat" 
            icon={<History size={18} color={activeTab === 'riwayat' ? '#0D9488' : '#94A3B8'} />}
            onPress={() => setActiveTab('riwayat')} 
          />
          <TabItem 
            active={activeTab === 'risiko'} 
            label="Analisis" 
            icon={<AlertCircle size={18} color={activeTab === 'risiko' ? '#0D9488' : '#94A3B8'} />}
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
  <View style={[styles.infoRow, !isLast && styles.borderBottom]}>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  balitaName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  balitaSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: '#F0FDFA',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#0D9488',
  },
  tabContent: {
    padding: 20,
  },
  infoCard: {
    padding: 0,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D9488',
  },
  unit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#94A3B8',
  },
  summaryCard: {
    borderWidth: 1,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0D9488',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 8,
  },
  summaryStatus: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  summaryDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  historyStats: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  historyAction: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0D9488',
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
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});
