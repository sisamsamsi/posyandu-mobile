import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal
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
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react-native';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { DashboardService, DashboardStats } from '../../services/dashboard-service';
import { PieChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isNotifVisible, setIsNotifVisible] = useState(false);

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
      {/* Header with Background Accent */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.greeting}>Halo, Kader!</Text>
          <Text style={styles.subGreeting}>Ayo pantau kesehatan warga hari ini.</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => setIsNotifVisible(true)}>
          <Bell size={22} color="#1E293B" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Statistics Section */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>Ringkasan Data</Text>
        </View>
        <View style={styles.row}>
          <SummaryCard 
            label="Balita" 
            value={stats?.totalBalita || 0} 
            icon={<Baby />} 
            color="#0D9488" // Teal for Balita
          />
          <SummaryCard 
            label="Lansia" 
            value={stats?.totalLansia || 0} 
            icon={<Users />} 
            color="#6366F1" // Indigo for Lansia
          />
        </View>

        <Card style={styles.visitCard}>
           <View style={[styles.visitIcon, { backgroundColor: '#F0FDFA' }]}>
              <Calendar size={24} color="#0D9488" />
           </View>
           <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.visitLabel}>Kunjungan Bulan Ini</Text>
              <Text style={styles.visitValue}>{stats?.visitsThisMonth || 0} <Text style={styles.visitSub}>pelayanan</Text></Text>
           </View>
           <TouchableOpacity onPress={() => router.push('/penimbangan')}>
              <ChevronRight size={20} color="#94A3B8" />
           </TouchableOpacity>
        </Card>

        {/* Nutrition Chart */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>Distribusi Status Gizi</Text>
        </View>
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
          <Card style={styles.emptyChart}><Text style={styles.emptyText}>Tidak ada data gizi bulan ini</Text></Card>
        )}

        {/* Quick Utilities */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>Layanan Admin</Text>
        </View>
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
              <View style={[styles.adminIcon, { backgroundColor: '#EEF2FF' }]}>
                <FileDown size={24} color="#6366F1" />
              </View>
              <Text style={styles.adminText}>Export Laporan</Text>
          </TouchableOpacity>
        </View>

        {/* App Info Card */}
        <Card style={styles.promoCard}>
           <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>Posyandu Mobile V1.0</Text>
              <Text style={styles.promoDesc}>Digitalisasi layanan kesehatan tingkat desa kini lebih mudah.</Text>
           </View>
           <BarChart3 size={40} color="rgba(255,255,255,0.3)" />
        </Card>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={isNotifVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsNotifVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifikasi Terbaru</Text>
              <TouchableOpacity onPress={() => setIsNotifVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
               <NotifItem 
                 icon={<AlertCircle size={20} color="#EF4444" />}
                 title="Siaga Stunting"
                 desc="3 Balita di RT 02 memerlukan pemantauan intensif."
                 time="Baru saja"
               />
               <NotifItem 
                 icon={<AlertCircle size={20} color="#F59E0B" />}
                 title="Pemeriksaan Lansia"
                 desc="Kegiatan Posyandu Lansia dijadwalkan besok Jam 09:00."
                 time="2 jam yang lalu"
               />
               <NotifItem 
                 icon={<CheckCircle2 size={20} color="#0D9488" />}
                 title="Import Berhasil"
                 desc="57 data balita telah berhasil disinkronisasi."
                 time="Kemarin"
               />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NotifItem({ icon, title, desc, time }: { icon: any, title: string, desc: string, time: string }) {
  return (
    <View style={styles.notifItem}>
      <View style={styles.notifIconContainer}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{title}</Text>
        <Text style={styles.notifDesc}>{desc}</Text>
        <Text style={styles.notifTime}>{time}</Text>
      </View>
    </View>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#64748B',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerTitleContainer: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subGreeting: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },
  notifBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  notifDot: { position: 'absolute', top: 14, right: 14, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF' },
  scrollContent: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { marginTop: 20, marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 },
  visitCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#0D9488' },
  visitIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  visitLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  visitValue: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  visitSub: { fontSize: 13, fontWeight: 'normal', color: '#94A3B8' },
  chartCard: { padding: 12, alignItems: 'center' },
  emptyChart: { padding: 40, alignItems: 'center', backgroundColor: '#F1F5F9', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: '#94A3B8', fontSize: 13 },
  adminGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  adminBtn: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  adminIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  adminText: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  promoCard: { marginTop: 24, backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', padding: 20, borderTopLeftRadius: 32 },
  promoTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  promoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 18 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  modalBody: { marginBottom: 20 },
  notifItem: { flexDirection: 'row', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  notifIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  notifDesc: { fontSize: 13, color: '#64748B', marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#94A3B8', marginTop: 8 }
});
