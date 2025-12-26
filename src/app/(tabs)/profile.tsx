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
  Image,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ChevronRight,
  X,
  Crown,
  Check,
  Upload,
  Image as ImageIcon,
  Lock,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppStore } from '@/lib/store';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { isInvoiceNumberInRange } from '@/lib/invoice-helpers';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  getQBConnection,
  getQBSyncStats,
  getQBSyncLogs,
  toggleAutoSync,
  syncExpenseToQB,
  type QBConnection,
  type QBSyncStats,
  type QBSyncLog,
} from '@/lib/quickbooks';
import {
  isQBConnected,
  disconnectQB as disconnectQBToken,
} from '../../../lib/quickbooks/token-manager';
import { Switch } from 'react-native';
import {
  isRevenueCatEnabled,
  hasEntitlement,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecatClient';
import type { PurchasesPackage } from 'react-native-purchases';

const systemFont = Platform.OS === 'ios' ? 'System' : undefined;

interface MenuItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
  isSubtle?: boolean;
  badge?: boolean;
}

function MenuItem({
  label,
  value,
  onPress,
  showChevron = true,
  isDestructive = false,
  isSubtle = false,
  badge = false,
}: MenuItemProps) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      className="active:opacity-60"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
    >
      <Text
        style={{
          fontFamily: systemFont,
          fontSize: 16,
          fontWeight: '400',
          color: isDestructive
            ? '#DC2626'
            : isSubtle
            ? '#6B7280'
            : '#111827',
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          flexShrink: 1,
        }}
      >
        {value && !badge && (
          <Text
            style={{
              fontFamily: systemFont,
              fontSize: 15,
              fontWeight: '500',
              color: '#111827',
            }}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
        {value && badge && (
          <View
            style={{
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontFamily: systemFont,
                fontSize: 13,
                fontWeight: '600',
                color: '#111827',
              }}
            >
              {value}
            </Text>
          </View>
        )}
        {showChevron && (
          <ChevronRight size={20} strokeWidth={1.5} color="#9CA3AF" />
        )}
      </View>
    </Pressable>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
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
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [companyRtn, setCompanyRtn] = useState('');
  const [companyCai, setCompanyCai] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [invoiceRangeStart, setInvoiceRangeStart] = useState('');
  const [invoiceRangeEnd, setInvoiceRangeEnd] = useState('');
  const [caiExpirationDate, setCaiExpirationDate] = useState('');
  const [currencyCode, setCurrencyCode] = useState(currentUser?.currencyCode || 'HNL');
  const [isSavingCompanyInfo, setIsSavingCompanyInfo] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  // QuickBooks integration state
  const [qbConnection, setQbConnection] = useState<QBConnection | null>(null);
  const [qbSyncStats, setQbSyncStats] = useState<QBSyncStats | null>(null);
  const [qbSyncLogs, setQbSyncLogs] = useState<QBSyncLog[]>([]);
  const [loadingQB, setLoadingQB] = useState(false);
  const [showQBSyncLogs, setShowQBSyncLogs] = useState(false);
  const [qbConnected, setQBConnected] = useState(false);

  const initials = currentUser?.nombreNegocio
    ? getInitials(currentUser.nombreNegocio)
    : 'MN';

  // Helper: Format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
  };

  // Load user data from Supabase
  const loadUserData = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error('Error getting auth user:', authError);
        return;
      }

      setIsLoadingUserData(true);

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
        setCurrentUser({
          id: data.id,
          email: data.email || authUser.email || '',
          nombreNegocio: data.nombre_negocio || 'Mi Negocio',
          plan: data.plan || 'gratis',
          currencyCode: data.currency_code || 'HNL',
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
        });
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  }, [setCurrentUser]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Check QB connection status on mount
  useEffect(() => {
    const checkQBConnection = async () => {
      console.log('[QB DEBUG] currentUser from useAuthContext:', currentUser);
      console.log('[QB DEBUG] currentUser.id:', currentUser?.id);
      if (currentUser?.id) {
        console.log('[QB DEBUG] User ID:', currentUser?.id);
        const connected = await isQBConnected(currentUser.id);
        console.log('[QB DEBUG] Connection result:', connected);
        setQBConnected(connected);
      }
    };
    checkQBConnection();
  }, [currentUser?.id]);

  // Load QuickBooks data
  const loadQBData = useCallback(async () => {
    console.log('[QB DEBUG] currentUser from useAuthContext:', currentUser);
    console.log('[QB DEBUG] currentUser.id:', currentUser?.id);
    if (!currentUser?.id) return;

    try {
      setLoadingQB(true);
      console.log('[QB DEBUG] Loading QB data for User ID:', currentUser.id);
      const [connection, stats, logs, connected] = await Promise.all([
        getQBConnection(currentUser.id),
        getQBSyncStats(currentUser.id),
        getQBSyncLogs(currentUser.id, 5),
        isQBConnected(currentUser.id),
      ]);

      console.log('[QB DEBUG] Connection result from loadQBData:', connected);
      setQbConnection(connection);
      setQbSyncStats(stats);
      setQbSyncLogs(logs);
      setQBConnected(connected);
    } catch (error) {
      console.error('Error loading QB data:', error);
    } finally {
      setLoadingQB(false);
    }
  }, [currentUser?.id]);

  // Handle disconnect QuickBooks
  const handleDisconnectQB = async () => {
    Alert.alert(
      'Desconectar QuickBooks',
      '¿Estás seguro de que quieres desconectar tu cuenta de QuickBooks?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser?.id) return;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const success = await disconnectQBToken(currentUser.id);

            if (success) {
              setQbConnection(null);
              setQbSyncStats(null);
              setQbSyncLogs([]);
              setQBConnected(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Alert.alert('Listo', 'QuickBooks desconectado correctamente');
            } else {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              Alert.alert('Error', 'No se pudo desconectar');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadQBData();
    }, [loadUserData, loadQBData]),
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
        const monthlyPkg =
          offeringsResult.data.current.availablePackages.find(
            (pkg) => pkg.identifier === '$rc_monthly',
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

  const handlePlanPress = () => {
    Haptics.selectionAsync();
    if (isPro) {
      Alert.alert(
        'Plan Pro Activo',
        'Tienes gastos ilimitados.\n\nPara cancelar tu suscripción, ve a Configuración > Tu nombre > Suscripciones en tu dispositivo.',
        [{ text: 'OK' }],
      );
    } else {
      setShowProModal(true);
    }
  };

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
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          Alert.alert(
            'Bienvenido a MANU Pro',
            'Ahora tienes gastos ilimitados.',
            [{ text: 'OK' }],
          );
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo completar la compra. Intenta de nuevo.',
      );
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsProcessingPurchase(true);

    try {
      const result = await restorePurchases();

      if (result.ok) {
        const hasProNow = result.data.entitlements.active?.['pro'];
        if (hasProNow) {
          setIsPro(true);
          setShowProModal(false);
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          Alert.alert(
            'Compras restauradas',
            'Tu suscripción Pro ha sido restaurada.',
          );
        } else {
          Alert.alert(
            'Sin compras',
            'No se encontraron compras previas.',
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron restaurar las compras.');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

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

      setCurrentUser({
        ...currentUser,
        nombreNegocio: newBusinessName.trim(),
      });

      setShowEditNameModal(false);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      Alert.alert('Listo', 'Nombre actualizado correctamente');

      await loadUserData();
    } catch (error) {
      console.error('Error updating business name:', error);
      Alert.alert('Error', 'No se pudo actualizar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUploadLogo = async () => {
    console.log('🚀 [INICIO] handleUploadLogo llamado');

    if (!currentUser?.id) {
      console.log('❌ No hay currentUser.id');
      return;
    }
    console.log('✅ currentUser.id existe:', currentUser.id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log('✅ Session obtenida:', !!session);

    if (!session) {
      Alert.alert(
        'Error',
        'No estás autenticado. Cerrá sesión y volvé a entrar.',
      );
      return;
    }

    try {
      console.log('📸 Solicitando permisos de galería...');
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📸 Permisos resultado:', status);
      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Se necesita acceso a la galería para seleccionar el logo.',
        );
        return;
      }

      console.log('🖼️ Abriendo selector de imagen...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      console.log('🖼️ Resultado del picker:', result.canceled ? 'CANCELADO' : 'SELECCIONADO');
      if (result.canceled) return;

      const asset = result.assets[0];
      console.log('📦 Asset URI:', asset.uri);
      console.log('📦 Asset size:', asset.fileSize);

      if (asset.fileSize && asset.fileSize > 2097152) {
        Alert.alert('Error', 'El archivo es muy grande. Máximo 2MB.');
        return;
      }

      setIsUploadingLogo(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let fileExt = 'jpg';
      if (asset.mimeType) {
        fileExt = asset.mimeType.split('/')[1];
      } else if (Platform.OS === 'web' && asset.uri.startsWith('data:')) {
        const match = asset.uri.match(/data:image\/(\w+);base64/);
        fileExt = match ? match[1] : 'jpg';
      } else {
        fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      }

      const fileName = `logo.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      console.log('🔄 Leyendo archivo con FileSystem...');

      // Leer el archivo como base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64' as any,
      });

      console.log('✅ Base64 leído, length:', base64.length);

      // Decodificar base64 a ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('✅ ArrayBuffer creado, size:', bytes.length);

      console.log('📤 Iniciando upload a Supabase, path:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, bytes.buffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      console.log('📤 Upload completado, error:', uploadError ? uploadError.message : 'ninguno');
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('company-logos').getPublicUrl(filePath);

      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('usuarios')
        .update({ empresa_logo_url: cacheBustedUrl })
        .eq('id', currentUser.id);

      if (dbError) throw dbError;

      setCompanyLogoUrl(cacheBustedUrl);

      setCurrentUser({
        ...currentUser,
        empresaLogoUrl: cacheBustedUrl,
      });

      // Force reload user data to ensure sync
      await loadUserData();
      console.log('🔄 User data reloaded, new logo URL:', currentUser?.empresaLogoUrl);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      Alert.alert('Listo', 'Logo subido correctamente');
    } catch (error) {
      console.error('Error uploading logo:', error);
      Alert.alert('Error', 'No se pudo subir el logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!currentUser?.id) return;

    Alert.alert(
      'Eliminar logo',
      '¿Seguro que quieres quitar el logo de tu empresa?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => Haptics.selectionAsync(),
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              const filesToRemove = [
                `${currentUser.id}/logo.png`,
                `${currentUser.id}/logo.jpg`,
                `${currentUser.id}/logo.jpeg`,
              ];

              await supabase.storage
                .from('company-logos')
                .remove(filesToRemove);

              const { error: dbError } = await supabase
                .from('usuarios')
                .update({ empresa_logo_url: null })
                .eq('id', currentUser.id);

              if (dbError) throw dbError;

              setCompanyLogoUrl('');
              setCurrentUser({
                ...currentUser,
                empresaLogoUrl: undefined,
              });

              // Force reload user data to ensure sync
              await loadUserData();
              console.log('🗑️ User data reloaded after delete');

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert('Listo', 'Logo eliminado correctamente');
            } catch (error) {
              console.error('Error deleting logo:', error);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
              Alert.alert('Error', 'No se pudo eliminar el logo');
            }
          },
        },
      ],
    );
  };

  const handleEditCompanyInfo = () => {
    setCompanyName(currentUser?.empresaNombre || '');
    setCompanyLogoUrl(currentUser?.empresaLogoUrl || '');
    setCompanyRtn(currentUser?.empresaRtn || '');
    setCompanyCai(currentUser?.empresaCai || '');
    setCompanyAddress(currentUser?.empresaDireccion || '');
    setCompanyPhone(currentUser?.empresaTelefono || '');
    setCompanyEmail(currentUser?.empresaEmail || '');
    setTaxRate(
      currentUser?.tasaImpuesto
        ? (currentUser.tasaImpuesto * 100).toString()
        : '15',
    );
    setInvoiceRangeStart(currentUser?.facturaRangoInicio || '');
    setInvoiceRangeEnd(currentUser?.facturaRangoFin || '');
    setCaiExpirationDate(currentUser?.caiFechaVencimiento || '');
    setCurrencyCode(currentUser?.currencyCode || 'HNL');

    setShowCompanyInfoModal(true);
  };

  const handleSaveCompanyInfo = async () => {
    if (!currentUser?.id) return;

    setIsSavingCompanyInfo(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const parsedTaxRate = taxRate.trim()
        ? parseFloat(taxRate) / 100
        : 0.15;

      // Validate and calculate nextInvoiceNumber
      const rangeStart = invoiceRangeStart.trim();
      const rangeEnd = invoiceRangeEnd.trim();
      const currentNextNumber = currentUser?.facturaProximoNumero;

      let nextInvoiceNumber: string | null = null;

      // If both range start and end are provided, validate consistency
      if (rangeStart && rangeEnd) {
        // Validate range consistency (start <= end using string comparison)
        // For numeric comparison, extract digits
        const startNum = parseInt(rangeStart.replace(/\D/g, ''), 10);
        const endNum = parseInt(rangeEnd.replace(/\D/g, ''), 10);
        
        if (!isNaN(startNum) && !isNaN(endNum) && startNum > endNum) {
          Alert.alert(
            'Error de validación',
            'El rango de inicio debe ser menor o igual al rango de fin.'
          );
          setIsSavingCompanyInfo(false);
          return;
        }

        // Check if current nextInvoiceNumber is within the new range
        if (currentNextNumber) {
          const inRange = isInvoiceNumberInRange(
            currentNextNumber,
            rangeStart,
            rangeEnd
          );

          if (inRange) {
            // Keep current number if it's still in range
            nextInvoiceNumber = currentNextNumber;
          } else {
            // Reset to range start if current number is outside range
            nextInvoiceNumber = rangeStart;
          }
        } else {
          // No current number, use range start
          nextInvoiceNumber = rangeStart;
        }
      } else if (rangeStart && !rangeEnd) {
        // Only start provided, use it if no current number exists
        nextInvoiceNumber = currentNextNumber || rangeStart;
      } else if (!rangeStart && rangeEnd) {
        // Only end provided, invalid state - clear next number
        nextInvoiceNumber = null;
      } else {
        // No range provided, keep current number or null
        nextInvoiceNumber = currentNextNumber || null;
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          empresa_nombre: companyName.trim() || null,
          empresa_logo_url: companyLogoUrl || null,
          empresa_rtn: companyRtn.trim() || null,
          empresa_cai: companyCai.trim() || null,
          empresa_direccion: companyAddress.trim() || null,
          empresa_telefono: companyPhone.trim() || null,
          empresa_email: companyEmail.trim() || null,
          tasa_impuesto: parsedTaxRate,
          factura_rango_inicio: rangeStart || null,
          factura_rango_fin: rangeEnd || null,
          factura_proximo_numero: nextInvoiceNumber,
          cai_fecha_vencimiento: caiExpirationDate.trim() || null,
          currency_code: currencyCode,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setCurrentUser({
        ...currentUser,
        empresaNombre: companyName.trim() || undefined,
        empresaLogoUrl: companyLogoUrl || undefined,
        empresaRtn: companyRtn.trim() || undefined,
        empresaCai: companyCai.trim() || undefined,
        empresaDireccion: companyAddress.trim() || undefined,
        empresaTelefono: companyPhone.trim() || undefined,
        empresaEmail: companyEmail.trim() || undefined,
        tasaImpuesto: parsedTaxRate,
        facturaRangoInicio: rangeStart || undefined,
        facturaRangoFin: rangeEnd || undefined,
        facturaProximoNumero: nextInvoiceNumber || undefined,
        caiFechaVencimiento: caiExpirationDate.trim() || undefined,
        currencyCode: currencyCode,
      });

      setShowCompanyInfoModal(false);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      Alert.alert('Listo', 'Información actualizada correctamente');

      await loadUserData();
    } catch (error) {
      console.error('Error updating company info:', error);
      Alert.alert('Error', 'No se pudo actualizar la información');
    } finally {
      setIsSavingCompanyInfo(false);
    }
  };

  const handleFAQPress = () => {
    Haptics.selectionAsync();
    Alert.alert(
      'Ayuda y soporte',
      '¿Necesitas ayuda con MANU?\n\nContáctanos por WhatsApp o email.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'WhatsApp',
          onPress: () =>
            Linking.openURL(
              'https://wa.me/50412345678?text=Hola, necesito ayuda con MANU',
            ),
        },
        {
          text: 'Email',
          onPress: () =>
            Linking.openURL(
              'mailto:support@manu.app?subject=Ayuda con MANU',
            ),
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            Haptics.impactAsync(
              Haptics.ImpactFeedbackStyle.Medium,
            );

            const result = await signOut();

            if (result.success) {
              clearStore();
              router.replace('/login');
            } else {
              Alert.alert(
                'Error',
                result.error?.message ||
                  'No se pudo cerrar sesión',
              );
            }

            setIsLoggingOut(false);
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción no se puede deshacer. Todos tus datos serán eliminados.',
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
      ],
    );
  };

  if (isLoggingOut) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-[15px] text-[#666666] mt-4">
          Cerrando sesión...
        </Text>
      </SafeAreaView>
    );
  }

  if (isLoadingUserData && !currentUser) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="text-[15px] text-[#666666] mt-4">
          Cargando perfil...
        </Text>
      </SafeAreaView>
    );
  }

  const displayBusinessTitle =
    currentUser?.empresaNombre ||
    currentUser?.nombreNegocio ||
    'Mi negocio';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View className="px-5 pt-2 pb-4">
          <Text
            style={{
              fontFamily: systemFont,
              fontSize: 32,
              fontWeight: '700',
              color: '#111827',
            }}
          >
            Perfil
          </Text>
        </View>

        {/* Header with gradient */}
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: 24, paddingBottom: 24 }}
        >
          <Animated.View
            entering={FadeInDown.duration(300).delay(100)}
            className="items-center"
          >
            {/* Avatar con logo o iniciales */}
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {currentUser?.empresaLogoUrl ? (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    padding: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image
                    source={{ uri: currentUser.empresaLogoUrl }}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                    resizeMode="contain"
                    key={currentUser.empresaLogoUrl}
                  />
                </View>
              ) : (
                <Text
                  style={{
                    fontFamily: systemFont,
                    fontSize: 32,
                    fontWeight: '600',
                    color: '#111827',
                  }}
                >
                  {initials}
                </Text>
              )}
            </View>

            {/* Business title (legal o nombre negocio) */}
            <Text
              style={{
                fontFamily: systemFont,
                fontSize: 18,
                fontWeight: '600',
                color: '#111827',
                textAlign: 'center',
                paddingHorizontal: 32,
              }}
              numberOfLines={2}
            >
              {displayBusinessTitle}
            </Text>

            {/* Email */}
            <Text
              style={{
                fontFamily: systemFont,
                fontSize: 14,
                fontWeight: '400',
                color: '#6B7280',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {currentUser?.email || ''}
            </Text>

            {/* Badge PRO */}
            {isPro && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: '#000000',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: systemFont,
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    letterSpacing: 0.5,
                  }}
                >
                  PRO
                </Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* Section: negocio y plan */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(200)}
          className="px-5 mt-6"
        >
          {/* Nombre del negocio: label arriba, valor abajo */}
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
              paddingVertical: 14,
            }}
          >
            <Text
              style={{
                fontFamily: systemFont,
                fontSize: 14,
                fontWeight: '400',
                color: '#6B7280',
                marginBottom: 2,
              }}
            >
              Nombre del negocio
            </Text>
            <Pressable
              onPress={handleEditBusinessName}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              className="active:opacity-60"
            >
              <Text
                style={{
                  fontFamily: systemFont,
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#111827',
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {currentUser?.nombreNegocio || 'Mi Negocio'}
              </Text>
              <ChevronRight
                size={20}
                strokeWidth={1.5}
                color="#9CA3AF"
              />
            </Pressable>
          </View>

          {/* Plan actual con badge */}
          <MenuItem
            label="Plan actual"
            value={isPro ? 'Pro' : 'Gratis'}
            onPress={handlePlanPress}
            badge
          />
        </Animated.View>

        {/* Company Info Section */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(250)}
          className="px-5 mt-8"
        >
          <Text
            style={{
              fontFamily: systemFont,
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 0.5,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Datos de facturación
          </Text>

          {/* Información de empresa: título + estado en línea abajo */}
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
              paddingVertical: 14,
            }}
          >
            <Pressable
              onPress={handleEditCompanyInfo}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              className="active:opacity-60"
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: systemFont,
                    fontSize: 16,
                    fontWeight: '400',
                    color: '#111827',
                  }}
                >
                  Información de empresa
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 2,
                  }}
                >
                  {currentUser?.empresaRtn && (
                    <Check
                      size={14}
                      strokeWidth={2.5}
                      color="#10B981"
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: systemFont,
                      fontSize: 13,
                      fontWeight: '400',
                      color: currentUser?.empresaRtn
                        ? '#10B981'
                        : '#6B7280',
                      marginLeft: currentUser?.empresaRtn ? 4 : 0,
                    }}
                  >
                    {currentUser?.empresaRtn
                      ? 'Configurado'
                      : 'Sin configurar'}
                  </Text>
                </View>
              </View>
              <ChevronRight
                size={20}
                strokeWidth={1.5}
                color="#9CA3AF"
              />
            </Pressable>
          </View>
        </Animated.View>

        {/* INTEGRACIONES SECTION */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(250)}
          className="px-5 mt-8"
        >
          <Text className="text-[13px] text-[#999999] mb-4 uppercase tracking-wide">
            INTEGRACIONES
          </Text>
          
          {/* QuickBooks Card - 20% más pequeño */}
          <View
            className="bg-[#EBEBEB] rounded-2xl p-6 mb-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
              borderWidth: 0
            }}
          >
            {/* Header: Lock + Logo - REDUCIDO 20% */}
            <View className="flex-row items-center mb-4">
              <Lock size={16} color="#2CA01C" strokeWidth={2} />
              <View 
                className="w-7 h-7 bg-[#2CA01C] rounded-lg items-center justify-center mx-2"
                style={{ borderWidth: 0 }}
              >
                <Text className="text-white font-bold text-[14px]">qb</Text>
              </View>
              <Text className="text-[18px] font-medium text-black">quickbooks</Text>
            </View>

            {/* Badge Conectado - REDUCIDO 20% - SIN BORDE */}
            <View 
              className="bg-[#F0FDF4] rounded-lg px-3 py-2.5 mb-4 flex-row items-center"
              style={{ 
                gap: 6,
                borderWidth: 0
              }}
            >
              <View 
                className="w-4 h-4 bg-[#16A34A] rounded-full items-center justify-center"
                style={{ borderWidth: 0 }}
              >
                <Text className="text-white text-[10px] font-bold">✓</Text>
              </View>
              <Text className="text-[11px] font-medium text-[#16A34A]">
                Conectado de forma segura
              </Text>
            </View>

            {/* Info Minimalista - REDUCIDO 20% */}
            <View className="mb-4" style={{ gap: 6 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] text-[#666666]">Auto-sync:</Text>
                <Text className="text-[11px] font-normal text-[#666666]">Desactivado</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] text-[#666666]">Última sync:</Text>
                <Text className="text-[11px] font-normal text-[#666666]">Hace 2 horas</Text>
              </View>
            </View>

            {/* Botones - REDUCIDO 20% - SIN BORDES FORZADO */}
            <View className="flex-row" style={{ gap: 8 }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/qb-category-mapping');
                }}
                className="flex-1 bg-[#2CA01C] rounded-lg py-2.5 items-center active:opacity-80"
                style={{
                  borderWidth: 0,
                  borderColor: 'transparent',
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 0
                }}
              >
                <Text 
                  className="text-[11px] font-normal text-white"
                  style={{ borderWidth: 0 }}
                >
                  Configuración
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDisconnectQB}
                className="flex-1 bg-[#DC2626] rounded-lg py-2.5 items-center active:opacity-80"
                style={{
                  borderWidth: 0,
                  borderColor: 'transparent',
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 0
                }}
              >
                <Text 
                  className="text-[11px] font-normal text-white"
                  style={{ borderWidth: 0 }}
                >
                  Desconectar
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Help Section */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(300)}
          className="px-5 mt-8"
        >
          <MenuItem label="FAQ y ayuda" onPress={handleFAQPress} />
        </Animated.View>

        {/* Bottom Actions */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(300)}
          className="px-5 mt-12"
        >
          <Pressable
            style={{ paddingVertical: 16 }}
            className="active:opacity-60"
            onPress={handleLogout}
          >
            <Text
              style={{
                fontFamily: systemFont,
                fontSize: 16,
                fontWeight: '400',
                color: '#111827',
              }}
            >
              Cerrar sesión
            </Text>
          </Pressable>

          <Pressable
            style={{ paddingVertical: 16 }}
            className="active:opacity-60"
            onPress={handleDeleteAccount}
          >
            <Text
              style={{
                fontFamily: systemFont,
                fontSize: 16,
                fontWeight: '400',
                color: '#6B7280',
              }}
            >
              Eliminar cuenta
            </Text>
          </Pressable>
        </Animated.View>

        <View className="h-8" />
      </ScrollView>

      {/* Modales: reusa exactamente los tuyos, solo conectados a los handlers */}
      {/* Edit Business Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <SafeAreaView
          className="flex-1 bg-white"
          edges={['top', 'bottom']}
        >
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
                backgroundColor:
                  isSavingName || !newBusinessName.trim()
                    ? '#E5E5E5'
                    : '#000000',
              }}
            >
              {isSavingName ? (
                <ActivityIndicator size="small" color="#666666" />
              ) : (
                <Text
                  className="text-[16px] font-semibold"
                  style={{
                    color: !newBusinessName.trim()
                      ? '#666666'
                      : '#FFFFFF',
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
        <SafeAreaView
          className="flex-1 bg-white"
          edges={['top', 'bottom']}
        >
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

          <ScrollView
            className="flex-1 px-5 pt-6"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo de empresa */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Logo de la empresa
              </Text>
              <View
                className="flex-row items-center"
                style={{ gap: 12 }}
              >
                {companyLogoUrl ? (
                  <View className="border border-[#E5E5E5] p-2">
                    <Image
                      source={{ uri: companyLogoUrl }}
                      style={{ width: 100, height: 100 }}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View className="border border-[#E5E5E5] p-2 w-[100px] h-[100px] items-center justify-center bg-[#F9FAFB]">
                    <ImageIcon
                      size={40}
                      strokeWidth={1.5}
                      color="#CCCCCC"
                    />
                  </View>
                )}
                <View className="flex-1">
                  <Pressable
                    onPress={handleUploadLogo}
                    disabled={isUploadingLogo}
                    className="border border-black px-4 py-3 items-center active:opacity-60"
                  >
                    {isUploadingLogo ? (
                      <ActivityIndicator
                        size="small"
                        color="#000000"
                      />
                    ) : (
                      <View
                        className="flex-row items-center"
                        style={{ gap: 8 }}
                      >
                        <Upload
                          size={18}
                          strokeWidth={1.5}
                          color="#000000"
                        />
                        <Text className="text-[14px] text-black">
                          {companyLogoUrl
                            ? 'Cambiar logo'
                            : 'Subir logo'}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <Text className="text-[12px] text-[#999999] mt-2">
                    PNG o JPG, máx 2MB
                  </Text>
                  {companyLogoUrl && (
                    <Pressable
                      onPress={handleDeleteLogo}
                      className="mt-3 active:opacity-60"
                    >
                      <Text className="text-[13px] text-[#DC2626] text-center">
                        Eliminar logo
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            {/* Moneda principal */}
            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Moneda principal
              </Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    ActionSheetIOS.showActionSheetWithOptions(
                      {
                        options: ['Cancelar', 'HNL - Lempira hondureño', 'USD - Dólar estadounidense'],
                        cancelButtonIndex: 0,
                      },
                      (buttonIndex) => {
                        if (buttonIndex === 1) setCurrencyCode('HNL');
                        if (buttonIndex === 2) setCurrencyCode('USD');
                      }
                    );
                  } else {
                    // Para Android/Web, usar Alert simple o mantener Picker
                    Alert.alert(
                      'Seleccionar moneda',
                      '',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'HNL - Lempira hondureño', onPress: () => setCurrencyCode('HNL') },
                        { text: 'USD - Dólar estadounidense', onPress: () => setCurrencyCode('USD') },
                      ]
                    );
                  }
                }}
                className="border border-[#E5E5E5] px-4 py-3 flex-row justify-between items-center"
                style={{ minHeight: 50 }}
              >
                <Text className="text-[16px] text-black">
                  {currencyCode === 'USD' ? 'USD - Dólar estadounidense' : 'HNL - Lempira hondureño'}
                </Text>
                <ChevronRight size={20} strokeWidth={1.5} color="#999999" />
              </Pressable>
              <Text className="text-[12px] text-[#999999] mt-1">
                Esta moneda se usa para registrar y ver tus GASTOS y reportes.
                Las FACTURAS legales se generan siempre en Lempiras (HNL).
              </Text>
            </View>

            {/* El resto de campos de empresa: igual que en tu archivo original */}
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

            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                RTN de la empresa
              </Text>
              <TextInput
                className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                value={companyRtn}
                onChangeText={setCompanyRtn}
                placeholder="08011990123456"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                maxLength={14}
              />
            </View>

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

            <View className="my-6 border-t border-[#E5E5E5]" />
            <Text className="text-[15px] font-medium text-black mb-4">
              Rango de facturas
            </Text>

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

            <View className="mb-5">
              <Text className="text-[13px] text-[#666666] mb-2">
                Próximo número de factura
              </Text>
              <View className="border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-3">
                <Text className="text-[16px] text-[#666666]">
                  {currentUser?.facturaProximoNumero ||
                    invoiceRangeStart ||
                    'Sin configurar'}
                </Text>
              </View>
              <Text className="text-[12px] text-[#999999] mt-1">
                Se actualiza automáticamente al crear facturas
              </Text>
            </View>

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
                backgroundColor: isSavingCompanyInfo
                  ? '#E5E5E5'
                  : '#000000',
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

      {/* Pro Subscription Modal (igual que antes) */}
      <Modal
        visible={showProModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProModal(false)}
      >
        <SafeAreaView
          className="flex-1 bg-white"
          edges={['top', 'bottom']}
        >
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
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-black rounded-2xl items-center justify-center mb-4">
                <Crown
                  size={32}
                  strokeWidth={1.5}
                  color="#FFFFFF"
                />
              </View>
              <Text className="text-[28px] font-bold text-black mb-2">
                MANU Pro
              </Text>
              <Text className="text-[15px] text-[#666666] text-center">
                Lleva tu negocio al siguiente nivel
              </Text>
            </View>

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

            <View className="mb-8 p-5 border border-[#E5E5E5] rounded-xl">
              <Text className="text-[16px] font-semibold text-black mb-4">
                Incluye:
              </Text>
              <Feature text="Gastos ilimitados cada mes" />
              <Feature text="OCR ilimitado para recibos" />
              <Feature text="Almacenamiento de todas las fotos" />
              <Feature text="Reportes completos por categoría" />
              <Feature text="Exportar a PDF" />
              <Feature text="Historial de 12 meses" />
              <Feature text="Soporte prioritario" />
            </View>

            {proPackage ? (
              <Pressable
                onPress={handlePurchasePro}
                disabled={isProcessingPurchase}
                className="py-4 items-center rounded-lg active:opacity-80"
                style={{
                  backgroundColor: isProcessingPurchase
                    ? '#E5E5E5'
                    : '#000000',
                }}
              >
                {isProcessingPurchase ? (
                  <View
                    className="flex-row items-center"
                    style={{ gap: 8 }}
                  >
                    <ActivityIndicator
                      size="small"
                      color="#666666"
                    />
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
                <ActivityIndicator
                  size="small"
                  color="#999999"
                />
                <Text className="text-[14px] text-[#999999] mt-2">
                  Cargando precios...
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleRestorePurchases}
              disabled={isProcessingPurchase}
              className="mt-4 py-3 items-center active:opacity-60"
            >
              <Text className="text-[14px] text-[#666666] underline">
                Restaurar compras anteriores
              </Text>
            </Pressable>

            <Text className="text-[12px] text-[#999999] text-center mt-6 leading-5">
              Suscripción con renovación automática. Puedes cancelar
              en cualquier momento desde la App Store o Google Play.
              El pago se cargará a tu cuenta al confirmar la compra.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* QuickBooks Sync Logs Modal */}
      <Modal
        visible={showQBSyncLogs}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQBSyncLogs(false)}
      >
        <SafeAreaView
          className="flex-1 bg-white"
          edges={['top', 'bottom']}
        >
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#E5E5E5]">
            <Text className="text-[18px] font-semibold text-black">
              Logs de Sincronización
            </Text>
            <Pressable
              onPress={() => setShowQBSyncLogs(false)}
              className="p-1 active:opacity-60"
            >
              <X size={24} strokeWidth={1.5} color="#000000" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {qbSyncLogs.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-[14px] text-[#666666] text-center">
                  No hay logs de sincronización aún
                </Text>
              </View>
            ) : (
              qbSyncLogs.map((log) => (
                <View
                  key={log.id}
                  className="mb-4 p-4 border border-[#E5E5E5] rounded-lg"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: systemFont,
                          fontSize: 14,
                          fontWeight: '500',
                          color: '#111827',
                        }}
                      >
                        {log.sync_status === 'synced' && '✅ Sincronizado'}
                        {log.sync_status === 'failed' && '❌ Error'}
                        {log.sync_status === 'pending' && '⏳ Pendiente'}
                      </Text>
                      {log.last_sync_at && (
                        <Text
                          style={{
                            fontFamily: systemFont,
                            fontSize: 12,
                            color: '#666666',
                            marginTop: 4,
                          }}
                        >
                          {new Date(log.last_sync_at).toLocaleString('es-HN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </View>
                    {log.qb_expense_id && (
                      <Text
                        style={{
                          fontFamily: systemFont,
                          fontSize: 11,
                          color: '#999999',
                        }}
                      >
                        QB: {log.qb_expense_id.substring(0, 8)}...
                      </Text>
                    )}
                  </View>

                  {log.sync_error && (
                    <View className="mt-2 p-2 bg-[#FEE2E2] rounded">
                      <Text
                        style={{
                          fontFamily: systemFont,
                          fontSize: 12,
                          color: '#DC2626',
                        }}
                      >
                        {log.sync_error}
                      </Text>
                    </View>
                  )}

                  {log.sync_status === 'failed' && (
                    <Pressable
                      onPress={async () => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        );
                        const result = await syncExpenseToQB(log.expense_id);
                        if (result.success) {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Success
                          );
                          Alert.alert('Listo', 'Gasto sincronizado correctamente');
                          await loadQBData();
                        } else {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Error
                          );
                          Alert.alert('Error', result.error || 'No se pudo sincronizar');
                        }
                      }}
                      className="mt-3 py-2 px-4 items-center bg-black rounded-lg active:opacity-80"
                    >
                      <Text
                        style={{
                          fontFamily: systemFont,
                          fontSize: 13,
                          fontWeight: '500',
                          color: '#FFFFFF',
                        }}
                      >
                        Reintentar
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
