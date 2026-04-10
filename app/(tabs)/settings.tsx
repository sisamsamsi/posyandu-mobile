// app/(tabs)/settings.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/auth-store';
import { COLORS } from '../../lib/constants';

export default function SettingsScreen() {
  const { signOut } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pengaturan</Text>
      <Text style={styles.subtitle}>Konfigurasi aplikasi dan akun</Text>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Keluar Akun</Text>
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
  section: {
    marginTop: 'auto',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
