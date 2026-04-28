// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOW } from '../lib/constants';
import { Eye, EyeOff, LogIn } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.card}>
          {/* Logo & Brand */}
          <View style={styles.header}>
            <View style={styles.logoImageContainer}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            </View>
            <Text style={styles.brandSubtitle}>Posyandu Berbasis Keluarga</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="nama@email.com"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Masukkan password"
                  placeholderTextColor={COLORS.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  {showPassword ? <EyeOff size={18} color={COLORS.textTertiary} /> : <Eye size={18} color={COLORS.textTertiary} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={signInWithEmail}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <LogIn size={18} color="#fff" />
                  <Text style={styles.buttonText}>Masuk</Text>
                </View>
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

          {/* Register prompt */}
          <View style={styles.registerPrompt}>
            <Text style={styles.registerPromptText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
              <Text style={styles.registerPromptLink}>Daftar di sini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOW.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImageContainer: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '80%',
    height: '100%',
  },
  brandSubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 24,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceDim,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceDim,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: 14,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 4,
    ...SHADOW.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: '700',
  },
  repairButton: {
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.md,
    borderStyle: 'dashed',
  },
  repairButtonText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerPromptText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  registerPromptLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
