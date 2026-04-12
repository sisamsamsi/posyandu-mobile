import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  ScrollView
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
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const fetchData = async () => {
    const results = await getPenimbangans(selectedMonth, selectedYear);
    setData(results);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const years = [2024, 2025, 2026];
  const months = Array.from({ length: 12 }, (_, i) => i);

  const renderItem = ({ item }: { item: Penimbangan }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/balita/${item.balita_id}`)}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#F0FDFA' }]}>
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
        <View style={{ width: 32 }} />
      </View>

      <TouchableOpacity 
        style={styles.filterBar}
        onPress={() => setIsPickerVisible(true)}
      >
        <View style={styles.monthSelector}>
          <Calendar size={18} color="#0D9488" />
          <Text style={styles.monthText}>{getIndoMonthName(selectedMonth)} {selectedYear}</Text>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
        <Text style={styles.countText}>{data.length} Kegiatan</Text>
      </TouchableOpacity>

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

      {/* Simplified Month/Year Picker Modal */}
      <Modal visible={isPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Periode</Text>
            
            <Text style={styles.pickerSub}>Tahun</Text>
            <View style={styles.yearRow}>
               {years.map(y => (
                 <TouchableOpacity 
                   key={y} 
                   onPress={() => setSelectedYear(y)}
                   style={[styles.yearBtn, selectedYear === y && styles.activeYearBtn]}
                 >
                   <Text style={[styles.yearBtnText, selectedYear === y && styles.activeYearBtnText]}>{y}</Text>
                 </TouchableOpacity>
               ))}
            </View>

            <Text style={styles.pickerSub}>Bulan</Text>
            <ScrollView contentContainerStyle={styles.monthGrid}>
               {months.map(m => (
                 <TouchableOpacity 
                   key={m} 
                   onPress={() => setSelectedMonth(m)}
                   style={[styles.monthBtn, selectedMonth === m && styles.activeMonthBtn]}
                 >
                   <Text style={[styles.monthBtnText, selectedMonth === m && styles.activeMonthBtnText]}>
                     {getIndoMonthName(m).substring(0, 3)}
                   </Text>
                 </TouchableOpacity>
               ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setIsPickerVisible(false)}
            >
              <Text style={styles.closeBtnText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  yearBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  activeYearBtn: {
    backgroundColor: '#0D9488',
  },
  yearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  activeYearBtnText: {
    color: '#FFFFFF',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthBtn: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeMonthBtn: {
    backgroundColor: '#0D9488',
  },
  monthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeMonthBtnText: {
    color: '#FFFFFF',
  },
  closeBtn: {
    marginTop: 24,
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
