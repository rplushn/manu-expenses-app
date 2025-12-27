import React, { useState, useMemo, useLayoutEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Period } from '@/lib/store';
import { CATEGORY_LABELS } from '@/lib/types';
import { generateDetailedReport } from '@/lib/pdf-generator';
import { FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigation } from 'expo-router';

function formatAmount(amount: number): string {
  return amount.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

const PERIOD_DISPLAY: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

// Format date from YYYY-MM-DD to "DD MMM YYYY"
function formatExpenseDate(dateStr: string): string {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

export default function ReportsScreen() {
  const navigation = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const getPeriodStats = useAppStore((s) => s.getPeriodStats);
  const getCategorySummary = useAppStore((s) => s.getCategorySummary);
  const getExpensesByPeriod = useAppStore((s) => s.getExpensesByPeriod);
  const currentUser = useAppStore((s) => s.currentUser);
  const expenses = useAppStore((s) => s.expenses);

  const stats = useMemo(() => getPeriodStats(selectedPeriod), [getPeriodStats, selectedPeriod]);
  const categorySummary = useMemo(() => getCategorySummary(selectedPeriod), [getCategorySummary, selectedPeriod]);
  const periodExpenses = useMemo(() => getExpensesByPeriod(selectedPeriod), [getExpensesByPeriod, selectedPeriod]);

  const biggestExpense = useMemo(() => {
    if (periodExpenses.length === 0) return null;
    return periodExpenses.reduce((max, e) => (e.amount > max.amount ? e : max), periodExpenses[0]);
  }, [periodExpenses]);

  // Calculate average per expense
  const averagePerExpense = useMemo(() => {
    if (stats.count === 0) return 0;
    return stats.total / stats.count;
  }, [stats]);

  // Get top category (highest percentage)
  const topCategory = useMemo(() => {
    if (categorySummary.length === 0) return null;
    return categorySummary.reduce((max, item) => 
      item.percentage > max.percentage ? item : max, 
      categorySummary[0]
    );
  }, [categorySummary]);

  // Sort expenses by date (most recent first)
  const sortedExpenses = useMemo(() => {
    return [...periodExpenses].sort((a, b) => {
      return b.expenseDate.localeCompare(a.expenseDate);
    });
  }, [periodExpenses]);

  // Current date and time for header/footer
  const now = new Date();
  const formattedDate = format(now, "d 'de' MMMM yyyy", { locale: es });
  const formattedTime = format(now, 'h:mm a');

  const handlePeriodChange = (period: Period) => {
    Haptics.selectionAsync();
    setSelectedPeriod(period);
  };

  const handleDownloadPDF = async () => {
    if (periodExpenses.length === 0) {
      Alert.alert('Sin datos', 'No hay gastos para reportar en este periodo');
      return;
    }

    setIsGeneratingPDF(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const businessName = currentUser?.empresaNombre || currentUser?.nombreNegocio || 'Mi Negocio';
      const logoUrl = currentUser?.empresaLogoUrl;
      
      // DEBUG: Log logo info
      console.log('🔍 [PDF] Logo URL being passed:', currentUser?.empresaLogoUrl);
      console.log('🔍 [PDF] currentUser:', JSON.stringify(currentUser, null, 2));
      
      await generateDetailedReport(
        periodExpenses,
        businessName,
        selectedPeriod,
        stats,
        categorySummary,
        biggestExpense,
        averagePerExpense,
        topCategory,
        logoUrl
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el reporte');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Configure header with PDF download button
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Reportes',
      headerShown: true,
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontSize: 20, fontWeight: '500', color: '#1A1A1A' },
      headerRight: () => (
        <View style={{ marginRight: 16 }}>
          <Pressable onPress={handleDownloadPDF} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? (
              <ActivityIndicator size="small" color="#1A1A1A" />
            ) : (
              <FileText size={24} color="#1A1A1A" strokeWidth={1.8} />
            )}
          </Pressable>
        </View>
      ),
    });
  }, [navigation, handleDownloadPDF, isGeneratingPDF]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12 }}
        stickyHeaderIndices={[0]}
      >
        {/* Period Tabs - Sticky */}
        <View 
          className="flex-row mx-5 border border-[#2A2A2A]"
          style={{
            backgroundColor: '#FFFFFF',
            zIndex: 10,
            paddingVertical: 12,
            paddingHorizontal: 0,
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
                backgroundColor: selectedPeriod === period ? '#1A1A1A' : '#FFFFFF',
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

        {/* Resumen Ejecutivo */}
        <View className="px-6 mt-8">
          <Text className="text-[18px] font-bold text-[#1A1A1A] mb-6">
            RESUMEN EJECUTIVO
          </Text>
          
          <View className="border border-[#2A2A2A] p-5">
            <View className="flex-row justify-between items-center py-2 border-b border-[#2A2A2A]">
              <Text className="text-[14px] font-light text-[#666666]">Total Gastos:</Text>
              <Text className="text-[14px] font-semibold text-[#1A1A1A]">
                L {formatAmount(stats.total)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-[#2A2A2A]">
              <Text className="text-[14px] font-light text-[#666666]">Número de Gastos:</Text>
              <Text className="text-[14px] font-semibold text-[#1A1A1A]">
                {stats.count}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-[#2A2A2A]">
              <Text className="text-[14px] font-light text-[#666666]">Promedio por Gasto:</Text>
              <Text className="text-[14px] font-semibold text-[#1A1A1A]">
                L {formatAmount(averagePerExpense)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-[#2A2A2A]">
              <Text className="text-[14px] font-light text-[#666666]">Gasto Más Alto:</Text>
              <Text className="text-[14px] font-semibold text-[#1A1A1A]">
                {biggestExpense ? `L ${formatAmount(biggestExpense.amount)}` : '-'}
              </Text>
            </View>
            <View className="py-2">
              <Text className="text-[14px] font-light text-[#666666]">
                Categoría Mayor Gasto:
              </Text>
              <Text
                className="text-[14px] font-semibold text-[#1A1A1A] mt-1"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {topCategory
                  ? `${CATEGORY_LABELS[topCategory.category]} (${topCategory.percentage.toFixed(1)}%)`
                  : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Gastos por Categoría */}
        <View className="px-6 mt-8">
          <Text className="text-[18px] font-bold text-[#1A1A1A] mb-6">
            GASTOS POR CATEGORÍA
          </Text>

          {categorySummary.length === 0 ? (
            <View className="border border-[#2A2A2A] p-5">
              <Text className="text-[14px] text-[#999999] text-center py-4">
                Sin datos en este periodo
              </Text>
            </View>
          ) : (
            <View className="border border-[#2A2A2A]">
              {/* Table Header */}
              <View className="flex-row border-b border-[#2A2A2A] bg-[#F9FAFB]">
                <View style={{ flex: 2, paddingVertical: 8, paddingHorizontal: 8 }}>
                  <Text className="text-[13px] font-bold text-[#1A1A1A]" style={{ textAlign: 'left', paddingLeft: 8 }}>Categoría</Text>
                </View>
                <View style={{ flex: 2, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: '#2A2A2A' }}>
                  <Text className="text-[13px] font-bold text-[#1A1A1A]" style={{ textAlign: 'right', paddingRight: 8 }}>Monto</Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: '#2A2A2A' }}>
                  <Text className="text-[13px] font-bold text-[#1A1A1A]" style={{ textAlign: 'right', paddingRight: 8 }}>%</Text>
                </View>
              </View>

              {/* Table Rows */}
              {categorySummary.map((item, index) => (
                <View
                  key={item.category}
                  className={`flex-row border-b border-[#2A2A2A] ${index === categorySummary.length - 1 ? 'border-b-0' : ''}`}
                >
                  <View style={{ flex: 2, paddingVertical: 8, paddingHorizontal: 8 }}>
                    <Text className="text-[13px] font-light text-[#1A1A1A]" style={{ textAlign: 'left', paddingLeft: 8 }}>
                      {CATEGORY_LABELS[item.category]}
                    </Text>
                  </View>
                  <View style={{ flex: 2, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: '#2A2A2A' }}>
                    <Text
                      className="text-[13px] font-light text-[#1A1A1A]"
                      style={{ textAlign: 'right', paddingRight: 8 }}
                    >
                      L {formatAmount(item.total)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: '#2A2A2A' }}>
                    <Text className="text-[13px] font-light text-[#1A1A1A]" style={{ textAlign: 'right', paddingRight: 8 }}>
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}

              {/* Table Footer - Total */}
              <View className="flex-row border-t-2 border-[#2A2A2A] bg-[#F9FAFB]">
                <View style={{ flex: 2, paddingVertical: 8, paddingHorizontal: 8 }}>
                  <Text className="text-[13px] font-bold text-[#1A1A1A]" style={{ textAlign: 'left', paddingLeft: 8 }}>TOTAL</Text>
                </View>
                <View style={{ flex: 2, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: '#2A2A2A' }}>
                  <Text
                    className="text-[13px] font-bold text-[#1A1A1A]"
                    style={{ textAlign: 'right', paddingRight: 8 }}
                  >
                    L {formatAmount(stats.total)}
                  </Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: '#2A2A2A' }}>
                  <Text className="text-[13px] font-bold text-[#1A1A1A]" style={{ textAlign: 'right', paddingRight: 8 }}>
                    100%
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Detalle de Gastos */}
        <View className="px-6 mt-8">
          <Text className="text-[18px] font-bold text-[#1A1A1A] mb-6">
            DETALLE DE GASTOS
          </Text>

          {sortedExpenses.length === 0 ? (
            <View className="border border-[#2A2A2A] p-5">
              <Text className="text-[14px] text-[#999999] text-center py-4">
                Sin gastos en este periodo
              </Text>
            </View>
          ) : (
            <View className="border border-[#2A2A2A]">
              {/* Table Header */}
              <View className="flex-row border-b border-[#2A2A2A] bg-[#F9FAFB]">
                <View className="w-24 px-3 py-3">
                  <Text className="text-[13px] font-medium text-[#1A1A1A]">Fecha</Text>
                </View>
                <View className="flex-1 px-3 py-3 border-l border-[#2A2A2A]">
                  <Text className="text-[13px] font-medium text-[#1A1A1A]">Categoría</Text>
                </View>
                <View 
                  className="px-3 py-3 border-l border-[#2A2A2A]"
                  style={{ minWidth: 100, flexShrink: 0 }}
                >
                  <Text className="text-[13px] font-medium text-[#1A1A1A]" style={{ textAlign: 'right' }}>Monto</Text>
                </View>
              </View>

              {/* Table Rows */}
              {sortedExpenses.map((expense, index) => (
                <View
                  key={expense.id}
                  className={`flex-row border-b border-[#2A2A2A] ${index === sortedExpenses.length - 1 ? 'border-b-0' : ''}`}
                >
                  <View className="w-24 px-3 py-3">
                    <Text className="text-[12px] font-light text-[#1A1A1A]">
                      {formatExpenseDate(expense.expenseDate)}
                    </Text>
                  </View>
                  <View className="flex-1 px-3 py-3 border-l border-[#2A2A2A]">
                    <Text className="text-[12px] font-light text-[#1A1A1A]" numberOfLines={1}>
                      {CATEGORY_LABELS[expense.category]}
                    </Text>
                  </View>
                  <View 
                    className="px-3 py-3 border-l border-[#2A2A2A]"
                    style={{ minWidth: 100, flexShrink: 0 }}
                  >
                    <Text 
                      className="text-[12px] font-light text-[#1A1A1A]"
                      numberOfLines={1}
                      ellipsizeMode="clip"
                      style={{ textAlign: 'right' }}
                    >
                      L {formatAmount(expense.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="px-6 mt-8 mb-8 pt-4 border-t border-[#2A2A2A]">
          <Text className="text-[12px] text-[#999999] text-center">
            Reporte generado por MANU el {formattedDate} a las {formattedTime}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
