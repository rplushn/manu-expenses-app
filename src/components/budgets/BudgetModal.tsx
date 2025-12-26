import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Budget, BudgetFormData } from '@/types/budget';
import { ExpenseCategory, CATEGORY_LABELS } from '@/lib/types';
import { formatMoney } from '@/lib/store';

interface BudgetModalProps {
  visible: boolean;
  budget: Budget | null;
  onClose: () => void;
  onSave: (data: BudgetFormData) => Promise<void>;
  onDelete?: (budget: Budget) => void;
  currencyCode: string;
}

export function BudgetModal({
  visible,
  budget,
  onClose,
  onSave,
  onDelete,
  currencyCode,
}: BudgetModalProps) {
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'mensual' | 'anual'>('mensual');
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const categories: ExpenseCategory[] = [
    'mercaderia',
    'servicios',
    'marketing',
    'transporte',
    'operacion',
    'personal',
    'instalaciones',
    'impuestos',
    'equipamiento',
    'alimentacion',
    'otros',
  ];

  useEffect(() => {
    if (budget) {
      setCategory(budget.category);
      setAmount(budget.amount.toString());
      setPeriod(budget.period);
    } else {
      setCategory(null);
      setAmount('');
      setPeriod('mensual');
    }
    setShowCategoryPicker(false);
  }, [budget, visible]);

  const handleSave = async () => {
    if (!category) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        category: category,
        amount: parsedAmount,
        period: period,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el presupuesto');
    } finally {
      setIsSaving(false);
    }
  };

  const currencySymbol = currencyCode === 'USD' ? '$' : 'L';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 pt-4 pb-6 border-b border-[#2A2A2A]">
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#000000',
              }}
            >
              {budget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </Text>
            <Pressable onPress={onClose} className="p-2 active:opacity-60">
              <X size={24} strokeWidth={1.5} color="#1A1A1A" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-6">
              {/* Category */}
              <View className="mb-6">
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#666666',
                    marginBottom: 8,
                  }}
                >
                  Categoría *
                </Text>
                <Pressable
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  style={{
                    borderWidth: 1.8,
                    borderColor: '#2A2A2A',
                    borderRadius: 8,
                    padding: 16,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '400',
                      color: category ? '#000000' : '#999999',
                    }}
                  >
                    {category ? CATEGORY_LABELS[category] : 'Selecciona una categoría'}
                  </Text>
                </Pressable>

                {showCategoryPicker && (
                  <View
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#1A1A1A',
                      borderRadius: 8,
                      marginTop: 8,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {categories.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryPicker(false);
                        }}
                        style={{
                          padding: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: '#F0F0F0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '400',
                            color: '#000000',
                          }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Amount */}
              <View className="mb-6">
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#666666',
                    marginBottom: 8,
                  }}
                >
                  Monto límite *
                </Text>
                <View
                  style={{
                    borderWidth: 1.8,
                    borderColor: '#2A2A2A',
                    borderRadius: 8,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '400',
                      color: '#000000',
                      marginRight: 8,
                    }}
                  >
                    {currencySymbol}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#999999"
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '400',
                      color: '#000000',
                    }}
                  />
                </View>
              </View>

              {/* Period */}
              <View className="mb-8">
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#666666',
                    marginBottom: 8,
                  }}
                >
                  Período *
                </Text>
                <View className="flex-row" style={{ gap: 12 }}>
                  <Pressable
                    onPress={() => setPeriod('mensual')}
                    style={{
                      flex: 1,
                      borderWidth: 1.5,
                      borderColor: period === 'mensual' ? '#2A2A2A' : '#2A2A2A',
                      borderRadius: 8,
                      padding: 16,
                      backgroundColor: period === 'mensual' ? '#000000' : '#FFFFFF',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '400',
                        color: period === 'mensual' ? '#FFFFFF' : '#000000',
                        textAlign: 'center',
                      }}
                    >
                      Mensual
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPeriod('anual')}
                    style={{
                      flex: 1,
                      borderWidth: 1.5,
                      borderColor: period === 'anual' ? '#2A2A2A' : '#2A2A2A',
                      borderRadius: 8,
                      padding: 16,
                      backgroundColor: period === 'anual' ? '#000000' : '#FFFFFF',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '400',
                        color: period === 'anual' ? '#FFFFFF' : '#000000',
                        textAlign: 'center',
                      }}
                    >
                      Anual
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-6 pt-4 pb-6 border-t border-[#2A2A2A]">
            {budget && onDelete && (
              <Pressable
                onPress={() => {
                  onDelete(budget);
                  onClose();
                }}
                disabled={isSaving}
                style={{
                  borderWidth: 1.8,
                  borderColor: '#FF3B30',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: '#FFFFFF',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#FF3B30',
                    textAlign: 'center',
                  }}
                >
                  Eliminar Presupuesto
                </Text>
              </Pressable>
            )}
            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={onClose}
                disabled={isSaving}
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: '#1A1A1A',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: '#F5F5F5',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#000000',
                    textAlign: 'center',
                  }}
                >
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={isSaving || !category || !amount}
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: '#1A1A1A',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: '#000000',
                  opacity: isSaving || !category || !amount ? 0.5 : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#FFFFFF',
                      textAlign: 'center',
                    }}
                  >
                    Guardar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

