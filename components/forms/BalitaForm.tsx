// components/forms/BalitaForm.tsx
import React, { useState, useEffect } from 'react';
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
import { Calendar, User, BookOpen, MapPin, Phone, Scale, Ruler, CheckSquare, Square } from 'lucide-react-native';

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
    rw: initialData?.rw || '',
    no_hp_ortu: initialData?.no_hp_ortu || '',
    no_kk: initialData?.no_kk || '',
    nik_ortu: initialData?.nik_ortu || '',
    anak_ke: initialData?.anak_ke || 1,
    usia_kehamilan_lahir: initialData?.usia_kehamilan_lahir || 36,
    buku_kia: initialData?.buku_kia !== undefined ? initialData.buku_kia : true,
    buku_kia_bayi_kecil: initialData?.buku_kia_bayi_kecil || false,
    tatalaksana_bblr: initialData?.tatalaksana_bblr || false,
    imd: initialData?.imd !== undefined ? initialData.imd : true,
    ...initialData
  });

  const [bbLahirText, setBbLahirText] = useState(initialData?.bb_lahir ? initialData.bb_lahir.toString() : '');
  const [tbLahirText, setTbLahirText] = useState(initialData?.tb_lahir ? initialData.tb_lahir.toString() : '');
  const [lkLahirText, setLkLahirText] = useState(initialData?.lk_lahir ? initialData.lk_lahir.toString() : '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isTempNik, setIsTempNik] = useState(false);

  const generateTemporaryNik = (dob: string, jk: string) => {
    const prefix = '340208';
    const parts = (dob || '').split('-');
    const year = parts[0] ? parts[0].substring(2, 4) : '20';
    const month = parts[1] || '01';
    let dayVal = parseInt(parts[2] || '01');
    if (jk === 'Perempuan') {
      dayVal += 40;
    }
    const day = dayVal.toString().padStart(2, '0');
    const dobStr = `${day}${month}${year}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}${dobStr}${randomSuffix}`;
  };

  const handleToggleTempNik = () => {
    setIsTempNik(prev => {
      const nextVal = !prev;
      if (nextVal) {
        const tempNik = generateTemporaryNik(
          formData.tanggal_lahir || '',
          formData.jenis_kelamin || ''
        );
        setFormData(p => ({ ...p, nik: tempNik }));
      } else {
        setFormData(p => ({ ...p, nik: '' }));
      }
      return nextVal;
    });
  };

  useEffect(() => {
    if (isTempNik) {
      const tempNik = generateTemporaryNik(
        formData.tanggal_lahir || '',
        formData.jenis_kelamin || ''
      );
      setFormData(prev => ({ ...prev, nik: tempNik }));
    }
  }, [formData.tanggal_lahir, formData.jenis_kelamin, isTempNik]);

  useEffect(() => {
    if (bbLahirText) {
      const bb = parseFloat(bbLahirText.replace(',', '.'));
      if (!isNaN(bb)) {
        if (bb < 2.5) {
          setFormData(prev => ({
            ...prev,
            buku_kia_bayi_kecil: true,
            tatalaksana_bblr: true
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            buku_kia_bayi_kecil: false,
            tatalaksana_bblr: false
          }));
        }
      }
    }
  }, [bbLahirText]);

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
      lk_lahir: lkLahirText ? parseFloat(lkLahirText.replace(',', '.')) : null,
      anak_ke: formData.anak_ke ? parseInt(formData.anak_ke.toString()) : null,
      usia_kehamilan_lahir: formData.usia_kehamilan_lahir ? parseInt(formData.usia_kehamilan_lahir.toString()) : null,
    };
    onSubmit(finalData);
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
          <View style={styles.nikHeaderRow}>
            <Text style={styles.label}>NIK</Text>
            <TouchableOpacity 
              style={styles.checkboxWrapper} 
              onPress={handleToggleTempNik}
              activeOpacity={0.7}
            >
              {isTempNik ? (
                <CheckSquare size={16} color={COLORS.tealPrimary} />
              ) : (
                <Square size={16} color="#94A3B8" />
              )}
              <Text style={styles.checkboxLabel}>NIK belum ada</Text>
            </TouchableOpacity>
          </View>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'nik' && styles.inputWrapperFocused,
            isTempNik && styles.inputWrapperDisabled
          ]}>
            <BookOpen size={18} color={isTempNik ? '#cbd5e1' : (focusedField === 'nik' ? COLORS.tealPrimary : '#94A3B8')} />
            <TextInput
              style={[styles.input, isTempNik && styles.inputDisabled]}
              value={formData.nik}
              onChangeText={(val) => handleChange('nik', val)}
              placeholder="16 Digit Nomor Induk Kependudukan"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={16}
              editable={!isTempNik}
              onFocus={() => setFocusedField('nik')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Nomor KK */}
          <Text style={styles.label}>Nomor KK</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'no_kk' && styles.inputWrapperFocused
          ]}>
            <BookOpen size={18} color={focusedField === 'no_kk' ? COLORS.tealPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.no_kk || ''}
              onChangeText={(val) => handleChange('no_kk', val)}
              placeholder="16 Digit Nomor Kartu Keluarga"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={16}
              onFocus={() => setFocusedField('no_kk')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Anak Ke */}
          <Text style={styles.label}>Anak Ke Berapa?</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'anak_ke' && styles.inputWrapperFocused
          ]}>
            <User size={18} color={focusedField === 'anak_ke' ? COLORS.tealPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.anak_ke?.toString() || ''}
              onChangeText={(val) => handleChange('anak_ke', val ? parseInt(val) || '' : '')}
              placeholder="Contoh: 2"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              onFocus={() => setFocusedField('anak_ke')}
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

          {/* NIK Ortu */}
          <Text style={styles.label}>NIK Orang Tua</Text>
          <View style={[
            styles.inputWrapper, 
            focusedField === 'nik_ortu' && styles.inputWrapperFocused
          ]}>
            <BookOpen size={18} color={focusedField === 'nik_ortu' ? COLORS.tealPrimary : '#94A3B8'} />
            <TextInput
              style={styles.input}
              value={formData.nik_ortu || ''}
              onChangeText={(val) => handleChange('nik_ortu', val)}
              placeholder="16 Digit NIK Orang Tua"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={16}
              onFocus={() => setFocusedField('nik_ortu')}
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

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
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

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>RW</Text>
              <View style={[
                styles.inputWrapper, 
                { marginBottom: 0 },
                focusedField === 'rw' && styles.inputWrapperFocused
              ]}>
                <MapPin size={18} color={focusedField === 'rw' ? COLORS.tealPrimary : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  value={formData.rw || ''}
                  onChangeText={(val) => handleChange('rw', val)}
                  placeholder="Contoh: 1"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('rw')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
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

          <View style={[styles.row, { marginTop: 16 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>LK Lahir (cm)</Text>
              <View style={[
                styles.inputWrapper, 
                { marginBottom: 0 },
                focusedField === 'lk_lahir' && styles.inputWrapperFocused
              ]}>
                <Ruler size={18} color={focusedField === 'lk_lahir' ? COLORS.tealPrimary : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  value={lkLahirText}
                  onChangeText={setLkLahirText}
                  placeholder="Contoh: 33.0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  onFocus={() => setFocusedField('lk_lahir')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Usia Kehamilan (mggu)</Text>
              <View style={[
                styles.inputWrapper, 
                { marginBottom: 0 },
                focusedField === 'usia_kehamilan_lahir' && styles.inputWrapperFocused
              ]}>
                <Calendar size={18} color={focusedField === 'usia_kehamilan_lahir' ? COLORS.tealPrimary : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  value={formData.usia_kehamilan_lahir?.toString() || ''}
                  onChangeText={(val) => handleChange('usia_kehamilan_lahir', val ? parseInt(val) || '' : '')}
                  placeholder="Contoh: 38"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  onFocus={() => setFocusedField('usia_kehamilan_lahir')}
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
  nikHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  inputWrapperDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputDisabled: {
    color: '#64748B',
  },
});
