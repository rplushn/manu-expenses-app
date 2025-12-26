import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Budget } from '@/types/budget';
import { CATEGORY_LABELS } from '@/lib/types';

interface BudgetCardProps {
  budget: Budget;
  spent: number;
  onPress: () => void;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BudgetCard({ budget, spent, onPress }: BudgetCardProps) {
  const spentAmount = typeof spent === 'number' ? spent : 0;
  const limit = typeof budget.amount === 'number' ? budget.amount : 0;
  const percentage = limit > 0 ? (spentAmount / limit) * 100 : 0;

  // Status color function - Progresión gris (nunca rojo en barra)
  const getDotColor = () => {
    if (percentage === 0) return '#D1D5DB';
    if (percentage < 33) return '#D1D5DB';
    if (percentage < 66) return '#6B7280';
    return '#6B7280'; // Gris oscuro siempre
  };

  const statusColor = getDotColor();

  const periodText = budget.period === 'mensual' ? 'Mensual' : 'Anual';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          borderWidth: 2,
          borderColor: '#000000',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 20,
          paddingVertical: 24,
          marginBottom: 20,
        }}
      >
        {/* Header con nombre + dot status */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
            {CATEGORY_LABELS[budget.category]}
          </Text>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: percentage >= 100 ? '#EF4444' : statusColor,
              marginTop: 1,
            }}
          />
        </View>

        {/* Período */}
        <Text style={{ fontSize: 16, fontWeight: '400', color: '#666666', marginBottom: 12 }}>
          {periodText}
        </Text>

        {/* Progress Bar with Percentage */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Barra container */}
            <View
              style={{
                flex: 1,
                height: 6,
                backgroundColor: '#F3F4F6',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              {/* Barra llena */}
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: statusColor,
                }}
              />
            </View>

            {/* Porcentaje */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#1A1A1A',
                minWidth: 35,
                textAlign: 'right',
              }}
            >
              {percentage.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Amounts - Gastado y Límite */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          {/* Gastado */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: '300', color: '#666666', marginBottom: 4 }}>
              Gastado
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
              L {formatAmount(spentAmount)}
            </Text>
          </View>

          {/* Límite */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: '300', color: '#666666', marginBottom: 4 }}>
              Límite
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
              L {formatAmount(limit)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

