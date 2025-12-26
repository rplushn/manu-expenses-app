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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { signUp, signIn } from '@/lib/auth';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function SignupScreen() {
  const router = useRouter();

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombreFocused, setNombreFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const validateForm = (): string | null => {
    if (!nombreNegocio.trim()) {
      return 'El nombre del negocio es requerido';
    }
    if (nombreNegocio.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres';
    }
    if (!email.trim()) {
      return 'El email es requerido';
    }
    if (!email.includes('@') || !email.includes('.')) {
      return 'Ingresa un email válido';
    }
    if (!password) {
      return 'La contraseña es requerida';
    }
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await signUp(email, password, nombreNegocio);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Wait for email confirmation processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Auto-login after signup
      const loginResult = await signIn(email, password);

      if (loginResult.success) {
        router.replace('/(tabs)');
      } else {
        setIsLoading(false);
        setError('Cuenta creada pero login falló. Revisa tu email para confirmar tu cuenta o intenta de nuevo en unos minutos.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error?.message || 'Error al crear la cuenta');
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
          >
            {/* Header */}
            <Animated.View
              entering={FadeIn.duration(300)}
              className="flex-row items-center px-5 pt-2"
            >
              <Pressable
                onPress={() => router.back()}
                className="p-2 -ml-2 active:opacity-60"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={24} strokeWidth={1.5} color="#1A1A1A" />
              </Pressable>
            </Animated.View>

            {/* Title */}
            <Animated.View
              entering={FadeIn.duration(400)}
              className="px-5 mt-8"
            >
              <Text
                className="text-[28px] font-semibold text-black tracking-[-0.5px]"
                style={{ fontFamily: 'System' }}
              >
                Crear cuenta
              </Text>
              <Text className="text-[14px] text-[#666666] mt-2">
                Registra tu negocio en MANU
              </Text>
            </Animated.View>

            {/* Form */}
            <View className="px-5 mt-8">
              {/* Error Message */}
              {error && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="bg-[#FEF2F2] border border-[#DC2626] p-4 mb-6"
                >
                  <Text className="text-[14px] text-[#DC2626]">{error}</Text>
                </Animated.View>
              )}

              {/* Business Name Input */}
              <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                <Text className="text-[13px] text-[#666666] mb-2">
                  Nombre del negocio
                </Text>
                <View
                  className="border p-4"
                  style={{
                    borderColor: nombreFocused ? '#1A1A1A' : '#F0F0F0',
                  }}
                >
                  <TextInput
                    className="text-[16px] text-black"
                    placeholder="Mi Pulpería"
                    placeholderTextColor="#999999"
                    value={nombreNegocio}
                    onChangeText={setNombreNegocio}
                    onFocus={() => setNombreFocused(true)}
                    onBlur={() => setNombreFocused(false)}
                    editable={!isLoading}
                    autoCapitalize="words"
                  />
                </View>
              </Animated.View>

              {/* Email Input */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(200)}
                className="mt-5"
              >
                <Text className="text-[13px] text-[#666666] mb-2">Email</Text>
                <View
                  className="border p-4"
                  style={{
                    borderColor: emailFocused ? '#1A1A1A' : '#F0F0F0',
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
                entering={FadeInDown.duration(300).delay(300)}
                className="mt-5"
              >
                <Text className="text-[13px] text-[#666666] mb-2">
                  Contraseña
                </Text>
                <View
                  className="border p-4 flex-row items-center"
                  style={{
                    borderColor: passwordFocused ? '#1A1A1A' : '#F0F0F0',
                  }}
                >
                  <TextInput
                    className="flex-1 text-[16px] text-black"
                    placeholder="Mínimo 8 caracteres"
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

              {/* Confirm Password Input */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(400)}
                className="mt-5"
              >
                <Text className="text-[13px] text-[#666666] mb-2">
                  Confirmar contraseña
                </Text>
                <View
                  className="border p-4"
                  style={{
                    borderColor: confirmFocused ? '#1A1A1A' : '#F0F0F0',
                  }}
                >
                  <TextInput
                    className="text-[16px] text-black"
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#999999"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    editable={!isLoading}
                  />
                </View>
              </Animated.View>

              {/* Signup Button */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(500)}
                className="mt-8"
              >
                <Pressable
                  className="bg-black py-4 items-center active:opacity-80"
                  onPress={handleSignup}
                  disabled={isLoading}
                  style={{ opacity: isLoading ? 0.6 : 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-[15px] font-medium">
                      Crear cuenta
                    </Text>
                  )}
                </Pressable>
              </Animated.View>

              {/* Login Link */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(600)}
                className="mt-6 mb-8 items-center"
              >
                <Pressable
                  onPress={() => router.back()}
                  disabled={isLoading}
                >
                  <Text className="text-[14px] text-black">
                    ¿Ya tienes cuenta?{' '}
                    <Text style={{ textDecorationLine: 'underline' }}>
                      Inicia sesión
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
