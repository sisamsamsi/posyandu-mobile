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
  Platform,
  Pressable
} from 'react-native';
import { X, Calendar as CalendarIcon, Check, Trash2, CheckCircle2 } from 'lucide-react-native';
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
  { key: 'hb0_date', label: 'HB0', sub: 'Usia 24 jam' },
  { key: 'bcg_date', label: 'BCG', sub: 'Usia < 2 bulan' },
  { key: 'penta_1_date', label: 'PENTA 1', sub: 'Usia 2 bulan' },
  { key: 'penta_2_date', label: 'PENTA 2', sub: 'Usia 3 bulan' },
  { key: 'penta_3_date', label: 'PENTA 3', sub: 'Usia 4 bulan' },
  { key: 'ipv_1_date', label: 'IPV 1', sub: 'Usia 2-4 bulan' },
  { key: 'ipv_2_date', label: 'IPV 2', sub: 'Usia 3-5 bulan' },
  { key: 'ipv_3_date', label: 'IPV 3', sub: 'Usia 4-6 bulan' },
  { key: 'pcv_1_date', label: 'PCV 1', sub: 'Usia 2 bulan' },
  { key: 'pcv_2_date', label: 'PCV 2', sub: 'Usia 3 bulan' },
  { key: 'pcv_3_date', label: 'PCV 3', sub: 'Usia 12 bulan' },
  { key: 'rv_1_date', label: 'ROTAVIRUS 1', sub: 'Usia 2 bulan' },
  { key: 'rv_2_date', label: 'ROTAVIRUS 2', sub: 'Usia 3-4 bulan' },
  { key: 'rv_3_date', label: 'ROTAVIRUS 3', sub: 'Usia 4-5 bulan' },
  { key: 'mr_date', label: 'MR', sub: 'Usia 9 bulan' },
  { key: 'je_date', label: 'JE', sub: 'Usia 10 bulan' },
  { key: 'booster_penta_date', label: 'PENTA (Booster)', sub: 'Usia 18 bulan' },
  { key: 'booster_mr_date', label: 'MR (Booster)', sub: 'Usia 18 bulan' },
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

  const completeness = ImunisasiService.calculateCompleteness(formData as Imunisasi);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={styles.container}>
          {/* Bottom Sheet Drag Handle */}
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Kartu Imunisasi Anak</Text>
              <Text style={styles.subtitle}>{balita.nama} (RT {balita.rt})</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.completenessBadge}>
                <CheckCircle2 size={14} color={COLORS.tealPrimary} />
                <Text style={styles.completenessText}>{completeness}%</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
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
                      <TouchableOpacity 
                        onPress={() => removeDate(v.key)} 
                        style={styles.removeBtn}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.pickerBtn} 
                      onPress={() => setShowPicker(v.key)}
                      activeOpacity={0.7}
                    >
                      <CalendarIcon size={14} color={COLORS.tealPrimary} />
                      <Text style={styles.pickerBtnText}>Isi Tanggal</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, loading && { opacity: 0.8 }]} 
              onPress={handleSave} 
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Check size={20} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.saveBtnText}>Simpan Kartu</Text>
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
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.45)', 
    justifyContent: 'flex-end' 
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
  },
  container: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    height: '85%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 24,
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9'
  },
  title: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 13, 
    color: '#64748B', 
    marginTop: 4,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completenessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 6,
  },
  completenessText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.tealPrimary,
  },
  closeBtn: { 
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { 
    padding: 20,
    gap: 12,
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    padding: 14,
    borderRadius: 20,
  },
  labelCol: { flex: 1 },
  label: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#0F172A',
  },
  subLabel: { 
    fontSize: 11, 
    color: '#94A3B8', 
    marginTop: 4,
    fontWeight: '600',
  },
  actionCol: { alignItems: 'flex-end' },
  dateBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  dateText: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#475569',
  },
  removeBtn: { 
    padding: 2,
  },
  pickerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.tealPrimary,
    gap: 6
  },
  pickerBtnText: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: COLORS.tealPrimary,
  },
  footer: { 
    flexDirection: 'row', 
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 12, 
    borderTopWidth: 1.5, 
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: { 
    flex: 1, 
    height: 52,
    borderRadius: 26, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#64748B',
  },
  saveBtn: { 
    flex: 2, 
    height: 52,
    borderRadius: 26, 
    backgroundColor: COLORS.tealPrimary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: COLORS.tealPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveBtnText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#FFFFFF',
  }
});
