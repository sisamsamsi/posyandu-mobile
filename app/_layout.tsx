// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/auth-store';
import { useServiceStore } from '../stores/service-store';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../lib/constants';

function RootLayoutNav() {
  const { session, initialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
    ensureActivePosyandu();
  }, []);

  const ensureActivePosyandu = async () => {
    const { activePosyanduId, setActivePosyandu } = useServiceStore.getState();
    if (!activePosyanduId) {
      console.log('Ensuring active Posyandu for Guest Mode...');
      const { data } = await supabase.from('posyandus').select('id').limit(1).single();
      if (data) {
        setActivePosyandu(data.id);
        console.log('Auto-selected Posyandu ID:', data.id);
      }
    }
  };

  useEffect(() => {
    if (!initialized) return;

    const isLoginScreen = segments[0] === 'login';

    // Temporary: Disable Auth Gate to skip login screen
    // We allow access even without a session
    if (isLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return <RootLayoutNav />;
}
