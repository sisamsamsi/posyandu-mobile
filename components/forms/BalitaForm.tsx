// components/forms/BalitaForm.tsx
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
import { Balita } from '../../lib/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../lib/constants';
import { Calendar, User, BookOpen, MapPin, Phone, Scale, Ruler } from 'lucide-react-native';

interface BalitaFormProps {
  initialData?: Partial<Balita>;
  onSubmit: (data: Partial<Balita>) => void;
  loading?: boolean;
}

export const BalitaForm: React.FC<BalitaFormProps> = ({ 
  initialData, 
  onSubmit, 
  loading 
}) => {
  const [formData, setFormData] = useState<Partial<Balita>>({
    nama: initialData?.nama || '',
    nik: initialData?.nik || '',
    tanggal_lahir: initialData?.tanggal_lahir || new Date().toISOString().split('T')[0],
    jenis_kelamin: initialData?.jenis_kelamin || 'Laki-laki',
    nama_ortu: initialData?.nama_ortu || '',
    alamat: initialData?.alamat || '',
    rt: initialData?.rt || 1,
    no_hp_ortu: initialData?.no_hp_ortu || '',
    ...initialData
  });

  const [bbLahirText, setBbLahirText] = useState(initialData?.bb_lahir ? initialData.bb_lahir.toString() : '');
  const [tbLahirText, setTbLahirText] = useState(initialData?.tb_lahir ? initialData.tb_lahir.toString() : '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (field: keyof Balita, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleChange('tanggal_lahir', selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleFormSubmit = () => {
    const finalData = {
      ...formData,
      bb_lahir: bbLahirText ? parseFloat(bbLahirText.replace(',', '.')) : null,
      tb_lahir: tbLahirText ? parseFloat(tbLahirText.replace(',', '.')) : null,
    };
    onSubmit(finalData);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Data Diri Balita</Text>

          {/* Nama Balita */}
          <Text style={styles.label}>Nama Balita</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'nama' && styles.inputWrapperFocused
          ]}>
            <User size={18} color={focusedField === 'nama' ? COLORS.tealPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.nama}
              onChangeText={(val) => handleChange('nama', val)}
              placeholder="Nama Lengkap Anak"
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
            <BookOpen size={18} color={focusedField === 'nik' ? COLORS.tealPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.nik}
              onChangeText={(val) => handleChange('nik', val)}
              placeholder="16 Digit Nomor Induk Kependudukan"
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
                <Calendar size={18} color={COLORS.tealPrimary} />
                <Text style={styles.dateButtonText}>{formData.tanggal_lahir}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(formData.tanggal_lahir || Date.now())}
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
          <Text style={styles.cardSectionTitle}>Orang Tua & Alamat</Text>

          {/* Nama Ortu */}
          <Text style={styles.label}>Nama Orang Tua (Ibu/Ayah)</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'nama_ortu' && styles.inputWrapperFocused
          ]}>
            <User size={18} color={focusedField === 'nama_ortu' ? COLORS.tealPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.nama_ortu}
              onChangeText={(val) => handleChange('nama_ortu', val)}
              placeholder="Nama Orang Tua Kandung"
              placeholderTextColor="#94A3B8"
              onFocus={() => setFocusedField('nama_ortu')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* No HP Ortu */}
          <Text style={styles.label}>No. HP Orang Tua (WhatsApp)</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'no_hp_ortu' && styles.inputWrapperFocused
          ]}>
            <Phone size={18} color={focusedField === 'no_hp_ortu' ? COLORS.tealPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.no_hp_ortu || ''}
              onChangeText={(val) => {
                let formatted = val;
                if (val.startsWith('08')) {
                  formatted = '628' + val.substring(2);
                }
                handleChange('no_hp_ortu', formatted);
              }}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              onFocus={() => setFocusedField('no_hp_ortu')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Alamat & RT */}
          <Text style={styles.label}>Alamat Rumah</Text>
          <View style={[
            styles.inputWrapper, 
            styles.textAreaWrapper,
            focusedField === 'alamat' && styles.inputWrapperFocused
          ]}>
            <MapPin size={18} color={focusedField === 'alamat' ? COLORS.tealPrimary : '#94A3B8'} style={{ marginTop: 2 }} />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.alamat}
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
            { marginBottom: 0 },
            focusedField === 'rt' && styles.inputWrapperFocused
          ]}>
            <MapPin size={18} color={focusedField === 'rt' ? COLORS.tealPrimary : '#94A3B8'} />
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
          <Text style={styles.cardSectionTitle}>Antropometri Kelahiran</Text>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>BB Lahir (kg)</Text>
              <View style={[
                styles.inputWrapper, 
                { marginBottom: 0 },
                focusedField === 'bb_lahir' && styles.inputWrapperFocused
              ]}>
                <Scale size={18} color={focusedField === 'bb_lahir' ? COLORS.tealPrimary : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  value={bbLahirText}
                  onChangeText={setBbLahirText}
                  placeholder="Contoh: 3.2"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  onFocus={() => setFocusedField('bb_lahir')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>TB Lahir (cm)</Text>
              <View style={[
                styles.inputWrapper, 
                { marginBottom: 0 },
                focusedField === 'tb_lahir' && styles.inputWrapperFocused
              ]}>
                <Ruler size={18} color={focusedField === 'tb_lahir' ? COLORS.tealPrimary : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  value={tbLahirText}
                  onChangeText={setTbLahirText}
                  placeholder="Contoh: 50.0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  onFocus={() => setFocusedField('tb_lahir')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleFormSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Menyimpan...' : 'Simpan Data Balita'}
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
    gap: 16,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
    marginBottom: 16,
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
    marginBottom: 16,
    height: 44,
    gap: 8,
  },
  inputWrapperFocused: {
    borderColor: COLORS.tealPrimary,
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
    backgroundColor: COLORS.tealPrimary,
  },
  genderText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 12,
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: COLORS.tealPrimary,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: '#99F6E4',
  },
});
