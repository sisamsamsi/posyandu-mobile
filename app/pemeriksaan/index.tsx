import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Users, ChevronRight, Filter, Activity } from 'lucide-react-native';
import { usePemeriksaan } from '../../hooks/usePemeriksaan';
import { PemeriksaanLansia } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatIndoDate, getIndoMonthName } from '../../lib/utils';

export default function RiwayatPemeriksaanScreen() {
  const router = useRouter();
  const { getPemeriksaans, loading } = usePemeriksaan();
  
  const [data, setData] = useState<PemeriksaanLansia[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchData = async () => {
    const results = await getPemeriksaans(selectedMonth, selectedYear);
    setData(results);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const renderItem = ({ item }: { item: PemeriksaanLansia }) => {
    const [sis, dias] = (item.tekanan_darah || '0/0').split('/').map(Number);
    const isHighRisk = sis > 140 || (item.gula_darah || 0) > 200 || (item.kolesterol || 0) > 200 || (item.asam_urat || 0) > 7;

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/lansia/${item.lansia_id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Users size={24} color="#0D9488" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.lansia?.nama || 'Unknown'}</Text>
              <Text style={styles.date}>{formatIndoDate(item.tanggal_periksa)}</Text>
            </View>
            <Badge 
              label={isHighRisk ? 'Berisiko' : 'Normal'} 
              variant={isHighRisk ? 'danger' : 'success'} 
            />
          </View>
          
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TD</Text>
              <Text style={styles.statValue}>{item.tekanan_darah || '-'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Gula</Text>
              <Text style={styles.statValue}>{item.gula_darah || '-'} <Text style={styles.unit}>mg/dL</Text></Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Asam Urat</Text>
              <Text style={styles.statValue}>{item.asam_urat || '-'} <Text style={styles.unit}>mg/dL</Text></Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Riwayat Pemeriksaan</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#0D9488" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.monthSelector}>
          <Calendar size={18} color="#64748B" />
          <Text style={styles.monthText}>{getIndoMonthName(selectedMonth)} {selectedYear}</Text>
        </View>
        <Text style={styles.countText}>{data.length} Kegiatan</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada data pemeriksaan pada bulan ini.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  countText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  list: {
    padding: 20,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  unit: {
    fontSize: 9,
    fontWeight: 'normal',
    color: '#94A3B8',
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
