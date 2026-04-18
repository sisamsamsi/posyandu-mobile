import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, Share2, Users, ArrowLeft, PlusCircle } from 'lucide-react-native';
import { COLORS } from '../lib/constants';
import { useAuthStore } from '../stores/auth-store';
import { OnboardingService } from '../services/onboarding-service';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');

  // Input states
  const [posyanduName, setPosyanduName] = useState('');
  const [posyanduAddress, setPosyanduAddress] = useState('');
  
  const [inviteCode, setInviteCode] = useState('');
  const [joinRole, setJoinRole] = useState<'balita' | 'lansia'>('balita');

  const handleCreate = async () => {
    if (!posyanduName.trim()) {
      Alert.alert('Error', 'Nama posyandu tidak boleh kosong');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'Sesi tidak valid, mohon login kembali.');
      return;
    }

    setLoading(true);
    // When creating, the admin serves all/ketua
    const result = await OnboardingService.createPosyandu(posyanduName, posyanduAddress, user.id, 'semua');
    setLoading(false);

    if (result.success) {
      Alert.alert('Berhasil', 'Posyandu berhasil didaftarkan.', [
        { text: 'Lanjut', onPress: () => router.replace('/select-workspace') }
      ]);
    } else {
      Alert.alert('Gagal', result.error);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || inviteCode.length < 5) {
      Alert.alert('Error', 'Kode undangan tidak valid');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'Sesi tidak valid, mohon login kembali.');
      return;
    }

    setLoading(true);
    const result = await OnboardingService.joinPosyandu(inviteCode, user.id, joinRole);
    setLoading(false);

    if (result.success) {
      Alert.alert('Berhasil', `Berhasil bergabung dengan ${result.namaPosyandu} sebagai Kader ${joinRole.toUpperCase()}.`, [
        { text: 'Mulai', onPress: () => router.replace('/select-workspace') }
      ]);
    } else {
      Alert.alert('Gagal', result.error);
    }
  };

  if (mode === 'create') {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setMode('selection')}>
              <ArrowLeft color="#64748B" size={24} />
              <Text style={styles.backText}>Kembali</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: '#F0FDFA' }]}>
                <PlusCircle size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Daftarkan Posyandu</Text>
              <Text style={styles.subtitle}>Buat ruang kerja untuk Posyandu Anda dan kelola kader-kadernya.</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>Nama Posyandu</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Posyandu Melati 1"
                value={posyanduName}
                onChangeText={setPosyanduName}
              />

              <Text style={styles.label}>Alamat Singkat</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="RW 01, Kelurahan X"
                value={posyanduAddress}
                onChangeText={setPosyanduAddress}
                multiline
              />

              <TouchableOpacity 
                style={[styles.actionBtn, loading && styles.disabledBtn]} 
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Daftarkan & Buat Kode Undangan</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  if (mode === 'join') {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setMode('selection')}>
              <ArrowLeft color="#64748B" size={24} />
              <Text style={styles.backText}>Kembali</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                <Share2 size={32} color="#6366F1" />
              </View>
              <Text style={styles.title}>Gabung Posyandu</Text>
              <Text style={styles.subtitle}>Masukkan kode unik yang diberikan oleh Ketua Posyandu Anda.</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>Kode Undangan (Invite Code)</Text>
              <TextInput
                style={[styles.input, { fontSize: 20, textAlign: 'center', letterSpacing: 2 }]}
                placeholder="XXXXXX"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                maxLength={8}
              />

              <Text style={styles.label}>Fokus Pelayanan Anda</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity 
                  style={[styles.roleBtn, joinRole === 'balita' && styles.roleBtnActiveBalita]}
                  onPress={() => setJoinRole('balita')}
                >
                  <Text style={[styles.roleText, joinRole === 'balita' && styles.roleTextActiveBalita]}>Balita</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleBtn, joinRole === 'lansia' && styles.roleBtnActiveLansia]}
                  onPress={() => setJoinRole('lansia')}
                >
                  <Text style={[styles.roleText, joinRole === 'lansia' && styles.roleTextActiveLansia]}>Lansia</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#6366F1', marginTop: 24 }, loading && styles.disabledBtn]} 
                onPress={handleJoin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Konfirmasi & Gabung</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // Selection Mode (Default)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.selectionContent}>
        <View style={styles.header}>
          <Building2 size={48} color={COLORS.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Selamat Datang!</Text>
          <Text style={styles.subtitle}>Sepertinya Anda belum tergabung ke Posyandu manapun.</Text>
        </View>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('create')}>
          <View style={[styles.optionIcon, { backgroundColor: '#F0FDFA' }]}>
            <PlusCircle size={28} color={COLORS.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Buat Posyandu Baru</Text>
            <Text style={styles.optionDesc}>Pilih ini jika Anda adalah Ketua yang ingin mendaftarkan identitas Posyandu di aplikasi.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('join')}>
          <View style={[styles.optionIcon, { backgroundColor: '#EEF2FF' }]}>
            <Users size={28} color="#6366F1" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Gabung ke Posyandu</Text>
            <Text style={styles.optionDesc}>Pilih ini jika Ketua Anda sudah memberikan Kode Undangan untuk bergabung.</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    flexGrow: 1,
  },
  selectionContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  optionDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  roleBtnActiveBalita: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDFA',
  },
  roleBtnActiveLansia: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  roleTextActiveBalita: {
    color: COLORS.primary,
  },
  roleTextActiveLansia: {
    color: '#6366F1',
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
