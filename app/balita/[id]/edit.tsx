import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { BalitaForm } from '../../../components/forms/BalitaForm';
import { useBalita } from '../../../hooks/useBalita';
import { Balita } from '../../../lib/types';

export default function EditBalita() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getBalitaById, upsertBalita, loading: hookLoading } = useBalita();
  const [balita, setBalita] = useState<Balita | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (typeof id === 'string') {
        const data = await getBalitaById(id);
        setBalita(data);
      }
      setFetching(false);
    };
    fetchDetail();
  }, [id]);

  const handleSubmit = async (data: any) => {
    try {
      if (data.nik.length !== 16) {
        Alert.alert('Error', 'NIK harus 16 digit');
        return;
      }

      await upsertBalita({ ...data, id });
      Alert.alert('Sukses', 'Data Balita berhasil diperbarui', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memperbarui data');
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Balita</Text>
      </View>

      {balita && (
        <BalitaForm 
          initialData={balita} 
          onSubmit={handleSubmit} 
          loading={hookLoading} 
        />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
