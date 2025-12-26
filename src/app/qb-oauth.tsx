// QuickBooks OAuth Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { useAppStore } from '@/lib/store';
import { saveQBToken } from '../../lib/quickbooks/token-manager';
import * as Haptics from 'expo-haptics';

// QuickBooks OAuth URLs
const QB_CLIENT_ID = process.env.EXPO_PUBLIC_QB_CLIENT_ID || '';
const QB_REDIRECT_URI = process.env.EXPO_PUBLIC_QB_REDIRECT_URI || 'https://tuapp.com/auth/qb-callback';
const QB_SCOPE = 'com.intuit.quickbooks.accounting';
const QB_AUTH_URL = `https://appcenter.intuit.com/connect/oauth2?client_id=${QB_CLIENT_ID}&scope=${QB_SCOPE}&redirect_uri=${encodeURIComponent(QB_REDIRECT_URI)}&response_type=code`;

export default function QBOAuthScreen() {
  const router = useRouter();
  const currentUser = useAppStore((state) => state.currentUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qbConnected, setQBConnected] = useState(false);

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // Check if this is the callback URL
    if (url.includes(QB_REDIRECT_URI) || url.includes('qb-callback')) {
      setLoading(true);

      try {
        // Extract authorization code from URL
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const realmId = urlObj.searchParams.get('realmId');
        const error = urlObj.searchParams.get('error');

        if (error) {
          // User denied authorization
          setError('Autorización cancelada por el usuario');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => {
            router.back();
          }, 2000);
          return;
        }

        if (!code || !realmId) {
          setError('No se pudo obtener el código de autorización');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => {
            router.back();
          }, 2000);
          return;
        }

        // Exchange code for tokens via Edge Function
        const { data, error: tokenError } = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/qb-exchange-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              code,
              realmId,
            }),
          }
        ).then((res) => res.json());

        if (tokenError || !data?.success) {
          setError(tokenError?.message || 'Error al obtener tokens');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => {
            router.back();
          }, 2000);
          return;
        }

        // Save connection using token manager
        if (currentUser?.id) {
          const connection = await saveQBToken(
            currentUser.id,
            data.accessToken,
            realmId,
            'sandbox', // or 'production' based on your environment
            data.refreshToken,
            data.companyName
          );

          if (connection) {
            setQBConnected(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              '✅ QuickBooks conectado',
              'QuickBooks se ha conectado correctamente.',
              [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]
            );
          } else {
            setError('Error al guardar la conexión');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
      } catch (err) {
        console.error('Error in OAuth callback:', err);
        setError('Error al procesar la autorización');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => {
          router.back();
        }, 2000);
      } finally {
        setLoading(false);
      }
    }
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-[18px] font-semibold text-black mb-2 text-center">
            Error de conexión
          </Text>
          <Text className="text-[14px] text-[#666666] text-center mb-6">
            {error}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-6 py-3 bg-black rounded-lg active:opacity-80"
          >
            <Text className="text-[16px] font-semibold text-white">
              Volver
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#E5E5E5]">
        <Text className="text-[18px] font-semibold text-black">
          Conectar QuickBooks
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="p-1 active:opacity-60"
        >
          <X size={24} strokeWidth={1.5} color="#000000" />
        </Pressable>
      </View>

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-white z-10">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-[14px] text-[#666666] mt-4">
            Conectando con QuickBooks...
          </Text>
        </View>
      )}

      <WebView
        source={{ uri: QB_AUTH_URL }}
        onNavigationStateChange={handleNavigationStateChange}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError('Error al cargar la página de autorización');
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
          setError('Error de conexión con QuickBooks');
        }}
        style={{ flex: 1 }}
        startInLoadingState
        renderLoading={() => (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#000000" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

