import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronRight, X, Crown, Check } from 'lucide-react-native';
import { useAppStore } from '@/lib/store';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  isRevenueCatEnabled,
  hasEntitlement,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecatClient';
import type { PurchasesPackage } from 'react-native-purchases';

interface MenuItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
  isSubtle?: boolean;
}

function MenuItem({
  label,
  value,
  onPress,
  showChevron = true,
  isDestructive = false,
  isSubtle = false,
}: MenuItemProps) {
  return (
    <Pressable
      className="flex-row justify-between items-center py-4 border-b border-[#E5E5E5] active:opacity-60"
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
    >
      <Text
        className="text-[15px]"
        style={{
          color: isDestructive ? '#000000' : isSubtle ? '#999999' : '#000000',
        }}
      >
        {label}
      </Text>
      <View className="flex-row items-center">
        {value && (
          <Text className="text-[15px] text-[#666666] mr-2">{value}</Text>
        )}
        {showChevron && (
          <ChevronRight size={20} strokeWidth={1.5} color="#999999" />
        )}
      </View>
    </Pressable>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Feature item component for Pro modal
const Feature = ({ text }: { text: string }) => (
  <View className="flex-row items-center mb-3" style={{ gap: 10 }}>
    <Check size={18} strokeWidth={2} color="#000000" />
    <Text className="text-[15px] text-[#333333] flex-1">{text}</Text>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const clearStore = useAppStore((s) => s.clearStore);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Pro subscription state
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);

  // Edit business name state
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Edit company info state
  const [showCompanyInfoModal, setShowCompanyInfoModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyRtn, setCompanyRtn] = useState('');
  const [companyCai, setCompanyCai] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [invoiceRangeStart, setInvoiceRangeStart] = useState('');
  const [invoiceRangeEnd, setInvoiceRangeEnd] = useState('');
  const [caiExpirationDate, setCaiExpirationDate] = useState('');
  const [isSavingCompanyInfo, setIsSavingCompanyInfo] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  const initials = currentUser?.nombreNegocio
    ? getInitials(currentUser.nombreNegocio)
    : 'MN';

  // Load user data from Supabase
  const loadUserData = useCallback(async () => {
    try {
      // Get authenticated user ID
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Error getting auth user:', authError);
        return;
      }

      setIsLoadingUserData(true);

      // Fetch full user data from usuarios table
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      if (data) {
        // Update currentUser with all fields from database
        setCurrentUser({
          id: data.id,
          email: data.email || authUser.email || '',
          nombreNegocio: data.nombre_negocio || 'Mi Negocio',
          plan: data.plan || 'gratis',
          empresaNombre: data.empresa_nombre || undefined,
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
        });
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  }, [setCurrentUser]);

  // Load user data on mount and when screen comes into focus
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  // Check Pro status and load offerings
  const checkProAndLoadOfferings = useCallback(async () => {
    if (!isRevenueCatEnabled()) return;

    try {
      const proResult = await hasEntitlement('pro');
      if (proResult.ok) {
        setIsPro(proResult.data);
      }

      const offeringsResult = await getOfferings();
      if (offeringsResult.ok && offeringsResult.data.current) {
        const monthlyPkg = offeringsResult.data.current.availablePackages.find(
          (pkg) => pkg.identifier === '$rc_monthly'
        );
        if (monthlyPkg) {
          setProPackage(monthlyPkg);
        }
      }
    } catch (error) {
      console.error('Error checking pro status:', error);
    }
  }, []);

  useEffect(() => {
    checkProAndLoadOfferings();
  }, [checkProAndLoadOfferings]);

  // Handle Plan press - open paywall or show pro info
  const handlePlanPress = () => {
    Haptics.selectionAsync();
    if (isPro) {
      Alert.alert(
        'Plan Pro Activo',
        'Tienes gastos ilimitados.\n\nPara cancelar tu suscripción, ve a Configuración > Tu nombre > Suscripciones en tu dispositivo.',
        [{ text: 'OK' }]
      );
    } else {
      setShowProModal(true);
    }
  };

  // Handle purchase Pro
  const handlePurchasePro = async () => {
    if (!proPackage) {
      Alert.alert('Error', 'Producto no disponible. Intenta de nuevo.');
      return;
    }

    setIsProcessingPurchase(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePackage(proPackage);

      if (result.ok) {
        const hasProNow = result.data.entitlements.active?.['pro'];
        if (hasProNow) {
          setIsPro(true);
          setShowProModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Bienvenido a MANU Pro', 'Ahora tienes gastos ilimitados.', [
            { text: 'OK' },
          ]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar la compra. Intenta de nuevo.');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  // Handle restore purchases
  const handleRestorePurchases = async () => {
    setIsProcessingPurchase(true);

    try {
      const result = await restorePurchases();

      if (result.ok) {
        const hasProNow = result.data.entitlements.active?.['pro'];
        if (hasProNow) {
          setIsPro(true);
          setShowProModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Compras restauradas', 'Tu suscripción Pro ha sido restaurada.');
        } else {
          Alert.alert('Sin compras', 'No se encontraron compras previas.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron restaurar las compras.');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  // Handle edit business name
  const handleEditBusinessName = () => {
    setNewBusinessName(currentUser?.nombreNegocio || '');
    setShowEditNameModal(true);
  };

  const handleSaveBusinessName = async () => {
    if (!newBusinessName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    if (!currentUser?.id) return;

    setIsSavingName(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nombre_negocio: newBusinessName.trim() })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local state
      setCurrentUser({
        ...currentUser,
        nombreNegocio: newBusinessName.trim(),
      });

      setShowEditNameModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Listo', 'Nombre actualizado correctamente');
      
      // Reload user data to ensure sync
      await loadUserData();
    } catch (error) {
      console.error('Error updating business name:', error);
      Alert.alert('Error', 'No se pudo actualizar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle edit company info
  const handleEditCompanyInfo = () => {
    setCompanyName(currentUser?.empresaNombre || '');
    setCompanyRtn(currentUser?.empresaRtn || '');
    setCompanyCai(currentUser?.empresaCai || '');
    setCompanyAddress(currentUser?.empresaDireccion || '');
    setCompanyPhone(currentUser?.empresaTelefono || '');
    setCompanyEmail(currentUser?.empresaEmail || '');
    setTaxRate(currentUser?.tasaImpuesto ? (currentUser.tasaImpuesto * 100).toString() : '15');
    setInvoiceRangeStart(currentUser?.facturaRangoInicio || '');
    setInvoiceRangeEnd(currentUser?.facturaRangoFin || '');
    setCaiExpirationDate(currentUser?.caiFechaVencimiento || '');
    setShowCompanyInfoModal(true);
  };

  const handleSaveCompanyInfo = async () => {
    if (!currentUser?.id) return;

    setIsSavingCompanyInfo(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Parse tax rate (convert from percentage to decimal)
      const parsedTaxRate = taxRate.trim() ? parseFloat(taxRate) / 100 : 0.15;

      // Auto-calculate next invoice number if range is set
      let nextInvoiceNumber = currentUser?.facturaProximoNumero;
      if (invoiceRangeStart.trim() && !nextInvoiceNumber) {
        // Initialize with range start if not set
        nextInvoiceNumber = invoiceRangeStart.trim();
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          empresa_nombre: companyName.trim() || null,
          empresa_rtn: companyRtn.trim() || null,
          empresa_cai: companyCai.trim() || null,
          empresa_direccion: companyAddress.trim() || null,
          empresa_telefono: companyPhone.trim() || null,
          empresa_email: companyEmail.trim() || null,
          tasa_impuesto: parsedTaxRate,
          factura_rango_inicio: invoiceRangeStart.trim() || null,
          factura_rango_fin: invoiceRangeEnd.trim() || null,
          factura_proximo_numero: nextInvoiceNumber || null,
          cai_fecha_vencimiento: caiExpirationDate.trim() || null,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local state
      setCurrentUser({
        ...currentUser,
        empresaNombre: companyName.trim() || undefined,
        empresaRtn: companyRtn.trim() || undefined,
        empresaCai: companyCai.trim() || undefined,
        empresaDireccion: companyAddress.trim() || undefined,
        empresaTelefono: companyPhone.trim() || undefined,
        empresaEmail: companyEmail.trim() || undefined,
        tasaImpuesto: parsedTaxRate,
        facturaRangoInicio: invoiceRangeStart.trim() || undefined,
        facturaRangoFin: invoiceRangeEnd.trim() || undefined,
        facturaProximoNumero: nextInvoiceNumber || undefined,
        caiFechaVencimiento: caiExpirationDate.trim() || undefined,
      });

      setShowCompanyInfoModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Listo', 'Información actualizada correctamente');
      
      // Reload user data to ensure sync
      await loadUserData();
    } catch (error) {
      console.error('Error updating company info:', error);
      Alert.alert('Error', 'No se pudo actualizar la información');
    } finally {
      setIsSavingCompanyInfo(false);
    }
  };

  // Handle FAQ press
  const handleFAQPress = () => {
    Haptics.selectionAsync();
    Alert.alert(
      'Ayuda y soporte',
      '¿Necesitas ayuda con MANU?\n\nContáctanos por WhatsApp o email.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'WhatsApp',
          onPress: () => Linking.openURL('https://wa.me/50412345678?text=Hola, necesito ayuda con MANU'),
        },
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:support@manu.app?subject=Ayuda con MANU'),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesion',
      'Seguro que deseas cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesion',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const result = await signOut();

            if (result.success) {
              clearStore();
              router.replace('/login');
            } else {
              Alert.alert('Error', result.error?.message || 'No se pudo cerrar sesion');
            }

            setIsLoggingOut(false);
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta accion no se puede deshacer. Todos tus datos seran eliminados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await signOut();
            clearStore();
            router.replace('/login');
            setIsLoggingOut(false);
          },
        },
      ]
    );
  };

  if (isLoggingOut) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-[15px] text-[#666666] mt-4">Cerrando sesion...</Text>
      </SafeAreaView>
    );
  }

  if (isLoadingUserData && !currentUser) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-[15px] text-[#666666] mt-4">Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-2 pb-6">
          <Text className="text-[20px] font-semibold text-black">Perfil</Text>
        </View>

        {/* Profile Avatar */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          className="items-center mt-4"
        >
          <View className="w-20 h-20 border border-[#E5E5E5] items-center justify-center">
            <Text className="text-[24px] font-semibold text-black">
              {initials}
            </Text>
          </View>

          <Text className="text-[20px] font-semibold text-black mt-4">
            {currentUser?.nombreNegocio || 'Mi Negocio'}
          </Text>
          <Text className="text-[14px] text-[#666666] mt-1">
            {currentUser?.email || ''}
          </Text>
          {isPro && (
            <View className="mt-2 bg-black px-3 py-1 rounded">
              <Text className="text-[11px] font-bold text-white">PRO</Text>
            </View>
          )}
        </Animated.View>

        {/* Menu Items */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(200)}
          className="px-5 mt-12"
        >
          <MenuItem
            label="Nombre del negocio"
            value={currentUser?.nombreNegocio || 'Mi Negocio'}
            onPress={handleEditBusinessName}
          />
          <MenuItem
            label="Plan actual"
            value={isPro ? 'Pro' : 'Gratis'}
            onPress={handlePlanPress}
          />
        </Animated.View>

        {/* Company Info Section */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(250)}
          className="px-5 mt-8"
        >
          <Text className="text-[13px] text-[#999999] mb-3 uppercase tracking-wide">
            Datos de facturación
          </Text>
          <MenuItem
            label="Información de empresa"
            value={currentUser?.empresaRtn ? 'Configurado' : 'Sin configurar'}
            onPress={handleEditCompanyInfo}
          />
        </Animated.View>

        {/* Help Section */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(275)}
          className="px-5 mt-8"
        >
          <MenuItem
            label="FAQ y ayuda"
            onPress={handleFAQPress}
          />
        </Animated.View>

        {/* Bottom Actions */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(300)}
          className="px-5 mt-12"
        >
          <Pressable
            className="py-4 active:opacity-60"
            onPress={handleLogout}
          >
            <Text className="text-[15px] text-black">Cerrar sesion</Text>
          </Pressable>

          <Pressable
            className="py-4 active:opacity-60"
            onPress={handleDeleteAccount}
          >
            <Text className="text-[15px] text-[#999999]">Eliminar cuenta</Text>
          </Pressable>
        </Animated.View>

        <View className="h-8" />
      </ScrollView>

      {/* Edit Business Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#E5E5E5]">
            <Pressable
              onPress={() => setShowEditNameModal(false)}
              className="p-1 active:opacity-60"
              disabled={isSavingName}
            >
              <X size={24} strokeWidth={1.5} color="#000000" />
            </Pressable>
            <Text className="text-[18px] font-semibold text-black">
              Editar nombre
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <View className="flex-1 px-5 pt-8">
            <Text className="text-[14px] text-[#666666] mb-2">
              Nombre del negocio
            </Text>
            <TextInput
              className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
              value={newBusinessName}
              onChangeText={setNewBusinessName}
              placeholder="Nombre del negocio"
              placeholderTextColor="#999999"
              maxLength={50}
              autoFocus
            />

            <Pressable
              onPress={handleSaveBusinessName}
              disabled={isSavingName || !newBusinessName.trim()}
              className="mt-6 py-4 items-center active:opacity-80"
              style={{
                backgroundColor: isSavingName || !newBusinessName.trim() ? '#E5E5E5' : '#000000',
              }}
            >
              {isSavingName ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <Text
                  className="text-[16px] font-semibold"
                  style={{
                    color: !newBusinessName.trim() ? '#666666' : '#FFFFFF',
                  }}
                >
                  Guardar
                </Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Company Info Modal */}
      <Modal
        visible={showCompanyInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompanyInfoModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#E5E5E5]">
            <Pressable
              onPress={() => setShowCompanyInfoModal(false)}
              className="p-1 active:opacity-60"
              disabled={isSavingCompanyInfo}
            >
              <X size={24} strokeWidth={1.5} color="#000000" />
            </Pressable>
            <Text className="text-[18px] font-semibold text-black">
              Datos de facturación
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
            {/* Company Name */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Nombre de la empresa *
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="RPLUS INVERSIONES S DE RL"
                placeholderTextColor="#999999"
                maxLength={100}
              />
              <Text className="text-[12px] text-[#999999] mt-1">
                Nombre legal de la empresa para facturas
              </Text>
            </View>

            {/* RTN */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                RTN de la empresa
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={companyRtn}
                onChangeText={setCompanyRtn}
                placeholder="0801199012345"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                maxLength={13}
              />
            </View>

            {/* CAI */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                CAI (Código de Autorización)
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={companyCai}
                onChangeText={setCompanyCai}
                placeholder="CAI-123456-789012-345678"
                placeholderTextColor="#999999"
                maxLength={50}
              />
            </View>

            {/* Address */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Dirección
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={companyAddress}
                onChangeText={setCompanyAddress}
                placeholder="Calle Principal, Col. Centro"
                placeholderTextColor="#999999"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                style={{ minHeight: 60 }}
              />
            </View>

            {/* Phone */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Teléfono
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={companyPhone}
                onChangeText={setCompanyPhone}
                placeholder="+504 1234-5678"
                placeholderTextColor="#999999"
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>

            {/* Email */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Email de facturación
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={companyEmail}
                onChangeText={setCompanyEmail}
                placeholder="facturacion@empresa.com"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>

            {/* Tax Rate */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Tasa de impuesto (%)
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="15"
                placeholderTextColor="#999999"
                keyboardType="decimal-pad"
                maxLength={5}
              />
              <Text className="text-[12px] text-[#999999] mt-1">
                Por defecto: 15% (ISV en Honduras)
              </Text>
            </View>

            {/* Section Divider */}
            <View className="my-6 border-t border-[#E5E5E5]" />
            <Text className="text-[15px] font-medium text-black mb-4">
              Rango de facturas
            </Text>

            {/* Invoice Range Start */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Rango de facturas - Inicio
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={invoiceRangeStart}
                onChangeText={setInvoiceRangeStart}
                placeholder="000-001-01-00000001"
                placeholderTextColor="#999999"
                maxLength={50}
              />
              <Text className="text-[12px] text-[#999999] mt-1">
                Formato: 000-001-01-00000001
              </Text>
            </View>

            {/* Invoice Range End */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Rango de facturas - Fin
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={invoiceRangeEnd}
                onChangeText={setInvoiceRangeEnd}
                placeholder="000-001-01-00005000"
                placeholderTextColor="#999999"
                maxLength={50}
              />
              <Text className="text-[12px] text-[#999999] mt-1">
                Formato: 000-001-01-00005000
              </Text>
            </View>

            {/* Next Invoice Number (Read-only) */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Próximo número de factura
              </Text>
              <View className="border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-3">
                <Text className="text-[16px] text-[#666666]">
                  {currentUser?.facturaProximoNumero || invoiceRangeStart || 'Sin configurar'}
                </Text>
              </View>
              <Text className="text-[12px] text-[#999999] mt-1">
                Se actualiza automáticamente al crear facturas
              </Text>
            </View>

            {/* CAI Expiration Date */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Fecha de vencimiento del CAI
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={caiExpirationDate}
                onChangeText={setCaiExpirationDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999999"
                maxLength={10}
              />
              <Text className="text-[12px] text-[#999999] mt-1">
                Formato: YYYY-MM-DD (ejemplo: 2025-12-31)
              </Text>
            </View>

            <Pressable
              onPress={handleSaveCompanyInfo}
              disabled={isSavingCompanyInfo}
              className="mt-4 mb-8 py-4 items-center active:opacity-80"
              style={{
                backgroundColor: isSavingCompanyInfo ? '#E5E5E5' : '#000000',
              }}
            >
              {isSavingCompanyInfo ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <Text className="text-[16px] font-semibold text-white">
                  Guardar
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Pro Subscription Modal */}
      <Modal
        visible={showProModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#E5E5E5]">
            <Pressable
              onPress={() => setShowProModal(false)}
              className="p-1 active:opacity-60"
              disabled={isProcessingPurchase}
            >
              <X size={24} strokeWidth={1.5} color="#000000" />
            </Pressable>
            <Text className="text-[18px] font-semibold text-black">
              MANU Pro
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-black rounded-2xl items-center justify-center mb-4">
                <Crown size={32} strokeWidth={1.5} color="#FFFFFF" />
              </View>
              <Text className="text-[28px] font-bold text-black mb-2">
                MANU Pro
              </Text>
              <Text className="text-[15px] text-[#666666] text-center">
                Lleva tu negocio al siguiente nivel
              </Text>
            </View>

            {/* Price */}
            {proPackage && (
              <View className="items-center mb-8 p-6 bg-[#F9F9F9] rounded-xl">
                <Text className="text-[14px] text-[#666666] mb-1">
                  Suscripción mensual
                </Text>
                <Text className="text-[36px] font-bold text-black">
                  {proPackage.product.priceString}
                </Text>
                <Text className="text-[13px] text-[#999999] mt-1">
                  por mes
                </Text>
              </View>
            )}

            {/* Features */}
            <View className="mb-8 p-5 border border-[#E5E5E5] rounded-xl">
              <Text className="text-[16px] font-semibold text-black mb-4">
                Incluye:
              </Text>
              <Feature text="Gastos ilimitados cada mes" />
              <Feature text="OCR ilimitado para recibos" />
              <Feature text="Almacenamiento de todas las fotos" />
              <Feature text="Reportes completos por categoria" />
              <Feature text="Exportar a PDF" />
              <Feature text="Historial de 12 meses" />
              <Feature text="Soporte prioritario" />
            </View>

            {/* Purchase Button */}
            {proPackage ? (
              <Pressable
                onPress={handlePurchasePro}
                disabled={isProcessingPurchase}
                className="py-4 items-center rounded-lg active:opacity-80"
                style={{
                  backgroundColor: isProcessingPurchase ? '#E5E5E5' : '#000000',
                }}
              >
                {isProcessingPurchase ? (
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <ActivityIndicator size="small" color="#666666" />
                    <Text className="text-[16px] font-semibold text-[#666666]">
                      Procesando...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[16px] font-semibold text-white">
                    Suscribirse por {proPackage.product.priceString}/mes
                  </Text>
                )}
              </Pressable>
            ) : (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#999999" />
                <Text className="text-[14px] text-[#999999] mt-2">
                  Cargando precios...
                </Text>
              </View>
            )}

            {/* Restore Purchases */}
            <Pressable
              onPress={handleRestorePurchases}
              disabled={isProcessingPurchase}
              className="mt-4 py-3 items-center active:opacity-60"
            >
              <Text className="text-[14px] text-[#666666] underline">
                Restaurar compras anteriores
              </Text>
            </Pressable>

            {/* Disclaimer */}
            <Text className="text-[12px] text-[#999999] text-center mt-6 leading-5">
              Suscripción con renovación automática. Puedes cancelar en
              cualquier momento desde la App Store o Google Play. El pago se
              cargará a tu cuenta al confirmar la compra.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
