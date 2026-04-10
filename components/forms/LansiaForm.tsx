import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform
} from 'react-native';
import { Lansia } from '../../lib/types';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Nama Lengkap</Text>
        <TextInput
          style={styles.input}
          value={formData.nama}
          onChangeText={(val) => handleChange('nama', val)}
          placeholder="Nama Lengkap Lansia"
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
                 value={new Date(formData.tanggal_lahir || '1970-01-01')}
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
        </View>

        <Text style={styles.label}>Riwayat Penyakit Bawaan</Text>
        <View style={styles.diseaseInputRow}>
            <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={newDisease}
            onChangeText={setNewDisease}
            placeholder="Tambah penyakit (misal: Hipertensi)"
            />
            <TouchableOpacity style={styles.addButton} onPress={addDisease}>
                <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
        </View>
        
        <View style={styles.diseaseList}>
            {formData.penyakit_bawaan?.map((disease, idx) => (
                <View key={idx} style={styles.diseaseBadge}>
                    <Text style={styles.diseaseText}>{disease}</Text>
                    <TouchableOpacity onPress={() => removeDisease(idx)}>
                        <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={() => onSubmit(formData)}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Menyimpan...' : 'Simpan Data Lansia'}
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
  diseaseInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#0D9488',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  diseaseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  diseaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  diseaseText: {
    color: '#0D9488',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  removeText: {
    color: '#0D9488',
    fontSize: 14,
    fontWeight: 'bold',
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
