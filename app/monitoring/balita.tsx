import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Search, Baby, Filter, CheckCircle2, AlertCircle, LogOut } from 'lucide-react-native';
import { useBalita } from '../../hooks/useBalita';
import { usePenimbangan } from '../../hooks/usePenimbangan';
import { Balita } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { calculateAgeMonths, getIndoMonthName } from '../../lib/utils';

export default function MonitoringBalitaScreen() {
  const router = useRouter();
  const { getBalitas } = useBalita();
  const { getMonthlyAttendance } = usePenimbangan();
  
  const [loading, setLoading] = useState(true);
  const [balitas, setBalitas] = useState<Balita[]>([]);
  const [attendance, setAttendance] = useState<string[]>([]); // List of balita_ids who attended
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Sudah' | 'Belum' | 'Lulus'>('Semua');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allBalitas, monthlyRecords] = await Promise.all([
        getBalitas(),
        getMonthlyAttendance(selectedMonth, selectedYear)
      ]);
      
      setBalitas(allBalitas);
      setAttendance(monthlyRecords.map((r: any) => r.balita_id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const getStatus = (balita: Balita) => {
    const age = calculateAgeMonths(balita.tanggal_lahir);
    if (age > 60) return { label: 'Lulus', variant: 'info' as const, icon: <LogOut size={16} color="#06B6D4" /> };
    if (attendance.includes(balita.id)) return { label: 'Sudah', variant: 'success' as const, icon: <CheckCircle2 size={16} color="#22C55E" /> };
    return { label: 'Belum', variant: 'warning' as const, icon: <AlertCircle size={16} color="#F59E0B" /> };
  };

  const filteredData = balitas.filter(b => {
    const matchesSearch = b.nama.toLowerCase().includes(searchQuery.toLowerCase()) || b.nik.includes(searchQuery);
    if (!matchesSearch) return false;

    if (activeFilter === 'Semua') return true;
    
    const status = getStatus(b);
    return status.label === activeFilter;
  });

  const renderItem = ({ item }: { item: Balita }) => {
    const status = getStatus(item);
    const age = calculateAgeMonths(item.tanggal_lahir);

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/balita/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.avatar}>
              <Baby size={28} color="#0D9488" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.nama}</Text>
              <Text style={styles.subtext}>{age} Bulan • RT {item.rt}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Badge label={status.label} variant={status.variant} />
              <View style={styles.iconWrapper}>{status.icon}</View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const stats = {
    total: balitas.length,
    sudah: balitas.filter(b => calculateAgeMonths(b.tanggal_lahir) <= 60 && attendance.includes(b.id)).length,
    belum: balitas.filter(b => calculateAgeMonths(b.tanggal_lahir) <= 60 && !attendance.includes(b.id)).length,
    lulus: balitas.filter(b => calculateAgeMonths(b.tanggal_lahir) > 60).length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Monitoring Balita</Text>
        <TouchableOpacity onPress={fetchData} style={styles.filterButton}>
          <Calendar size={20} color="#0D9488" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Cari Nama atau NIK..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.statsBar}>
        <StatItem label="Total" count={stats.total} color="#1E293B" />
        <StatItem label="Sudah" count={stats.sudah} color="#22C55E" />
        <StatItem label="Belum" count={stats.belum} color="#F59E0B" />
        <StatItem label="Lulus" count={stats.lulus} color="#06B6D4" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer} contentContainerStyle={styles.chipContent}>
        {(['Semua', 'Sudah', 'Belum', 'Lulus'] as const).map((f) => (
          <TouchableOpacity 
            key={f} 
            onPress={() => setActiveFilter(f)}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>Status Kehadiran: {getIndoMonthName(selectedMonth)} {selectedYear}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada data balita.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const StatItem = ({ label, count, color }: { label: string, count: number, color: string }) => (
  <View style={styles.statItem}>
    <Text style={[styles.statCount, { color }]}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  filterButton: {
    padding: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chipContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
  },
  chipContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  chipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
    elevation: 2,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  monthHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 10,
    padding: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  iconWrapper: {
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
