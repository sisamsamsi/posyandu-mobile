// app/(tabs)/data.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function DataMasterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Master</Text>
      <Text style={styles.subtitle}>Kelola data balita, lansia, dan posyandu</Text>
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
