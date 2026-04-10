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
import { useBalita } from '../../hooks/useBalita';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Plus, Baby, ArrowLeft } from 'lucide-react-native';
import { Balita } from '../../lib/types';

export default function BalitaIndex() {
  const router = useRouter();
  const { getBalitas, loading } = useBalita();
  const [balitas, setBalitas] = useState<Balita[]>([]);
  const [search, setSearch] = useState('');

  const fetchBalitas = async (query?: string) => {
    const data = await getBalitas(query);
    setBalitas(data);
  };

  useEffect(() => {
    fetchBalitas();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchBalitas(text);
  };

  const renderItem = ({ item }: { item: Balita }) => (
    <TouchableOpacity onPress={() => router.push(`/balita/${item.id}`)}>
      <Card style={styles.childCard}>
        <View style={styles.childAvatar}>
          <Baby size={24} color="#0D9488" />
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.nama}</Text>
          <Text style={styles.childNik}>{item.nik}</Text>
          <View style={styles.badgeRow}>
            <Badge label={item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'} variant="primary" />
            <Text style={styles.childRt}>RT {item.rt}</Text>
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

      {loading && balitas.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={balitas}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  childNik: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childRt: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
