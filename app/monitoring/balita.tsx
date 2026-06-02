import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Search, Baby, Filter, CheckCircle2, AlertCircle, LogOut } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useBalita } from '../../hooks/useBalita';
import { usePenimbangan } from '../../hooks/usePenimbangan';
import { Balita } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { calculateAgeMonths, getIndoMonthName } from '../../lib/utils';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';
import { COLORS } from '../../lib/constants';

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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedMonth(selectedDate.getMonth());
      setSelectedYear(selectedDate.getFullYear());
    }
  };

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
        <Card style={styles.v2Card}>
          <View style={styles.v2CardContent}>
            <View style={styles.v2Avatar}>
              <Baby size={24} color={COLORS.tealPrimary} />
            </View>
            <View style={styles.v2Info}>
              <Text style={styles.v2Name}>{item.nama}</Text>
              <View style={styles.v2MetaRow}>
                <Text style={styles.v2AgeText}>{age} Bulan</Text>
                <View style={styles.v2Dot} />
                <Text style={styles.v2AddressText}>RT {item.rt}</Text>
              </View>
            </View>
            <View style={styles.v2StatusCol}>
              <Badge label={status.label} variant={status.variant} />
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
        <Image 
          source={require('../../assets/images/logo.png')} 
          style={{ width: 160, height: 50, flex: 1, marginLeft: 8 }} 
          resizeMode="contain" 
        />
        <View style={styles.headerRight}>
          <WorkspaceSwitcher size={22} color={COLORS.tealPrimary} />
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarButton}>
            <Calendar size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
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

      <View style={styles.filterContainer}>
        {(['Semua', 'Sudah', 'Belum', 'Lulus'] as const).map((f) => (
          <TouchableOpacity 
            key={f} 
            onPress={() => setActiveFilter(f)}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>Status Kehadiran: {getIndoMonthName(selectedMonth)} {selectedYear}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.tealPrimary} />
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
      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedYear, selectedMonth, 1)}
          mode="date"
          display="default"
          onChange={handleDateChange}
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
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  calendarButton: {
    padding: 4,
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.tealBg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: COLORS.tealBg,
    paddingBottom: 16,
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.tealBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.tealPrimary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: COLORS.tealTonal,
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
  // V2 STYLES
  v2Card: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 20,
  },
  v2CardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  v2Avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.tealBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  v2Info: {
    flex: 1,
  },
  v2Name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  v2MetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  v2AgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  v2Dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  v2AddressText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  v2StatusCol: {
    alignItems: 'flex-end',
  },
});
