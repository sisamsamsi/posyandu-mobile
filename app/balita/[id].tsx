  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit, Trash2, Baby, Calendar, User, MapPin } from 'lucide-react-native';
import { useBalita } from '../../hooks/useBalita';
import { Balita } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function BalitaDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getBalitaById, deleteBalita, loading } = useBalita();
  const [balita, setBalita] = useState<Balita | null>(null);

  const fetchDetail = async () => {
    if (typeof id === 'string') {
      const data = await getBalitaById(id);
      setBalita(data);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus data balita ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            if (balita?.id) {
              const success = await deleteBalita(balita.id);
              if (success) {
                router.replace('/balita');
              }
            }
          }
        }
      ]
    );
  };

  if (loading && !balita) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!balita) {
    return (
      <View style={styles.errorContainer}>
        <Text>Data tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Profil Balita</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push(`/balita/${balita.id}/edit`)} 
            style={styles.actionButton}
          >
            <Edit size={20} color="#0D9488" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Baby size={40} color="#0D9488" />
          </View>
          <Text style={styles.name}>{balita.nama}</Text>
          <Badge label={balita.jenis_kelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'} variant="primary" />
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={20} color="#64748B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>NIK</Text>
              <Text style={styles.infoValue}>{balita.nik}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color="#64748B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Tanggal Lahir</Text>
              <Text style={styles.infoValue}>{balita.tanggal_lahir}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={20} color="#64748B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Orang Tua</Text>
              <Text style={styles.infoValue}>{balita.nama_ortu}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MapPin size={20} color="#64748B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={styles.infoValue}>{balita.alamat} (RT {balita.rt})</Text>
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>BB Lahir</Text>
            <Text style={styles.statValue}>{balita.bb_lahir || '-'} kg</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>TB Lahir</Text>
            <Text style={styles.statValue}>{balita.tb_lahir || '-'} cm</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Riwayat Kunjungan</Text>
        {balita.penimbangans && balita.penimbangans.length > 0 ? (
          balita.penimbangans.map((p, idx) => (
            <Card key={idx} style={styles.visitCard}>
               <Text>{p.tanggal}: {p.berat_badan}kg / {p.tinggi_badan}cm</Text>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada riwayat penimbangan.</Text>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 16,
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoCard: {
    padding: 0,
    paddingVertical: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D9488',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  visitCard: {
    marginBottom: 8,
  },
  emptyText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
