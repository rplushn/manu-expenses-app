import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Budget, BudgetStatus } from '@/types/budget';
import { CATEGORY_LABELS } from '@/lib/types';
import { formatMoney } from '@/lib/store';

interface BudgetCardProps {
  budget: Budget;
  spent: number;
  onPress: () => void;
  currencyCode: string;
}

export function BudgetCard({ budget, spent, onPress, currencyCode }: BudgetCardProps) {
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  
  const getStatus = (): BudgetStatus => {
    if (percentage >= 100) return 'PASADO';
    if (percentage >= 80) return 'ALERTA';
    return 'OK';
  };

  const status = getStatus();

  const statusColors = {
    OK: { bg: '#000000', text: '#FFFFFF' },
    ALERTA: { bg: '#FF9500', text: '#FFFFFF' },
    PASADO: { bg: '#FF3B30', text: '#FFFFFF' },
  };

  const statusLabels = {
    OK: 'OK',
    ALERTA: 'ALERTA',
    PASADO: 'PASADO',
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1.5,
        borderColor: '#1A1A1A',
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
      }}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#000000',
              marginBottom: 4,
            }}
          >
            {CATEGORY_LABELS[budget.category]}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#666666',
            }}
          >
            {budget.period === 'mensual' ? 'Mensual' : 'Anual'}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: statusColors[status].bg,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: statusColors[status].text,
            }}
          >
            {statusLabels[status]}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View
        style={{
          height: 8,
          backgroundColor: '#F5F5F5',
          borderRadius: 4,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: statusColors[status].bg,
          }}
        />
      </View>

      {/* Amounts */}
      <View className="flex-row justify-between items-center">
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '400',
              color: '#666666',
              marginBottom: 2,
            }}
          >
            Gastado
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#000000',
            }}
          >
            {formatMoney(spent, currencyCode)}
          </Text>
        </View>
        <View className="items-end">
          <Text
            style={{
              fontSize: 13,
              fontWeight: '400',
              color: '#666666',
              marginBottom: 2,
            }}
          >
            Límite
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#000000',
            }}
          >
            {formatMoney(budget.amount, currencyCode)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

