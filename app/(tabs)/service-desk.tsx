// app/(tabs)/service-desk.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function ServiceDeskScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pelayanan (Service Desk)</Text>
      <Text style={styles.subtitle}>Pilih kategori pelayanan untuk memulai</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardText}>Layanan Balita</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardText}>Layanan Lansia</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 32,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
