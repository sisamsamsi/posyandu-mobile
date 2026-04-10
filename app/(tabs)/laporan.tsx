// app/(tabs)/laporan.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Laporan</Text>
      <Text style={styles.subtitle}>Cetak dan unduh laporan bulanan</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
