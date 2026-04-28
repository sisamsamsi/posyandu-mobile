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
import { Plus, Baby, ArrowLeft, GraduationCap } from 'lucide-react-native';
import { Balita } from '../../lib/types';
import { differenceInMonths } from 'date-fns';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';

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

  const renderItem = ({ item }: { item: Balita }) => {
    const ageMonths = differenceInMonths(new Date(), new Date(item.tanggal_lahir));
    const isGraduated = ageMonths >= 60;

    return (
      <TouchableOpacity onPress={() => router.push(`/balita/${item.id}`)}>
        <Card style={styles.childCard}>
          <View style={styles.childAvatar}>
            <Baby size={22} color={COLORS.balita} />
          </View>
          <View style={styles.childInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.childName}>{item.nama}</Text>
              {isGraduated && (
                <View style={styles.lulusBadge}>
                  <GraduationCap size={11} color={COLORS.textOnDark} />
                  <Text style={styles.lulusText}>LULUS</Text>
                </View>
              )}
            </View>
            <Text style={styles.childNik}>{item.nik}</Text>
            <View style={styles.badgeRow}>
              <Badge label={item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'} variant="balita" />
              <Text style={styles.childRt}>RT {item.rt}</Text>
              <Text style={styles.childAge}> {ageMonths} bln</Text>
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
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.title}>Data Balita</Text>
          <View style={[styles.headerAccent, { backgroundColor: COLORS.balita }]} />
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

      {loading && balitas.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.balita} />
        </View>
      ) : (
        <FlatList
          data={balitas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Baby size={48} color={COLORS.surfaceBorder} />
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
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.balitaLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  childInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lulusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lulusText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textOnDark,
  },
  childNik: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childRt: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  childAge: {
    fontSize: 11,
    color: COLORS.textTertiary,
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
    backgroundColor: COLORS.balita,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.lg,
  },
});
