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
  User, 
  Calendar, 
  MapPin, 
  Activity,
  TrendingUp,
  History,
  AlertCircle,
  LayoutDashboard,
  Heart,
  Droplet,
  Stethoscope
} from 'lucide-react-native';
import { useLansia } from '../../hooks/useLansia';
import { Lansia, PemeriksaanLansia } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { HealthTrendChart } from '../../components/charts/HealthTrendChart';
import { HealthAnalyzer, HealthAnalysisResult } from '../../services/health-analyzer';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

type TabType = 'profil' | 'tren' | 'riwayat';

export default function LansiaDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getLansiaById, deleteLansia, loading: lansiaLoading } = useLansia();
  
  const [lansia, setLansia] = useState<Lansia | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profil');
  const [latestAnalysis, setLatestAnalysis] = useState<HealthAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (typeof id !== 'string') return;
    setLoading(true);
    try {
      const data = await getLansiaById(id);
      if (data) {
        setLansia(data);
        if (data.pemeriksaan_lansias && data.pemeriksaan_lansias.length > 0) {
          const sorted = [...data.pemeriksaan_lansias].sort((a,b) => 
            new Date(b.tanggal_periksa).getTime() - new Date(a.tanggal_periksa).getTime()
          );
          const analysis = HealthAnalyzer.analyze(sorted[0], data);
          setLatestAnalysis(analysis);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Hapus Data', 'Yakin ingin menghapus data lansia ini?', [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Hapus', 
        style: 'destructive',
        onPress: async () => {
          if (lansia?.id) {
            const ok = await deleteLansia(lansia.id);
            if (ok) router.replace('/lansia');
          }
        }
      }
    ]);
  };

  if (loading || lansiaLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Memuat profil lansia...</Text>
      </View>
    );
  }

  if (!lansia) return null;

  const sortedPemeriksaan = [...(lansia.pemeriksaan_lansias || [])].sort((a,b) => 
    new Date(a.tanggal_periksa).getTime() - new Date(b.tanggal_periksa).getTime()
  );

  const lastPemeriksaan = sortedPemeriksaan[sortedPemeriksaan.length - 1];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profil':
        return (
          <View>
            <Card style={styles.infoCard}>
              <InfoRow icon={<Activity size={20} color="#6366F1" />} label="NIK" value={lansia.nik} />
              <InfoRow 
                icon={<Calendar size={20} color="#6366F1" />} 
                label="Tanggal Lahir" 
                value={format(new Date(lansia.tanggal_lahir), 'dd MMMM yyyy', { locale: idLocale })} 
              />
              <InfoRow 
                icon={<MapPin size={20} color="#6366F1" />} 
                label="Alamat" 
                value={`${lansia.alamat || '-'} (RT ${lansia.rt || '-'})`} 
                isLast 
              />
            </Card>

            <View style={styles.statsGrid}>
               <Card style={styles.statCard}>
                  <Text style={styles.statLabel}>BB Terakhir</Text>
                  <Text style={styles.statValue}>{lastPemeriksaan?.berat_badan || '-'} <Text style={styles.unit}>kg</Text></Text>
               </Card>
               <Card style={styles.statCard}>
                  <Text style={styles.statLabel}>LiLA</Text>
                  <Text style={styles.statValue}>{lastPemeriksaan?.lingkar_lengan || '-'} <Text style={styles.unit}>cm</Text></Text>
               </Card>
            </View>

            <Text style={styles.sectionTitle}>Status Kesehatan Terbaru</Text>
            {latestAnalysis ? (
              <View style={styles.alertsGrid}>
                {latestAnalysis.alerts.map((alert, i) => (
                  <Card key={i} style={[styles.alertCard, { borderLeftColor: alert.level === 'danger' ? '#EF4444' : alert.level === 'warning' ? '#F59E0B' : '#22C55E' }]}>
                    <Text style={styles.alertLabel}>{alert.label}</Text>
                    <Text style={[styles.alertValue, { color: alert.level === 'danger' ? '#B91C1C' : alert.level === 'warning' ? '#B45309' : '#15803D' }]}>{alert.value}</Text>
                    <Text style={styles.alertMsg}>{alert.message}</Text>
                  </Card>
                ))}
              </View>
            ) : (
                <Card style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Belum ada data pemeriksaan.</Text>
                </Card>
            )}

            <Text style={styles.sectionTitle}>Riwayat Penyakit</Text>
            <View style={styles.diseaseList}>
              {lansia.penyakit_bawaan && lansia.penyakit_bawaan.length > 0 ? (
                lansia.penyakit_bawaan.map((d, i) => (
                  <View key={i} style={styles.diseaseBadge}>
                    <Text style={styles.diseaseText}>{d}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubText}>Tidak ada riwayat penyakit bawaan.</Text>
              )}
            </View>
          </View>
        );

      case 'tren':
        const labels = sortedPemeriksaan.map(p => format(new Date(p.tanggal_periksa), 'dd/MM'));
        
        return (
          <View>
             <HealthTrendChart 
               title="Tren Tekanan Darah (mmHg)"
               labels={labels}
               legend={['Sistolik', 'Diastolik']}
               datasets={[
                 {
                   data: sortedPemeriksaan.map(p => Number(p.tekanan_darah?.split('/')[0]) || 0),
                   color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                   strokeWidth: 2
                 },
                 {
                   data: sortedPemeriksaan.map(p => Number(p.tekanan_darah?.split('/')[1]) || 0),
                   color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                   strokeWidth: 2
                 }
               ]}
             />
             
             <HealthTrendChart 
               title="Tren Indeks Massa Tubuh (IMT)"
               labels={labels}
               datasets={[
                 {
                   data: sortedPemeriksaan.map(p => {
                      const h = p.tinggi_badan ? p.tinggi_badan / 100 : 0;
                      return h > 0 ? (p.berat_badan || 0) / (h * h) : 0;
                   }),
                   color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                   strokeWidth: 2
                 }
               ]}
             />

             <HealthTrendChart 
               title="Tren Lingkar Perut (cm)"
               labels={labels}
               datasets={[
                 {
                   data: sortedPemeriksaan.map(p => p.lingkar_perut || 0),
                   color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                   strokeWidth: 2
                 }
               ]}
             />
          </View>
        );

      case 'riwayat':
        return (
          <View>
            <Text style={styles.sectionTitle}>Log Pemeriksaan</Text>
            {[...sortedPemeriksaan].reverse().map((p, idx) => (
              <Card key={p.id} style={styles.historyCard}>
                 <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{format(new Date(p.tanggal_periksa), 'dd MMMM yyyy', { locale: idLocale })}</Text>
                    <Badge label={p.tekanan_darah || '-'} variant="info" />
                 </View>
                 <View style={styles.historyGrid}>
                    <HistoryItem label="Gula" value={p.gula_darah} unit="mg/dL" />
                    <HistoryItem label="Asam Urat" value={p.asam_urat} unit="mg/dL" />
                    <HistoryItem label="Kolesterol" value={p.kolesterol} unit="mg/dL" />
                    <HistoryItem label="Trigliserid" value={p.trigliserida} unit="mg/dL" />
                 </View>
                 {p.keluhan && <Text style={styles.historyKeluhan}>Keluhan: {p.keluhan}</Text>}
              </Card>
            ))}
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
        <Text style={styles.headerTitle}>Detail Lansia</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/lansia/${lansia.id}/edit`)} style={styles.headerAction}>
            <Edit size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerAction}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
           <View style={styles.avatarContainer}>
              <User size={48} color="#6366F1" />
           </View>
           <Text style={styles.lansiaName}>{lansia.nama}</Text>
           <Text style={styles.lansiaSubtitle}>{lansia.nik} • {lansia.jenis_kelamin}</Text>
        </View>

        <View style={styles.tabBar}>
          <TabItem 
            active={activeTab === 'profil'} 
            label="Profil" 
            icon={<LayoutDashboard size={18} color={activeTab === 'profil' ? '#0D9488' : '#94A3B8'} />}
            onPress={() => setActiveTab('profil')} 
          />
          <TabItem 
            active={activeTab === 'tren'} 
            label="Tren" 
            icon={<TrendingUp size={18} color={activeTab === 'tren' ? '#0D9488' : '#94A3B8'} />}
            onPress={() => setActiveTab('tren')} 
          />
          <TabItem 
            active={activeTab === 'riwayat'} 
            label="Riwayat" 
            icon={<History size={18} color={activeTab === 'riwayat' ? '#0D9488' : '#94A3B8'} />}
            onPress={() => setActiveTab('riwayat')} 
          />
        </View>

        <View style={styles.tabContent}>
           {renderTabContent()}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push(`/service-desk/lansia?id=${lansia.id}`)}
      >
        <Stethoscope size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Periksa Lansia</Text>
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

const HistoryItem = ({ label, value, unit }: { label: string, value: number | null | undefined, unit: string }) => (
  <View style={styles.hItem}>
    <Text style={styles.hLabel}>{label}</Text>
    <Text style={styles.hValue}>{value || '-'}</Text>
    <Text style={styles.hUnit}>{unit}</Text>
  </View>
);

const TabItem = ({ active, label, icon, onPress }: { active: boolean, label: string, icon: React.ReactNode, onPress: () => void }) => (
  <TouchableOpacity style={[styles.tabItem, active && styles.activeTabItem]} onPress={onPress}>
    {icon}
    <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  backButton: { marginRight: 16, padding: 4 },
  headerActions: { flexDirection: 'row' },
  headerAction: { padding: 8, marginLeft: 8 },
  scrollContent: { paddingBottom: 100 },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  lansiaName: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  lansiaSubtitle: { fontSize: 14, color: '#64748B' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, justifyContent: 'space-between' },
  tabItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  activeTabItem: { backgroundColor: '#EEF2FF' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginTop: 4 },
  activeTabLabel: { color: '#6366F1' },
  tabContent: { padding: 20 },
  infoCard: { padding: 0, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#334155' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 12 },
  statLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#6366F1' },
  unit: { fontSize: 11, fontWeight: 'normal', color: '#94A3B8' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  alertsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  alertCard: { width: '48%', marginBottom: 12, borderLeftWidth: 4, paddingHorizontal: 12, paddingVertical: 10 },
  alertLabel: { fontSize: 10, color: '#64748B' },
  alertValue: { fontSize: 14, fontWeight: 'bold', marginVertical: 2 },
  alertMsg: { fontSize: 10, color: '#94A3B8' },
  diseaseList: { flexDirection: 'row', flexWrap: 'wrap' },
  diseaseBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  diseaseText: { color: '#475569', fontSize: 13 },
  historyCard: { marginBottom: 12 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyDate: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8 },
  hItem: { width: '25%', alignItems: 'center' },
  hLabel: { fontSize: 8, color: '#94A3B8' },
  hValue: { fontSize: 12, fontWeight: 'bold', color: '#1E293B' },
  hUnit: { fontSize: 7, color: '#CBD5E1' },
  historyKeluhan: { fontSize: 12, color: '#64748B', marginTop: 10, fontStyle: 'italic' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, elevation: 8 },
  fabText: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  emptyCard: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  emptySubText: { color: '#94A3B8', fontStyle: 'italic', fontSize: 13 },
});
