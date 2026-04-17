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
    // We removed the auto-pick logic to force the user to pick a 
    // specific Posyandu in the selection screen.
  };

  useEffect(() => {
    if (!initialized) return;

    const { activeWorkspace } = useServiceStore.getState();
    const isLoginScreen = segments[0] === 'login';
    const isSelectWorkspaceScreen = segments[0] === 'select-workspace';

    if (!session) {
      if (!isLoginScreen) {
        router.replace('/login');
      }
    } else if (!activeWorkspace) {
      if (!isSelectWorkspaceScreen) {
        router.replace('/select-workspace');
      }
    } else {
      if (isLoginScreen || isSelectWorkspaceScreen) {
        router.replace('/(tabs)');
      }
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
      <Stack.Screen name="select-workspace" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return <RootLayoutNav />;
}
