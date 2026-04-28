import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Baby, Users, Settings, ChevronRight, Calendar, ClipboardList } from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';

export default function DataMasterScreen() {
  const router = useRouter();
  const { activeWorkspace } = useServiceStore();
  const isBalita = activeWorkspace === 'balita';

  const allMenuItems = [
    {
      title: 'Data Balita',
      subtitle: 'Pendaftaran & data induk anak',
      icon: <Baby size={22} color={COLORS.balita} />,
      route: '/balita',
      color: COLORS.balitaLight,
      accentColor: COLORS.balita,
      ws: 'balita',
    },
    {
      title: 'Riwayat Penimbangan',
      subtitle: 'Aktivitas KMS & pencatatan bulanan',
      icon: <Calendar size={22} color={COLORS.balita} />,
      route: '/penimbangan',
      color: COLORS.balitaLight,
      accentColor: COLORS.balita,
      ws: 'balita',
    },
    {
      title: 'Monitoring Balita',
      subtitle: 'Analisis status kehadiran',
      icon: <ClipboardList size={22} color={COLORS.balita} />,
      route: '/monitoring/balita',
      color: COLORS.balitaLight,
      accentColor: COLORS.balita,
      ws: 'balita',
    },
    {
      title: 'Data Lansia',
      subtitle: 'Pendaftaran & profil kesehatan lansia',
      icon: <Users size={22} color={COLORS.lansia} />,
      route: '/lansia',
      color: COLORS.lansiaLight,
      accentColor: COLORS.lansia,
      ws: 'lansia',
    },
    {
      title: 'Riwayat Pemeriksaan',
      subtitle: 'Catatan tensi & kesehatan',
      icon: <Calendar size={22} color={COLORS.lansia} />,
      route: '/pemeriksaan',
      color: COLORS.lansiaLight,
      accentColor: COLORS.lansia,
      ws: 'lansia',
    },
    {
      title: 'Monitoring Lansia',
      subtitle: 'Pantau kunjungan bulanan',
      icon: <ClipboardList size={22} color={COLORS.lansia} />,
      route: '/monitoring/lansia',
      color: COLORS.lansiaLight,
      accentColor: COLORS.lansia,
      ws: 'lansia',
    },
    {
      title: 'Pengaturan',
      subtitle: 'Konfigurasi unit posyandu',
      icon: <Settings size={22} color={COLORS.textTertiary} />,
      route: '/settings',
      color: COLORS.surfaceDim,
      accentColor: COLORS.textTertiary,
      ws: 'both',
    },
  ];

  const menuItems = allMenuItems.filter((item) => item.ws === 'both' || item.ws === activeWorkspace);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Data Warga</Text>
          <Text style={styles.subtitle}>
            Kelola informasi {isBalita ? 'Balita' : 'Lansia'} & riwayat layanan
          </Text>
        </View>
        <View style={styles.headerRight}>
          <WorkspaceSwitcher color={COLORS.textPrimary} size={22} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
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
              <ChevronRight size={16} color={COLORS.textTertiary} />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerRight: {
    marginTop: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 4,
    lineHeight: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOW.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
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
