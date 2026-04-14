// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { COLORS } from '../lib/constants';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    try {
      setLoading(true);
      console.log('Attempting login with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Login result:', { hasData: !!data, hasSession: !!data?.session, error: error?.message });

      if (error) {
        Alert.alert('Login Gagal', error.message);
      } else {
        // Explicitly move to workspace selection
        router.replace('/select-workspace');
      }
    } catch (err: any) {
      console.error('Login error exception:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRepair() {
    try {
      setLoading(true);
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceKey) {
        Alert.alert('Error', 'Service Role Key tidak ditemukan di .env');
        return;
      }

      console.log('Running Emergency Repair...');
      const adminClient = createClient(url, serviceKey);

      const email = 'kader@posyandu.com';
      const password = 'password123';

      // Ensure user exists and has confirmed email
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) throw listError;

      const user = users.find(u => u.email === email);

      if (!user) {
        console.log('Creating user...');
        const { error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });
        if (createError) throw createError;
        Alert.alert('Sukses', `Akun ${email} berhasil dibuat dengan password ${password}`);
      } else {
        console.log('Resetting password for user ID:', user.id);
        const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
          password: password
        });
        if (updateError) throw updateError;
        Alert.alert('Sukses', `Password untuk ${email} telah di-reset menjadi: ${password}`);
      }
    } catch (err: any) {
      console.error('Repair failed:', err);
      Alert.alert('Repair Gagal', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Posyandu Mobile</Text>
        <Text style={styles.subtitle}>Sistem Informasi khusus Kader Posyandu</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="nama@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.repairButton} 
            onPress={handleRepair}
            disabled={loading}
          >
            <Text style={styles.repairButtonText}>Masalah Masuk? Perbaiki & Reset Akun</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: -8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  repairButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  repairButtonText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
});
