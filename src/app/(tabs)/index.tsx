import React, { useState, useMemo, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import {
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Check,
  Crown,
} from 'lucide-react-native';
import { useAppStore, Period, formatMoney } from '@/lib/store';
import { CATEGORY_LABELS, ExpenseCategory } from '@/lib/types';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts';
import { textStyles } from '@/theme/textStyles';
import { Receipt } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isRevenueCatEnabled,
  hasEntitlement,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecatClient';
import { checkExpenseLimit, EXPENSE_LIMITS } from '@/lib/expense-limits';
import type { PurchasesPackage } from 'react-native-purchases';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  mercaderia: '#1A1A1A',
  servicios: '#1A1A1A',
  marketing: '#1A1A1A',
  transporte: '#4D4D4D',
  operacion: '#666666',
  personal: '#737373',
  instalaciones: '#808080',
  impuestos: '#8C8C8C',
  equipamiento: '#999999',
  alimentacion: '#A6A6A6',
  otros: '#BBBBBB',
};

// Feature item component
const Feature = ({ text }: { text: string }) => (
  <View className="flex-row items-center mb-3" style={{ gap: 10 }}>
    <Check size={18} strokeWidth={2} color="#1A1A1A" />
    <Text className="text-[15px] font-light text-[#1A1A1A] flex-1">{text}</Text>
  </View>
);

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { alerts, hasAlerts, dismissBanner } = useBudgetAlerts();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Format time function (same as history)
  const formatTime = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'h:mm a'); // No locale to ensure AM/PM in English
  };

  // Pro subscription state
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [remainingExpenses, setRemainingExpenses] = useState(EXPENSE_LIMITS.FREE);
  const [usedExpenses, setUsedExpenses] = useState(0);

  const syncStatus = useAppStore((s) => s.syncStatus);
  const isLoading = useAppStore((s) => s.isLoading);
  const loadExpenses = useAppStore((s) => s.loadExpenses);
  const getExpensesByPeriod = useAppStore((s) => s.getExpensesByPeriod);
  const getPeriodStats = useAppStore((s) => s.getPeriodStats);
  const getCategorySummary = useAppStore((s) => s.getCategorySummary);
  const currentUser = useAppStore((s) => s.currentUser);
  const addExpense = useAppStore((s) => s.addExpense);
  
  // User currency for consistent formatting
  const userCurrency = currentUser?.currencyCode || 'HNL';

  const periodExpenses = useMemo(
    () => getExpensesByPeriod(selectedPeriod),
    [getExpensesByPeriod, selectedPeriod]
  );
  const stats = useMemo(
    () => getPeriodStats(selectedPeriod),
    [getPeriodStats, selectedPeriod]
  );
  const categorySummary = useMemo(
    () => getCategorySummary(selectedPeriod),
    [getCategorySummary, selectedPeriod]
  );

  // Show only last 3 expenses
  const recentExpenses = periodExpenses.slice(0, 3);

  // Check Pro status and load offerings
  const checkProAndLoadOfferings = useCallback(async () => {
    if (!isRevenueCatEnabled()) return;

    try {
      // Check pro entitlement
      const proResult = await hasEntitlement('pro');
      if (proResult.ok) {
        setIsPro(proResult.data);
      }

      // Load offerings
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

  // Check expense limits
  const checkLimits = useCallback(async () => {
    if (!currentUser?.id) return;

    const { remaining, used } = await checkExpenseLimit(currentUser.id, isPro);
    setRemainingExpenses(remaining);
    setUsedExpenses(used);
  }, [currentUser?.id, isPro]);

  useEffect(() => {
    checkProAndLoadOfferings();
  }, [checkProAndLoadOfferings]);

  // Load expenses on mount and when period changes
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses, selectedPeriod]);

  useEffect(() => {
    checkLimits();
  }, [checkLimits, periodExpenses.length]);

  // Load dismissed alert state
  useEffect(() => {
    AsyncStorage.getItem('budget_alert_dismissed').then((value) => {
      if (value === 'true') {
        setAlertDismissed(true);
      }
    });
  }, []);

  const handlePeriodChange = (period: Period) => {
    Haptics.selectionAsync();
    setSelectedPeriod(period);
  };

  const handleAddExpense = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check limit for free users
    if (!isPro && currentUser?.id) {
      const { canAdd } = await checkExpenseLimit(currentUser.id, isPro);

      if (!canAdd) {
        Alert.alert(
          'Límite alcanzado',
          `Plan Gratis: ${EXPENSE_LIMITS.FREE} gastos/mes. Ya has usado tu límite este mes.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ver MANU Pro',
              onPress: () => setShowProModal(true),
            },
          ]
        );
        return;
      }
    }

    router.push('/add-expense');
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Bienvenido a MANU Pro', 'Ahora tienes gastos ilimitados.', [
            { text: 'OK' },
          ]);
        }
      } else if (result.reason === 'sdk_error') {
        // User cancelled or other error
        console.log('Purchase cancelled or failed');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar la compra. Intenta de nuevo.');
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

  const renderChangeIndicator = () => {
    if (stats.change === 0) {
      return (
        <View className="flex-row items-center mt-2">
          <Minus size={14} strokeWidth={1.5} color="#999999" />
          <Text className="text-[13px] font-light text-[#999999] ml-1">
            Sin cambio vs periodo anterior
          </Text>
        </View>
      );
    }

    const isUp = stats.change > 0;
    return (
      <View className="flex-row items-center mt-2">
        {isUp ? (
          <TrendingUp size={14} strokeWidth={1.5} color="#DC2626" />
        ) : (
          <TrendingDown size={14} strokeWidth={1.5} color="#16A34A" />
        )}
        <Text
          className="text-[13px] font-light ml-1"
          style={{ color: isUp ? '#DC2626' : '#16A34A' }}
        >
          {isUp ? '+' : ''}{formatMoney(stats.change, userCurrency)} (
          {stats.changePercent.toFixed(0)}%)
        </Text>
      </View>
    );
  };

  // Configure header with logo and button
  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerShown: true,
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
          <View style={{ 
            width: 32, 
            height: 32, 
            backgroundColor: '#FF6B00', 
            borderRadius: 6,
            marginRight: 10 
          }} />
          <Text style={{ 
            fontSize: 15, 
            fontWeight: '600', 
            color: '#1A1A1A',
            letterSpacing: -.8
          }}>
             MANU
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={{ marginRight: 16 }}>
          <Pressable onPress={handleAddExpense}>
            <Plus size={28} color="#1A1A1A" strokeWidth={1.8} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, handleAddExpense]);

  // Calculate sticky index: 1 if warning is shown, 0 otherwise
  const showWarning = !isPro && isRevenueCatEnabled();
  const stickyIndex = showWarning ? 1 : 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12 }}
        stickyHeaderIndices={[stickyIndex]}
      >

        {/* Free Plan Usage Warning */}
        {!isPro && isRevenueCatEnabled() && (
          <Pressable
            onPress={() => setShowProModal(true)}
            className="mx-5 mt-4 p-3 border-l-[3px] active:opacity-80"
            style={{
              backgroundColor:
                remainingExpenses <= 5 ? '#FEF2F2' : '#F9FAFB',
              borderLeftColor:
                remainingExpenses <= 5 ? '#DC2626' : '#9CA3AF',
            }}
          >
            <Text
              className="text-[13px] font-medium"
              style={{
                color: remainingExpenses <= 5 ? '#DC2626' : '#6B7280',
              }}
            >
              Plan Gratis: {usedExpenses}/{EXPENSE_LIMITS.FREE} gastos este mes
              {remainingExpenses <= 5 && ' · Toca para ver Pro'}
            </Text>
          </Pressable>
        )}

        {/* Period Selector - Sticky */}
        <View 
          className="flex-row mt-4 border border-[#2A2A2A]"
          style={{
            backgroundColor: '#FFFFFF',
            zIndex: 10,
            paddingVertical: 12,
            paddingHorizontal: 0,
            marginHorizontal: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 3,
          }}
        >
          {(['today', 'week', 'month'] as Period[]).map((period) => (
            <Pressable
              key={period}
              className="flex-1 py-3 items-center active:opacity-60"
              style={{
                backgroundColor:
                  selectedPeriod === period ? '#1A1A1A' : '#FFFFFF',
              }}
              onPress={() => handlePeriodChange(period)}
            >
              <Text
                className="text-[14px] font-normal"
                style={{
                  color: selectedPeriod === period ? '#FFFFFF' : '#666666',
                }}
              >
                {PERIOD_LABELS[period]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Budget Alerts Banner */}
        {hasAlerts && !alertDismissed && (
          <View
            style={{
              marginHorizontal: 12,
              marginBottom: 10,
              backgroundColor: '#FFF3CD',
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#FF6B00',
              overflow: 'hidden',
            }}
          >
            <Pressable
              style={{
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => router.push('/(tabs)/budgets')}
            >
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#856404', marginBottom: 3 }}>
                  {alerts.length} {alerts.length === 1 ? 'presupuesto cerca' : 'presupuestos cerca'} del límite
                </Text>
                <Text style={{ fontSize: 11, color: '#856404' }}>
                  Toca para ver detalles
                </Text>
              </View>
            </Pressable>

            {/* Botón X para cerrar */}
            <Pressable
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                padding: 6,
              }}
              onPress={(e) => {
                e.stopPropagation();
                setAlertDismissed(true);
                AsyncStorage.setItem('budget_alert_dismissed', 'true');
              }}
            >
              <Text style={{ fontSize: 18, color: '#856404', fontWeight: '700' }}>×</Text>
            </Pressable>
          </View>
        )}

        {/* Period Total */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          className="mt-6"
          style={{ paddingHorizontal: 12 }}
        >
          <Text className="text-[14px] font-light text-[#666666] mb-1">
            Total {PERIOD_LABELS[selectedPeriod].toLowerCase()}
          </Text>
          <Text
            className="text-[56px] font-bold text-[#1A1A1A] tracking-[-1px]"
            style={{ fontFamily: 'System' }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMoney(stats.total, userCurrency)}
          </Text>
          <Text className="text-[14px] font-light text-[#666666] mt-1">
            {stats.count} {stats.count === 1 ? 'gasto' : 'gastos'}
            {selectedPeriod !== 'today' &&
              ` · ${formatMoney(stats.averageDaily, userCurrency)}/dia`}
          </Text>
          {renderChangeIndicator()}
        </Animated.View>

        {/* Category Chart */}
        {categorySummary.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(300).delay(200)}
            className="mt-6"
            style={{ paddingHorizontal: 12 }}
          >
            <Text className="text-[16px] font-normal text-[#1A1A1A] mb-6">
              Por categoria
            </Text>
            <View className="border border-[#2A2A2A] p-5">
              {categorySummary.map((cat, index) => (
                <View key={cat.category} className={index > 0 ? 'mt-6' : ''}>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-[14px] font-light text-[#1A1A1A]">
                      {CATEGORY_LABELS[cat.category]}
                    </Text>
                    <Text className="text-[14px] font-light text-[#666666]">
                      {formatMoney(cat.total, userCurrency)} ({cat.percentage.toFixed(0)}%)
                    </Text>
                  </View>
                  <View className="h-2 bg-[#FAFAFA] overflow-hidden">
                    <Animated.View
                      entering={FadeIn.duration(500).delay(300 + index * 100)}
                      className="h-full"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[cat.category],
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Divider */}
        <View className="mt-6 h-[1px] bg-[#F0F0F0]" style={{ marginHorizontal: 12 }} />

        {/* Recent Expenses */}
        <View className="mt-6" style={{ paddingHorizontal: 12 }}>
          <Text className="text-[16px] font-normal text-[#1A1A1A] mb-4">
            Ultimos gastos
          </Text>

          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#1A1A1A" />
              <Text className="text-[14px] font-light text-[#666666] mt-3">
                Cargando gastos...
              </Text>
            </View>
          ) : recentExpenses.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-[15px] font-light text-[#999999]">
                Sin gastos en este periodo
              </Text>
              <Pressable
                onPress={handleAddExpense}
                className="mt-6 border border-black px-6 py-4 active:opacity-60"
              >
                <Text className="text-[14px] font-light text-[#1A1A1A]">Agregar gasto</Text>
              </Pressable>
            </View>
          ) : (
            recentExpenses.map((expense, index) => (
              <Animated.View
                key={expense.id}
                entering={FadeInDown.duration(300).delay(200 + index * 100)}
              >
                <Pressable
                  onPress={() => router.push('/(tabs)/history')}
                  className="mb-3 active:opacity-60"
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: '#1A1A1A',
                      borderRadius: 0,
                      padding: 14,
                    }}
                  >
                    <View className="flex-row">
                      {/* Time column */}
                      <View className="mr-3" style={{ width: 70 }}>
                        <Text style={{ ...textStyles.secondaryText, fontSize: 11 }}>
                          {formatTime(expense.createdAt)}
                        </Text>
                      </View>

                      {/* Content column */}
                      <View className="flex-1" style={{ gap: 7 }}>
                        {/* Provider and amount row */}
                        <View className="flex-row justify-between items-center" style={{ marginBottom: 3 }}>
                          <Text style={{ ...textStyles.listItemTitle, fontWeight: '400', fontSize: 14 }} className="flex-1">
                            {expense.provider || 'Sin proveedor'}
                          </Text>
                          <Text style={{ ...textStyles.listItemAmount, fontSize: 15 }} className="ml-2">
                            {formatMoney(expense.amount, expense.currencyCode || userCurrency)}
                          </Text>
                        </View>

                        {/* Category and notes row (indented) */}
                        <View className="flex-row items-center">
                          <Text style={{ ...textStyles.secondaryText, fontWeight: '300', fontSize: 11 }}>
                            {CATEGORY_LABELS[expense.category]}
                          </Text>
                          {expense.notes && (
                            <>
                              <Text style={{ ...textStyles.secondaryText, fontSize: 11 }} className="mx-1">•</Text>
                              <Text style={{ ...textStyles.secondaryText, fontSize: 11 }}>NOTAS</Text>
                            </>
                          )}
                          {expense.receiptImageUrl && (
                            <Receipt
                              size={10}
                              strokeWidth={1.5}
                              color="#999999"
                              style={{ marginLeft: 3 }}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))
          )}

          {periodExpenses.length > 3 && (
            <Pressable
              onPress={() => router.push('/(tabs)/history')}
              className="mt-2 active:opacity-60"
            >
              <Text
                className="text-[14px] font-light text-[#1A1A1A]"
                style={{ textDecorationLine: 'underline' }}
              >
                Ver todos ({periodExpenses.length})
              </Text>
            </Pressable>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* Pro Subscription Modal */}
      <Modal
        visible={showProModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#2A2A2A]">
            <Pressable
              onPress={() => setShowProModal(false)}
              className="p-1 active:opacity-60"
              disabled={isProcessingPurchase}
            >
              <X size={24} strokeWidth={1.5} color="#1A1A1A" />
            </Pressable>
            <Text className="text-[18px] font-medium text-[#1A1A1A]">
              MANU Pro
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-black rounded-3xl items-center justify-center mb-4">
                <Crown size={32} strokeWidth={1.5} color="#FFFFFF" />
              </View>
              <Text className="text-[28px] font-semibold text-[#1A1A1A] mb-2">
                MANU Pro
              </Text>
              <Text className="text-[15px] font-light text-[#666666] text-center">
                Lleva tu negocio al siguiente nivel
              </Text>
            </View>

            {/* Price */}
            {proPackage && (
              <View className="items-center mb-8 p-7 bg-[#F9F9F9] rounded-2xl">
                <Text className="text-[14px] text-[#666666] mb-1">
                  Suscripción mensual
                </Text>
                <Text className="text-[36px] font-bold text-[#1A1A1A]">
                  {proPackage.product.priceString}
                </Text>
                <Text className="text-[13px] font-light text-[#999999] mt-1">
                  por mes
                </Text>
              </View>
            )}

            {/* Features */}
            <View className="mb-8 p-6 border border-[#2A2A2A] rounded-2xl">
              <Text className="text-[16px] font-medium text-[#1A1A1A] mb-6">
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
                className="py-5 items-center rounded-xl active:opacity-80"
                style={{
                  backgroundColor: isProcessingPurchase ? '#E5E5E5' : '#1A1A1A',
                }}
              >
                {isProcessingPurchase ? (
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <ActivityIndicator size="small" color="#666666" />
                    <Text className="text-[16px] font-medium text-[#666666]">
                      Procesando...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[16px] font-medium text-white">
                    Suscribirse por {proPackage.product.priceString}/mes
                  </Text>
                )}
              </Pressable>
            ) : (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#999999" />
                <Text className="text-[14px] font-light text-[#999999] mt-2">
                  Cargando precios...
                </Text>
              </View>
            )}

            {/* Restore Purchases */}
            <Pressable
              onPress={handleRestorePurchases}
              disabled={isProcessingPurchase}
              className="mt-6 py-3 items-center active:opacity-60"
            >
              <Text className="text-[14px] font-light text-[#666666] underline">
                Restaurar compras anteriores
              </Text>
            </Pressable>

            {/* Disclaimer */}
            <Text className="text-[12px] font-light text-[#999999] text-center mt-8 leading-5">
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
