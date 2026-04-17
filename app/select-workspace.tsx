import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Baby, 
  Users, 
  ArrowRight, 
  Heart, 
  MapPin, 
  ChevronLeft,
  Building2
} from 'lucide-react-native';
import { useServiceStore } from '../stores/service-store';
import { usePosyandu } from '../hooks/usePosyandu';
import { COLORS } from '../lib/constants';
import { Posyandu } from '../lib/types';

const { width } = Dimensions.get('window');

export default function SelectWorkspaceScreen() {
  const router = useRouter();
  const { setActiveWorkspace, setActivePosyandu, activePosyanduId } = useServiceStore();
  const { getAllPosyandus } = usePosyandu();
  
  const [step, setStep] = useState<'posyandu' | 'workspace'>(activePosyanduId ? 'workspace' : 'posyandu');
  const [posyandus, setPosyandus] = useState<Posyandu[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === 'posyandu') {
      loadPosyandus();
    }
  }, [step]);

  const loadPosyandus = async () => {
    setLoading(true);
    try {
      const data = await getAllPosyandus();
      setPosyandus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePosyanduSelect = (id: string) => {
    setActivePosyandu(id);
    setStep('workspace');
  };

  const handleWorkspaceSelect = (workspace: 'balita' | 'lansia') => {
    setActiveWorkspace(workspace);
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    setActivePosyandu(null);
    setStep('posyandu');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          {step === 'workspace' && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <ChevronLeft size={24} color="#64748B" />
              <Text style={styles.backText}>Ganti Posyandu</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.logoBadge}>
            <Heart size={24} color={COLORS.primary} fill={COLORS.primary} />
          </View>
          <Text style={styles.title}>
            {step === 'posyandu' ? 'Pilih Posyandu' : 'Pilih Layanan'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'posyandu' 
              ? 'Silakan pilih lokasi Posyandu tempat Anda bertugas hari ini.' 
              : 'Selamat bekerja, Kader! Silakan pilih fokus pelayanan Anda.'}
          </Text>
        </View>

        {step === 'posyandu' ? (
          <ScrollView 
            style={styles.scrollList} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : posyandus.length === 0 ? (
              <View style={styles.emptyState}>
                <Building2 size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Tidak ada data posyandu ditemukan.</Text>
              </View>
            ) : (
              posyandus.map((p) => (
                <TouchableOpacity 
                  key={p.id}
                  style={styles.posyanduCard}
                  onPress={() => handlePosyanduSelect(p.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.posyanduIcon}>
                    <MapPin size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.posyanduInfo}>
                    <Text style={styles.posyanduName}>{p.nama_posyandu}</Text>
                    <Text style={styles.posyanduAddr} numberOfLines={1}>{p.alamat_lengkap || 'Alamat belum diatur'}</Text>
                  </View>
                  <ArrowRight size={20} color="#CBD5E1" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        ) : (
          <View style={styles.grid}>
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => handleWorkspaceSelect('balita')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#F0FDFA' }]}>
                <Baby size={32} color={COLORS.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Pelayanan Balita</Text>
                <Text style={styles.cardDesc}>Data penimbangan, status gizi, dan imunisasi anak.</Text>
              </View>
              <View style={styles.arrowBtn}>
                <ArrowRight size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.card} 
              onPress={() => handleWorkspaceSelect('lansia')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Users size={32} color="#6366F1" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Pelayanan Lansia</Text>
                <Text style={styles.cardDesc}>Pemeriksaaan kesehatan rutin dan pemantauan lansia.</Text>
              </View>
              <View style={styles.arrowBtn}>
                <ArrowRight size={20} color="#6366F1" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pilihan konteks yang tepat memastikan laporan Anda akurat dan aman.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    width: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: -10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 4,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  scrollList: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 20,
    gap: 12,
  },
  posyanduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  posyanduIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  posyanduInfo: {
    flex: 1,
  },
  posyanduName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  posyanduAddr: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  grid: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
