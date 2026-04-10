import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit, Trash2, User, Calendar, MapPin, Activity } from 'lucide-react-native';
import { useLansia } from '../../hooks/useLansia';
import { Lansia } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function LansiaDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getLansiaById, deleteLansia, loading } = useLansia();
  const [lansia, setLansia] = useState<Lansia | null>(null);

  const fetchDetail = async () => {
    if (typeof id === 'string') {
      const data = await getLansiaById(id);
      setLansia(data);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus data lansia ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            if (lansia?.id) {
              const success = await deleteLansia(lansia.id);
              if (success) {
                router.replace('/lansia');
              }
            }
          }
        }
      ]
    );
  };

  if (loading && !lansia) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!lansia) {
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
        <Text style={styles.title}>Profil Lansia</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push(`/lansia/${lansia.id}/edit`)} 
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
            <User size={40} color="#0D9488" />
          </View>
          <Text style={styles.name}>{lansia.nama}</Text>
          <Badge label={lansia.jenis_kelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'} variant="primary" />
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Activity size={20} color="#64748B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>NIK</Text>
              <Text style={styles.infoValue}>{lansia.nik}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color="#64748B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Tanggal Lahir</Text>
              <Text style={styles.infoValue}>{lansia.tanggal_lahir}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MapPin size={20} color="#64748B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={styles.infoValue}>{lansia.alamat || '-'} (RT {lansia.rt || '-'})</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Penyakit Bawaan</Text>
        <View style={styles.diseaseList}>
          {lansia.penyakit_bawaan && lansia.penyakit_bawaan.length > 0 ? (
            lansia.penyakit_bawaan.map((d, i) => (
              <View key={i} style={styles.diseaseBadge}>
                <Text style={styles.diseaseText}>{d}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Tidak ada riwayat penyakit.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Riwayat Pemeriksaan</Text>
        {lansia.pemeriksaan_lansias && lansia.pemeriksaan_lansias.length > 0 ? (
          lansia.pemeriksaan_lansias.map((p, idx) => (
            <Card key={idx} style={styles.visitCard}>
               <Text>{p.tanggal_periksa}: {p.keluhan || 'Tidak ada keluhan'}</Text>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada riwayat pemeriksaan.</Text>
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
    marginBottom: 24,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  diseaseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  diseaseBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  diseaseText: {
    color: '#475569',
    fontSize: 14,
  },
  visitCard: {
    marginBottom: 8,
  },
  emptyText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 16,
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
