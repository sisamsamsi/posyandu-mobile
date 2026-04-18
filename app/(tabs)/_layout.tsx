// app/(tabs)/_layout.tsx
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Stethoscope, ClipboardList, BarChart3, FileText, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/constants';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Hitung padding bawah secara dinamis:
  // - Jika ada tombol navigasi Android (insets.bottom > 0), gunakan nilai tersebut
  // - Jika tidak ada (gesture navigation), beri padding minimum agar tidak terlalu mepet
  const bottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 8)
    : insets.bottom + 4;

  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          paddingBottom: 2,
        },
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          borderTopWidth: 0,
          backgroundColor: '#FFFFFF',
          elevation: 24,
          shadowColor: '#006A63',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
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
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="service-desk"
        options={{
          title: 'Layanan',
          tabBarIcon: ({ color }) => <Stethoscope size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: 'Warga',
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analisis"
        options={{
          title: 'Analisis',
          tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Export',
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
