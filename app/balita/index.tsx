import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBalita } from '../../hooks/useBalita';
import { SearchBar } from '../../components/ui/SearchBar';
import { Plus, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { Balita } from '../../lib/types';
import { differenceInMonths } from 'date-fns';
import { COLORS } from '../../lib/constants';

export default function BalitaIndex() {
  const router = useRouter();
  const { getBalitas, loading } = useBalita();
  const [balitas, setBalitas] = useState<Balita[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'semua' | 'baduta' | 'balita' | 'lulus'>('semua');

  const fetchBalitas = async (query?: string) => {
    const data = await getBalitas(query);
    setBalitas(data);
  };

  // Filtered balitas based on age
  const filteredBalitas = React.useMemo(() => {
    return balitas.filter(item => {
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
  }, [balitas, activeFilter]);

  // Counts for filter chips
  const counts = React.useMemo(() => {
    let baduta = 0;
    let balitaCount = 0;
    let lulusCount = 0;
    balitas.forEach(b => {
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
      semua: balitas.length,
      baduta,
      balita: balitaCount,
      lulus: lulusCount
    };
  }, [balitas]);

  useEffect(() => {
    fetchBalitas();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchBalitas(text);
  };

  const getInitials = (name: string) => {
    if (!name) return 'B';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderItem = ({ item }: { item: Balita }) => {
    const ageMonths = differenceInMonths(new Date(), new Date(item.tanggal_lahir));
    const initials = getInitials(item.nama);
    const posyanduName = item.posyandu?.nama_posyandu || 'Posyandu';

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/balita/${item.id}`)} 
        activeOpacity={0.7}
        style={styles.cardWrapper}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.nameText} numberOfLines={1}>{item.nama}</Text>
          <Text style={styles.subText}>{ageMonths} bln • {posyanduName}</Text>
        </View>
        
        <ChevronRight size={18} color="#94A3B8" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Data Balita</Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar 
          value={search} 
          onChangeText={handleSearch} 
          onClear={() => handleSearch('')} 
          placeholder="Cari nama atau NIK..."
        />
      </View>

      {/* Filter Chips for Balita */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.filterScrollContainer}
        style={styles.filterScrollView}
      >
        <TouchableOpacity 
          style={[styles.filterChip, activeFilter === 'semua' && styles.filterChipActive]}
          onPress={() => setActiveFilter('semua')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, activeFilter === 'semua' && styles.filterChipTextActive]}>
            Semua ({counts.semua})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterChip, activeFilter === 'baduta' && styles.filterChipActive]}
          onPress={() => setActiveFilter('baduta')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, activeFilter === 'baduta' && styles.filterChipTextActive]}>
            {"Baduta (< 2 Th) ("}{counts.baduta}{")"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterChip, activeFilter === 'balita' && styles.filterChipActive]}
          onPress={() => setActiveFilter('balita')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, activeFilter === 'balita' && styles.filterChipTextActive]}>
            Balita (2-5 Th) ({counts.balita})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterChip, activeFilter === 'lulus' && styles.filterChipActive]}
          onPress={() => setActiveFilter('lulus')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, activeFilter === 'lulus' && styles.filterChipTextActive]}>
            {"Lulus (> 5 Th) ("}{counts.lulus}{")"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {loading && balitas.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={filteredBalitas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada data balita ditemukan.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => fetchBalitas(search)}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/balita/create')}
      >
        <Plus size={28} color="#FFFFFF" />
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  filterScrollView: {
    maxHeight: 50,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  filterScrollContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
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
