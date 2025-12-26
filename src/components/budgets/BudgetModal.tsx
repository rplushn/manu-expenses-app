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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 24,
              borderBottomWidth: 1.5,
              borderBottomColor: '#1A1A1A',
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: '#1A1A1A',
                letterSpacing: -0.5,
              }}
            >
              {budget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </Text>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <X size={28} strokeWidth={2} color="#1A1A1A" />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
              {/* Category */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#666666',
                    marginBottom: 8,
                  }}
                >
                  Categoría *
                </Text>
                <Pressable
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  style={{
                    borderWidth: 2,
                    borderColor: '#1A1A1A',
                    borderRadius: 0,
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '400',
                      color: category ? '#1A1A1A' : '#CCCCCC',
                    }}
                  >
                    {category ? CATEGORY_LABELS[category] : 'Selecciona una categoría'}
                  </Text>
                </Pressable>

                {showCategoryPicker && (
                  <View
                    style={{
                      borderWidth: 2,
                      borderColor: '#1A1A1A',
                      borderRadius: 0,
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
                          paddingVertical: 16,
                          paddingHorizontal: 16,
                          borderBottomWidth: 2,
                          borderBottomColor: '#1A1A1A',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '400',
                            color: '#1A1A1A',
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
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#666666',
                    marginBottom: 8,
                  }}
                >
                  Monto límite *
                </Text>
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: '#1A1A1A',
                    borderRadius: 0,
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#1A1A1A',
                      marginRight: 8,
                    }}
                  >
                    {currencySymbol}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#CCCCCC"
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#1A1A1A',
                    }}
                  />
                </View>
              </View>

              {/* Period */}
              <View style={{ marginBottom: 32 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#666666',
                    marginBottom: 8,
                  }}
                >
                  Período *
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => setPeriod('mensual')}
                    style={{
                      flex: 1,
                      borderWidth: 2,
                      borderColor: '#1A1A1A',
                      borderRadius: 0,
                      paddingVertical: 16,
                      backgroundColor: period === 'mensual' ? '#1A1A1A' : '#FFFFFF',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: period === 'mensual' ? '#FFFFFF' : '#666666',
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
                      borderWidth: 2,
                      borderColor: '#1A1A1A',
                      borderRadius: 0,
                      paddingVertical: 16,
                      backgroundColor: period === 'anual' ? '#1A1A1A' : '#FFFFFF',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: period === 'anual' ? '#FFFFFF' : '#666666',
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
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 24,
              borderTopWidth: 1.5,
              borderTopColor: '#1A1A1A',
            }}
          >
            {budget && onDelete && (
              <Pressable
                onPress={() => {
                  onDelete(budget);
                  onClose();
                }}
                disabled={isSaving}
                style={{
                  borderWidth: 2,
                  borderColor: '#FF3B30',
                  borderRadius: 0,
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  backgroundColor: '#FFFFFF',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#FF3B30',
                    textAlign: 'center',
                  }}
                >
                  Eliminar Presupuesto
                </Text>
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={onClose}
                disabled={isSaving}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderColor: '#1A1A1A',
                  borderRadius: 0,
                  paddingVertical: 16,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#1A1A1A',
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
                  borderWidth: 2,
                  borderColor: '#1A1A1A',
                  borderRadius: 0,
                  paddingVertical: 16,
                  backgroundColor: isSaving || !category || !amount ? '#CCCCCC' : '#1A1A1A',
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
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

