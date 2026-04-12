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

  useEffect(() => {
    fetchData();
  }, [month, year, rt]);

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
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Sasaran</Text>
            <Text style={styles.statValue}>{balitaData.totalSasaran}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Hadir</Text>
            <View style={styles.row}>
               <Text style={styles.statValue}>{balitaData.totalHadir}</Text>
               <Badge 
                 label={`${Math.round((balitaData.totalHadir / (balitaData.totalSasaran || 1)) * 100)}%`} 
                 variant="success" 
               />
            </View>
          </Card>
        </View>

        <DistributionChart title="Distribusi Berat Badan (BB/U)" data={balitaData.stats_bb_u} />
        <DistributionChart title="Distribusi Stunting (TB/U)" data={balitaData.stats_tb_u} />
        <DistributionChart title="Distribusi Wasting (BB/TB)" data={balitaData.stats_bb_tb} />
      </View>
    );
  };

  const renderLansiaTab = () => {
    if (!lansiaData) return null;
    return (
      <View>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Total Lansia</Text>
            <Text style={styles.statValue}>{lansiaData.totalSasaran}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Diperiksa</Text>
            <Text style={styles.statValue}>{lansiaData.totalHadir}</Text>
          </Card>
        </View>

        <DistributionChart title="Prevalensi Penyakit Lansia" data={lansiaData.stats_kondisi} />

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
          strokeWidth: 2
        },
        {
          data: trendData.map(t => t.lansia),
          color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Purple
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
            width={screenWidth - 72}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff' }
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
          icon={<Baby size={18} color={activeTab === 'balita' ? '#0D9488' : '#64748B'} />} 
          label="Balita" 
          onPress={() => setActiveTab('balita')} 
        />
        <TabButton 
          active={activeTab === 'lansia'} 
          icon={<Users size={18} color={activeTab === 'lansia' ? '#0D9488' : '#64748B'} />} 
          label="Lansia" 
          onPress={() => setActiveTab('lansia')} 
        />
        <TabButton 
          active={activeTab === 'tren'} 
          icon={<TrendingUp size={18} color={activeTab === 'tren' ? '#0D9488' : '#64748B'} />} 
          label="Tren" 
          onPress={() => setActiveTab('tren')} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ active, icon, label, onPress }: { active: boolean, icon: any, label: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[styles.tabButton, active && styles.activeTabButton]} 
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  activeTabLabel: { color: '#0D9488' },
  content: { padding: 20 },
  loader: { padding: 100, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statCard: { flex: 1, padding: 16 },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#991B1B' },
  alertText: { fontSize: 13, color: '#991B1B', marginTop: 2, lineHeight: 18 },
  chartContainer: { padding: 16 },
  chartTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 20 },
  lineChart: { borderRadius: 16, marginVertical: 8 }
});
