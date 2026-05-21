import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { BalitaForm } from '../../components/forms/BalitaForm';
import { useBalita } from '../../hooks/useBalita';
import { useServiceStore } from '../../stores/service-store';

export default function CreateBalita() {
  const router = useRouter();
  const { upsertBalita, loading } = useBalita();
  const { activePosyanduId } = useServiceStore();

  const handleSubmit = async (data: any) => {
    try {
      if (data.nik.length !== 16) {
        Alert.alert('Error', 'NIK harus 16 digit');
        return;
      }

      // Inject posyandu_id dari store aktif
      const dataWithPosyandu = { ...data, posyandu_id: activePosyanduId };
      await upsertBalita(dataWithPosyandu);
      
      Alert.alert('Sukses', 'Data Balita berhasil disimpan', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan data');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Tambah Balita</Text>
      </View>

      <BalitaForm onSubmit={handleSubmit} loading={loading} />
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
});
