// components/forms/LansiaForm.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Lansia } from '../../lib/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../lib/constants';
import { Calendar, User, BookOpen, MapPin, Activity, Plus, X } from 'lucide-react-native';

interface LansiaFormProps {
  initialData?: Partial<Lansia>;
  onSubmit: (data: Partial<Lansia>) => void;
  loading?: boolean;
}

export const LansiaForm: React.FC<LansiaFormProps> = ({ 
  initialData, 
  onSubmit, 
  loading 
}) => {
  const [formData, setFormData] = useState<Partial<Lansia>>({
    nama: initialData?.nama || '',
    nik: initialData?.nik || '',
    tanggal_lahir: initialData?.tanggal_lahir || '1970-01-01',
    jenis_kelamin: initialData?.jenis_kelamin || 'Perempuan',
    alamat: initialData?.alamat || '',
    rt: initialData?.rt || 1,
    penyakit_bawaan: initialData?.penyakit_bawaan || [],
    ...initialData
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDisease, setNewDisease] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (field: keyof Lansia, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleChange('tanggal_lahir', selectedDate.toISOString().split('T')[0]);
    }
  };

  const addDisease = () => {
    if (newDisease.trim()) {
      const updated = [...(formData.penyakit_bawaan || []), newDisease.trim()];
      handleChange('penyakit_bawaan', updated);
      setNewDisease('');
    }
  };

  const removeDisease = (index: number) => {
    const updated = [...(formData.penyakit_bawaan || [])];
    updated.splice(index, 1);
    handleChange('penyakit_bawaan', updated);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 64}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Data Diri Lansia</Text>

          {/* Nama Lengkap */}
          <Text style={styles.label}>Nama Lengkap</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'nama' && styles.inputWrapperFocused
          ]}>
            <User size={18} color={focusedField === 'nama' ? COLORS.indigoPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.nama}
              onChangeText={(val) => handleChange('nama', val)}
              placeholder="Nama Lengkap Lansia"
              placeholderTextColor="#94A3B8"
              onFocus={() => setFocusedField('nama')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* NIK */}
          <Text style={styles.label}>NIK</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'nik' && styles.inputWrapperFocused
          ]}>
            <BookOpen size={18} color={focusedField === 'nik' ? COLORS.indigoPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.nik}
              onChangeText={(val) => handleChange('nik', val)}
              placeholder="16 Digit NIK"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={16}
              onFocus={() => setFocusedField('nik')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Tanggal Lahir & Jenis Kelamin */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Tanggal Lahir</Text>
              <TouchableOpacity 
                style={styles.dateButton} 
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={18} color={COLORS.indigoPrimary} />
                <Text style={styles.dateButtonText}>{formData.tanggal_lahir}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(formData.tanggal_lahir || '1970-01-01')}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Jenis Kelamin</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[
                    styles.genderButton, 
                    formData.jenis_kelamin === 'Laki-laki' && styles.genderButtonActive
                  ]}
                  onPress={() => handleChange('jenis_kelamin', 'Laki-laki')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.genderText, 
                    formData.jenis_kelamin === 'Laki-laki' && styles.genderTextActive
                  ]}>Laki-laki</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.genderButton, 
                    formData.jenis_kelamin === 'Perempuan' && styles.genderButtonActive
                  ]}
                  onPress={() => handleChange('jenis_kelamin', 'Perempuan')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.genderText, 
                    formData.jenis_kelamin === 'Perempuan' && styles.genderTextActive
                  ]}>Perempuan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Alamat Rumah</Text>

          {/* Alamat & RT */}
          <Text style={styles.label}>Alamat Lengkap</Text>
          <View style={[
            styles.inputWrapper, 
            styles.textAreaWrapper,
            focusedField === 'alamat' && styles.inputWrapperFocused
          ]}>
            <MapPin size={18} color={focusedField === 'alamat' ? COLORS.indigoPrimary : '#94A3B8'} style={{ marginTop: 2 }} />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.alamat || ''}
              onChangeText={(val) => handleChange('alamat', val)}
              placeholder="Alamat Lengkap (RT/RW, Jalan, Nomor)"
              placeholderTextColor="#94A3B8"
              multiline
              onFocus={() => setFocusedField('alamat')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <Text style={styles.label}>RT</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'rt' && styles.inputWrapperFocused
          ]}>
            <MapPin size={18} color={focusedField === 'rt' ? COLORS.indigoPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.rt?.toString()}
              onChangeText={(val) => handleChange('rt', parseInt(val) || 1)}
              keyboardType="numeric"
              onFocus={() => setFocusedField('rt')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Riwayat Medis Bawaan</Text>

          <Text style={styles.label}>Penyakit Bawaan</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'newDisease' && styles.inputWrapperFocused
          ]}>
            <Activity size={18} color={focusedField === 'newDisease' ? COLORS.indigoPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={newDisease}
              onChangeText={setNewDisease}
              placeholder="Hipertensi, Diabetes, Asam Urat..."
              placeholderTextColor="#94A3B8"
              onFocus={() => setFocusedField('newDisease')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: COLORS.indigoPrimary }]} 
              onPress={addDisease}
              activeOpacity={0.7}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.diseaseList}>
            {formData.penyakit_bawaan?.map((disease, idx) => (
              <View key={idx} style={[styles.diseaseBadge, { backgroundColor: COLORS.indigoTonal, borderColor: COLORS.indigoTonal }]}>
                <Text style={[styles.diseaseText, { color: COLORS.indigoPrimary }]}>{disease}</Text>
                <TouchableOpacity onPress={() => removeDisease(idx)} activeOpacity={0.7}>
                  <X size={14} color={COLORS.indigoPrimary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: COLORS.indigoPrimary }, loading && styles.buttonDisabled]}
          onPress={() => onSubmit(formData)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Menyimpan...' : 'Simpan Data Lansia'}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
    gap: 8,
  },
  inputWrapperFocused: {
    borderColor: COLORS.indigoPrimary,
    backgroundColor: '#FFFFFF',
  },
  textAreaWrapper: {
    height: 80,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
  },
  textArea: {
    height: '100%',
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  genderContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
    alignItems: 'center',
  },
  genderButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },
  genderButtonActive: {
    backgroundColor: COLORS.indigoPrimary,
  },
  genderText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 12,
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diseaseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  diseaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  diseaseText: {
    fontSize: 13,
    fontWeight: '800',
  },
  submitButton: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: '#C7D2FE',
  },
});
