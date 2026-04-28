import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  FileDown, 
  ChevronRight, 
  FileText, 
  PieChart as PieChartIcon,
} from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { COLORS, RADIUS, SHADOW } from '../../lib/constants';
import { useServiceStore } from '../../stores/service-store';
import { WorkspaceSwitcher } from '../../components/ui/WorkspaceSwitcher';

export default function LaporanTabScreen() {
  const router = useRouter();
  const { activeWorkspace } = useServiceStore();

  const allReportItems = [
    {
      title: 'Laporan Bulanan Balita',
      desc: 'SKDN, Prioritas Masalah Gizi & Daftar Penimbangan',
      icon: <FileText size={18} color={COLORS.balita} />,
      route: '/admin/reports?type=balita',
      color: COLORS.balitaLight,
      ws: 'balita'
    },
    {
      title: 'Laporan Bulanan Lansia',
      desc: 'Pemeriksaan Fisik, Vital & Hasil Laboratorium',
      icon: <FileText size={18} color={COLORS.lansia} />,
      route: '/admin/reports?type=lansia',
      color: COLORS.lansiaLight,
      ws: 'lansia'
    }
  ];

  const reportItems = allReportItems.filter(item => item.ws === activeWorkspace);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pusat Laporan</Text>
        <WorkspaceSwitcher size={22} color={COLORS.textPrimary} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Promo banner */}
        <View style={styles.promoCard}>
          <View style={styles.promoIconCircle}>
            <FileDown size={24} color={COLORS.textOnDark} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.promoTitle}>Ekspor Laporan PDF</Text>
            <Text style={styles.promoDesc}>Siapkan laporan bulanan untuk diserahkan ke Puskesmas secara instan.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pilih Jenis Laporan</Text>
        
        {reportItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.item}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              {item.icon}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
            <View style={styles.chevronCircle}>
              <ChevronRight size={16} color={COLORS.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.infoArea}>
          <PieChartIcon size={20} color={COLORS.textTertiary} />
          <Text style={styles.infoText}>
            Semua laporan dihasilkan dalam format PDF standar yang siap dibagikan via WhatsApp atau dicetak.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: COLORS.textPrimary,
  },
  content: { padding: 20 },
  promoCard: { 
    backgroundColor: COLORS.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: RADIUS.xl,
    marginBottom: 28,
    ...SHADOW.md,
  },
  promoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoTitle: { 
    color: COLORS.textOnDark, 
    fontSize: 16, 
    fontWeight: '700',
  },
  promoDesc: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 12, 
    marginTop: 4, 
    lineHeight: 17,
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: COLORS.textSecondary, 
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOW.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemInfo: { flex: 1 },
  itemTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: COLORS.textPrimary,
  },
  itemDesc: { 
    fontSize: 12, 
    color: COLORS.textTertiary, 
    marginTop: 2,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoArea: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 10,
    lineHeight: 17,
  },
});
