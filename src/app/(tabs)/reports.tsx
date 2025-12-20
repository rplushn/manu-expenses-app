import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Period } from '@/lib/store';
import { CATEGORY_LABELS, ExpenseCategory } from '@/lib/types';
import { generateMonthlyReport } from '@/lib/pdf-generator';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { TrendingUp, TrendingDown, Minus, Receipt, Target, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

function formatAmount(amount: number): string {
  return amount.toLocaleString('es-HN');
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  mercaderia: '#000000',
  servicios: '#1A1A1A',
  marketing: '#333333',
  transporte: '#4D4D4D',
  operacion: '#666666',
  personal: '#737373',
  instalaciones: '#808080',
  impuestos: '#8C8C8C',
  equipamiento: '#999999',
  alimentacion: '#A6A6A6',
  otros: '#BBBBBB',
};

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

  const topProvider = useMemo(() => {
    const providerMap: Record<string, { total: number; count: number }> = {};
    periodExpenses.forEach((e) => {
      if (!providerMap[e.provider]) {
        providerMap[e.provider] = { total: 0, count: 0 };
      }
      providerMap[e.provider].total += e.amount;
      providerMap[e.provider].count += 1;
    });

    const sorted = Object.entries(providerMap).sort(([, a], [, b]) => b.total - a.total);
    if (sorted.length === 0) return null;
    return {
      name: sorted[0][0],
      total: sorted[0][1].total,
      count: sorted[0][1].count,
    };
  }, [periodExpenses]);

  const biggestExpense = useMemo(() => {
    if (periodExpenses.length === 0) return null;
    return periodExpenses.reduce((max, e) => (e.amount > max.amount ? e : max), periodExpenses[0]);
  }, [periodExpenses]);

  const handlePeriodChange = (period: Period) => {
    Haptics.selectionAsync();
    setSelectedPeriod(period);
  };

  const handleDownloadPDF = async () => {
    if (expenses.length === 0) {
      Alert.alert('Sin datos', 'No hay gastos para reportar');
      return;
    }

    setIsGeneratingPDF(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const businessName = currentUser?.nombreNegocio || 'Mi Negocio';
      await generateMonthlyReport(expenses, businessName);
      // No mostrar alert de éxito - el share sheet es suficiente
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el reporte');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderChangeIndicator = () => {
    if (stats.change === 0) {
      return (
        <View className="flex-row items-center mt-2">
          <Minus size={14} strokeWidth={1.5} color="#999999" />
          <Text className="text-[13px] text-[#999999] ml-1">
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
          className="text-[13px] ml-1"
          style={{ color: isUp ? '#DC2626' : '#16A34A' }}
        >
          {isUp ? '+' : ''}L {formatAmount(stats.change)} ({stats.changePercent.toFixed(0)}%)
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-2 pb-4">
          <Text className="text-[20px] font-semibold text-black">Reportes</Text>
        </View>

        <View className="flex-row mx-5 border border-[#E5E5E5]">
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
                {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          className="px-5 mt-8"
        >
          <Text className="text-[14px] text-[#666666] mb-1">
            {PERIOD_LABELS[selectedPeriod]}
          </Text>
          <Text
            className="text-[48px] font-bold text-black tracking-[-1px]"
            style={{ fontFamily: 'System' }}
          >
            L {formatAmount(stats.total)}
          </Text>
          <Text className="text-[14px] text-[#666666] mt-1">
            {stats.count} {stats.count === 1 ? 'gasto' : 'gastos'}
            {selectedPeriod !== 'today' && ` - L ${formatAmount(stats.averageDaily)}/dia`}
          </Text>
          {renderChangeIndicator()}
        </Animated.View>

        <View className="flex-row px-5 mt-6">
          <Animated.View
            entering={FadeIn.duration(300).delay(200)}
            className="flex-1 border border-[#E5E5E5] p-4 mr-2"
          >
            <View className="flex-row items-center mb-2">
              <Target size={16} strokeWidth={1.5} color="#666666" />
              <Text className="text-[12px] text-[#666666] ml-1">Mayor gasto</Text>
            </View>
            {biggestExpense ? (
              <>
                <Text className="text-[18px] text-black font-semibold" style={{ fontFamily: 'System' }}>
                  L {formatAmount(biggestExpense.amount)}
                </Text>
                <Text className="text-[12px] text-[#999999] mt-1" numberOfLines={1}>
                  {biggestExpense.provider}
                </Text>
              </>
            ) : (
              <Text className="text-[14px] text-[#999999]">-</Text>
            )}
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(300).delay(250)}
            className="flex-1 border border-[#E5E5E5] p-4 ml-2"
          >
            <View className="flex-row items-center mb-2">
              <Receipt size={16} strokeWidth={1.5} color="#666666" />
              <Text className="text-[12px] text-[#666666] ml-1">Top proveedor</Text>
            </View>
            {topProvider ? (
              <>
                <Text className="text-[18px] text-black font-semibold" style={{ fontFamily: 'System' }}>
                  L {formatAmount(topProvider.total)}
                </Text>
                <Text className="text-[12px] text-[#999999] mt-1" numberOfLines={1}>
                  {topProvider.name} ({topProvider.count})
                </Text>
              </>
            ) : (
              <Text className="text-[14px] text-[#999999]">-</Text>
            )}
          </Animated.View>
        </View>

        <View className="mx-5 mt-8 h-[1px] bg-[#E5E5E5]" />

        <View className="px-5 mt-6">
          <Text className="text-[16px] font-medium text-black mb-4">
            Por categoria
          </Text>

          {categorySummary.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-[15px] text-[#999999]">
                Sin datos en este periodo
              </Text>
            </View>
          ) : (
            <View className="border border-[#E5E5E5] p-4">
              {categorySummary.map((item, index) => (
                <Animated.View
                  key={item.category}
                  entering={FadeInDown.duration(300).delay(300 + index * 80)}
                  className={index > 0 ? 'mt-5' : ''}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <View
                        className="w-3 h-3 mr-2"
                        style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                      />
                      <Text className="text-[14px] text-black">
                        {CATEGORY_LABELS[item.category]}
                      </Text>
                    </View>
                    <View className="flex-row items-baseline">
                      <Text
                        className="text-[14px] text-black font-medium"
                        style={{ fontFamily: 'System' }}
                      >
                        L {formatAmount(item.total)}
                      </Text>
                      <Text className="text-[12px] text-[#999999] ml-2">
                        {item.count} {item.count === 1 ? 'gasto' : 'gastos'}
                      </Text>
                    </View>
                  </View>

                  <View className="h-2 bg-[#F5F5F5] overflow-hidden">
                    <Animated.View
                      entering={FadeIn.duration(500).delay(400 + index * 80)}
                      className="h-full"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[item.category],
                      }}
                    />
                  </View>

                  <Text className="text-[12px] text-[#999999] mt-1">
                    {item.percentage.toFixed(1)}% del total
                  </Text>
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        <View className="px-5 mt-8 mb-8">
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
                  Descargar Reporte PDF
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
