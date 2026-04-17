import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  Animated,
  useAnimatedValue
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowRight, 
  Heart, 
  MapPin, 
  Building2,
  CheckCircle2
} from 'lucide-react-native';
import { useServiceStore } from '../stores/service-store';
import { usePosyandu } from '../hooks/usePosyandu';
import { COLORS } from '../lib/constants';
import { Posyandu } from '../lib/types';

export default function SelectWorkspaceScreen() {
  const router = useRouter();
  const { setActiveWorkspace, setActivePosyandu, activePosyanduId } = useServiceStore();
  const { getAllPosyandus } = usePosyandu();
  
  const [posyandus, setPosyandus] = useState<Posyandu[]>([]);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useAnimatedValue(0);

  useEffect(() => {
    loadPosyandus();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const handlePosyanduSelect = (p: Posyandu) => {
    // Deteksi otomatis tipe layanan berdasarkan nama posyandu
    // Jika mengandung "Lansia" -> masuk ke mode lansia
    // Selain itu (ILP, Balita, dll) -> masuk ke mode balita
    const name = p.nama_posyandu.toLowerCase();
    const workspace = name.includes('lansia') ? 'lansia' : 'balita';
    
    // Set state secara atomik
    setActivePosyandu(p.id);
    setActiveWorkspace(workspace);
    
    // Langsung navigasi ke dashboard
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Heart size={24} color={COLORS.primary} fill={COLORS.primary} />
          </View>
          <Text style={styles.title}>Pilih Posyandu</Text>
          <Text style={styles.subtitle}>
            Silakan pilih lokasi Posyandu tempat Anda bertugas hari ini.
          </Text>
        </View>

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
                style={[styles.posyanduCard, activePosyanduId === p.id && styles.posyanduCardActive]}
                onPress={() => handlePosyanduSelect(p)}
                activeOpacity={0.7}
              >
                <View style={[styles.posyanduIcon, activePosyanduId === p.id && { backgroundColor: '#CCFBF1' }]}>
                  <MapPin size={24} color={activePosyanduId === p.id ? COLORS.primary : '#64748B'} />
                </View>
                <View style={styles.posyanduInfo}>
                  <Text style={styles.posyanduName}>{p.nama_posyandu}</Text>
                  <Text style={styles.posyanduAddr} numberOfLines={1}>{p.alamat_lengkap || 'Alamat belum diatur'}</Text>
                </View>
                {activePosyanduId === p.id 
                  ? <CheckCircle2 size={20} color={COLORS.primary} />
                  : <ArrowRight size={20} color="#CBD5E1" />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistem akan otomatis menyesuaikan jenis pelayanan sesuai dengan Posyandu yang dipilih.
          </Text>
        </View>
      </Animated.View>
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
    marginBottom: 32,
    position: 'relative',
    width: '100%',
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
    maxHeight: 450,
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
  posyanduCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#F0FDFA',
  },
  posyanduIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
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
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
