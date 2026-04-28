import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { LayoutGrid } from 'lucide-react-native';
import { useServiceStore } from '../../stores/service-store';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS } from '../../lib/constants';

interface WorkspaceSwitcherProps {
  color?: string;
  size?: number;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ 
  color = COLORS.textPrimary, 
  size = 22 
}) => {
  const router = useRouter();
  const { setActiveWorkspace, setActivePosyandu } = useServiceStore();

  const handlePress = () => {
    setActiveWorkspace(null);
    setActivePosyandu(null);
    router.replace('/select-workspace');
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={styles.button}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <LayoutGrid size={size} color={color} />
        <Text style={[styles.label, { color }]}>Posyandu</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDim,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  iconWrapper: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
