import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Baby, Users, Settings, ChevronRight, Calendar, ClipboardList } from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { COLORS } from '../../lib/constants';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';

export default function DataMasterScreen() {
  const router = useRouter();
  const { activeWorkspace } = useServiceStore();

  const allMenuItems = [
    {
      title: 'Data Balita',
      subtitle: 'Pendaftaran & data induk anak',
      icon: <Baby size={24} color={COLORS.primaryDark} />,
      route: '/balita',
      color: '#E0F2F1', // Very light teal
      ws: 'balita',
    },
    {
      title: 'Riwayat Penimbangan',
      subtitle: 'Aktivitas KMS & pencatatan bulanan',
      icon: <Calendar size={24} color={COLORS.primaryDark} />,
      route: '/penimbangan',
      color: '#E0F2F1',
      ws: 'balita',
    },
    {
      title: 'Monitoring Balita',
      subtitle: 'Analisis status kehadiran',
      icon: <ClipboardList size={24} color={COLORS.primaryDark} />,
      route: '/monitoring/balita',
      color: '#E0F2F1',
      ws: 'balita',
    },
    {
      title: 'Data Lansia',
      subtitle: 'Pendaftaran & profil kesehatan lansia',
      icon: <Users size={24} color={COLORS.secondary} />,
      route: '/lansia',
      color: '#E3F2FD', // Very light blue
      ws: 'lansia',
    },
    {
      title: 'Riwayat Pemeriksaan',
      subtitle: 'Catatan tensi & kesehatan',
      icon: <Calendar size={24} color={COLORS.secondary} />,
      route: '/pemeriksaan',
      color: '#E3F2FD',
      ws: 'lansia',
    },
    {
      title: 'Monitoring Lansia',
      subtitle: 'Pantau kunjungan bulanan',
      icon: <ClipboardList size={24} color={COLORS.secondary} />,
      route: '/monitoring/lansia',
      color: '#E3F2FD',
      ws: 'lansia',
    },
    {
      title: 'Pengaturan',
      subtitle: 'Konfigurasi unit posyandu',
      icon: <Settings size={24} color="#64748B" />,
      route: '/settings',
      color: '#F1F5F9',
      ws: 'both',
    },
  ];

  const menuItems = allMenuItems.filter((item) => item.ws === 'both' || item.ws === activeWorkspace);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Data Master</Text>
          <Text style={styles.subtitle}>
            Kelola informasi dan riwayat layanan untuk {activeWorkspace === 'balita' ? 'Balita' : 'Lansia'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <WorkspaceSwitcher color="#1E293B" size={24} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
            style={styles.menuCard}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              {item.icon}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.actionCircle}>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerRight: {
    marginTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#191C1D',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 22,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 32, // Large radius per Serene Guardian
    elevation: 4,
    shadowColor: '#006A63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#191C1D',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
