import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLansia } from '../../hooks/useLansia';
import { useServiceStore } from '../../stores/service-store';
import { SearchBar } from '../../components/ui/SearchBar';
import { Plus, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { Lansia } from '../../lib/types';
import { COLORS } from '../../lib/constants';

export default function LansiaIndex() {
  const router = useRouter();
  const { getLansias, loading } = useLansia();
  const { activePosyanduId } = useServiceStore();
  const [lansias, setLansias] = useState<Lansia[]>([]);
  const [search, setSearch] = useState('');

  const fetchLansias = async (query?: string) => {
    const data = await getLansias(query);
    setLansias(data);
  };

  useEffect(() => {
    if (activePosyanduId) {
      fetchLansias();
    }
  }, [activePosyanduId]);

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchLansias(text);
  };

  const getInitials = (name: string) => {
    if (!name) return 'L';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderItem = ({ item }: { item: Lansia }) => {
    const ageYears = new Date().getFullYear() - new Date(item.tanggal_lahir).getFullYear();
    const initials = getInitials(item.nama);
    const posyanduName = item.posyandu?.nama_posyandu || 'Posyandu';

    return (
      <TouchableOpacity 
        onPress={() => router.push(`/lansia/${item.id}`)} 
        activeOpacity={0.7}
        style={styles.cardWrapper}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.nameText} numberOfLines={1}>{item.nama}</Text>
          <Text style={styles.subText}>{ageYears} thn • {posyanduName}</Text>
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
        <Text style={styles.title}>Data Lansia</Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar 
          value={search} 
          onChangeText={handleSearch} 
          onClear={() => handleSearch('')} 
          placeholder="Cari nama atau NIK..."
        />
      </View>

      {loading && lansias.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={lansias}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada data lansia ditemukan.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => fetchLansias(search)}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/lansia/create')}
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
    backgroundColor: '#6366F1',
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
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
});
