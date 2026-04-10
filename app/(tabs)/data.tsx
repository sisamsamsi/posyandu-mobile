import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Baby, Users, Settings, ChevronRight } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';

export default function DataMasterScreen() {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Data Balita',
      subtitle: 'Kelola data anak dan bayi',
      icon: <Baby size={32} color="#0D9488" />,
      route: '/balita',
      color: '#CCFBF1',
    },
    {
      title: 'Data Lansia',
      subtitle: 'Kelola data penduduk lansia',
      icon: <Users size={32} color="#0D9488" />,
      route: '/lansia',
      color: '#CCFBF1',
    },
    {
      title: 'Pengaturan Posyandu',
      subtitle: 'Konfigurasi unit posyandu',
      icon: <Settings size={32} color="#64748B" />,
      route: '/settings',
      color: '#F1F5F9',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Data Master</Text>
          <Text style={styles.subtitle}>Pilih kategori data yang ingin dikelola</Text>
        </View>

        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Card style={styles.menuCard}>
              <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                {item.icon}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
});
