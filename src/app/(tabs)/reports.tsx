import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Period } from '@/lib/store';
import { CATEGORY_LABELS } from '@/lib/types';
import { generateDetailedReport } from '@/lib/pdf-generator';
import { FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-6 pb-4 border-b border-[#E5E5E5]">
          <Text className="text-[24px] font-bold text-black mb-1">MANU</Text>
          <Text className="text-[18px] font-semibold text-black mb-2">
            {currentUser?.empresaNombre || currentUser?.nombreNegocio || 'Mi Negocio'}
          </Text>
          <Text className="text-[16px] font-medium text-[#666666] mb-3">
            Reporte de Gastos
          </Text>
          <Text className="text-[13px] text-[#999999] mb-1">
            Rango de fechas: {PERIOD_DISPLAY[selectedPeriod]}
          </Text>
          <Text className="text-[13px] text-[#999999]">
            Generado el {formattedDate} a las {formattedTime}
          </Text>
        </View>

        {/* Period Tabs */}
        <View className="flex-row mx-5 mt-2 border border-[#E5E5E5]">
          {(['today', 'week', 'month'] as Period[]).map((period) => (
            <Pressable
              key={period}
              className="flex-1 py-3 items-center active:opacity-60"
              style={{
                backgroundColor: selectedPeriod === period ? '#000000' : '#FFFFFF',
              }}
              onPress={() => handlePeriodChange(period)}
            >
              <Text
                className="text-[14px] font-medium"
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
        <View className="px-5 mt-6">
          <Text className="text-[18px] font-bold text-black mb-4">
            RESUMEN EJECUTIVO
          </Text>
          
          <View className="border border-[#E5E5E5] p-4">
            <View className="flex-row justify-between items-center py-2 border-b border-[#F5F5F5]">
              <Text className="text-[14px] text-[#666666]">Total Gastos:</Text>
              <Text className="text-[14px] font-semibold text-black">
                L {formatAmount(stats.total)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-[#F5F5F5]">
              <Text className="text-[14px] text-[#666666]">Número de Gastos:</Text>
              <Text className="text-[14px] font-semibold text-black">
                {stats.count}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-[#F5F5F5]">
              <Text className="text-[14px] text-[#666666]">Promedio por Gasto:</Text>
              <Text className="text-[14px] font-semibold text-black">
                L {formatAmount(averagePerExpense)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2 border-b border-[#F5F5F5]">
              <Text className="text-[14px] text-[#666666]">Gasto Más Alto:</Text>
              <Text className="text-[14px] font-semibold text-black">
                {biggestExpense ? `L ${formatAmount(biggestExpense.amount)}` : '-'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-[14px] text-[#666666]">Categoría Mayor Gasto:</Text>
              <Text className="text-[14px] font-semibold text-black">
                {topCategory 
                  ? `${CATEGORY_LABELS[topCategory.category]} (${topCategory.percentage.toFixed(1)}%)`
                  : '-'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Gastos por Categoría */}
        <View className="px-5 mt-6">
          <Text className="text-[18px] font-bold text-black mb-4">
            GASTOS POR CATEGORÍA
          </Text>

          {categorySummary.length === 0 ? (
            <View className="border border-[#E5E5E5] p-4">
              <Text className="text-[14px] text-[#999999] text-center py-4">
                Sin datos en este periodo
              </Text>
            </View>
          ) : (
            <View className="border border-[#E5E5E5]">
              {/* Table Header */}
              <View className="flex-row border-b border-[#E5E5E5] bg-[#F9FAFB]">
                <View className="flex-1 px-3 py-3">
                  <Text className="text-[13px] font-semibold text-black">Categoría</Text>
                </View>
                <View className="w-24 px-3 py-3 border-l border-[#E5E5E5]">
                  <Text className="text-[13px] font-semibold text-black text-right">Monto</Text>
                </View>
                <View className="w-20 px-3 py-3 border-l border-[#E5E5E5]">
                  <Text className="text-[13px] font-semibold text-black text-right">%</Text>
                </View>
              </View>

              {/* Table Rows */}
              {categorySummary.map((item, index) => (
                <View
                  key={item.category}
                  className={`flex-row border-b border-[#F5F5F5] ${index === categorySummary.length - 1 ? 'border-b-0' : ''}`}
                >
                  <View className="flex-1 px-3 py-3">
                    <Text className="text-[13px] text-black">
                      {CATEGORY_LABELS[item.category]}
                    </Text>
                  </View>
                  <View className="w-24 px-3 py-3 border-l border-[#E5E5E5]">
                    <Text className="text-[13px] text-black text-right">
                      L {formatAmount(item.total)}
                    </Text>
                  </View>
                  <View className="w-20 px-3 py-3 border-l border-[#E5E5E5]">
                    <Text className="text-[13px] text-black text-right">
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}

              {/* Table Footer - Total */}
              <View className="flex-row border-t-2 border-[#E5E5E5] bg-[#F9FAFB]">
                <View className="flex-1 px-3 py-3">
                  <Text className="text-[13px] font-semibold text-black">TOTAL</Text>
                </View>
                <View className="w-24 px-3 py-3 border-l border-[#E5E5E5]">
                  <Text className="text-[13px] font-semibold text-black text-right">
                    L {formatAmount(stats.total)}
                  </Text>
                </View>
                <View className="w-20 px-3 py-3 border-l border-[#E5E5E5]">
                  <Text className="text-[13px] font-semibold text-black text-right">
                    100%
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Detalle de Gastos */}
        <View className="px-5 mt-6">
          <Text className="text-[18px] font-bold text-black mb-4">
            DETALLE DE GASTOS
          </Text>

          {sortedExpenses.length === 0 ? (
            <View className="border border-[#E5E5E5] p-4">
              <Text className="text-[14px] text-[#999999] text-center py-4">
                Sin gastos en este periodo
              </Text>
            </View>
          ) : (
            <View className="border border-[#E5E5E5]">
              {/* Table Header */}
              <View className="flex-row border-b border-[#E5E5E5] bg-[#F9FAFB]">
                <View className="w-24 px-3 py-3">
                  <Text className="text-[13px] font-semibold text-black">Fecha</Text>
                </View>
                <View className="flex-1 px-3 py-3 border-l border-[#E5E5E5]">
                  <Text className="text-[13px] font-semibold text-black">Proveedor</Text>
                </View>
                <View className="w-28 px-3 py-3 border-l border-[#E5E5E5]">
                  <Text className="text-[13px] font-semibold text-black">Categoría</Text>
                </View>
                <View className="w-24 px-3 py-3 border-l border-[#E5E5E5]">
                  <Text className="text-[13px] font-semibold text-black text-right">Monto</Text>
                </View>
              </View>

              {/* Table Rows */}
              {sortedExpenses.map((expense, index) => (
                <View
                  key={expense.id}
                  className={`flex-row border-b border-[#F5F5F5] ${index === sortedExpenses.length - 1 ? 'border-b-0' : ''}`}
                >
                  <View className="w-24 px-3 py-3">
                    <Text className="text-[12px] text-black">
                      {formatExpenseDate(expense.expenseDate)}
                    </Text>
                  </View>
                  <View className="flex-1 px-3 py-3 border-l border-[#E5E5E5]">
                    <Text className="text-[12px] text-black" numberOfLines={1}>
                      {expense.provider || 'Sin proveedor'}
                    </Text>
                  </View>
                  <View className="w-28 px-3 py-3 border-l border-[#E5E5E5]">
                    <Text className="text-[12px] text-black" numberOfLines={1}>
                      {CATEGORY_LABELS[expense.category]}
                    </Text>
                  </View>
                  <View className="w-24 px-3 py-3 border-l border-[#E5E5E5]">
                    <Text className="text-[12px] text-black text-right">
                      L {formatAmount(expense.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="px-5 mt-6 mb-8 pt-4 border-t border-[#E5E5E5]">
          <Text className="text-[12px] text-[#999999] text-center">
            Reporte generado por MANU el {formattedDate} a las {formattedTime}
          </Text>
        </View>

        {/* Download PDF Button */}
        <View className="px-5 mt-4 mb-8">
          <Pressable
            onPress={handleDownloadPDF}
            disabled={isGeneratingPDF}
            style={{
              backgroundColor: isGeneratingPDF ? '#666666' : '#000000',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isGeneratingPDF ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500', marginLeft: 8 }}>
                  Generando reporte...
                </Text>
              </>
            ) : (
              <>
                <FileText size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500', marginLeft: 8 }}>
                  Descargar reporte detallado (PDF)
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
