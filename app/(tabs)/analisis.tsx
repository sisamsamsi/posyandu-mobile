import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  TrendingUp, 
  Users, 
  Heart,
  Baby,
  Activity,
  AlertTriangle
} from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/ui/FilterBar';
import { DistributionChart } from '../../components/charts/DistributionChart';
import { AnalysisService, BalitaAnalysis, LansiaAnalysis, TrendPoint } from '../../services/analysis-service';
import { LineChart } from 'react-native-chart-kit';
import { useServiceStore } from '../../stores/service-store';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';
import { COLORS } from '../../lib/constants';

const screenWidth = Dimensions.get('window').width;

type AnalysisTab = 'balita' | 'lansia' | 'tren';

export default function AnalysisTabScreen() {
  const { activeWorkspace, activePosyanduId } = useServiceStore();
  const [loading, setLoading] = useState(true);
  
  // Align active tab with active workspace initially
  const [activeTab, setActiveTab] = useState<AnalysisTab>(activeWorkspace === 'lansia' ? 'lansia' : 'balita');
  
  // Filters
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [rt, setRt] = useState<number | null>(null);

  // Data
  const [balitaData, setBalitaData] = useState<BalitaAnalysis | null>(null);
  const [lansiaData, setLansiaData] = useState<LansiaAnalysis | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  
  // By Name List States
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [peopleList, setPeopleList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Dynamic Theme
  const isBalita = activeWorkspace === 'balita';
  const theme = {
    primary: isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary,
    background: isBalita ? COLORS.tealBg : COLORS.indigoBg,
    tonal: isBalita ? COLORS.tealTonal : COLORS.indigoTonal,
  };

  const chartThemeColor = activeTab === 'balita' ? COLORS.tealPrimary : (activeTab === 'lansia' ? COLORS.indigoPrimary : '#F59E0B');

  useEffect(() => {
    fetchData();
    setSelectedIndicator(null);
    setSelectedStatus(null);
    setPeopleList([]);
  }, [month, year, rt, activeTab]);

  useEffect(() => {
    if (selectedStatus) {
      fetchPeople();
    } else {
      setPeopleList([]);
    }
  }, [selectedStatus, selectedIndicator]);

  const fetchPeople = async () => {
    if (!selectedStatus) return;
    setListLoading(true);
    try {
      const data = await AnalysisService.getPeopleByStatus(
        activeTab as 'balita' | 'lansia',
        activePosyanduId || '',
        month,
        year,
        rt || undefined,
        selectedIndicator || undefined,
        selectedStatus
      );
      setPeopleList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balita, lansia, trends] = await Promise.all([
        AnalysisService.getBalitaAnalysis(activePosyanduId || '', month, year, rt || undefined),
        AnalysisService.getLansiaAnalysis(activePosyanduId || '', month, year, rt || undefined),
        AnalysisService.getTrendData(activePosyanduId || '', 6)
      ]);
      setBalitaData(balita);
      setLansiaData(lansia);
      setTrendData(trends);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderBalitaTab = () => {
    if (!balitaData) return null;
    return (
      <View>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Sasaran Balita</Text>
            <Text style={styles.statValue}>{balitaData.totalSasaran}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Kehadiran</Text>
            <View style={styles.row}>
               <Text style={styles.statValue}>{balitaData.totalHadir}</Text>
               <Badge 
                 label={`${Math.round((balitaData.totalHadir / (balitaData.totalSasaran || 1)) * 100)}%`} 
                 variant="success" 
               />
            </View>
          </Card>
        </View>

        <DistributionChart 
          title="Distribusi Berat Badan (BB/U)" 
          data={balitaData.stats_bb_u} 
          color={theme.primary} 
          onPress={(status) => {
            setSelectedIndicator('status_bb_u');
            setSelectedStatus(status);
          }}
        />
        <DistributionChart 
          title="Distribusi Stunting (TB/U)" 
          data={balitaData.stats_tb_u} 
          color={theme.primary} 
          onPress={(status) => {
            setSelectedIndicator('status_tb_u');
            setSelectedStatus(status);
          }}
        />
        <DistributionChart 
          title="Distribusi Wasting (BB/TB)" 
          data={balitaData.stats_bb_tb} 
          color={theme.primary} 
          onPress={(status) => {
            setSelectedIndicator('status_bb_tb');
            setSelectedStatus(status);
          }}
        />
      </View>
    );
  };

  const renderLansiaTab = () => {
    if (!lansiaData) return null;
    return (
      <View>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Total Sasaran</Text>
            <Text style={styles.statValue}>{lansiaData.totalSasaran}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Diperiksa</Text>
            <Text style={styles.statValue}>{lansiaData.totalHadir}</Text>
          </Card>
        </View>

        <DistributionChart 
          title="Prevalensi Penyakit Lansia" 
          data={lansiaData.stats_kondisi} 
          color={theme.primary} 
          onPress={(status) => {
            setSelectedIndicator('stats_kondisi');
            setSelectedStatus(status);
          }}
        />

        <Card style={styles.alertCard}>
           <Heart size={18} color={COLORS.error} />
           <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.alertTitle}>Rekomendasi Tindak Lanjut</Text>
              <Text style={styles.alertText}>
                {lansiaData.stats_kondisi.find(s => s.label === 'Hipertensi')?.count || 0} lansia terdeteksi hipertensi. Disarankan penjadwalan kunjungan rumah oleh kader.
              </Text>
           </View>
        </Card>
      </View>
    );
  };

  const renderTrendTab = () => {
    const chartData = {
      labels: trendData.map(t => t.month),
      datasets: [
        {
          data: trendData.map(t => t.balita),
          color: (opacity = 1) => `rgba(0, 168, 150, ${opacity})`, // Teal
          strokeWidth: 2
        },
        {
          data: trendData.map(t => t.lansia),
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`, // Indigo
          strokeWidth: 2
        }
      ],
      legend: ['Balita', 'Lansia']
    };

    return (
      <Card style={styles.chartContainer}>
         <Text style={styles.chartTitle}>Tren Kehadiran 6 Bulan Terakhir</Text>
         <LineChart
            data={chartData}
            width={screenWidth - 56}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              propsForDots: { r: '4', strokeWidth: '1.5', stroke: '#fff' }
            }}
            bezier
            style={styles.lineChart}
         />
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Analisis Posyandu</Text>
          <Text style={styles.headerSubtitle}>Pantauan status & tren klinis bulan berjalan</Text>
        </View>
        <WorkspaceSwitcher size={20} color="#1E293B" />
      </View>

      <FilterBar 
        month={month} 
        year={year} 
        rt={rt}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onRtChange={setRt}
      />

      <View style={styles.tabBar}>
        {activeWorkspace === 'balita' && (
          <TabButton 
            active={activeTab === 'balita'} 
            icon={<Baby size={16} color={activeTab === 'balita' ? theme.primary : '#64748B'} />} 
            label="Balita" 
            activeColor={theme.primary}
            activeTonal={theme.tonal}
            onPress={() => setActiveTab('balita')} 
          />
        )}
        {activeWorkspace === 'lansia' && (
          <TabButton 
            active={activeTab === 'lansia'} 
            icon={<Users size={16} color={activeTab === 'lansia' ? theme.primary : '#64748B'} />} 
            label="Lansia" 
            activeColor={theme.primary}
            activeTonal={theme.tonal}
            onPress={() => setActiveTab('lansia')} 
          />
        )}
        <TabButton 
          active={activeTab === 'tren'} 
          icon={<TrendingUp size={16} color={activeTab === 'tren' ? chartThemeColor : '#64748B'} />} 
          label="Tren" 
          activeColor={chartThemeColor}
          activeTonal={activeTab === 'tren' ? `${chartThemeColor}12` : '#F1F5F9'}
          onPress={() => setActiveTab('tren')} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Menghitung kalkulasi data...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'balita' && renderBalitaTab()}
            {activeTab === 'lansia' && renderLansiaTab()}
            {activeTab === 'tren' && renderTrendTab()}

            {/* By Name List Section */}
            {selectedStatus && (
              <View style={styles.listSection}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>
                    Data By Name: <Text style={{ color: theme.primary }}>{selectedStatus}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedStatus(null)}>
                    <Text style={styles.closeBtn}>Tutup</Text>
                  </TouchableOpacity>
                </View>

                {listLoading ? (
                  <ActivityIndicator size="small" color="#64748B" style={{ margin: 20 }} />
                ) : peopleList.length > 0 ? (
                  <Card style={styles.peopleCard}>
                    {peopleList.map((person, idx) => (
                      <View key={person.id} style={[styles.peopleItem, idx === peopleList.length - 1 && { borderBottomWidth: 0 }]}>
                        <View>
                          <Text style={styles.personName}>{person.nama}</Text>
                          <Text style={styles.personSub}>NIK: {person.nik} • RT {person.rt}</Text>
                        </View>
                        <Badge label={person.status || selectedStatus} variant={person.status?.includes('Normal') ? 'success' : 'warning'} />
                      </View>
                    ))}
                  </Card>
                ) : (
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyText}>Tidak ada data untuk kategori ini.</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ active, icon, label, activeColor, activeTonal, onPress }: { active: boolean, icon: any, label: string, activeColor: string, activeTonal: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[
        styles.tabButton, 
        active && { backgroundColor: activeTonal }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.tabLabel, active && { color: activeColor, fontWeight: '800' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#00A896',
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.2 },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20, // Fully rounded bento pill
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  content: { padding: 16 },
  loader: { padding: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 13, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 20, marginTop: 12 },
  alertTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B' },
  alertText: { fontSize: 12, color: '#991B1B', marginTop: 2, lineHeight: 16, fontWeight: '500' },
  chartContainer: { padding: 14 },
  chartTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  lineChart: { borderRadius: 16, marginVertical: 4 },
  
  // List Section Styles
  listSection: { marginTop: 12, marginBottom: 40 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  listTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  closeBtn: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  peopleCard: { padding: 0, overflow: 'hidden' },
  peopleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  personName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  personSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  emptyList: { padding: 32, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16 },
  emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' }
});
