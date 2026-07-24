// app/monitoring/balita.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Search, Baby, CheckCircle2, AlertCircle, LogOut } from 'lucide-react-native';
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
  const [focusedSearch, setFocusedSearch] = useState(false);

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
            <View style={[styles.v2Avatar, { backgroundColor: COLORS.tealTonal }]}>
              <Baby size={22} color={COLORS.tealPrimary} />
            </View>
            <View style={styles.v2Info}>
              <Text style={styles.v2Name} numberOfLines={1}>{item.nama}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={{ marginRight: 8, padding: 4 }} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Monitoring Kehadiran</Text>
            <Text style={styles.headerSub}>Fokus Pelayanan Balita</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <WorkspaceSwitcher size={22} color={COLORS.tealPrimary} />
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)} 
            style={styles.calendarButton}
            activeOpacity={0.7}
          >
            <Calendar size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, focusedSearch && styles.searchBarFocused]}>
          <Search size={20} color={focusedSearch ? COLORS.tealPrimary : "#94A3B8"} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Cari Nama atau NIK Balita..."
            placeholderTextColor="#CBD5E1"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setFocusedSearch(true)}
            onBlur={() => setFocusedSearch(false)}
          />
        </View>
      </View>

      {/* Stats Bento Bar */}
      <View style={styles.statsBar}>
        <StatItem label="Total" count={stats.total} color="#0F172A" />
        <StatItem label="Sudah" count={stats.sudah} color="#10B981" />
        <StatItem label="Belum" count={stats.belum} color="#F59E0B" />
        <StatItem label="Lulus" count={stats.lulus} color="#06B6D4" />
      </View>

      {/* Filter Segmented Chips */}
      <View style={styles.filterContainer}>
        {(['Semua', 'Sudah', 'Belum', 'Lulus'] as const).map((f) => (
          <TouchableOpacity 
            key={f} 
            onPress={() => setActiveFilter(f)}
            style={[
              styles.chip, 
              activeFilter === f && [styles.chipActive, { backgroundColor: COLORS.tealPrimary }]
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>Jadwal Timbang: {getIndoMonthName(selectedMonth)} {selectedYear}</Text>
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <AlertCircle size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Tidak ada data balita yang cocok.</Text>
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
  <View style={styles.statCard}>
    <Text style={[styles.statCount, { color }]}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  calendarButton: {
    padding: 6,
    marginLeft: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarFocused: {
    borderColor: COLORS.tealPrimary,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  monthHeader: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  v2Card: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  v2CardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  v2Avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    color: '#0F172A',
  },
  v2MetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
    fontWeight: '600',
  },
  v2StatusCol: {
    alignItems: 'flex-end',
  },
});
