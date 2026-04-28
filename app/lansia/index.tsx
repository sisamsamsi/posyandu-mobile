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
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Plus, User, ArrowLeft } from 'lucide-react-native';
import { Lansia } from '../../lib/types';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';

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

  const renderItem = ({ item }: { item: Lansia }) => (
    <TouchableOpacity onPress={() => router.push(`/lansia/${item.id}`)}>
      <Card style={styles.personCard}>
        <View style={styles.personAvatar}>
          <User size={22} color={COLORS.lansia} />
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{item.nama}</Text>
          <Text style={styles.personNik}>{item.nik}</Text>
          <View style={styles.badgeRow}>
            <Badge label={item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'} variant="lansia" />
            <Text style={styles.personRt}>RT {item.rt}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.title}>Data Lansia</Text>
          <View style={[styles.headerAccent, { backgroundColor: COLORS.lansia }]} />
        </View>
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
          <ActivityIndicator size="large" color={COLORS.lansia} />
        </View>
      ) : (
        <FlatList
          data={lansias}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <User size={48} color={COLORS.surfaceBorder} />
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
        activeOpacity={0.8}
      >
        <Plus size={24} color={COLORS.textOnDark} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  backButton: {
    marginRight: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lansiaLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  personNik: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personRt: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lansia,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.lg,
  },
});
