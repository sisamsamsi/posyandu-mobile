// app/(tabs)/_layout.tsx
import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Stethoscope, ClipboardList, BarChart3, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/constants';
import { useServiceStore } from '../../stores/service-store';

interface TabIconProps {
  focused: boolean;
  color: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  primaryColor: string;
}

const TabIcon = ({ focused, color, Icon, primaryColor }: TabIconProps) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 40, marginTop: 4 }}>
      <View 
        style={{
          paddingHorizontal: 14,
          paddingVertical: 5,
          borderRadius: 20,
          backgroundColor: focused ? `${primaryColor}15` : 'transparent', // 15% opacity primary color
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 1,
        }}
      >
        <Icon size={focused ? 21 : 19} color={focused ? primaryColor : color} />
      </View>
      {focused && (
        <View 
          style={{ 
            width: 4, 
            height: 4, 
            borderRadius: 2, 
            backgroundColor: primaryColor,
            marginTop: 1,
          }} 
        />
      )}
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { activeWorkspace } = useServiceStore();
  
  const isBalita = activeWorkspace === 'balita';
  const currentPrimary = isBalita ? COLORS.tealPrimary : COLORS.indigoPrimary;

  // Hitung padding bawah secara dinamis:
  const bottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 8)
    : insets.bottom + 4;

  const tabBarHeight = 58 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: currentPrimary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          paddingBottom: 2,
        },
        tabBarStyle: {
          height: tabBarHeight + 4,
          paddingBottom: bottomPadding + 3,
          paddingTop: 8,
          borderTopWidth: 0,
          backgroundColor: '#FFFFFF',
          elevation: 32,
          shadowColor: currentPrimary,
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.04,
          shadowRadius: 20,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 18,
          color: '#1E293B',
          letterSpacing: -0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          headerShown: false, // Dashboard handles its own custom clinical header
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={Home} primaryColor={currentPrimary} />,
        }}
      />
      <Tabs.Screen
        name="service-desk"
        options={{
          title: 'Layanan',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={Stethoscope} primaryColor={currentPrimary} />,
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: 'Warga',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={ClipboardList} primaryColor={currentPrimary} />,
        }}
      />
      <Tabs.Screen
        name="analisis"
        options={{
          title: 'Analisis',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={BarChart3} primaryColor={currentPrimary} />,
        }}
      />
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Export',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} Icon={FileText} primaryColor={currentPrimary} />,
        }}
      />
    </Tabs>
  );
}

