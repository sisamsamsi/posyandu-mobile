// components/ImunisasiForm.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { X, Calendar as CalendarIcon, Check, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Balita, Imunisasi } from '../lib/types';
import { ImunisasiService } from '../services/imunisasi-service';
import { COLORS } from '../lib/constants';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Props {
  visible: boolean;
  onClose: () => void;
  balita: Balita;
}

const VACCINES = [
  { key: 'hb0_date', label: 'HB0', sub: '24 jam' },
  { key: 'bcg_date', label: 'BCG', sub: '< 2 bln' },
  { key: 'penta_1_date', label: 'PENTA 1', sub: '2 bln' },
  { key: 'penta_2_date', label: 'PENTA 2', sub: '3 bln' },
  { key: 'penta_3_date', label: 'PENTA 3', sub: '4 bln' },
  { key: 'ipv_1_date', label: 'IPV 1', sub: '2 bln' },
  { key: 'ipv_2_date', label: 'IPV 2', sub: '3 bln' },
  { key: 'ipv_3_date', label: 'IPV 3', sub: '4 bln' },
  { key: 'pcv_1_date', label: 'PCV 1', sub: '2 bln' },
  { key: 'pcv_2_date', label: 'PCV 2', sub: '3 bln' },
  { key: 'pcv_3_date', label: 'PCV 3', sub: '12 bln' },
  { key: 'rv_1_date', label: 'ROTAVIRUS 1', sub: '2 bln' },
  { key: 'rv_2_date', label: 'ROTAVIRUS 2', sub: '3 bln' },
  { key: 'rv_3_date', label: 'ROTAVIRUS 3', sub: '4 bln' },
  { key: 'mr_date', label: 'MR', sub: '9 bln' },
  { key: 'je_date', label: 'JE', sub: '10 bln' },
  { key: 'booster_penta_date', label: 'PENTA (Booster)', sub: '18 bln' },
  { key: 'booster_mr_date', label: 'MR (Booster)', sub: '18 bln' },
];

export default function ImunisasiForm({ visible, onClose, balita }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Imunisasi>>(balita.imunisasi || { balita_id: balita.id });
  const [showPicker, setShowPicker] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFormData(balita.imunisasi || { balita_id: balita.id });
    }
  }, [visible, balita]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await ImunisasiService.saveImunisasi({ ...formData, balita_id: balita.id });
      if (error) throw error;
      Alert.alert('Sukses', 'Data imunisasi berhasil disimpan');
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    const key = showPicker;
    setShowPicker(null);
    if (date && key) {
      setFormData(prev => ({ ...prev, [key]: format(date, 'yyyy-MM-dd') }));
    }
  };

  const removeDate = (key: string) => {
    setFormData(prev => ({ ...prev, [key]: null }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Kartu Imunisasi</Text>
              <Text style={styles.subtitle}>{balita.nama}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {VACCINES.map((v) => (
              <View key={v.key} style={styles.inputRow}>
                <View style={styles.labelCol}>
                  <Text style={styles.label}>{v.label}</Text>
                  <Text style={styles.subLabel}>{v.sub}</Text>
                </View>
                
                <View style={styles.actionCol}>
                  {formData[v.key as keyof Imunisasi] ? (
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateText}>
                        {format(new Date(formData[v.key as keyof Imunisasi] as string), 'dd MMM yyyy', { locale: id })}
                      </Text>
                      <TouchableOpacity onPress={() => removeDate(v.key)} style={styles.removeBtn}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.pickerBtn} 
                      onPress={() => setShowPicker(v.key)}
                    >
                      <CalendarIcon size={16} color={COLORS.primary} />
                      <Text style={styles.pickerBtnText}>Isi Tanggal</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Check size={20} color="#FFF" />
                  <Text style={styles.saveBtnText}>Simpan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={formData[showPicker as keyof Imunisasi] ? new Date(formData[showPicker as keyof Imunisasi] as string) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    height: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  title: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  closeBtn: { padding: 4 },
  
  scrollContent: { padding: 24 },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 16
  },
  labelCol: { flex: 1 },
  label: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  subLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  
  actionCol: { alignItems: 'flex-end' },
  dateBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  dateText: { fontSize: 13, fontWeight: '700', color: '#475569', marginRight: 10 },
  removeBtn: { padding: 4 },
  
  pickerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8
  },
  pickerBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  
  footer: { 
    flexDirection: 'row', 
    padding: 24, 
    gap: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  cancelBtn: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 16, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center' 
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  saveBtn: { 
    flex: 2, 
    padding: 16, 
    borderRadius: 16, 
    backgroundColor: COLORS.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' }
});
