import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { useAppStore, formatMoney } from '@/lib/store';
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
import { format, isToday, isYesterday, parseISO, startOfDay } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { es } from 'date-fns/locale';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { textStyles } from '@/theme/textStyles';

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
  const loadExpenses = useAppStore((s) => s.loadExpenses);
  const currentUser = useAppStore((s) => s.currentUser);
  
  // User currency for consistent formatting
  const userCurrency = currentUser?.currencyCode || 'HNL';

  // Reload expenses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  // Currency symbol for the expense being edited (if any)
  const editingExpenseCurrency = selectedExpense?.currencyCode || userCurrency;
  const editingCurrencySymbol = editingExpenseCurrency === 'USD' ? '$' : 'L';
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredExpenses = searchQuery.trim()
    ? expenses.filter(
        (e) =>
          e.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
          CATEGORY_LABELS[e.category]
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : expenses;

  // Sort by created_at DESC (most recent first)
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Group expenses by creation date
  interface ExpenseGroup {
    dateKey: string; // YYYY-MM-DD
    dateLabel: string; // "HOY", "AYER", or "DD MMM"
    expenses: Expense[];
    subtotal: number;
  }

  const formatDateLabel = (date: Date): string => {
    if (isToday(date)) {
      const dayMonth = format(date, 'd MMM', { locale: es });
      return `HOY - ${dayMonth}`;
    } else if (isYesterday(date)) {
      const dayMonth = format(date, 'd MMM', { locale: es });
      return `AYER - ${dayMonth}`;
    } else {
      const dayName = format(date, 'EEEE', { locale: es });
      const dayMonth = format(date, 'd MMM', { locale: es });
      // Capitalize first letter of day name
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return `${capitalizedDay} - ${dayMonth}`;
    }
  };

  const groupExpensesByDate = (): ExpenseGroup[] => {
    const groups: Map<string, ExpenseGroup> = new Map();

    sortedExpenses.forEach((expense) => {
      // expenseDate viene como string 'YYYY-MM-DD'
      const [year, month, day] = expense.expenseDate.split('-').map(Number);
      const expenseDate = new Date(year, month - 1, day);
      const dateKey = format(startOfDay(expenseDate), 'yyyy-MM-dd');
      const dateLabel = formatDateLabel(startOfDay(expenseDate));

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          dateKey,
          dateLabel,
          expenses: [],
          subtotal: 0,
        });
      }

      const group = groups.get(dateKey)!;
      group.expenses.push(expense);
      group.subtotal += expense.amount;
    });

    // Sort expenses within each group by createdAt DESC (most recent first)
    groups.forEach((group) => {
      group.expenses.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });

    // Convert to array and sort by dateKey DESC (most recent first)
    return Array.from(groups.values()).sort((a, b) => {
      return b.dateKey.localeCompare(a.dateKey);
    });
  };

  const expenseGroups = groupExpensesByDate();

  // Format time as HH:MM AM/PM (English format)
  const formatTime = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'h:mm a'); // No locale to ensure AM/PM in English
  };

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
    
    // Initialize selectedDate from expense date (YYYY-MM-DD to Date)
    // Add 'T12:00:00' to avoid timezone issues
    const expenseDate = selectedExpense.expenseDate 
      ? new Date(selectedExpense.expenseDate + 'T12:00:00')
      : new Date();
    setSelectedDate(expenseDate);

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

    // Convert selectedDate to YYYY-MM-DD format if needed
    const fechaString = editExpenseDate || (selectedDate instanceof Date 
      ? format(selectedDate, 'yyyy-MM-dd')
      : selectedDate);

    const success = await updateExpense(selectedExpense.id, {
      amount: parsedAmount,
      category: editCategory,
      provider: editProvider || 'Sin proveedor',
      notes: editNotes.trim() || undefined,
      expenseDate: fechaString,
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
            <Text style={textStyles.screenTitle}>
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

          <Text style={textStyles.largeNumber} className="mb-1">
            Total: {formatMoney(total, userCurrency)}
          </Text>
          <Text style={textStyles.secondaryText}>
            {filteredExpenses.length} gasto{filteredExpenses.length !== 1 ? 's' : ''}
          </Text>
        </Animated.View>

        {/* Expense List */}
        <FlatList
          data={expenseGroups}
          keyExtractor={(group) => group.dateKey}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View className="mb-6">
              {/* Date Header */}
              <Text style={textStyles.sectionLabel} className="mb-3 mt-2">
                {group.dateLabel}
              </Text>

              {/* Expenses in this group */}
              {group.expenses.map((expense) => (
                <Pressable
                  key={expense.id}
                  onPress={() => openDetailModal(expense)}
                  className="py-2 active:opacity-60"
                >
                  <View className="flex-row">
                    {/* Time column */}
                    <View className="mr-3" style={{ width: 70 }}>
                      <Text style={textStyles.secondaryText}>
                        {formatTime(expense.createdAt)}
                      </Text>
                    </View>

                    {/* Content column */}
                    <View className="flex-1">
                      {/* Provider and amount row */}
                      <View className="flex-row justify-between items-center mb-1">
                        <Text style={textStyles.listItemTitle} className="flex-1">
                          {expense.provider || 'Sin proveedor'}
                        </Text>
                        <Text style={textStyles.listItemAmount} className="ml-2">
                          {formatMoney(expense.amount, expense.currencyCode || userCurrency)}
                        </Text>
                      </View>

                      {/* Category and notes row (indented) */}
                      <View className="flex-row items-center">
                        <Text style={textStyles.secondaryText}>
                          {CATEGORY_LABELS[expense.category]}
                        </Text>
                        {expense.notes && (
                          <>
                            <Text style={textStyles.secondaryText} className="mx-1">•</Text>
                            <Text style={textStyles.secondaryText}>NOTAS</Text>
                          </>
                        )}
                        {expense.receiptImageUrl && (
                          <Receipt
                            size={12}
                            strokeWidth={1.5}
                            color="#999999"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}

              {/* Divider and Subtotal */}
              <View className="flex-row items-center my-2">
                <View className="flex-1 h-[1px] bg-[#E5E5E5]" />
              </View>
              <View className="flex-row justify-end items-center mb-2">
                <Text style={textStyles.secondaryText}>
                  Subtotal: {formatMoney(group.subtotal, userCurrency)}
                </Text>
              </View>
            </View>
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
                      {formatMoney(selectedExpense.amount, selectedExpense.currencyCode || userCurrency)}
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
                      <Text className="text-[16px] text-black mr-1">
                        {editingCurrencySymbol}
                      </Text>
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
                      onPress={() => setShowDatePicker(true)}
                      className="border border-[#E5E5E5] px-4 py-3 flex-row justify-between items-center"
                      disabled={isSaving}
                    >
                      <Text className="text-[16px] text-black">
                        {format(selectedDate, 'dd/MM/yyyy')}
                      </Text>
                      <Calendar size={20} strokeWidth={1.5} color="#999999" />
                    </Pressable>
                  </View>

                  {showDatePicker && Platform.OS === 'ios' && (
                    <View style={{ 
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      marginBottom: 20,
                      paddingVertical: 8,
                      borderRadius: 4
                    }}>
                      <DateTimePicker
                        value={selectedDate instanceof Date ? selectedDate : new Date(selectedDate)}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) => {
                          if (date) {
                            setSelectedDate(date);
                            const fechaString = format(date, 'yyyy-MM-dd');
                            setEditExpenseDate(fechaString);
                            Haptics.selectionAsync();
                          }
                          // Close picker after selection
                          if (event.type === 'set') {
                            setShowDatePicker(false);
                          }
                        }}
                        maximumDate={new Date()}
                        textColor="#000000"
                      />
                    </View>
                  )}
                  {showDatePicker && Platform.OS !== 'ios' && (
                    <DateTimePicker
                      value={selectedDate instanceof Date ? selectedDate : new Date(selectedDate)}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                          setSelectedDate(date);
                          const fechaString = format(date, 'yyyy-MM-dd');
                          setEditExpenseDate(fechaString);
                          Haptics.selectionAsync();
                        }
                      }}
                      maximumDate={new Date()}
                    />
                  )}

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
      </SafeAreaView>
    </View>
  );
}
