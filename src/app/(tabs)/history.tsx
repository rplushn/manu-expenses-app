import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/lib/store';
import {
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Edit3,
  Receipt,
  Calendar,
} from 'lucide-react-native';
import { ExpenseCategory, CATEGORY_LABELS, Expense } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

const CATEGORIES: ExpenseCategory[] = [
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

export default function HistoryScreen() {
  const expenses = useAppStore((s) => s.expenses);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const updateExpense = useAppStore((s) => s.updateExpense);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Edit form state
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory | null>(null);
  const [editProvider, setEditProvider] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editExpenseDate, setEditExpenseDate] = useState<string>(''); // YYYY-MM-DD format
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditDatePickerVisible, setIsEditDatePickerVisible] = useState(false);
  const [tempEditExpenseDate, setTempEditExpenseDate] = useState<Date>(new Date());

  const filteredExpenses = searchQuery.trim()
    ? expenses.filter(
        (e) =>
          e.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
          CATEGORY_LABELS[e.category]
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : expenses;

  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Eliminar gasto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        onPress: async () => {
          const success = await removeExpense(id);
          if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowDetailModal(false);
            setSelectedExpense(null);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const openDetailModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEditModal = () => {
    if (!selectedExpense) return;
    setEditAmount(selectedExpense.amount.toString());
    setEditCategory(selectedExpense.category);
    setEditProvider(selectedExpense.provider);
    setEditNotes(selectedExpense.notes || '');

    // Keep expense_date as YYYY-MM-DD string
    setEditExpenseDate(selectedExpense.expenseDate);

    setShowDetailModal(false);
    setShowEditModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveEdit = async () => {
    if (!selectedExpense || !editAmount || !editCategory || isSaving) return;

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // editExpenseDate is already in YYYY-MM-DD format
    const success = await updateExpense(selectedExpense.id, {
      amount: parsedAmount,
      category: editCategory,
      provider: editProvider || 'Sin proveedor',
      notes: editNotes.trim() || undefined,
      expenseDate: editExpenseDate,
    });

    setIsSaving(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditModal(false);
      setSelectedExpense(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo actualizar el gasto');
    }
  };

  // Format date from YYYY-MM-DD string to display format
  const formatDate = (dateStr: string) => {
    // Parse YYYY-MM-DD as local date (not UTC)
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
  };

  const isEditValid =
    editAmount && editCategory && parseFloat(editAmount) > 0;

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(200)}
          className="px-5 pt-4 pb-4"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[24px] font-semibold text-black">
              Historial
            </Text>
            <Pressable
              onPress={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
              className="p-2 active:opacity-60"
            >
              {showSearch ? (
                <X size={24} strokeWidth={1.5} color="#000000" />
              ) : (
                <Search size={24} strokeWidth={1.5} color="#000000" />
              )}
            </Pressable>
          </View>

          {showSearch && (
            <Animated.View entering={FadeIn.duration(200)} className="mb-4">
              <View className="border border-[#E5E5E5] p-3 flex-row items-center">
                <Search size={18} strokeWidth={1.5} color="#999999" />
                <TextInput
                  className="flex-1 ml-2 text-[15px] text-black"
                  placeholder="Buscar por proveedor..."
                  placeholderTextColor="#999999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
            </Animated.View>
          )}

          <Text className="text-[20px] font-semibold text-black mb-1">
            Total: L {total.toFixed(2)}
          </Text>
          <Text className="text-[14px] text-[#666666]">
            {filteredExpenses.length} gasto{filteredExpenses.length !== 1 ? 's' : ''}
          </Text>
        </Animated.View>

        {/* Expense List */}
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openDetailModal(item)}
              className="flex-row justify-between items-center py-4 border-b border-[#E5E5E5] active:opacity-60"
            >
              <View className="flex-1">
                <Text className="text-[16px] font-medium text-black mb-1">
                  {item.provider || 'Sin proveedor'}
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-[13px] text-[#999999]">
                    {CATEGORY_LABELS[item.category]}
                  </Text>
                  {item.notes && (
                    <View className="ml-2 px-1.5 py-0.5 bg-[#F5F5F5]">
                      <Text className="text-[10px] text-[#666666]">NOTAS</Text>
                    </View>
                  )}
                  {item.receiptImageUrl && (
                    <Receipt
                      size={12}
                      strokeWidth={1.5}
                      color="#999999"
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
              </View>

              <Text className="text-[16px] font-semibold text-black mr-2">
                L {item.amount.toFixed(2)}
              </Text>
              <ChevronRight size={18} strokeWidth={1.5} color="#CCCCCC" />
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-[16px] text-[#666666]">
                {searchQuery ? 'Sin resultados' : 'Sin gastos'}
              </Text>
            </View>
          }
        />

        {/* Detail Modal */}
        <Modal
          visible={showDetailModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowDetailModal(false);
            setSelectedExpense(null);
          }}
        >
          <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            {selectedExpense && (
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View className="flex-row justify-between items-center px-5 pt-4 pb-6">
                  <Text className="text-[20px] font-semibold text-black">
                    Detalle del gasto
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowDetailModal(false);
                      setSelectedExpense(null);
                    }}
                    className="p-2 active:opacity-60"
                  >
                    <X size={24} strokeWidth={1.5} color="#000000" />
                  </Pressable>
                </View>

                <View className="px-5">
                  {/* Amount */}
                  <View className="mb-6">
                    <Text className="text-[13px] text-[#666666] mb-1">Monto</Text>
                    <Text className="text-[32px] font-semibold text-black">
                      L {selectedExpense.amount.toFixed(2)}
                    </Text>
                  </View>

                  {/* Category */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-1">
                      Categoría
                    </Text>
                    <Text className="text-[16px] text-black">
                      {CATEGORY_LABELS[selectedExpense.category]}
                    </Text>
                  </View>

                  {/* Provider */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-1">
                      Proveedor
                    </Text>
                    <Text className="text-[16px] text-black">
                      {selectedExpense.provider || 'Sin proveedor'}
                    </Text>
                  </View>

                  {/* Date & Time */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-1">
                      Fecha y hora
                    </Text>
                    <Text className="text-[16px] text-black">
                      {formatDate(selectedExpense.expenseDate)} a las{' '}
                      {new Date(selectedExpense.createdAt).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </Text>
                  </View>

                  {/* Notes */}
                  {selectedExpense.notes && (
                    <View className="mb-5">
                      <Text className="text-[13px] text-[#666666] mb-1">
                        Notas
                      </Text>
                      <View className="bg-[#F5F5F5] p-4">
                        <Text className="text-[15px] text-black leading-5">
                          {selectedExpense.notes}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Receipt Image */}
                  {selectedExpense.receiptImageUrl && (
                    <View className="mb-6">
                      <Text className="text-[13px] text-[#666666] mb-2">
                        Foto del recibo
                      </Text>
                      <View className="border border-[#E5E5E5] overflow-hidden">
                        <Image
                          source={{ uri: selectedExpense.receiptImageUrl }}
                          style={{ width: '100%', height: 300 }}
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="flex-row mt-4 mb-8">
                    <Pressable
                      onPress={openEditModal}
                      className="flex-1 py-4 bg-black items-center mr-2 active:opacity-80"
                    >
                      <View className="flex-row items-center">
                        <Edit3
                          size={18}
                          strokeWidth={1.5}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[15px] font-medium text-white">
                          Editar
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(selectedExpense.id)}
                      className="flex-1 py-4 border border-[#DC2626] items-center ml-2 active:opacity-80"
                    >
                      <View className="flex-row items-center">
                        <Trash2
                          size={18}
                          strokeWidth={1.5}
                          color="#DC2626"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[15px] font-medium text-[#DC2626]">
                          Eliminar
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* Edit Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowEditModal(false);
            setSelectedExpense(null);
          }}
        >
          <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
            >
              <ScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Modal Header */}
                <View className="flex-row justify-between items-center px-5 pt-4 pb-6">
                  <Text className="text-[20px] font-semibold text-black">
                    Editar gasto
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowEditModal(false);
                      setSelectedExpense(null);
                    }}
                    className="p-2 active:opacity-60"
                    disabled={isSaving}
                  >
                    <X size={24} strokeWidth={1.5} color="#000000" />
                  </Pressable>
                </View>

                <View className="px-5">
                  {/* Amount Input */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-2">
                      Monto *
                    </Text>
                    <View className="border border-[#E5E5E5] p-4 flex-row items-center">
                      <Text className="text-[16px] text-black mr-1">L</Text>
                      <TextInput
                        className="flex-1 text-[16px] text-black"
                        placeholder="0"
                        placeholderTextColor="#999999"
                        keyboardType="decimal-pad"
                        value={editAmount}
                        onChangeText={setEditAmount}
                        editable={!isSaving}
                      />
                    </View>
                  </View>

                  {/* Category Picker */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-2">
                      Categoría *
                    </Text>
                    <Pressable
                      className="border border-[#E5E5E5] p-4 flex-row items-center justify-between active:opacity-60"
                      onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                      disabled={isSaving}
                    >
                      <Text
                        className="text-[16px]"
                        style={{ color: editCategory ? '#000000' : '#999999' }}
                      >
                        {editCategory
                          ? CATEGORY_LABELS[editCategory]
                          : 'Seleccionar'}
                      </Text>
                      <ChevronDown size={20} strokeWidth={1.5} color="#999999" />
                    </Pressable>

                    {showCategoryPicker && (
                      <View className="border border-t-0 border-[#E5E5E5]">
                        {CATEGORIES.map((cat) => (
                          <Pressable
                            key={cat}
                            className="p-4 border-b border-[#F5F5F5] active:bg-[#F5F5F5]"
                            onPress={() => {
                              setEditCategory(cat);
                              setShowCategoryPicker(false);
                              Haptics.selectionAsync();
                            }}
                          >
                            <Text
                              className="text-[15px]"
                              style={{
                                color: editCategory === cat ? '#000000' : '#666666',
                                fontWeight: editCategory === cat ? '500' : '400',
                              }}
                            >
                              {CATEGORY_LABELS[cat]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Provider Input */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-2">
                      Proveedor (opcional)
                    </Text>
                    <View className="border border-[#E5E5E5] p-4">
                      <TextInput
                        className="text-[16px] text-black"
                        placeholder="Nombre del proveedor"
                        placeholderTextColor="#999999"
                        value={editProvider}
                        onChangeText={setEditProvider}
                        editable={!isSaving}
                      />
                    </View>
                  </View>

                  {/* Expense Date Picker */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-2">
                      Fecha del gasto *
                    </Text>
                    <Pressable
                      className="border p-4 flex-row items-center justify-between active:opacity-60"
                      style={{
                        borderColor: '#E5E5E5',
                      }}
                      onPress={() => {
                        // Convert YYYY-MM-DD string to Date object in local timezone
                        if (editExpenseDate) {
                          const [year, month, day] = editExpenseDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          setTempEditExpenseDate(date);
                        } else {
                          setTempEditExpenseDate(new Date());
                        }
                        setIsEditDatePickerVisible(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      disabled={isSaving}
                    >
                      <View className="flex-row items-center flex-1">
                        <Calendar size={18} strokeWidth={1.5} color="#666666" />
                        <Text className="text-[16px] text-black ml-2">
                          {editExpenseDate ? (() => {
                            const [year, month, day] = editExpenseDate.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            return format(date, "d 'de' MMMM, yyyy", { locale: es });
                          })() : 'Seleccionar fecha'}
                        </Text>
                      </View>
                    </Pressable>
                  </View>

                  {/* Notes Input */}
                  <View className="mb-5">
                    <Text className="text-[13px] text-[#666666] mb-2">
                      Notas (opcional)
                    </Text>
                    <View className="border border-[#E5E5E5] p-4">
                      <TextInput
                        className="text-[16px] text-black"
                        placeholder="Recordatorios, observaciones..."
                        placeholderTextColor="#999999"
                        value={editNotes}
                        onChangeText={(text) => setEditNotes(text.slice(0, 500))}
                        editable={!isSaving}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        style={{ minHeight: 80 }}
                      />
                    </View>
                    {editNotes.length > 0 && (
                      <Text className="text-[12px] text-[#999999] mt-1 text-right">
                        {editNotes.length}/500
                      </Text>
                    )}
                  </View>

                  {/* Save Button */}
                  <View className="mt-4 mb-8">
                    <Pressable
                      className="py-4 items-center active:opacity-60"
                      style={{
                        backgroundColor:
                          isEditValid && !isSaving ? '#000000' : '#E5E5E5',
                      }}
                      onPress={handleSaveEdit}
                      disabled={!isEditValid || isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text
                          className="text-[15px] font-medium"
                          style={{
                            color: isEditValid ? '#FFFFFF' : '#999999',
                          }}
                        >
                          Guardar cambios
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>

        {/* Date Picker Modal for Edit */}
        <Modal
          visible={isEditDatePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setIsEditDatePickerVisible(false);
            // Reset temp date to current editExpenseDate
            if (editExpenseDate) {
              const [year, month, day] = editExpenseDate.split('-').map(Number);
              setTempEditExpenseDate(new Date(year, month - 1, day));
            }
          }}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              setIsEditDatePickerVisible(false);
              // Reset temp date
              if (editExpenseDate) {
                const [year, month, day] = editExpenseDate.split('-').map(Number);
                setTempEditExpenseDate(new Date(year, month - 1, day));
              }
            }}
          >
            <Pressable
              style={{
                width: '90%',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-[18px] font-semibold text-black mb-4">
                Fecha del gasto
              </Text>

              {Platform.OS === 'web' ? (
                // Web: Use HTML5 date input
                <View className="mb-4">
                  <TextInput
                    className="border border-[#E5E5E5] p-4 text-[16px] text-black"
                    value={editExpenseDate}
                    onChange={(e: any) => {
                      // On web, TextInput can receive native events
                      const value = e.target?.value || e.nativeEvent?.text;
                      if (value) {
                        setEditExpenseDate(value);
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999999"
                    // @ts-ignore - type prop works on web via react-native-web
                    type="date"
                    // @ts-ignore - max prop works on web
                    max={new Date().toISOString().split('T')[0]}
                    style={{
                      outlineStyle: 'none',
                    }}
                  />
                </View>
              ) : (
                // Native: Use DateTimePicker
                <View style={{ backgroundColor: '#FFFFFF' }}>
                  <DateTimePicker
                    value={tempEditExpenseDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setIsEditDatePickerVisible(false);
                        if (selectedDate) {
                          // Convert Date to YYYY-MM-DD string in local timezone
                          const year = selectedDate.getFullYear();
                          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                          const day = String(selectedDate.getDate()).padStart(2, '0');
                          setEditExpenseDate(`${year}-${month}-${day}`);
                          Haptics.selectionAsync();
                        }
                      } else if (selectedDate) {
                        setTempEditExpenseDate(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                    locale="es-ES"
                    textColor="#000000"
                    style={{ backgroundColor: '#FFFFFF' }}
                  />
                </View>
              )}

              <View className="flex-row mt-4" style={{ gap: 12 }}>
                <Pressable
                  onPress={() => {
                    setIsEditDatePickerVisible(false);
                    // Reset temp date
                    if (editExpenseDate) {
                      const [year, month, day] = editExpenseDate.split('-').map(Number);
                      setTempEditExpenseDate(new Date(year, month - 1, day));
                    }
                  }}
                  className="flex-1 py-3 border border-[#E5E5E5] items-center active:opacity-60"
                >
                  <Text className="text-[15px] font-medium text-black">
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      // Native: Convert Date to YYYY-MM-DD string in local timezone
                      const year = tempEditExpenseDate.getFullYear();
                      const month = String(tempEditExpenseDate.getMonth() + 1).padStart(2, '0');
                      const day = String(tempEditExpenseDate.getDate()).padStart(2, '0');
                      setEditExpenseDate(`${year}-${month}-${day}`);
                    }
                    // Web: editExpenseDate is already set by the input
                    setIsEditDatePickerVisible(false);
                    Haptics.selectionAsync();
                  }}
                  className="flex-1 py-3 bg-black items-center active:opacity-80"
                >
                  <Text className="text-[15px] font-medium text-white">
                    Guardar
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
