// app/counseling/history.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface HistoryItem {
  id: string;
  tanggal: string;
  created_at: string;
  pertanyaan: string[];
  jawaban: string[];
  rekomendasi: string;
  balita: {
    id: string;
    nama: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    rt: number;
  };
  category: 'Gizi' | 'Tumbuh Kembang' | 'Imunisasi';
  title: string;
}

export default function CounselingHistoryScreen() {
  const router = useRouter();
  const { activePosyanduId } = useServiceStore();
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [filteredData, setFilteredData] = useState<HistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Gizi' | 'Tumbuh Kembang' | 'Imunisasi'>('Semua');

  useEffect(() => {
    fetchHistory();
  }, [activePosyanduId]);

  useEffect(() => {
    filterData();
  }, [activeFilter, historyData]);

  const fetchHistory = async () => {
    if (!activePosyanduId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('penyuluhans')
        .select(`
          id,
          tanggal,
          created_at,
          pertanyaan,
          jawaban,
          rekomendasi,
          balita:balitas!inner(
            id,
            nama,
            tanggal_lahir,
            jenis_kelamin,
            rt,
            posyandu_id
          )
        `)
        .eq('balita.posyandu_id', activePosyanduId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map categories and titles dynamically
      const mapped = (data || []).map((item: any) => {
        const recommendation = item.rekomendasi || '';
        const questions = (item.pertanyaan || []).join(' ').toLowerCase();
        const answers = (item.jawaban || []).join(' ').toLowerCase();
        const text = (recommendation + ' ' + questions + ' ' + answers).toLowerCase();

        // 1. Determine category
        let category: 'Gizi' | 'Tumbuh Kembang' | 'Imunisasi' = 'Gizi';
        if (text.includes('imunisasi') || text.includes('vaksin') || text.includes('campak') || text.includes('polio') || text.includes('dpt')) {
          category = 'Imunisasi';
        } else if (text.includes('stunting') || text.includes('pendek') || text.includes('tumbuh') || text.includes('kembang') || text.includes('stimulasi') || text.includes('motorik')) {
          category = 'Tumbuh Kembang';
        }

        // 2. Determine title
        let title = `Penyuluhan ${item.balita.nama}`;
        if (text.includes('sayur')) {
          title = 'Anak susah makan sayur';
        } else if (text.includes('menu') || text.includes('resep')) {
          title = 'Menu sehat untuk balita';
        } else if (text.includes('demam') || text.includes('panas') || text.includes('pilek') || text.includes('flu')) {
          title = 'Demam dan infeksi pada balita';
        } else if (category === 'Imunisasi') {
          title = 'Jadwal imunisasi dasar lengkap';
        } else if (category === 'Tumbuh Kembang' && text.includes('pendek')) {
          title = 'Pencegahan stunting balita';
        } else if (text.includes('asi') && text.includes('mpasi')) {
          title = 'Pemberian ASI eksklusif & MPASI';
        }

        return {
          id: item.id,
          tanggal: item.tanggal,
          created_at: item.created_at,
          pertanyaan: item.pertanyaan,
          jawaban: item.jawaban,
          rekomendasi: item.rekomendasi,
          balita: item.balita,
          category,
          title,
        };
      });

      setHistoryData(mapped);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Gagal memuat riwayat penyuluhan.');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (activeFilter === 'Semua') {
      setFilteredData(historyData);
    } else {
      setFilteredData(historyData.filter(item => item.category === activeFilter));
    }
  };

  const groupDataByMonth = (items: HistoryItem[]) => {
    const groups: Record<string, HistoryItem[]> = {};
    items.forEach(item => {
      const date = new Date(item.created_at || item.tanggal);
      const monthYear = format(date, 'MMMM yyyy', { locale: idLocale });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(item);
    });
    return Object.entries(groups);
  };

  const getCategoryStyles = (category: 'Gizi' | 'Tumbuh Kembang' | 'Imunisasi') => {
    switch (category) {
      case 'Imunisasi':
        return { bg: '#FFEDD5', color: '#F97316' }; // Orange tonal
      case 'Tumbuh Kembang':
        return { bg: '#F3E8FF', color: '#8B5CF6' }; // Purple tonal
      case 'Gizi':
      default:
        return { bg: '#E6F4EA', color: '#09A477' }; // Green/Teal tonal
    }
  };

  const formatItemTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  };

  const formatItemDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, 'd MMM yyyy', { locale: idLocale });
  };

  const groupedHistory = groupDataByMonth(filteredData);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Penyuluhan</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['Semua', 'Gizi', 'Tumbuh Kembang', 'Imunisasi'].map((filterName) => (
            <TouchableOpacity
              key={filterName}
              style={[
                styles.filterChip,
                activeFilter === filterName && styles.filterChipActive
              ]}
              onPress={() => setActiveFilter(filterName as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filterName && styles.filterTextActive
                ]}
              >
                {filterName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#09A477" />
          <Text style={styles.loadingText}>Memuat riwayat...</Text>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.center}>
          <FileText size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>Tidak ada riwayat penyuluhan.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {groupedHistory.map(([monthYear, items]) => (
            <View key={monthYear} style={styles.monthSection}>
              <Text style={styles.monthHeader}>{monthYear}</Text>
              
              <View style={styles.listCard}>
                {items.map((item, idx) => {
                  const catTheme = getCategoryStyles(item.category);
                  const time = formatItemTime(item.created_at);
                  const date = formatItemDate(item.tanggal || item.created_at);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.listItem,
                        idx === items.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => router.push(`/counseling/summary?id=${item.id}`)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: catTheme.bg }]}>
                        <FileText size={20} color={catTheme.color} />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemSubText} numberOfLines={1}>
                          {item.balita.nama} (RT {item.balita.rt}) • {item.rekomendasi.replace(/[\*#\-\d\.]/g, '').trim()}
                        </Text>
                        <Text style={styles.itemDate}>
                          {date} • {time}
                        </Text>
                      </View>

                      <ChevronRight size={18} color="#94A3B8" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#09A477',
    borderColor: '#09A477',
  },
  filterText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
  },
  monthSection: {
    marginBottom: 20,
  },
  monthHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    paddingLeft: 4,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
