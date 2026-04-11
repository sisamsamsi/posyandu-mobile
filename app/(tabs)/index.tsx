import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Baby, 
  Users, 
  Calendar, 
  FileDown, 
  FileUp, 
  Bell, 
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react-native';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { DashboardService, DashboardStats } from '../../services/dashboard-service';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchStats = async () => {
    try {
      const data = await DashboardService.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, Kader!</Text>
          <Text style={styles.subGreeting}>Data Posyandu Terkini</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Bell size={22} color="#1E293B" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Core Stats */}
        <View style={styles.row}>
          <SummaryCard label="Balita" value={stats?.totalBalita || 0} icon={<Baby />} color="#0D9488" />
          <SummaryCard label="Lansia" value={stats?.totalLansia || 0} icon={<Users />} color="#2563EB" />
        </View>
        <Card style={styles.visitCard}>
           <View style={styles.visitIcon}>
              <Calendar size={24} color="#0D9488" />
           </View>
           <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.visitLabel}>Kunjungan Bulan Ini</Text>
              <Text style={styles.visitValue}>{stats?.visitsThisMonth || 0} <Text style={styles.visitSub}>pelayanan</Text></Text>
           </View>
        </Card>

        {/* Charts */}
        <Text style={styles.sectionTitle}>Distribusi Status Gizi</Text>
        {stats?.nutritionStats && stats.nutritionStats.length > 0 ? (
          <Card style={styles.chartCard}>
            <PieChart
              data={stats.nutritionStats.map(s => ({
                name: s.label,
                population: s.count,
                color: s.color,
                legendFontColor: '#64748B',
                legendFontSize: 11,
              }))}
              width={screenWidth - 40}
              height={180}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              absolute
            />
          </Card>
        ) : (
          <Card style={styles.emptyChart}><Text style={styles.emptyText}>Tidak ada data gizi</Text></Card>
        )}

        <View style={styles.adminSection}>
           <Text style={styles.sectionTitle}>Utililtas Data</Text>
           <View style={styles.adminGrid}>
              <TouchableOpacity 
                style={styles.adminBtn}
                onPress={() => router.push('/admin/import-data')}
              >
                 <View style={[styles.adminIcon, { backgroundColor: '#F0FDFA' }]}>
                    <FileUp size={24} color="#0D9488" />
                 </View>
                 <Text style={styles.adminText}>Import Excel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.adminBtn}
                onPress={() => router.push('/admin/reports')}
              >
                 <View style={[styles.adminIcon, { backgroundColor: '#EFF6FF' }]}>
                    <FileDown size={24} color="#2563EB" />
                 </View>
                 <Text style={styles.adminText}>Export Laporan</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* Info Card */}
        <Card style={styles.promoCard}>
           <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>Posyandu Mobile V1.0</Text>
              <Text style={styles.promoDesc}>Digitalisasi layanan kesehatan tingkat desa kini lebih mudah.</Text>
           </View>
           <BarChart3 size={40} color="rgba(255,255,255,0.3)" />
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  greeting: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subGreeting: { fontSize: 14, color: '#64748B', marginTop: 4 },
  notifBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#F1F5F9' },
  scrollContent: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 20, marginBottom: 16, paddingHorizontal: 4 },
  visitCard: { flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 8 },
  visitIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F0FDFA', justifyContent: 'center', alignItems: 'center' },
  visitLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  visitValue: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  visitSub: { fontSize: 14, fontWeight: 'normal', color: '#94A3B8' },
  chartCard: { padding: 8, alignItems: 'center' },
  emptyChart: { padding: 40, alignItems: 'center', backgroundColor: '#F1F5F9', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: '#94A3B8' },
  adminSection: { marginTop: 12 },
  adminGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  adminBtn: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  adminIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  adminText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  promoCard: { marginTop: 24, backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', padding: 20, borderTopLeftRadius: 32 },
  promoTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  promoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 18 }
});
