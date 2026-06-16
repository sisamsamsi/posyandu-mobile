// app/(tabs)/data.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBalita } from '../../hooks/useBalita';
import { useLansia } from '../../hooks/useLansia';
import { useServiceStore } from '../../stores/service-store';
import { SearchBar } from '../../components/ui/SearchBar';
import { Plus, ChevronRight, Baby, Users } from 'lucide-react-native';
import { COLORS } from '../../lib/constants';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';
import { differenceInMonths } from 'date-fns';

export default function DataMasterScreen() {
  const router = useRouter();
  const { activeWorkspace, activePosyanduId } = useServiceStore();
  const isBalita = activeWorkspace === 'balita';
  
  const { getBalitas, loading: balitaLoading } = useBalita();
  const { getLansias, loading: lansiaLoading } = useLansia();

  const [search, setSearch] = useState('');
  const [listData, setListData] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'semua' | 'baduta' | 'balita' | 'lulus'>('semua');

  const theme = {
    primary: isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary,
    background: isBalita ? COLORS.tealBg : COLORS.indigoBg,
    tonal: isBalita ? COLORS.tealTonal : COLORS.indigoTonal,
  };

  const loading = isBalita ? balitaLoading : lansiaLoading;

  const fetchData = async (query?: string) => {
    if (!activePosyanduId) return;
    if (isBalita) {
      const data = await getBalitas(query);
      setListData(data);
    } else {
      const data = await getLansias(query);
      setListData(data);
    }
  };

  useEffect(() => {
    setActiveFilter('semua');
    fetchData();
  }, [activeWorkspace, activePosyanduId]);

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchData(text);
  };

  // Filtered balitas based on age
  const filteredData = React.useMemo(() => {
    if (!isBalita) return listData;
    return listData.filter(item => {
      const ageMonths = differenceInMonths(new Date(), new Date(item.tanggal_lahir));
      if (activeFilter === 'baduta') {
        return ageMonths < 24;
      }
      if (activeFilter === 'balita') {
        return ageMonths >= 24 && ageMonths <= 60;
      }
      if (activeFilter === 'lulus') {
        return ageMonths > 60;
      }
      return true;
    });
  }, [listData, activeFilter, isBalita]);

  // Counts for filters
  const counts = React.useMemo(() => {
    if (!isBalita) return { semua: 0, baduta: 0, balita: 0, lulus: 0 };
    let baduta = 0;
    let balitaCount = 0;
    let lulusCount = 0;
    listData.forEach(b => {
      const age = differenceInMonths(new Date(), new Date(b.tanggal_lahir));
      if (age < 24) {
        baduta++;
      } else if (age <= 60) {
        balitaCount++;
      } else {
        lulusCount++;
      }
    });
    return {
      semua: listData.length,
      baduta,
      balita: balitaCount,
      lulus: lulusCount
    };
  }, [listData, isBalita]);

  const getInitials = (name: string) => {
    if (!name) return isBalita ? 'B' : 'L';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAgeText = (birthDate: string) => {
    if (isBalita) {
      const months = differenceInMonths(new Date(), new Date(birthDate));
      return `${months} bulan`;
    } else {
      const years = new Date().getFullYear() - new Date(birthDate).getFullYear();
      return `${years} tahun`;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const initials = getInitials(item.nama);
    const posyanduName = item.posyandu?.nama_posyandu || 'Posyandu';
    const ageText = getAgeText(item.tanggal_lahir);
    
    // Check if balita is graduated (age > 60 months)
    const ageMonths = isBalita ? differenceInMonths(new Date(), new Date(item.tanggal_lahir)) : 0;
    const isGraduated = isBalita && ageMonths > 60;

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/${activeWorkspace}/${item.id}`)} 
        activeOpacity={0.7}
        style={styles.cardWrapper}
      >
        <View style={[styles.avatarContainer, { backgroundColor: theme.tonal }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>{item.nama}</Text>
            {isGraduated && (
              <View style={styles.graduatedBadge}>
                <Text style={styles.graduatedBadgeText}>Lulus</Text>
              </View>
            )}
          </View>
          <Text style={styles.subText}>{ageText} • RT {item.rt || 1} • {posyanduName}</Text>
        </View>
        
        <View style={styles.actionCircle}>
          <ChevronRight size={16} color={theme.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Daftar {isBalita ? 'Balita' : 'Lansia'}</Text>
          <Text style={styles.subtitle}>
            Kelola data & riwayat {isBalita ? 'tumbuh kembang anak' : 'kesehatan lansia'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <WorkspaceSwitcher color="#1E293B" size={22} />
        </View>
      </View>

      {/* Search Bar Container */}
      <View style={styles.searchContainer}>
        <SearchBar 
          value={search} 
          onChangeText={handleSearch} 
          onClear={() => handleSearch('')} 
          placeholder={isBalita ? "Cari nama balita atau NIK..." : "Cari nama lansia atau NIK..."}
        />
      </View>

      {/* Filter Chips for Balita */}
      {isBalita && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScrollContainer}
          style={styles.filterScrollView}
        >
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'semua' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setActiveFilter('semua')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'semua' && styles.filterChipTextActive]}>
              Semua ({counts.semua})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'baduta' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setActiveFilter('baduta')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'baduta' && styles.filterChipTextActive]}>
              Baduta (< 2 Th) ({counts.baduta})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'balita' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setActiveFilter('balita')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'balita' && styles.filterChipTextActive]}>
              Balita (2-5 Th) ({counts.balita})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'lulus' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setActiveFilter('lulus')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'lulus' && styles.filterChipTextActive]}>
              Lulus (> 5 Th) ({counts.lulus})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* List Container */}
      {loading && filteredData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Memuat data warga...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.tonal }]}>
                {isBalita ? (
                  <Baby size={32} color={theme.primary} />
                ) : (
                  <Users size={32} color={theme.primary} />
                )}
              </View>
              <Text style={styles.emptyTitle}>Data Tidak Ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                Belum ada data {isBalita ? 'balita' : 'lansia'} yang terdaftar untuk posyandu ini.
              </Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => fetchData(search)}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} 
        onPress={() => router.push(`/${activeWorkspace}/create`)}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
  },
  headerRight: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 18,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '900',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  graduatedBadge: {
    backgroundColor: '#F0FDF4', // soft green Kemenkes
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  graduatedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A', // Green text
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  filterScrollView: {
    maxHeight: 50,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  filterScrollContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});
