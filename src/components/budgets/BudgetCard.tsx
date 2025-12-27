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
          borderWidth: 1,
          borderColor: '#000000',
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginBottom: 12,
        }}
      >
        {/* Header con nombre + dot status */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>
            {CATEGORY_LABELS[budget.category]}
          </Text>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: percentage >= 100 ? '#EF4444' : statusColor,
              marginTop: 1,
            }}
          />
        </View>

        {/* Período */}
        <Text style={{ fontSize: 13, fontWeight: '400', color: '#666666', marginBottom: 8 }}>
          {periodText}
        </Text>

        {/* Alert Indicator */}
        {percentage >= 80 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: percentage >= 100 ? '#FFE5E5' : '#FFF3CD',
              borderRadius: 8,
              borderLeftWidth: 3,
              borderLeftColor: percentage >= 100 ? '#DC3545' : '#FF6B00',
            }}
          >
            <Text style={{ fontSize: 18 }}>
              {percentage >= 100 ? '🚨' : '⚠️'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: percentage >= 100 ? '#721C24' : '#856404',
              }}
            >
              {percentage >= 100
                ? `Excedido por L ${(spentAmount - limit).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
                : `${(100 - percentage).toFixed(0)}% restante`}
            </Text>
          </View>
        )}

        {/* Progress Bar with Percentage */}
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {/* Barra container */}
            <View
              style={{
                flex: 1,
                height: 5,
                backgroundColor: '#F3F4F6',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* Barra llena */}
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: percentage >= 100 ? '#DC3545' : percentage >= 80 ? '#FF6B00' : '#4A90E2',
                }}
              />
            </View>

            {/* Porcentaje */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: '#1A1A1A',
                minWidth: 28,
                textAlign: 'right',
              }}
            >
              {percentage.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Amounts - Gastado y Límite */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          {/* Gastado */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '300', color: '#666666', marginBottom: 3 }}>
              Gastado
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#1A1A1A' }}>
              L {formatAmount(spentAmount)}
            </Text>
          </View>

          {/* Límite */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, fontWeight: '300', color: '#666666', marginBottom: 3 }}>
              Límite
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#1A1A1A' }}>
              L {formatAmount(limit)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

