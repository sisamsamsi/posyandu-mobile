// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { COLORS } from '../lib/constants';
import { Eye, EyeOff } from 'lucide-react-native';
import { useServiceStore } from '../stores/service-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Login Gagal', error.message);
      } else {
        // Clear any previous active workspace/posyandu
        useServiceStore.getState().setActivePosyandu(null);
        useServiceStore.getState().setActiveWorkspace(null);
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
  
  async function signInWithGoogle() {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.type !== 'success') {
        return; // Sign-in was cancelled, do nothing
      }
      
      const idToken = userInfo.data.idToken;
      
      if (!idToken) {
        throw new Error('Tidak ada ID Token Google yang ditemukan.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        Alert.alert('Login Google Gagal', error.message);
      } else {
        // Clear any previous active workspace/posyandu
        useServiceStore.getState().setActivePosyandu(null);
        useServiceStore.getState().setActiveWorkspace(null);
        // Explicitly move to workspace selection
        router.replace('/select-workspace');
      }
    } catch (err: any) {
      if (err.code !== '12501' && err.message !== 'Sign in action cancelled') {
        console.error('Google Sign-In error:', err);
        Alert.alert('Error Login Google', err.message || 'Terjadi kesalahan saat masuk menggunakan Google.');
      }
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
          <View style={styles.header}>
            <View style={styles.logoImageContainer}>
              <Image 
                source={require('../assets/simpulsehat-logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            </View>
            <Text style={styles.brandSubtitle}>Posyandu Berbasis Keluarga</Text>
          </View>

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
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="********"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
              </TouchableOpacity>
            </View>

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

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={[styles.googleButton, loading && styles.googleButtonDisabled]} 
              onPress={signInWithGoogle}
              disabled={loading}
            >
              <Image 
                source={require('../assets/images/google_icon.png')} 
                style={styles.googleIcon} 
                resizeMode="contain" 
              />
              <Text style={styles.googleButtonText}>Masuk dengan Google</Text>
            </TouchableOpacity>

            <View style={styles.registerPrompt}>
              <Text style={styles.registerPromptText}>Belum punya akun? </Text>
              <TouchableOpacity onPress={() => router.replace('/register')} disabled={loading}>
                <Text style={styles.registerPromptLink}>Daftar di sini</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  logoImageContainer: {
    width: '100%',
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
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

  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerPromptText: {
    color: '#64748b',
    fontSize: 14,
  },
  registerPromptLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    borderRadius: 8,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  googleButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
});
