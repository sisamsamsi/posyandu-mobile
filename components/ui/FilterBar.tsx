import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { ChevronDown, Filter } from 'lucide-react-native';

interface FilterBarProps {
  month: number;
  year: number;
  rt: number | null;
  onMonthChange: (val: number) => void;
  onYearChange: (val: number) => void;
  onRtChange: (val: number | null) => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEARS = [2024, 2025, 2026];
const RTS = [1, 2, 3, 4, 5];

export function FilterBar({ month, year, rt, onMonthChange, onYearChange, onRtChange }: FilterBarProps) {
  const [modalVisible, setModalVisible] = useState<string | null>(null);

  const openPicker = (type: string) => setModalVisible(type);

  const renderPickerItem = ({ item, type }: { item: any, type: string }) => {
    let label = item;
    let isActive = false;
    let onPress = () => {};

    if (type === 'month') {
      label = MONTHS[item - 1];
      isActive = month === item;
      onPress = () => { onMonthChange(item); setModalVisible(null); };
    } else if (type === 'year') {
      isActive = year === item;
      onPress = () => { onYearChange(item); setModalVisible(null); };
    } else if (type === 'rt') {
      label = item === null ? 'Semua RT' : `RT 0${item}`;
      isActive = rt === item;
      onPress = () => { onRtChange(item); setModalVisible(null); };
    }

    return (
      <TouchableOpacity 
        style={[styles.pickerItem, isActive && styles.activePickerItem]} 
        onPress={onPress}
      >
        <Text style={[styles.pickerItemText, isActive && styles.activePickerItemText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const getModalData = () => {
    if (modalVisible === 'month') return [1,2,3,4,5,6,7,8,9,10,11,12];
    if (modalVisible === 'year') return YEARS;
    if (modalVisible === 'rt') return [null, ...RTS];
    return [];
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.chip} onPress={() => openPicker('month')}>
          <Text style={styles.chipLabel}>{MONTHS[month - 1]}</Text>
          <ChevronDown size={14} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.chip} onPress={() => openPicker('year')}>
          <Text style={styles.chipLabel}>{year}</Text>
          <ChevronDown size={14} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.chip} onPress={() => openPicker('rt')}>
          <Filter size={14} color="#0D9488" style={{ marginRight: 4 }} />
          <Text style={styles.chipLabel}>{rt === null ? 'Semua RT' : `RT 0${rt}`}</Text>
          <ChevronDown size={14} color="#64748B" />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(null)}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pilih {modalVisible === 'rt' ? 'Wilayah' : modalVisible}</Text>
              <FlatList 
                data={getModalData()}
                keyExtractor={(item) => String(item)}
                renderItem={({ item }) => renderPickerItem({ item, type: modalVisible! })}
              />
           </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'capitalize',
    color: '#0F172A',
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activePickerItem: {
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#64748B',
  },
  activePickerItemText: {
    color: '#0D9488',
    fontWeight: 'bold',
  }
});
