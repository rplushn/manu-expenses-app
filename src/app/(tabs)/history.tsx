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
  Download,
  Check,
} from 'lucide-react-native';
import { ExpenseCategory, CATEGORY_LABELS, Expense } from '@/lib/types';
import { format, isToday, isYesterday, parseISO, startOfDay } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { es } from 'date-fns/locale';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { textStyles } from '@/theme/textStyles';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { zip } from 'react-native-zip-archive';

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

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Default: last month
    return date;
  });
  const [exportEndDate, setExportEndDate] = useState<Date>(new Date());
  const [showExportStartPicker, setShowExportStartPicker] = useState(false);
  const [showExportEndPicker, setShowExportEndPicker] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<ExpenseCategory>>(new Set());
  const [includePhotos, setIncludePhotos] = useState(false);
  const [csvFormat, setCsvFormat] = useState<'standard' | 'excel'>('standard');
  const [isExporting, setIsExporting] = useState(false);

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

  // Export functions
  const toggleCategory = (category: ExpenseCategory) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(CATEGORIES));
  };

  const clearAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const escapeCSVField = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    // Escape quotes by doubling them, then wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  const generateCSV = (expensesToExport: Expense[], separator: string = ','): string => {
    // CSV Header
    const headers = ['expenseDate', 'category', 'amount', 'currency', 'provider', 'notes', 'createdAt'];
    const csvRows = [headers.join(separator)];

    // CSV Rows - all fields properly escaped and quoted
    expensesToExport.forEach((expense) => {
      const row = [
        escapeCSVField(expense.expenseDate),
        escapeCSVField(expense.category),
        escapeCSVField(expense.amount),
        escapeCSVField(expense.currencyCode || userCurrency),
        escapeCSVField(expense.provider || ''),
        escapeCSVField(expense.notes || ''),
        escapeCSVField(expense.createdAt),
      ];
      csvRows.push(row.join(separator));
    });

    return csvRows.join('\n');
  };

  const downloadImage = async (imageUrl: string, localPath: string): Promise<boolean> => {
    try {
      const { uri } = await FileSystem.downloadAsync(imageUrl, localPath);
      return !!uri;
    } catch (error) {
      console.error('Error downloading image:', error);
      return false;
    }
  };

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Filter expenses by date range
      const startStr = format(exportStartDate, 'yyyy-MM-dd');
      const endStr = format(exportEndDate, 'yyyy-MM-dd');
      
      let expensesToExport = expenses.filter((expense) => {
        const expenseDateStr = expense.expenseDate;
        return expenseDateStr >= startStr && expenseDateStr <= endStr;
      });

      // Filter by selected categories
      if (selectedCategories.size > 0) {
        expensesToExport = expensesToExport.filter((expense) =>
          selectedCategories.has(expense.category)
        );
      }

      if (expensesToExport.length === 0) {
        Alert.alert('Sin datos', 'No hay gastos en el rango seleccionado');
        setIsExporting(false);
        return;
      }

      // Use documentDirectory for persistent storage
      const documentDir = FileSystem.documentDirectory;
      const cacheDir = FileSystem.cacheDirectory;
      if (!documentDir || !cacheDir) {
        throw new Error('Document or cache directory not available');
      }

      // Generate CSV with appropriate separator
      const separator = csvFormat === 'excel' ? ';' : ',';
      const csvContent = generateCSV(expensesToExport, separator);
      const baseFileName = `gastos_${startStr}_${endStr}`;
      const csvFileName = csvFormat === 'excel' 
        ? `${baseFileName}_excel.csv` 
        : `${baseFileName}.csv`;
      
      const csvFileUri = `${documentDir}${csvFileName}`;

      // Write CSV file
      await FileSystem.writeAsStringAsync(csvFileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('✅ CSV generated:', csvFileUri);
      console.log('📊 Format:', csvFormat, 'Separator:', separator);

      let fileToShare = csvFileUri;
      let mimeType = 'text/csv';
      let photoCount = 0;
      let zipPath: string | null = null;

      // If including photos, download them and create ZIP
      if (includePhotos) {
        const photosDir = `${cacheDir}manu-recibos/`;
        
        // Create photos directory
        const dirInfo = await FileSystem.getInfoAsync(photosDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
        }

        console.log('📸 Starting photo download to:', photosDir);

        // Download photos
        for (let i = 0; i < expensesToExport.length; i++) {
          const expense = expensesToExport[i];
          if (expense.receiptImageUrl) {
            console.log(`📥 Downloading image ${i + 1}/${expensesToExport.length}:`, expense.receiptImageUrl);
            
            const sanitizedProvider = (expense.provider || 'sin_proveedor')
              .replace(/[^a-zA-Z0-9]/g, '_')
              .substring(0, 20);
            const photoFileName = `${i + 1}_${expense.category}_${sanitizedProvider}.jpg`;
            const photoPath = `${photosDir}${photoFileName}`;
            
            try {
              const downloaded = await downloadImage(expense.receiptImageUrl, photoPath);
              if (downloaded) {
                photoCount++;
                console.log(`✅ Downloaded: ${photoFileName}`);
              } else {
                console.warn(`❌ Failed to download: ${photoFileName}`);
              }
            } catch (error) {
              console.error(`❌ Error downloading ${photoFileName}:`, error);
            }
          }
        }

        console.log(`📸 Downloaded ${photoCount} photos out of ${expensesToExport.filter(e => e.receiptImageUrl).length} available`);

        // Create ZIP if we have photos
        if (photoCount > 0) {
          try {
            zipPath = `${cacheDir}manu-recibos.zip`;
            console.log('📦 Creating ZIP file:', zipPath);
            await zip(photosDir, zipPath);
            console.log('✅ ZIP created successfully');
            
            // Clean up the temporary photos directory after zipping
            await FileSystem.deleteAsync(photosDir, { idempotent: true });
            console.log('🗑️ Cleaned up temporary photos directory');
          } catch (error) {
            console.error('❌ Error creating ZIP:', error);
            zipPath = null;
          }
        }
      }

      // Share files using expo-sharing
      if (await Sharing.isAvailableAsync()) {
        // Share CSV first
        await Sharing.shareAsync(fileToShare, {
          mimeType: mimeType,
          dialogTitle: 'Exportar gastos (CSV)',
          UTI: 'public.comma-separated-values-text', // iOS
        });
        
        // Share ZIP if it exists and has photos
        if (zipPath && photoCount > 0) {
          const zipInfo = await FileSystem.getInfoAsync(zipPath);
          if (zipInfo.exists) {
            console.log('📤 Sharing ZIP file:', zipPath);
            await Sharing.shareAsync(zipPath, {
              mimeType: 'application/zip',
              dialogTitle: 'Exportar fotos de recibos (ZIP)',
              UTI: 'public.zip-archive', // iOS
            });
          }
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Show success message
        let message: string;
        if (includePhotos && photoCount > 0 && zipPath) {
          message = `Se exportaron ${expensesToExport.length} gastos y ${photoCount} foto(s) en un archivo ZIP.`;
        } else {
          message = `Se exportaron ${expensesToExport.length} gastos en CSV.`;
        }
        
        Alert.alert('Exportado', message);
        setShowExportModal(false);
      } else {
        Alert.alert('Error', 'La función de compartir no está disponible');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Error', 'No se pudo exportar los gastos');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsExporting(false);
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
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Pressable
                onPress={() => setShowExportModal(true)}
                className="p-2 active:opacity-60"
              >
                <Download size={24} strokeWidth={1.5} color="#000000" />
              </Pressable>
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

        {/* Export Modal */}
        <Modal
          visible={showExportModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowExportModal(false)}
        >
          <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
            >
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-5 pt-4 pb-4 border-b border-[#E5E5E5]">
                  <View className="flex-row justify-between items-center">
                    <Text style={textStyles.screenTitle}>Exportar gastos</Text>
                    <Pressable
                      onPress={() => setShowExportModal(false)}
                      className="p-2 active:opacity-60"
                    >
                      <X size={24} strokeWidth={1.5} color="#000000" />
                    </Pressable>
                  </View>
                </View>

                <View className="px-5 pt-6">
                  {/* Date Range */}
                  <View className="mb-6">
                    <Text className="text-[13px] text-[#666666] mb-2">
                      Rango de fechas
                    </Text>
                    
                    <View className="mb-3">
                      <Text className="text-[12px] text-[#999999] mb-1">Desde</Text>
                      <Pressable
                        onPress={() => setShowExportStartPicker(true)}
                        className="border border-[#E5E5E5] px-4 py-3 flex-row justify-between items-center"
                      >
                        <Text className="text-[16px] text-black">
                          {format(exportStartDate, 'dd/MM/yyyy')}
                        </Text>
                        <Calendar size={20} strokeWidth={1.5} color="#999999" />
                      </Pressable>
                    </View>

                    <View>
                      <Text className="text-[12px] text-[#999999] mb-1">Hasta</Text>
                      <Pressable
                        onPress={() => setShowExportEndPicker(true)}
                        className="border border-[#E5E5E5] px-4 py-3 flex-row justify-between items-center"
                      >
                        <Text className="text-[16px] text-black">
                          {format(exportEndDate, 'dd/MM/yyyy')}
                        </Text>
                        <Calendar size={20} strokeWidth={1.5} color="#999999" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Categories */}
                  <View className="mb-6">
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="text-[13px] text-[#666666]">
                        Categorías
                      </Text>
                      <View className="flex-row" style={{ gap: 8 }}>
                        <Pressable
                          onPress={selectAllCategories}
                          className="px-3 py-1 border border-[#E5E5E5] active:opacity-60"
                        >
                          <Text className="text-[12px] text-black">Todas</Text>
                        </Pressable>
                        <Pressable
                          onPress={clearAllCategories}
                          className="px-3 py-1 border border-[#E5E5E5] active:opacity-60"
                        >
                          <Text className="text-[12px] text-black">Ninguna</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View className="border border-[#E5E5E5]">
                      {CATEGORIES.map((category) => (
                        <Pressable
                          key={category}
                          onPress={() => toggleCategory(category)}
                          className="px-4 py-3 flex-row items-center justify-between border-b border-[#F5F5F5] active:opacity-60"
                        >
                          <Text className="text-[15px] text-black">
                            {CATEGORY_LABELS[category]}
                          </Text>
                          {selectedCategories.has(category) && (
                            <Check size={20} strokeWidth={2} color="#000000" />
                          )}
                        </Pressable>
                      ))}
                    </View>
                    <Text className="text-[12px] text-[#999999] mt-2">
                      {selectedCategories.size === 0
                        ? 'Se exportarán todas las categorías'
                        : `${selectedCategories.size} categoría${selectedCategories.size !== 1 ? 's' : ''} seleccionada${selectedCategories.size !== 1 ? 's' : ''}`}
                    </Text>
                  </View>

                  {/* Include Photos */}
                  <View className="mb-6">
                    <Pressable
                      onPress={() => setIncludePhotos(!includePhotos)}
                      className="flex-row items-center justify-between py-3 border-b border-[#F5F5F5] active:opacity-60"
                    >
                      <View className="flex-1">
                        <Text className="text-[15px] text-black mb-1">
                          Incluir fotos de recibos
                        </Text>
                        <Text className="text-[12px] text-[#999999]">
                          Descargará las fotos en una carpeta separada
                        </Text>
                      </View>
                      <View
                        className="w-10 h-6 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: includePhotos ? '#000000' : '#E5E5E5',
                        }}
                      >
                        <View
                          className="w-5 h-5 rounded-full bg-white"
                          style={{
                            transform: [{ translateX: includePhotos ? 8 : -8 }],
                          }}
                        />
                      </View>
                    </Pressable>
                  </View>

                  {/* CSV Format */}
                  <View className="mb-6">
                    <Text className="text-[13px] text-[#666666] mb-2">
                      Formato CSV
                    </Text>
                    <View className="border border-[#E5E5E5]">
                      <Pressable
                        onPress={() => setCsvFormat('standard')}
                        className="px-4 py-3 flex-row items-center justify-between border-b border-[#F5F5F5] active:opacity-60"
                      >
                        <View className="flex-1">
                          <Text className="text-[15px] text-black">
                            CSV estándar (coma)
                          </Text>
                          <Text className="text-[12px] text-[#999999]">
                            Compatible con la mayoría de aplicaciones
                          </Text>
                        </View>
                        <View
                          className="w-5 h-5 rounded-full border-2 items-center justify-center"
                          style={{
                            borderColor: csvFormat === 'standard' ? '#000000' : '#E5E5E5',
                          }}
                        >
                          {csvFormat === 'standard' && (
                            <View className="w-3 h-3 rounded-full bg-black" />
                          )}
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => setCsvFormat('excel')}
                        className="px-4 py-3 flex-row items-center justify-between active:opacity-60"
                      >
                        <View className="flex-1">
                          <Text className="text-[15px] text-black">
                            CSV para Excel (punto y coma)
                          </Text>
                          <Text className="text-[12px] text-[#999999]">
                            Optimizado para Excel Web (LATAM/España)
                          </Text>
                        </View>
                        <View
                          className="w-5 h-5 rounded-full border-2 items-center justify-center"
                          style={{
                            borderColor: csvFormat === 'excel' ? '#000000' : '#E5E5E5',
                          }}
                        >
                          {csvFormat === 'excel' && (
                            <View className="w-3 h-3 rounded-full bg-black" />
                          )}
                        </View>
                      </Pressable>
                    </View>
                  </View>

                  {/* Export Button */}
                  <View className="mb-8">
                    <Pressable
                      onPress={handleExport}
                      disabled={isExporting}
                      className="py-4 items-center active:opacity-60"
                      style={{
                        backgroundColor: isExporting ? '#E5E5E5' : '#000000',
                      }}
                    >
                      {isExporting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-[15px] font-medium text-white">
                          Exportar
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>

          {/* Date Pickers */}
          {showExportStartPicker && Platform.OS === 'ios' && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E5E5',
                marginBottom: 20,
                paddingVertical: 8,
                borderRadius: 4,
              }}
            >
              <DateTimePicker
                value={exportStartDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setExportStartDate(date);
                    Haptics.selectionAsync();
                  }
                  if (event.type === 'set') {
                    setShowExportStartPicker(false);
                  }
                }}
                maximumDate={exportEndDate}
                textColor="#000000"
              />
            </View>
          )}
          {showExportStartPicker && Platform.OS !== 'ios' && (
            <DateTimePicker
              value={exportStartDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowExportStartPicker(false);
                if (date) {
                  setExportStartDate(date);
                  Haptics.selectionAsync();
                }
              }}
              maximumDate={exportEndDate}
            />
          )}

          {showExportEndPicker && Platform.OS === 'ios' && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E5E5',
                marginBottom: 20,
                paddingVertical: 8,
                borderRadius: 4,
              }}
            >
              <DateTimePicker
                value={exportEndDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setExportEndDate(date);
                    Haptics.selectionAsync();
                  }
                  if (event.type === 'set') {
                    setShowExportEndPicker(false);
                  }
                }}
                minimumDate={exportStartDate}
                maximumDate={new Date()}
                textColor="#000000"
              />
            </View>
          )}
          {showExportEndPicker && Platform.OS !== 'ios' && (
            <DateTimePicker
              value={exportEndDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowExportEndPicker(false);
                if (date) {
                  setExportEndDate(date);
                  Haptics.selectionAsync();
                }
              }}
              minimumDate={exportStartDate}
              maximumDate={new Date()}
            />
          )}
        </Modal>
      </SafeAreaView>
    </View>
  );
}
