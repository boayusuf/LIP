import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import InAppNotification from '../components/InAppNotification';
import { Colors } from '../constants/Colors';
import { useGroupStore } from '../lib/groupStore';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

/**
 * React Navigation defaults to its LIGHT theme, so any surface it draws itself
 * -- scene backgrounds, the tab bar's top border -- came out white and showed
 * as a pale seam against the app's own dark screens.
 */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    // Surfaces the navigator draws itself must match the screens too.
    card: Colors.background,
    border: Colors.background,
    text: Colors.textPrimary,
    primary: Colors.accent,
    notification: Colors.red,
  },
};

export default function RootLayout() {
  const { session, loading, profile, setSession, fetchProfile, fetchTasks, resetRepeatingTasks, registerPushToken } = useStore();
  const { groups, dmGroups, fetchGroups, fetchDMs, subscribeForNotifications, fetchUnreadCounts } = useGroupStore();
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchProfile();
      fetchTasks().then(() => resetRepeatingTasks());
      registerPushToken();
      fetchGroups();
      fetchDMs();
    }
  }, [session]);

  // Persistent notification subscriptions for all groups
  useEffect(() => {
    const allIds = [...groups, ...dmGroups].map(g => g.id);
    if (allIds.length === 0) return;
    fetchUnreadCounts();
    const unsub = subscribeForNotifications(allIds);
    return unsub;
  }, [groups.map(g => g.id).join(','), dmGroups.map(g => g.id).join(',')]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Session exists — wait for profile to load before deciding
    if (!profile) return;

    if (profile.onboarding_complete === false) {
      if (!inOnboarding) router.replace('/(onboarding)/welcome');
    } else {
      if (inAuth || inOnboarding) router.replace('/(tabs)');
    }
  }, [session, loading, profile, segments]);

  if (loading || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ThemeProvider>
        <InAppNotification />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
