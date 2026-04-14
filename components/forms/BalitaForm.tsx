import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Platform
} from 'react-native';
import { Balita } from '../../lib/types';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    bb_lahir: initialData?.bb_lahir || 0,
    tb_lahir: initialData?.tb_lahir || 0,
    ...initialData
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleChange = (field: keyof Balita, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleChange('tanggal_lahir', selectedDate.toISOString().split('T')[0]);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Nama Balita</Text>
        <TextInput
          style={styles.input}
          value={formData.nama}
          onChangeText={(val) => handleChange('nama', val)}
          placeholder="Nama Lengkap"
        />

        <Text style={styles.label}>NIK</Text>
        <TextInput
          style={styles.input}
          value={formData.nik}
          onChangeText={(val) => handleChange('nik', val)}
          placeholder="16 Digit NIK"
          keyboardType="numeric"
          maxLength={16}
        />

        <View style={styles.row}>
          <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
             <Text style={styles.label}>Tanggal Lahir</Text>
             <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowDatePicker(true)}
             >
               <Text>{formData.tanggal_lahir}</Text>
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

          <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Jenis Kelamin</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity 
                style={[styles.genderButton, formData.jenis_kelamin === 'Laki-laki' && styles.genderButtonActive]}
                onPress={() => handleChange('jenis_kelamin', 'Laki-laki')}
              >
                <Text style={[styles.genderText, formData.jenis_kelamin === 'Laki-laki' && styles.genderTextActive]}>L</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, formData.jenis_kelamin === 'Perempuan' && styles.genderButtonActive]}
                onPress={() => handleChange('jenis_kelamin', 'Perempuan')}
              >
                <Text style={[styles.genderText, formData.jenis_kelamin === 'Perempuan' && styles.genderTextActive]}>P</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Nama Orang Tua (Ibu/Ayah)</Text>
        <TextInput
          style={styles.input}
          value={formData.nama_ortu}
          onChangeText={(val) => handleChange('nama_ortu', val)}
          placeholder="Nama Orang Tua"
        />

        <Text style={styles.label}>Alamat</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.alamat}
          onChangeText={(val) => handleChange('alamat', val)}
          placeholder="Alamat Lengkap"
          multiline
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>RT</Text>
            <TextInput
              style={styles.input}
              value={formData.rt?.toString()}
              onChangeText={(val) => handleChange('rt', parseInt(val) || 1)}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 2, marginLeft: 8 }}>
            <Text style={styles.label}>No. HP Orang Tua (WhatsApp)</Text>
            <TextInput
              style={styles.input}
              value={formData.no_hp_ortu || ''}
              onChangeText={(val) => {
                let formatted = val;
                // Auto prefix 62 logic
                if (val.startsWith('08')) {
                  formatted = '628' + val.substring(2);
                }
                handleChange('no_hp_ortu', formatted);
              }}
              placeholder="Contoh: 0812..."
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>BB Lahir (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.bb_lahir?.toString()}
              onChangeText={(val) => handleChange('bb_lahir', parseFloat(val) || 0)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>TB Lahir (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.tb_lahir?.toString()}
              onChangeText={(val) => handleChange('tb_lahir', parseFloat(val) || 0)}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={() => onSubmit(formData)}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Menyimpan...' : 'Simpan Data Balita'}
        </Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genderButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  genderButtonActive: {
    backgroundColor: '#0D9488',
  },
  genderText: {
    color: '#64748B',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#0D9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#99F6E4',
  },
});
