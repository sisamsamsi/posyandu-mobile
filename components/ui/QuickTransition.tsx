import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Baby, Users, ArrowRightLeft } from 'lucide-react-native';

interface QuickTransitionProps {
  currentType: 'balita' | 'lansia';
  onSwitch: () => void;
}

export const QuickTransition: React.FC<QuickTransitionProps> = ({ currentType, onSwitch }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onSwitch}>
      <View style={styles.iconWrapper}>
        <ArrowRightLeft size={16} color="#0D9488" />
      </View>
      <View style={styles.textWrapper}>
         <Text style={styles.label}>Pindah ke</Text>
         <View style={styles.typeRow}>
            {currentType === 'lansia' ? <Baby size={14} color="#0D9488" /> : <Users size={14} color="#0D9488" />}
            <Text style={styles.typeName}>{currentType === 'lansia' ? ' Layanan Balita' : ' Layanan Lansia'}</Text>
         </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  iconWrapper: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
  },
  textWrapper: {
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
});
