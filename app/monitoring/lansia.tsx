import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Search, Users, Filter, CheckCircle2, AlertCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLansia } from '../../hooks/useLansia';
import { usePemeriksaan } from '../../hooks/usePemeriksaan';
import { Lansia } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { getIndoMonthName } from '../../lib/utils';

export default function MonitoringLansiaScreen() {
  const router = useRouter();
  const { getLansias } = useLansia();
  const { getMonthlyAttendance } = usePemeriksaan();
  
  const [loading, setLoading] = useState(true);
  const [lansias, setLansias] = useState<Lansia[]>([]);
  const [attendance, setAttendance] = useState<string[]>([]); // List of lansia_ids who attended
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
      const [allLansias, monthlyRecords] = await Promise.all([
        getLansias(),
        getMonthlyAttendance(selectedMonth, selectedYear)
      ]);
      
      setLansias(allLansias);
      setAttendance(monthlyRecords.map((r: any) => r.lansia_id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const filteredData = lansias.filter(l => 
    l.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.nik.includes(searchQuery)
  );

  const getStatus = (lansia: Lansia) => {
    if (attendance.includes(lansia.id)) return { label: 'Sudah', variant: 'success' as const, icon: <CheckCircle2 size={16} color="#22C55E" /> };
    return { label: 'Belum', variant: 'warning' as const, icon: <AlertCircle size={16} color="#F59E0B" /> };
  };

  const renderItem = ({ item }: { item: Lansia }) => {
    const status = getStatus(item);

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/lansia/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.v2Card}>
          <View style={styles.v2CardContent}>
            <View style={styles.v2Avatar}>
              <Users size={24} color="#6366F1" />
            </View>
            <View style={styles.v2Info}>
              <Text style={styles.v2Name}>{item.nama}</Text>
              <View style={styles.v2MetaRow}>
                <Text style={styles.v2MetaText}>RT {item.rt || '-'}</Text>
                <View style={styles.v2Dot} />
                <Text style={styles.v2MetaText}>{item.nik}</Text>
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
    total: lansias.length,
    sudah: attendance.length,
    belum: lansias.length - attendance.length,
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
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.filterButton}>
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
        <StatItem label="Total Sasaran" count={stats.total} color="#1E293B" />
        <StatItem label="Sudah Periksa" count={stats.sudah} color="#22C55E" />
        <StatItem label="Belum Periksa" count={stats.belum} color="#F59E0B" />
      </View>

      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>Status Kunjungan: {getIndoMonthName(selectedMonth)} {selectedYear}</Text>
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
              <Text style={styles.emptyText}>Tidak ada data lansia.</Text>
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
    backgroundColor: '#EEF2FF',
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
  v2MetaText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  v2Dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  v2StatusCol: {
    alignItems: 'flex-end',
  },
});
