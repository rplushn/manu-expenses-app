import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppStore, CurrentUser } from '@/lib/store';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom light theme matching MANU's design
const ManuTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    border: '#F0F0F0',
    primary: '#1A1A1A',
  },
};

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const currentUser = useAppStore((s) => s.currentUser);
  const loadExpenses = useAppStore((s) => s.loadExpenses);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          nombreNegocio: session.user.user_metadata?.nombre_negocio || 'Mi Negocio',
          plan: 'gratis',
          currencyCode: 'HNL',
        });
        loadExpenses();
      }
      setIsReady(true);
      SplashScreen.hideAsync();
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          nombreNegocio: session.user.user_metadata?.nombre_negocio || 'Mi Negocio',
          plan: 'gratis',
          currencyCode: 'HNL',
        });
        loadExpenses();
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load complete user data from usuarios table when session exists but currentUser lacks empresa data
  useEffect(() => {
    if (!session?.user?.id) return;
    if (!currentUser?.id) return; // Wait for basic user data to be set first
    
    // Check if we already have empresa data loaded
    const hasEmpresaData = currentUser.empresaNombre || currentUser.empresaRtn || currentUser.empresaLogoUrl;
    if (hasEmpresaData) return; // Already loaded, skip

    // Load complete user data from usuarios table
    const loadCompleteUserData = async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('❌ Error loading complete user data:', error);
          return;
        }

        if (!data) {
          console.warn('⚠️ No user data found in usuarios table');
          return;
        }

        const userData: CurrentUser = {
          id: data.id,
          email: data.email,
          nombreNegocio: data.nombre_negocio || 'Mi Negocio',
          plan: data.plan || 'gratis',
          empresaNombre: data.empresa_nombre || undefined,
          empresaLogoUrl: data.empresa_logo_url || undefined,
          empresaRtn: data.empresa_rtn || undefined,
          empresaCai: data.empresa_cai || undefined,
          empresaDireccion: data.empresa_direccion || undefined,
          empresaTelefono: data.empresa_telefono || undefined,
          empresaEmail: data.empresa_email || undefined,
          tasaImpuesto: data.tasa_impuesto || undefined,
          facturaRangoInicio: data.factura_rango_inicio || undefined,
          facturaRangoFin: data.factura_rango_fin || undefined,
          facturaProximoNumero: data.factura_proximo_numero || undefined,
          caiFechaVencimiento: data.cai_fecha_vencimiento || undefined,
        };

        console.log('✅ Complete user data loaded from usuarios table');
        setCurrentUser(userData);
      } catch (error) {
        console.error('❌ Exception loading complete user data:', error);
      }
    };

    loadCompleteUserData();
  }, [session?.user?.id, currentUser?.id, currentUser?.empresaNombre, currentUser?.empresaRtn, currentUser?.empresaLogoUrl, setCurrentUser]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';
    const inTabs = segments[0] === '(tabs)';

    if (!session && !inAuthGroup) {
      // Not logged in, redirect to login
      router.replace('/login');
    } else if (session && inAuthGroup) {
      // Logged in but on auth screen, redirect to home
      router.replace('/(tabs)');
    }
  }, [session, segments, isReady]);

  return (
    <ThemeProvider value={ManuTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-expense"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="camera"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="photo-preview"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <KeyboardProvider>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
