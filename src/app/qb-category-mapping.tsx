// QuickBooks Category Mapping Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronRight, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { CATEGORY_LABELS, ExpenseCategory } from '@/lib/types';
import * as Haptics from 'expo-haptics';

interface CategoryMapping {
  id: string;
  manu_category: ExpenseCategory;
  qb_account_name: string;
  qb_account_type: string;
  is_active: boolean;
}

const QB_ACCOUNT_TYPES = [
  'Expense',
  'Cost of Goods Sold',
  'Other Expense',
];

const DEFAULT_QB_ACCOUNTS: Record<ExpenseCategory, string> = {
  mercaderia: 'Cost of Goods Sold',
  servicios: 'Office Expenses',
  marketing: 'Advertising & Marketing',
  transporte: 'Vehicle Expenses',
  operacion: 'Operating Expenses',
  personal: 'Payroll Expenses',
  instalaciones: 'Rent or Lease',
  impuestos: 'Taxes & Licenses',
  equipamiento: 'Equipment Rental',
  alimentacion: 'Meals & Entertainment',
  otros: 'Other Expenses',
};

export default function QBCategoryMappingScreen() {
  const router = useRouter();
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountType, setEditAccountType] = useState('Expense');

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('category_mapping')
        .select('*')
        .order('manu_category');

      if (error) throw error;

      // If no mappings exist, create defaults
      if (!data || data.length === 0) {
        await createDefaultMappings();
        await loadMappings();
        return;
      }

      setMappings(data as CategoryMapping[]);
    } catch (error) {
      console.error('Error loading mappings:', error);
      Alert.alert('Error', 'No se pudieron cargar los mapeos');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultMappings = async () => {
    const defaultMappings = Object.entries(DEFAULT_QB_ACCOUNTS).map(
      ([category, accountName]) => ({
        manu_category: category as ExpenseCategory,
        qb_account_name: accountName,
        qb_account_type: 'Expense',
        is_active: true,
      })
    );

    const { error } = await supabase
      .from('category_mapping')
      .insert(defaultMappings);

    if (error) {
      console.error('Error creating default mappings:', error);
      throw error;
    }
  };

  const handleEdit = (mapping: CategoryMapping) => {
    setEditingCategory(mapping.manu_category);
    setEditAccountName(mapping.qb_account_name);
    setEditAccountType(mapping.qb_account_type);
  };

  const handleSave = async () => {
    if (!editingCategory || !editAccountName.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { error } = await supabase
        .from('category_mapping')
        .update({
          qb_account_name: editAccountName.trim(),
          qb_account_type: editAccountType,
        })
        .eq('manu_category', editingCategory);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingCategory(null);
      await loadMappings();
      Alert.alert('Listo', 'Mapeo actualizado correctamente');
    } catch (error) {
      console.error('Error saving mapping:', error);
      Alert.alert('Error', 'No se pudo guardar el mapeo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-[14px] text-[#666666] mt-4">
            Cargando mapeos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-[#E5E5E5]">
        <Text className="text-[18px] font-semibold text-black">
          Mapeo de Categorías
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="p-1 active:opacity-60"
        >
          <X size={24} strokeWidth={1.5} color="#000000" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-4">
          <Text className="text-[13px] text-[#666666] mb-4">
            Personaliza cómo se mapean tus categorías de MANU a cuentas de QuickBooks.
          </Text>

          {mappings.map((mapping) => (
            <View
              key={mapping.id}
              className="mb-4 p-4 border border-[#E5E5E5] rounded-lg"
            >
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-[16px] font-semibold text-black">
                    {CATEGORY_LABELS[mapping.manu_category]}
                  </Text>
                  <Text className="text-[12px] text-[#666666] mt-1">
                    {mapping.qb_account_name}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleEdit(mapping)}
                  className="p-2 active:opacity-60"
                >
                  <ChevronRight size={20} strokeWidth={1.5} color="#9CA3AF" />
                </Pressable>
              </View>

              {editingCategory === mapping.manu_category && (
                <View className="mt-3 pt-3 border-t border-[#E5E5E5]">
                  <Text className="text-[13px] text-[#666666] mb-2">
                    Nombre de cuenta QB
                  </Text>
                  <TextInput
                    className="border border-[#E5E5E5] px-3 py-2 text-[14px] text-black mb-3"
                    value={editAccountName}
                    onChangeText={setEditAccountName}
                    placeholder="Ej: Office Expenses"
                  />

                  <Text className="text-[13px] text-[#666666] mb-2">
                    Tipo de cuenta
                  </Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {QB_ACCOUNT_TYPES.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setEditAccountType(type)}
                        className={`px-4 py-2 rounded-lg border ${
                          editAccountType === type
                            ? 'bg-black border-black'
                            : 'bg-white border-[#E5E5E5]'
                        } active:opacity-80`}
                      >
                        <Text
                          className={`text-[13px] font-medium ${
                            editAccountType === type ? 'text-white' : 'text-black'
                          }`}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View className="flex-row mt-4" style={{ gap: 8 }}>
                    <Pressable
                      onPress={() => setEditingCategory(null)}
                      className="flex-1 py-2 items-center border border-[#E5E5E5] rounded-lg active:opacity-80"
                    >
                      <Text className="text-[14px] font-medium text-black">
                        Cancelar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSave}
                      disabled={saving}
                      className="flex-1 py-2 items-center bg-black rounded-lg active:opacity-80"
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-[14px] font-medium text-white">
                          Guardar
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

