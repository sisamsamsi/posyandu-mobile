// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/auth-store';
import { useServiceStore } from '../stores/service-store';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

  const { activeWorkspace } = useServiceStore();

  useEffect(() => {
    if (!initialized) return;

    const isLoginScreen = segments[0] === 'login';
    const isRegisterScreen = segments[0] === 'register';
    const isSelectWorkspaceScreen = segments[0] === 'select-workspace';
    const isOnboardingScreen = segments[0] === 'onboarding';

    if (!session) {
      if (!isLoginScreen && !isRegisterScreen) {
        router.replace('/login');
      }
    } else if (!activeWorkspace) {
      if (!isSelectWorkspaceScreen && !isOnboardingScreen) {
        router.replace('/select-workspace');
      }
    } else {
      if (isLoginScreen || isRegisterScreen || isSelectWorkspaceScreen || isOnboardingScreen) {
        router.replace('/(tabs)');
      }
    }
  }, [session, initialized, segments, activeWorkspace]);


  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFFFFF" 
        translucent={false} 
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="select-workspace" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="service-desk/balita" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="service-desk/lansia" options={{ headerShown: false, animation: 'none' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}
