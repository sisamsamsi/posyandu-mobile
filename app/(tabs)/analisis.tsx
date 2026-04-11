import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  Heart,
  Activity
} from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DashboardService, DashboardStats } from '../../services/dashboard-service';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function AnalysisTabScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await DashboardService.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const chartData = {
    labels: stats?.nutritionStats.map(s => s.label.substring(0, 7)) || [],
    datasets: [{
      data: stats?.nutritionStats.map(s => s.count) || []
    }]
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analisis Kesehatan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryRow}>
          <Card style={[styles.miniCard, { backgroundColor: '#F0FDFA' }]}>
             <Target size={20} color="#0D9488" />
             <Text style={styles.miniLabel}>Partisipasi</Text>
             <Text style={styles.miniValue}>85%</Text>
          </Card>
          <Card style={[styles.miniCard, { backgroundColor: '#FEF2F2' }]}>
             <Heart size={20} color="#EF4444" />
             <Text style={styles.miniLabel}>Risiko Gizi</Text>
             <Text style={styles.miniValue}>{stats?.nutritionStats.find(s => s.label === 'Gizi Buruk')?.count || 0} Anak</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Tren Status Gizi Balita</Text>
        <Card style={styles.chartCard}>
           {chartData.labels.length > 0 ? (
             <BarChart
               data={chartData}
               width={screenWidth - 60}
               height={220}
               yAxisLabel=""
               yAxisSuffix=""
               chartConfig={{
                 backgroundColor: '#ffffff',
                 backgroundGradientFrom: '#ffffff',
                 backgroundGradientTo: '#ffffff',
                 decimalPlaces: 0,
                 color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
                 labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                 style: {
                   borderRadius: 16
                 },
                 propsForBackgroundLines: {
                   strokeDasharray: ""
                 }
               }}
               style={{
                 marginVertical: 8,
                 borderRadius: 16
               }}
               showValuesOnTopOfBars
               fromZero
             />
           ) : (
             <Text style={styles.emptyText}>Belum ada data penimbangan bulan ini</Text>
           )}
        </Card>

        <Text style={styles.sectionTitle}>Status Kesehatan Lansia</Text>
        <View style={styles.list}>
          {stats?.healthAlertStats.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
               <Activity size={20} color={item.color} />
               <View style={styles.listItemText}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemSub}>{item.count} Warga</Text>
               </View>
               <Badge label={`${Math.round((item.count / (stats.totalLansia || 1)) * 100)}%`} variant={item.label === 'Normal' ? 'success' : 'danger'} />
            </View>
          ))}
        </View>

        <Card style={styles.insightCard}>
           <TrendingUp size={24} color="#0D9488" />
           <Text style={styles.insightTitle}>Analisis Sistem</Text>
           <Text style={styles.insightText}>
             Tingkat partisipasi bulan ini cukup baik. Segera lakukan kunjungan rumah (Home Visit) untuk Balita dengan status "Gizi Buruk" atau "Gizi Kurang".
           </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  miniCard: { width: '48%', padding: 16, borderLeftWidth: 4, borderLeftColor: '#0D9488' },
  miniLabel: { fontSize: 12, color: '#64748B', marginTop: 8 },
  miniValue: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 16, marginTop: 8 },
  chartCard: { padding: 10, alignItems: 'center', marginBottom: 24 },
  emptyText: { color: '#94A3B8', padding: 40 },
  list: { backgroundColor: '#FFF', borderRadius: 20, padding: 8, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  listItemText: { flex: 1, marginLeft: 12 },
  itemLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  itemSub: { fontSize: 12, color: '#94A3B8' },
  insightCard: { backgroundColor: '#F0FDFA', padding: 20, marginBottom: 20, borderColor: '#CCFBF1' },
  insightTitle: { fontSize: 16, fontWeight: 'bold', color: '#134E4A', marginTop: 12 },
  insightText: { fontSize: 13, color: '#134E4A', lineHeight: 20, marginTop: 4 }
});
