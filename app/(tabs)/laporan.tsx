import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  FileDown, 
  ChevronRight, 
  FileText, 
  PieChart as PieChartIcon,
  Calendar,
  AlertCircle
} from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { COLORS } from '../../lib/constants';

export default function LaporanTabScreen() {
  const router = useRouter();

  const reportItems = [
    {
      title: 'Laporan Bulanan Balita',
      desc: 'SKDN, Prioritas Masalah Gizi & Daftar Penimbangan',
      icon: <FileText size={20} color="#0D9488" />,
      route: '/admin/reports?type=balita'
    },
    {
      title: 'Laporan Bulanan Lansia',
      desc: 'Pemeriksaan Fisik, Vital & Hasil Laboratorium',
      icon: <FileText size={20} color="#6366F1" />,
      route: '/admin/reports?type=lansia'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pusat Laporan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.promoCard}>
           <FileDown size={32} color="#FFF" />
           <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.promoTitle}>Ekspor Laporan PDF</Text>
              <Text style={styles.promoDesc}>Siapkan laporan bulanan untuk diserahkan ke Puskesmas secara instan.</Text>
           </View>
        </Card>

        <Text style={styles.sectionTitle}>Pilih Jenis Laporan</Text>
        
        {reportItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.item}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.iconContainer}>
              {item.icon}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
            <ChevronRight size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <View style={styles.infoArea}>
           <PieChartIcon size={24} color="#94A3B8" />
           <Text style={styles.infoText}>
             Semua laporan dihasilkan dalam format PDF standar yang siap dibagikan via WhatsApp atau dicetak.
           </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  content: { padding: 20 },
  promoCard: { 
    backgroundColor: '#0D9488', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 24,
    marginBottom: 32,
    elevation: 8,
    shadowColor: '#0D9488',
    shadowOpacity: 0.3,
    shadowRadius: 12
  },
  promoTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  promoDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  itemDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  infoArea: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 12,
    lineHeight: 18
  }
});
