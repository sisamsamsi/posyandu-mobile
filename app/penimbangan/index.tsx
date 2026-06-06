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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const renderItem = ({ item }: { item: Penimbangan }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/balita/${item.balita_id}`)}
      activeOpacity={0.7}
    >
      <Card style={styles.v2Card}>
        <View style={styles.v2CardHeader}>
          <View style={styles.v2Avatar}>
            <Baby size={22} color="#0D9488" />
          </View>
          <View style={styles.v2Info}>
            <Text style={styles.v2Name}>{item.balita?.nama || 'Unknown'}</Text>
            <View style={styles.v2DateRow}>
              <Calendar size={12} color="#94A3B8" />
              <Text style={styles.v2Date}>{formatIndoDate(item.tanggal)}</Text>
            </View>
          </View>
          <Badge 
            label={item.status_bb_u || 'N/A'} 
            variant={item.status_bb_u?.includes('Kurang') || item.status_bb_u?.includes('Buruk') ? 'danger' : 'success'} 
          />
        </View>
        
        <View style={styles.v2StatsGrid}>
          <View style={styles.v2StatItem}>
            <Text style={styles.v2StatLabel}>BERAT</Text>
            <Text style={styles.v2StatValue}>{item.berat_badan.toFixed(2)} <Text style={styles.v2Unit}>kg</Text></Text>
          </View>
          <View style={styles.v2StatDivider} />
          <View style={styles.v2StatItem}>
            <Text style={styles.v2StatLabel}>TINGGI</Text>
            <Text style={styles.v2StatValue}>{item.tinggi_badan.toFixed(1)} <Text style={styles.v2Unit}>cm</Text></Text>
          </View>
          <View style={styles.v2StatDivider} />
          <View style={styles.v2StatItem}>
            <Text style={styles.v2StatLabel}>BB/U</Text>
            <Text style={styles.v2StatValue}>{item.zscore_bb_u?.toFixed(2) || '-'}</Text>
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
  // V2 RIWAYAT STYLES
  v2Card: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 24,
  },
  v2CardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  v2Avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  v2Info: {
    flex: 1,
  },
  v2Name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  v2DateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  v2Date: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  v2StatsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  v2StatItem: {
    flex: 1,
    alignItems: 'center',
  },
  v2StatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  v2StatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  v2Unit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  v2StatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
});
