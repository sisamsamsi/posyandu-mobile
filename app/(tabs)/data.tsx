import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Baby, Users, ChevronRight, ClipboardList } from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { COLORS } from '../../lib/constants';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';

export default function DataMasterScreen() {
  const router = useRouter();
  const { activeWorkspace } = useServiceStore();

  const isBalita = activeWorkspace === 'balita';
  const theme = {
    primary: isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary,
    background: isBalita ? COLORS.tealBg : COLORS.indigoBg,
    tonal: isBalita ? COLORS.tealTonal : COLORS.indigoTonal,
  };

  const allMenuItems = [
    {
      title: 'Data Balita',
      subtitle: 'Pendaftaran & data induk anak',
      icon: <Baby size={22} color={theme.primary} />,
      route: '/balita',
      ws: 'balita',
    },
    {
      title: 'Data Imunisasi',
      subtitle: 'Pantau kelengkapan vaksin anak',
      icon: <Baby size={22} color={theme.primary} />,
      route: '/imunisasi',
      ws: 'balita',
    },
    {
      title: 'Monitoring Balita',
      subtitle: 'Analisis status kehadiran bulanan',
      icon: <ClipboardList size={22} color={theme.primary} />,
      route: '/monitoring/balita',
      ws: 'balita',
    },
    {
      title: 'Data Lansia',
      subtitle: 'Pendaftaran & profil kesehatan lansia',
      icon: <Users size={22} color={theme.primary} />,
      route: '/lansia',
      ws: 'lansia',
    },
    {
      title: 'Monitoring Lansia',
      subtitle: 'Pantau kunjungan pemeriksaan bulanan',
      icon: <ClipboardList size={22} color={theme.primary} />,
      route: '/monitoring/lansia',
      ws: 'lansia',
    },
  ];

  const menuItems = allMenuItems.filter((item) => item.ws === activeWorkspace);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Data Master</Text>
          <Text style={styles.subtitle}>
            Kelola informasi dan riwayat layanan untuk {isBalita ? 'Balita' : 'Lansia'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <WorkspaceSwitcher color="#1E293B" size={22} />
        </View>
      </View>

      {/* Content Section */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
            style={styles.menuCard}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.tonal }]}>
              {item.icon}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.actionCircle}>
              <ChevronRight size={16} color={theme.primary} />
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
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#00A896',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  headerRight: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 18,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24, // Premium wide-rounded cards
    elevation: 3,
    shadowColor: '#00A896',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 18,
  },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
