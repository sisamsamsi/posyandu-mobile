import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  TrendingUp, 
  Users, 
  Heart,
  Baby
} from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { FilterBar } from '../../components/ui/FilterBar';
import { DistributionChart } from '../../components/charts/DistributionChart';
import { AnalysisService, BalitaAnalysis, LansiaAnalysis, TrendPoint } from '../../services/analysis-service';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type AnalysisTab = 'balita' | 'lansia' | 'tren';

// Category Colors
const COLORS = {
  balita: '#0D9488',
  lansia: '#6366F1',
  trend: '#F59E0B'
};

export default function AnalysisTabScreen() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('balita');
  
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

  useEffect(() => {
    fetchData();
    // Reset list when base filters or tabs change
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
        AnalysisService.getBalitaAnalysis(month, year, rt || undefined),
        AnalysisService.getLansiaAnalysis(month, year, rt || undefined),
        AnalysisService.getTrendData(6)
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
          <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: COLORS.balita }]}>
            <Text style={styles.statLabel}>Sasaran</Text>
            <Text style={[styles.statValue, { color: COLORS.balita }]}>{balitaData.totalSasaran}</Text>
          </Card>
          <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: COLORS.balita }]}>
            <Text style={styles.statLabel}>Hadir</Text>
            <View style={styles.row}>
               <Text style={[styles.statValue, { color: COLORS.balita }]}>{balitaData.totalHadir}</Text>
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
          color={COLORS.balita} 
          onPress={(status) => {
            setSelectedIndicator('status_bb_u');
            setSelectedStatus(status);
          }}
        />
        <DistributionChart 
          title="Distribusi Stunting (TB/U)" 
          data={balitaData.stats_tb_u} 
          color={COLORS.balita} 
          onPress={(status) => {
            setSelectedIndicator('status_tb_u');
            setSelectedStatus(status);
          }}
        />
        <DistributionChart 
          title="Distribusi Wasting (BB/TB)" 
          data={balitaData.stats_bb_tb} 
          color={COLORS.balita} 
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
          <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: COLORS.lansia }]}>
            <Text style={styles.statLabel}>Total Lansia</Text>
            <Text style={[styles.statValue, { color: COLORS.lansia }]}>{lansiaData.totalSasaran}</Text>
          </Card>
          <Card style={[styles.statCard, { borderBottomWidth: 3, borderBottomColor: COLORS.lansia }]}>
            <Text style={styles.statLabel}>Diperiksa</Text>
            <Text style={[styles.statValue, { color: COLORS.lansia }]}>{lansiaData.totalHadir}</Text>
          </Card>
        </View>

        <DistributionChart 
          title="Prevalensi Penyakit Lansia" 
          data={lansiaData.stats_kondisi} 
          color={COLORS.lansia} 
          onPress={(status) => {
            setSelectedIndicator('stats_kondisi');
            setSelectedStatus(status);
          }}
        />

        <Card style={styles.alertCard}>
           <Heart size={20} color="#EF4444" />
           <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.alertTitle}>Tindak Lanjut</Text>
              <Text style={styles.alertText}>
                {lansiaData.stats_kondisi.find(s => s.label === 'Hipertensi')?.count || 0} orang memiliki tekanan darah tinggi. Disarankan kunjungan rumah oleh Bidan.
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
          color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`, // Teal
          strokeWidth: 3
        },
        {
          data: trendData.map(t => t.lansia),
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // Indigo
          strokeWidth: 3
        }
      ],
      legend: ['Balita', 'Lansia']
    };

    return (
      <Card style={styles.chartContainer}>
         <Text style={styles.chartTitle}>Tren Kehadiran 6 Bulan Terakhir</Text>
         <LineChart
            data={chartData}
            width={screenWidth - 72}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              propsForDots: { r: '5', strokeWidth: '2', stroke: '#fff' }
            }}
            bezier
            style={styles.lineChart}
         />
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analisis Agregat</Text>
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
        <TabButton 
          active={activeTab === 'balita'} 
          icon={<Baby size={18} color={activeTab === 'balita' ? COLORS.balita : '#64748B'} />} 
          label="Balita" 
          activeColor={COLORS.balita}
          onPress={() => setActiveTab('balita')} 
        />
        <TabButton 
          active={activeTab === 'lansia'} 
          icon={<Users size={18} color={activeTab === 'lansia' ? COLORS.lansia : '#64748B'} />} 
          label="Lansia" 
          activeColor={COLORS.lansia}
          onPress={() => setActiveTab('lansia')} 
        />
        <TabButton 
          active={activeTab === 'tren'} 
          icon={<TrendingUp size={18} color={activeTab === 'tren' ? COLORS.trend : '#64748B'} />} 
          label="Tren" 
          activeColor={COLORS.trend}
          onPress={() => setActiveTab('tren')} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loadingText}>Menghitung data...</Text>
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
                    Data By Name: <Text style={{ color: activeTab === 'balita' ? COLORS.balita : COLORS.lansia }}>{selectedStatus}</Text>
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
                          <Text style={styles.personSub}>NIK: {person.nik} • RT 0{person.rt}</Text>
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

function TabButton({ active, icon, label, activeColor, onPress }: { active: boolean, icon: any, label: string, activeColor: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[
        styles.tabButton, 
        active && { backgroundColor: `${activeColor}15`, borderColor: activeColor, borderWidth: 1 }
      ]} 
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.tabLabel, active && { color: activeColor, fontWeight: '800' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  content: { padding: 20 },
  loader: { padding: 100, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statCard: { flex: 1, padding: 16 },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FCA5A5', marginTop: 12 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#991B1B' },
  alertText: { fontSize: 13, color: '#991B1B', marginTop: 2, lineHeight: 18 },
  chartContainer: { padding: 16 },
  chartTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  lineChart: { borderRadius: 16, marginVertical: 8 },
  
  // List Section Styles
  listSection: { marginTop: 12, marginBottom: 40 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  closeBtn: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
  peopleCard: { padding: 0, overflow: 'hidden' },
  peopleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  personName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  personSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  emptyList: { padding: 40, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: '#94A3B8', fontSize: 13 }
});
