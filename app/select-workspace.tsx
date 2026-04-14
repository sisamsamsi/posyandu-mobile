import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Baby, Users, ArrowRight, Heart } from 'lucide-react-native';
import { useServiceStore } from '../stores/service-store';
import { COLORS } from '../lib/constants';

const { width } = Dimensions.get('window');

export default function SelectWorkspaceScreen() {
  const router = useRouter();
  const { setActiveWorkspace } = useServiceStore();

  const handleSelect = (workspace: 'balita' | 'lansia') => {
    setActiveWorkspace(workspace);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Heart size={24} color={COLORS.primary} fill={COLORS.primary} />
          </View>
          <Text style={styles.title}>Pilih Layanan</Text>
          <Text style={styles.subtitle}>Selamat bekerja, Kader! Silakan pilih fokus pelayanan Anda hari ini.</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => handleSelect('balita')}
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
            onPress={() => handleSelect('lansia')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <Users size={32} color="#6366F1" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Pelayanan Lansia</Text>
              <Text style={styles.cardDesc}>Pemeriksaan vital, keluhan, dan kesehatan lansia.</Text>
            </View>
            <View style={styles.arrowBtn}>
              <ArrowRight size={20} color="#6366F1" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pilihan ini akan memisahkan pelaporan dan analisis agar tidak bercampur.
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
    marginBottom: 48,
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
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  grid: {
    gap: 20,
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
    width: 64,
    height: 64,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
