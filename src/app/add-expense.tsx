import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Camera, Image as ImageIcon, ChevronDown, CheckCircle, Calendar } from 'lucide-react-native';
import { useAppStore, formatMoney } from '@/lib/store';
import { ExpenseCategory, CATEGORY_LABELS } from '@/lib/types';
import { processReceiptImage } from '@/lib/ocr';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

export default function AddExpenseScreen() {
  const router = useRouter();
  const addExpense = useAppStore((s) => s.addExpense);
  const uploadReceiptImage = useAppStore((s) => s.uploadReceiptImage);
  const currentUser = useAppStore((s) => s.currentUser);

  // Currency symbol based on user's selected currency
  const currencySymbol = currentUser?.currencyCode === 'USD' ? '$' : 'L';

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [provider, setProvider] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [tempExpenseDate, setTempExpenseDate] = useState<Date>(new Date());
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | undefined>();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [providerFocused, setProviderFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [showOcrSuccess, setShowOcrSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara para escanear recibos');
        return;
      }

      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
        exif: false,
      });

      if (result.canceled) {
        setIsProcessing(false);
        return;
      }

      const asset = result.assets[0];
      if (!asset?.base64) {
        console.error('ImagePicker: no base64 returned');
        Alert.alert('Error', 'No se pudo capturar la imagen');
        setIsProcessing(false);
        return;
      }

      console.log('ImagePicker: base64 length:', asset.base64.length);

      // Process OCR
      const ocrResult = await processReceiptImage(asset.base64);

      if (ocrResult) {
        if (ocrResult.amount) {
          setAmount(ocrResult.amount.toString());
        }
        if (ocrResult.category && CATEGORIES.includes(ocrResult.category)) {
          setCategory(ocrResult.category);
        }
        if (ocrResult.vendor) {
          setProvider(ocrResult.vendor);
        }

        setShowOcrSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowOcrSuccess(false), 3000);
      }

      // Upload receipt image in background
      if (currentUser && asset.uri) {
        const imageUrl = await uploadReceiptImage(asset.uri);
        if (imageUrl) {
          setReceiptImageUrl(imageUrl);
          console.log('Receipt image uploaded:', imageUrl);
        }
      }

      if (!ocrResult) {
        Alert.alert('Foto guardada', 'No pudimos leer el recibo. Ingresa los datos manualmente.');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Algo salió mal al procesar la foto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería');
        return;
      }

      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
        exif: false,
      });

      if (result.canceled) {
        setIsProcessing(false);
        return;
      }

      const asset = result.assets[0];
      if (!asset?.base64) {
        Alert.alert('Error', 'No se pudo cargar la imagen');
        setIsProcessing(false);
        return;
      }

      console.log('Gallery picker: base64 length:', asset.base64.length);

      // Process OCR
      const ocrResult = await processReceiptImage(asset.base64);

      if (ocrResult) {
        if (ocrResult.amount) {
          setAmount(ocrResult.amount.toString());
        }
        if (ocrResult.category && CATEGORIES.includes(ocrResult.category)) {
          setCategory(ocrResult.category);
        }
        if (ocrResult.vendor) {
          setProvider(ocrResult.vendor);
        }

        setShowOcrSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowOcrSuccess(false), 3000);
      }

      // Upload receipt image in background
      if (currentUser && asset.uri) {
        const imageUrl = await uploadReceiptImage(asset.uri);
        if (imageUrl) {
          setReceiptImageUrl(imageUrl);
          console.log('Receipt image uploaded:', imageUrl);
        }
      }

      if (!ocrResult) {
        Alert.alert('Foto guardada', 'No pudimos leer el recibo. Ingresa los datos manualmente.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Algo salió mal al procesar la foto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!amount || !category || isSaving) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Convert expenseDate to YYYY-MM-DD string in local timezone
    const year = expenseDate.getFullYear();
    const month = String(expenseDate.getMonth() + 1).padStart(2, '0');
    const day = String(expenseDate.getDate()).padStart(2, '0');
    const expenseDateStr = `${year}-${month}-${day}`;

    const now = new Date();
    const success = await addExpense({
      amount: parsedAmount,
      category,
      provider: provider || 'Sin proveedor',
      expenseDate: expenseDateStr,
      createdAt: now.toISOString(),
      notes: notes.trim() || undefined,
      receiptImageUrl,
    });

    setIsSaving(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo guardar el gasto. Revisa tu conexión.');
    }
  };

  const isValid = amount && category && parseFloat(amount) > 0;

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View
              entering={FadeIn.duration(200)}
              className="flex-row justify-between items-center px-5 pt-4 pb-6"
            >
              <Text className="text-[20px] font-medium text-black">
                Nuevo gasto
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="p-2 active:opacity-60"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isSaving || isProcessing}
              >
                <X size={24} strokeWidth={1.5} color="#000000" />
              </Pressable>
            </Animated.View>

            <View className="px-5">
              {/* OCR Success Message */}
              {showOcrSuccess && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="flex-row items-center bg-[#F5F5F5] p-4 mb-4 border border-[#E5E5E5]"
                >
                  <CheckCircle size={20} strokeWidth={1.5} color="#000000" />
                  <Text className="text-[14px] font-light text-black ml-2 flex-1">
                    Recibo procesado correctamente
                  </Text>
                </Animated.View>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="flex-row items-center bg-[#F5F5F5] p-3 mb-4"
                >
                  <ActivityIndicator size="small" color="#000000" />
                  <Text className="text-[14px] font-light text-[#666666] ml-2">
                    Analizando recibo...
                  </Text>
                </Animated.View>
              )}

              {/* Photo Options */}
              <Animated.View
                entering={SlideInDown.duration(300).delay(100)}
                className="flex-row mb-4"
                style={{ gap: 12 }}
              >
                {/* Take Photo Button */}
                <Pressable
                  className="flex-1 flex-row items-center justify-center border border-[#E5E5E5] py-3.5 active:opacity-60"
                  style={{ gap: 8, backgroundColor: receiptImageUrl ? '#F5F5F5' : '#FFFFFF' }}
                  onPress={handleTakePhoto}
                  disabled={isSaving || isProcessing}
                >
                  <Camera size={20} strokeWidth={1.5} color="#000000" />
                  <Text className="text-[14px] font-normal text-black">
                    Tomar foto
                  </Text>
                </Pressable>

                {/* Pick from Gallery Button */}
                <Pressable
                  className="flex-1 flex-row items-center justify-center border border-[#E5E5E5] py-3.5 active:opacity-60"
                  style={{ gap: 8, backgroundColor: '#FFFFFF' }}
                  onPress={handlePickImage}
                  disabled={isSaving || isProcessing}
                >
                  <ImageIcon size={20} strokeWidth={1.5} color="#000000" />
                  <Text className="text-[14px] font-normal text-black">
                    Elegir de galería
                  </Text>
                </Pressable>
              </Animated.View>

              {/* Receipt Status */}
              {receiptImageUrl && !isProcessing && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="flex-row items-center bg-[#F5F5F5] p-3 mb-4"
                >
                  <CheckCircle size={18} strokeWidth={1.5} color="#000000" />
                  <Text className="text-[13px] font-light text-[#666666] ml-2 flex-1">
                    Foto guardada
                  </Text>
                </Animated.View>
              )}

              {/* Divider */}
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-[1px] bg-[#E5E5E5]" />
                <Text className="px-4 text-[13px] font-light text-[#999999]">
                  {receiptImageUrl ? 'edita los datos' : 'o ingresa manualmente'}
                </Text>
                <View className="flex-1 h-[1px] bg-[#E5E5E5]" />
              </View>

              {/* Amount Input */}
              <Animated.View entering={SlideInDown.duration(300).delay(200)}>
                <Text className="text-[13px] font-light text-[#666666] mb-2">Monto *</Text>
                <View
                  className="border p-4 flex-row items-center"
                  style={{
                    borderColor: amountFocused ? '#000000' : '#E5E5E5',
                  }}
                >
                  <Text className="text-[16px] font-light text-black mr-1">
                    {currencySymbol}
                  </Text>
                  <TextInput
                    className="flex-1 text-[16px] font-light text-black"
                    placeholder="0"
                    placeholderTextColor="#999999"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    onFocus={() => setAmountFocused(true)}
                    onBlur={() => setAmountFocused(false)}
                    style={{ fontFamily: 'System' }}
                    editable={!isSaving && !isProcessing}
                  />
                </View>
              </Animated.View>

              {/* Category Picker */}
              <Animated.View
                entering={SlideInDown.duration(300).delay(300)}
                className="mt-5"
              >
                <Text className="text-[13px] font-light text-[#666666] mb-2">
                  Categoría *
                </Text>
                <Pressable
                  className="border border-[#E5E5E5] p-4 flex-row items-center justify-between active:opacity-60"
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  disabled={isSaving || isProcessing}
                >
                  <Text
                    className="text-[16px]"
                    style={{ color: category ? '#000000' : '#999999' }}
                  >
                    {category ? CATEGORY_LABELS[category] : 'Seleccionar'}
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
                          setCategory(cat);
                          setShowCategoryPicker(false);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Text
                          className="text-[15px]"
                          style={{
                            color: category === cat ? '#000000' : '#666666',
                            fontWeight: category === cat ? '500' : '400',
                          }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Animated.View>

              {/* Provider Input */}
              <Animated.View
                entering={SlideInDown.duration(300).delay(400)}
                className="mt-5"
              >
                <Text className="text-[13px] font-light text-[#666666] mb-2">
                  Proveedor (opcional)
                </Text>
                <View
                  className="border p-4"
                  style={{
                    borderColor: providerFocused ? '#000000' : '#E5E5E5',
                  }}
                >
                  <TextInput
                    className="text-[16px] font-light text-black"
                    placeholder="Nombre del proveedor"
                    placeholderTextColor="#999999"
                    value={provider}
                    onChangeText={setProvider}
                    onFocus={() => setProviderFocused(true)}
                    onBlur={() => setProviderFocused(false)}
                    editable={!isSaving && !isProcessing}
                  />
                </View>
              </Animated.View>

              {/* Expense Date Picker */}
              <Animated.View
                entering={SlideInDown.duration(300).delay(425)}
                className="mt-5"
              >
                <Text className="text-[13px] font-light text-[#666666] mb-2">
                  Fecha del gasto (opcional)
                </Text>
                <Pressable
                  className="border p-4 flex-row items-center justify-between active:opacity-60"
                  style={{
                    borderColor: '#E5E5E5',
                  }}
                  onPress={() => {
                    setTempExpenseDate(expenseDate);
                    setIsDatePickerVisible(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  disabled={isSaving || isProcessing}
                >
                  <View className="flex-row items-center flex-1">
                    <Calendar size={18} strokeWidth={1.5} color="#666666" />
                    <Text className="text-[16px] font-light text-black ml-2">
                      {format(expenseDate, "d 'de' MMMM, yyyy", { locale: es })}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              {/* Notes Input */}
              <Animated.View
                entering={SlideInDown.duration(300).delay(450)}
                className="mt-5"
              >
                <Text className="text-[13px] font-light text-[#666666] mb-2">
                  Notas (opcional)
                </Text>
                <View
                  className="border p-4"
                  style={{
                    borderColor: notesFocused ? '#000000' : '#E5E5E5',
                  }}
                >
                  <TextInput
                    className="text-[16px] font-light text-black"
                    placeholder="Recordatorios, observaciones..."
                    placeholderTextColor="#999999"
                    value={notes}
                    onChangeText={(text) => setNotes(text.slice(0, 500))}
                    onFocus={() => setNotesFocused(true)}
                    onBlur={() => setNotesFocused(false)}
                    editable={!isSaving && !isProcessing}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{ minHeight: 80 }}
                  />
                </View>
                {notes.length > 0 && (
                  <Text className="text-[12px] font-light text-[#999999] mt-1 text-right">
                    {notes.length}/500
                  </Text>
                )}
              </Animated.View>

              {/* Save Button */}
              <Animated.View
                entering={SlideInDown.duration(300).delay(500)}
                className="mt-8"
              >
                <Pressable
                  className="py-4 items-center active:opacity-60"
                  style={{
                    backgroundColor: isValid && !isSaving && !isProcessing ? '#000000' : '#E5E5E5',
                  }}
                  onPress={handleSave}
                  disabled={!isValid || isSaving || isProcessing}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      className="text-[15px] font-normal"
                      style={{ color: isValid && !isProcessing ? '#FFFFFF' : '#999999' }}
                    >
                      Guardar gasto
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            </View>

            <View className="h-8" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Date Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsDatePickerVisible(false);
          setTempExpenseDate(expenseDate);
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
            setIsDatePickerVisible(false);
            setTempExpenseDate(expenseDate);
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
            <Text className="text-[18px] font-medium text-black mb-4">
              Fecha del gasto
            </Text>

            <View style={{ backgroundColor: '#FFFFFF' }}>
              <DateTimePicker
                value={tempExpenseDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setIsDatePickerVisible(false);
                    if (selectedDate) {
                      setExpenseDate(selectedDate);
                      Haptics.selectionAsync();
                    }
                  } else if (selectedDate) {
                    setTempExpenseDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                locale="es-ES"
                textColor="#000000"
                style={{ backgroundColor: '#FFFFFF' }}
              />
            </View>

            <View className="flex-row mt-4" style={{ gap: 12 }}>
              <Pressable
                onPress={() => {
                  setIsDatePickerVisible(false);
                  setTempExpenseDate(expenseDate);
                }}
                className="flex-1 py-3 border border-[#E5E5E5] items-center active:opacity-60"
              >
                <Text className="text-[15px] font-normal text-black">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setExpenseDate(tempExpenseDate);
                  setIsDatePickerVisible(false);
                  Haptics.selectionAsync();
                }}
                className="flex-1 py-3 bg-black items-center active:opacity-80"
              >
                <Text className="text-[15px] font-normal text-white">
                  Guardar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
