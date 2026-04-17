import React from 'react';
import { TouchableOpacity, Alert, StyleSheet, View } from 'react-native';
import { LayoutGrid } from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { COLORS } from '../../lib/constants';

interface WorkspaceSwitcherProps {
  color?: string;
  size?: number;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ 
  color = '#1E293B', 
  size = 22 
}) => {
  const { setActiveWorkspace, activeWorkspace } = useServiceStore();

  const handlePress = () => {
    Alert.alert(
      'Ganti Layanan',
      `Anda sedang di mode ${activeWorkspace === 'balita' ? 'Balita' : 'Lansia'}. Ingin pindah ke layanan lainnya?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Ya, Ganti', 
          onPress: () => {
            setActiveWorkspace(null);
          } 
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={styles.button}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <LayoutGrid size={size} color={color} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 12,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
