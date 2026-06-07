// app/(tabs)/settings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Settings,
  MapPin,
  Calendar,
  Baby,
  Users,
  Clock,
  Save,
  LogOut,
  ChevronDown,
  ChevronUp,
  Building2,
  Info,
  CheckCircle2,
  LayoutGrid,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/auth-store';
import { useServiceStore } from '../stores/service-store';
import { usePosyandu } from '../hooks/usePosyandu';
import { SettingsService, PosyanduSettingsUpdate } from '../services/settings-service';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/constants';
import { Posyandu } from '../lib/types';

type SectionKey = 'balita' | 'lansia' | 'profil' | 'info';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuthStore();
  const { activePosyanduId, setActiveWorkspace } = useServiceStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posyandu, setPosyandu] = useState<Posyandu | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    balita: true,
    lansia: true,
    profil: false,
    info: false,
  });

  // Form state
  const [form, setForm] = useState<PosyanduSettingsUpdate>({
    nama_posyandu: '',
    alamat_lengkap: '',
    nama_posyandu_balita: null,
    alamat_posyandu_balita: null,
    nama_posyandu_lansia: null,
    alamat_posyandu_lansia: null,
    kelurahan: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: 'Jawa Barat',
    jadwal_balita_tanggal: null,
    jadwal_balita_jam: '08:00',
    jadwal_lansia_tanggal: null,
    jadwal_lansia_jam: '08:00',
  });

  const posyanduId = activePosyanduId;

  const loadSettings = useCallback(async () => {
    if (!posyanduId) {
      setLoading(false);
      return;
    }
    try {
      const data = await SettingsService.getPosyanduSettings(posyanduId);
      if (data) {
        setPosyandu(data);
        setForm({
          nama_posyandu: data.nama_posyandu || '',
          alamat_lengkap: data.alamat_lengkap || '',
          nama_posyandu_balita: data.nama_posyandu_balita,
          alamat_posyandu_balita: data.alamat_posyandu_balita,
          nama_posyandu_lansia: data.nama_posyandu_lansia,
          alamat_posyandu_lansia: data.alamat_posyandu_lansia,
          kelurahan: data.kelurahan || '',
          kecamatan: data.kecamatan || '',
          kabupaten: data.kabupaten || '',
          provinsi: data.provinsi || 'Jawa Barat',
          jadwal_balita_tanggal: data.jadwal_balita_tanggal,
          jadwal_balita_jam: data.jadwal_balita_jam || '08:00',
          jadwal_lansia_tanggal: data.jadwal_lansia_tanggal,
          jadwal_lansia_jam: data.jadwal_lansia_jam || '08:00',
        });
        setHasChanges(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [posyanduId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = (key: keyof PosyanduSettingsUpdate, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!posyanduId) return;
    setSaving(true);
    try {
      const result = await SettingsService.updatePosyanduSettings(posyanduId, form);
      if (result.success) {
        setHasChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        Alert.alert('Gagal Menyimpan', result.error || 'Terjadi kesalahan');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSwitchWorkspace = () => {
    Alert.alert(
      'Ganti Layanan',
      'Apakah Anda ingin berganti fokus pelayanan (Balita/Lansia)? Anda akan diarahkan ke halaman pemilihan layanan.',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Ya, Ganti', 
          onPress: () => {
            setActiveWorkspace(null);
            // The router will automatically redirect to select-workspace because of the _layout.tsx guard
          } 
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar Akun',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: signOut },
      ]
    );
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat pengaturan...</Text>
      </View>
    );
  }

  if (!posyanduId) {
    return (
      <View style={styles.loadingContainer}>
        <Building2 size={48} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Belum Ada Posyandu</Text>
        <Text style={styles.emptyText}>
          Silakan pilih posyandu aktif di halaman Service Desk terlebih dahulu.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={{ marginRight: 8, padding: 4 }} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerIconCircle}>
            <Settings size={22} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Pengaturan</Text>
            <Text style={styles.headerSub}>Posyandu Aktif</Text>
          </View>
        </View>
        {hasChanges && (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Save size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>Simpan</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {saveSuccess && (
          <View style={styles.successBadge}>
            <CheckCircle2 size={16} color="#059669" />
            <Text style={styles.successText}>Tersimpan</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSettings(); }} />
          }
        >
          {/* ================================== */}
          {/* SECTION: PROFIL & JADWAL BALITA    */}
          {/* ================================== */}
          <View style={styles.bentoCard}>
            <SectionHeader
              icon={<Baby size={18} color={COLORS.primary} />}
              title="Profil & Jadwal Balita"
              expanded={expandedSections.balita}
              onToggle={() => toggleSection('balita')}
              accentColor={COLORS.primary}
            />
            {expandedSections.balita && (
              <View style={styles.sectionBody}>
                <FormField
                  label="Nama Posyandu Balita"
                  value={form.nama_posyandu_balita || ''}
                  onChangeText={(v) => updateField('nama_posyandu_balita', v)}
                  placeholder="Contoh: Posyandu Balita Melati 1"
                />
                <FormField
                  label="Alamat Khusus Posyandu Balita"
                  value={form.alamat_posyandu_balita || ''}
                  onChangeText={(v) => updateField('alamat_posyandu_balita', v)}
                  placeholder="Contoh: Kediaman Bu RW, RT 01/RW 02"
                  multiline
                />
                
                {/* Jadwal Balita */}
                <View style={[styles.scheduleCard, { marginTop: 8 }]}>
                  <View style={styles.scheduleHeader}>
                    <View style={[styles.scheduleIconCircle, { backgroundColor: '#F0FDFA' }]}>
                      <Clock size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.scheduleTitle}>Jadwal Kegiatan Balita</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.fieldLabel}>Setiap Tanggal</Text>
                      <TextInput
                        style={styles.input}
                        value={form.jadwal_balita_tanggal?.toString() || ''}
                        onChangeText={(v) => {
                          const num = parseInt(v, 10);
                          updateField('jadwal_balita_tanggal', isNaN(num) ? null : Math.min(31, Math.max(1, num)));
                        }}
                        placeholder="15"
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.fieldLabel}>Jam Mulai</Text>
                      <TextInput
                        style={styles.input}
                        value={form.jadwal_balita_jam || ''}
                        onChangeText={(v) => updateField('jadwal_balita_jam', v)}
                        placeholder="08:00"
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ================================== */}
          {/* SECTION: PROFIL & JADWAL LANSIA    */}
          {/* ================================== */}
          <View style={styles.bentoCard}>
            <SectionHeader
              icon={<Users size={18} color="#6366F1" />}
              title="Profil & Jadwal Lansia"
              expanded={expandedSections.lansia}
              onToggle={() => toggleSection('lansia')}
              accentColor="#6366F1"
            />
            {expandedSections.lansia && (
              <View style={styles.sectionBody}>
                <FormField
                  label="Nama Posyandu Lansia"
                  value={form.nama_posyandu_lansia || ''}
                  onChangeText={(v) => updateField('nama_posyandu_lansia', v)}
                  placeholder="Contoh: Posyandu Lansia Karang Werdha"
                />
                <FormField
                  label="Alamat Khusus Posyandu Lansia"
                  value={form.alamat_posyandu_lansia || ''}
                  onChangeText={(v) => updateField('alamat_posyandu_lansia', v)}
                  placeholder="Contoh: Balai Warga RW 02"
                  multiline
                />
                
                {/* Jadwal Lansia */}
                <View style={[styles.scheduleCard, { marginTop: 8 }]}>
                  <View style={styles.scheduleHeader}>
                    <View style={[styles.scheduleIconCircle, { backgroundColor: '#EEF2FF' }]}>
                      <Clock size={16} color="#6366F1" />
                    </View>
                    <Text style={styles.scheduleTitle}>Jadwal Kegiatan Lansia</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.fieldLabel}>Setiap Tanggal</Text>
                      <TextInput
                        style={styles.input}
                        value={form.jadwal_lansia_tanggal?.toString() || ''}
                        onChangeText={(v) => {
                          const num = parseInt(v, 10);
                          updateField('jadwal_lansia_tanggal', isNaN(num) ? null : Math.min(31, Math.max(1, num)));
                        }}
                        placeholder="22"
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.fieldLabel}>Jam Mulai</Text>
                      <TextInput
                        style={styles.input}
                        value={form.jadwal_lansia_jam || ''}
                        onChangeText={(v) => updateField('jadwal_lansia_jam', v)}
                        placeholder="09:00"
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ==================================== */}
          {/* SECTION: ADMINISTRASI ILP (SHARED)   */}
          {/* ==================================== */}
          <View style={styles.bentoCard}>
            <SectionHeader
              icon={<Building2 size={18} color="#64748B" />}
              title="Administrasi ILP (Shared)"
              expanded={expandedSections.profil}
              onToggle={() => toggleSection('profil')}
              accentColor="#64748B"
            />
            {expandedSections.profil && (
              <View style={styles.sectionBody}>
                <FormField
                  label="Nama Utama ILP"
                  value={form.nama_posyandu || ''}
                  onChangeText={(v) => updateField('nama_posyandu', v)}
                  placeholder="Contoh: ILP Puskesmas Pembantu Desa"
                />
                <FormField
                  label="Alamat Utama ILP"
                  value={form.alamat_lengkap || ''}
                  onChangeText={(v) => updateField('alamat_lengkap', v)}
                  placeholder="Contoh: Jl. Utama Desa No. 12"
                  multiline
                />
                <View style={styles.rowFields}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <FormField
                      label="Kelurahan/Desa"
                      value={form.kelurahan || ''}
                      onChangeText={(v) => updateField('kelurahan', v)}
                      placeholder="Sukajadi"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <FormField
                      label="Kecamatan"
                      value={form.kecamatan || ''}
                      onChangeText={(v) => updateField('kecamatan', v)}
                      placeholder="Pamanukan"
                    />
                  </View>
                </View>
                <View style={styles.rowFields}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <FormField
                      label="Kabupaten/Kota"
                      value={form.kabupaten || ''}
                      onChangeText={(v) => updateField('kabupaten', v)}
                      placeholder="Subang"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <FormField
                      label="Provinsi"
                      value={form.provinsi || ''}
                      onChangeText={(v) => updateField('provinsi', v)}
                      placeholder="Jawa Barat"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* =========================== */}
          {/* SECTION: TENTANG APLIKASI   */}
          {/* =========================== */}
          <View style={styles.bentoCard}>
            <SectionHeader
              icon={<Info size={18} color="#64748B" />}
              title="Tentang Aplikasi"
              expanded={expandedSections.info}
              onToggle={() => toggleSection('info')}
              accentColor="#64748B"
            />
            {expandedSections.info && (
              <View style={styles.sectionBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Versi Aplikasi</Text>
                  <Text style={styles.infoValue}>v2.0.0 (Premium)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Platform</Text>
                  <Text style={styles.infoValue}>React Native + Expo</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Database</Text>
                  <Text style={styles.infoValue}>Supabase (PostgreSQL)</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>Filosofi</Text>
                  <Text style={styles.infoValue}>Rawat Tumbuhnya, Jaga Tuanya</Text>
                </View>

                {posyandu?.invite_code && (
                  <View style={styles.waFormatCard}>
                    <Text style={[styles.waFormatTitle, { color: '#4338CA' }]}>🤝 Kode Undangan (Invite Code)</Text>
                    <Text style={[styles.waFormatText, { color: '#3730A3' }]}>
                      Bagikan kode ini kepada kader lain agar mereka bisa bergabung ke Posyandu Anda secara mandiri di halaman awal.
                    </Text>
                    <View style={styles.waFormatExample}>
                      <Text style={[styles.waFormatCode, { fontSize: 24, letterSpacing: 3, fontWeight: '900', color: '#312E81' }]}>{posyandu.invite_code}</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.waFormatCard, !posyandu?.invite_code && { marginTop: 16 }]}>
                  <Text style={styles.waFormatTitle}>📱 Format Nomor WhatsApp</Text>
                  <Text style={styles.waFormatText}>
                    Saat mengisi nomor HP orang tua, gunakan format berikut:
                  </Text>
                  <View style={styles.waFormatExample}>
                    <Text style={styles.waFormatCode}>0812-3456-7890</Text>
                    <Text style={styles.waFormatCode}>atau</Text>
                    <Text style={styles.waFormatCode}>6281234567890</Text>
                  </View>
                  <Text style={styles.waFormatNote}>
                    Aplikasi akan otomatis mengkonversi ke format internasional (62xxx).
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Ganti Layanan Button */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#F0FDFA', marginTop: 32 }]} 
            onPress={handleSwitchWorkspace}
          >
            <LayoutGrid size={20} color={COLORS.primary} />
            <Text style={[styles.logoutText, { color: COLORS.primary }]}>Ganti Layanan (Balita/Lansia)</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity style={[styles.logoutButton, { marginTop: 12 }]} onPress={handleLogout}>
            <LogOut size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Keluar Akun</Text>
          </TouchableOpacity>



          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================

function SectionHeader({
  icon,
  title,
  expanded,
  onToggle,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIconCircle, { backgroundColor: `${accentColor}15` }]}>
          {icon}
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {expanded ? (
        <ChevronUp size={20} color="#94A3B8" />
      ) : (
        <ChevronDown size={20} color="#94A3B8" />
      )}
    </TouchableOpacity>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          multiline && styles.inputMultiline,
          isFocused && { borderColor: COLORS.primary, borderWidth: 1.5 }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 4,
    lineHeight: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  successText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
  },

  scrollContent: {
    padding: 16,
  },

  // Bento Card Section
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#00A896',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionBody: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1.5,
    borderTopColor: '#F1F5F9',
  },

  // Form fields
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
  },

  // Schedule
  scheduleCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  scheduleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  scheduleRow: {
    flexDirection: 'row',
  },

  // Hint
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },

  // WA Format Card
  waFormatCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  waFormatTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 8,
  },
  waFormatText: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },
  waFormatExample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  waFormatCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  waFormatNote: {
    fontSize: 11,
    color: '#15803D',
    fontStyle: 'italic',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
});
