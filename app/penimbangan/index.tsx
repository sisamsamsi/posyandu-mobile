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
import { ArrowLeft, Calendar, Baby, ChevronRight, Filter } from 'lucide-react-native';
import { usePenimbangan } from '../../hooks/usePenimbangan';
import { Penimbangan } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatIndoDate, getIndoMonthName } from '../../lib/utils';

export default function RiwayatPenimbanganScreen() {
  const router = useRouter();
  const { getPenimbangans, loading } = usePenimbangan();
  
  const [data, setData] = useState<Penimbangan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchData = async () => {
    const results = await getPenimbangans(selectedMonth, selectedYear);
    setData(results);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const renderItem = ({ item }: { item: Penimbangan }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/balita/${item.balita_id}`)}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Baby size={24} color="#0D9488" />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.balita?.nama || 'Unknown'}</Text>
            <Text style={styles.date}>{formatIndoDate(item.tanggal)}</Text>
          </View>
          <Badge 
            label={item.status_bb_u || 'N/A'} 
            variant={item.status_bb_u?.includes('Kurang') || item.status_bb_u?.includes('Buruk') ? 'danger' : 'success'} 
          />
        </View>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>BB</Text>
            <Text style={styles.statValue}>{item.berat_badan} <Text style={styles.unit}>kg</Text></Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>TB</Text>
            <Text style={styles.statValue}>{item.tinggi_badan} <Text style={styles.unit}>cm</Text></Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>IMT/U</Text>
            <Text style={styles.statValue}>{item.zscore_imt_u?.toFixed(2) || '-'}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Riwayat Penimbangan</Text>
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
              <Text style={styles.emptyText}>Tidak ada data penimbangan pada bulan ini.</Text>
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  unit: {
    fontSize: 10,
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
