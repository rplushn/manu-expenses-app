import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { signIn, resetPassword } from '@/lib/auth';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }

    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await signIn(email, password);

    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error?.message || 'Error al iniciar sesión');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email requerido', 'Ingresa tu email para recuperar tu contraseña');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email);
    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        'Email enviado',
        'Revisa tu correo para restablecer tu contraseña'
      );
    } else {
      Alert.alert('Error', result.error?.message || 'No se pudo enviar el email');
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Header */}
            <Animated.View
              entering={FadeIn.duration(400)}
              className="items-center mt-16"
            >
              <Text
                className="text-[32px] font-semibold text-black tracking-[-1px]"
                style={{ fontFamily: 'System' }}
              >
                MANU
              </Text>
              <Text className="text-[14px] text-[#666666] mt-2">
                Gastos claros, negocios seguros
              </Text>
            </Animated.View>

            {/* Form */}
            <View className="px-5 mt-12">
              {/* Error Message */}
              {error && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="bg-[#FEF2F2] border border-[#DC2626] p-4 mb-6"
                >
                  <Text className="text-[14px] text-[#DC2626]">{error}</Text>
                </Animated.View>
              )}

              {/* Email Input */}
              <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                <Text className="text-[13px] text-[#666666] mb-2">Email</Text>
                <View
                  className="border p-4"
                  style={{
                    borderColor: emailFocused ? '#000000' : '#E5E5E5',
                  }}
                >
                  <TextInput
                    className="text-[16px] text-black"
                    placeholder="tu@email.com"
                    placeholderTextColor="#999999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    editable={!isLoading}
                  />
                </View>
              </Animated.View>

              {/* Password Input */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(200)}
                className="mt-5"
              >
                <Text className="text-[13px] text-[#666666] mb-2">Contraseña</Text>
                <View
                  className="border p-4 flex-row items-center"
                  style={{
                    borderColor: passwordFocused ? '#000000' : '#E5E5E5',
                  }}
                >
                  <TextInput
                    className="flex-1 text-[16px] text-black"
                    placeholder="Tu contraseña"
                    placeholderTextColor="#999999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!isLoading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="ml-2 p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={20} strokeWidth={1.5} color="#999999" />
                    ) : (
                      <Eye size={20} strokeWidth={1.5} color="#999999" />
                    )}
                  </Pressable>
                </View>
              </Animated.View>

              {/* Forgot Password */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(300)}
                className="mt-3 items-end"
              >
                <Pressable onPress={handleForgotPassword} disabled={isLoading}>
                  <Text className="text-[13px] text-[#666666]">
                    ¿Olvidaste tu contraseña?
                  </Text>
                </Pressable>
              </Animated.View>

              {/* Login Button */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(400)}
                className="mt-8"
              >
                <Pressable
                  className="bg-black py-4 items-center active:opacity-80"
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={{ opacity: isLoading ? 0.6 : 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-[15px] font-medium">
                      Iniciar sesión
                    </Text>
                  )}
                </Pressable>
              </Animated.View>

              {/* Signup Link */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(500)}
                className="mt-6 items-center"
              >
                <Pressable
                  onPress={() => router.push('/signup')}
                  disabled={isLoading}
                >
                  <Text className="text-[14px] text-black">
                    ¿No tienes cuenta?{' '}
                    <Text style={{ textDecorationLine: 'underline' }}>
                      Créala aquí
                    </Text>
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
