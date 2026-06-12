import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Animated,
  useAnimatedValue,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowRight, 
  Heart, 
  MapPin, 
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react-native';
import { useServiceStore } from '../stores/service-store';
import { usePosyandu, KaderPosyanduRel } from '../hooks/usePosyandu';
import { COLORS } from '../lib/constants';

export default function SelectWorkspaceScreen() {
  const router = useRouter();
  const { setActiveWorkspace, setActivePosyandu, activePosyanduId } = useServiceStore();
  const { getLinkedPosyandus } = usePosyandu();
  
  const [links, setLinks] = useState<KaderPosyanduRel[]>([]);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useAnimatedValue(0);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await getLinkedPosyandus();
      
      if (data.length === 0) {
        // No linked posyandus -> Onboarding
        router.replace('/onboarding');
      } else {
        setLinks(data);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (rel: KaderPosyanduRel) => {
    setActivePosyandu(rel.posyandus.id);
    
    // Strict service isolation!
    if (rel.fokus_layanan === 'balita' || rel.fokus_layanan === 'lansia') {
      setActiveWorkspace(rel.fokus_layanan);
    } else {
      // If 'semua' (Admin), default to balita, but they can toggle inside dashboard
      setActiveWorkspace('balita');
    }
    
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoImageContainer}>
            <Image 
              source={require('../assets/simpulsehat-logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>
          <Text style={styles.title}>Ruang Kerja Anda</Text>
          <Text style={styles.subtitle}>
            Posyandu tempat Anda bertugas sebagai Kader.
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollList} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : links.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Memeriksa pangkalan data...</Text>
            </View>
          ) : (
            links.map((rel) => (
              <TouchableOpacity 
                key={rel.id}
                style={[styles.posyanduCard, activePosyanduId === rel.posyandus.id && styles.posyanduCardActive]}
                onPress={() => handleSelect(rel)}
                activeOpacity={0.7}
              >
                <View style={[styles.posyanduIcon, activePosyanduId === rel.posyandus.id && { backgroundColor: '#CCFBF1' }]}>
                  <MapPin size={24} color={activePosyanduId === rel.posyandus.id ? COLORS.primary : '#64748B'} />
                </View>
                <View style={styles.posyanduInfo}>
                  <Text style={styles.posyanduName}>{rel.posyandus.nama_posyandu}</Text>
                  
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      Kader {rel.fokus_layanan.toUpperCase()} • {rel.role === 'ketua' ? 'Ketua' : 'Anggota'}
                    </Text>
                  </View>
                </View>
                {activePosyanduId === rel.posyandus.id 
                  ? <CheckCircle2 size={20} color={COLORS.primary} />
                  : <ArrowRight size={20} color="#CBD5E1" />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <AlertCircle size={16} color="#94A3B8" />
          <Text style={styles.footerText}>
            Akses layanan Anda dibatasi secara ketat sesuai dengan penugasan divisi (Balita/Lansia/Semua).
          </Text>
        </View>
        
        <TouchableOpacity style={styles.joinOtherBtn} onPress={() => router.push('/onboarding')}>
            <Text style={styles.joinOtherText}>+ Gabung Posyandu Lain</Text>
        </TouchableOpacity>
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
  logoImageContainer: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '700',
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
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  joinOtherBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  joinOtherText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  }
});
