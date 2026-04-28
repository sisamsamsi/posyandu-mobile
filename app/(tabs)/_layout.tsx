// app/(tabs)/_layout.tsx
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Stethoscope, ClipboardList, BarChart3, FileText, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOW } from '../../lib/constants';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const bottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 8)
    : insets.bottom + 4;

  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          paddingBottom: 2,
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: COLORS.surfaceBorder,
          backgroundColor: COLORS.surface,
          ...SHADOW.lg,
        },
        headerStyle: {
          backgroundColor: COLORS.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.surfaceBorder,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: COLORS.textPrimary,
          letterSpacing: -0.3,
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
