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
import { supabase } from '@/lib/supabase';
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
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'No se pudo identificar el usuario');
      setIsSaving(false);
      return;
    }

    // Insert expense directly to Supabase
    const { data: expenseData, error } = await supabase
      .from('gastos')
      .insert({
        usuario_id: currentUser.id,
        monto: parsedAmount,
        moneda: 'L',
        categoria: category,
        proveedor: provider || 'Sin proveedor',
        fecha: expenseDateStr,
        currency_code: currentUser.currencyCode || 'HNL',
        foto_url: receiptImageUrl || null,
        notas: notes.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setIsSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo guardar el gasto. Revisa tu conexión.');
      return;
    }

    // Send webhook notification (fire-and-forget)
    if (expenseData) {
      fetch('https://n8n.srv1009646.hstgr.cloud/webhook/ea0d35fa-c502-4ded-a618-22ed76af9f20', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      }).catch(err => console.log('n8n sync skipped:', err));
    }

    // Update local store by reloading expenses
    const loadExpenses = useAppStore.getState().loadExpenses;
    await loadExpenses();

    setIsSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
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
              className="flex-row justify-between items-center px-6 pt-4 pb-6"
            >
              <Text className="text-[20px] font-medium text-[#1A1A1A]">
                Nuevo gasto
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="p-2 active:opacity-60"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isSaving || isProcessing}
              >
                <X size={24} strokeWidth={1.5} color="#1A1A1A" />
              </Pressable>
            </Animated.View>

            <View className="px-6">
              {/* OCR Success Message */}
              {showOcrSuccess && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="flex-row items-center bg-[#FAFAFA] p-5 mb-6"
                  style={{ borderWidth: 1, borderColor: '#000000' }}
                >
                  <CheckCircle size={20} strokeWidth={1.5} color="#1A1A1A" />
                  <Text className="text-[14px] font-light text-[#1A1A1A] ml-2 flex-1">
                    Recibo procesado correctamente
                  </Text>
                </Animated.View>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="flex-row items-center bg-[#FAFAFA] p-3 mb-6"
                >
                  <ActivityIndicator size="small" color="#1A1A1A" />
                  <Text className="text-[14px] font-light text-[#666666] ml-2">
                    Analizando recibo...
                  </Text>
                </Animated.View>
              )}

              {/* Photo Options */}
              <Animated.View
                entering={SlideInDown.duration(300).delay(100)}
                style={{ flexDirection: 'row', gap: 8, marginBottom: 24, width: '100%' }}
              >
                {/* Take Photo Button */}
                <Pressable
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 14,
                    gap: 12,
                    backgroundColor: receiptImageUrl ? '#FAFAFA' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#000000',
                  }}
                  onPress={handleTakePhoto}
                  disabled={isSaving || isProcessing}
                >
                  <Camera size={20} strokeWidth={1.5} color="#1A1A1A" />
                  <Text style={{ fontSize: 14, fontWeight: '400', color: '#1A1A1A' }}>
                    Tomar foto
                  </Text>
                </Pressable>

                {/* Pick from Gallery Button */}
                <Pressable
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 14,
                    gap: 12,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#000000',
                  }}
                  onPress={handlePickImage}
                  disabled={isSaving || isProcessing}
                >
                  <ImageIcon size={20} strokeWidth={1.5} color="#1A1A1A" />
                  <Text style={{ fontSize: 14, fontWeight: '400', color: '#1A1A1A' }}>
                    Elegir de galería
                  </Text>
                </Pressable>
              </Animated.View>

              {/* Receipt Status */}
              {receiptImageUrl && !isProcessing && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="flex-row items-center bg-[#FAFAFA] p-3 mb-6"
                >
                  <CheckCircle size={18} strokeWidth={1.5} color="#1A1A1A" />
                  <Text className="text-[13px] font-light text-[#666666] ml-2 flex-1">
                    Foto guardada
                  </Text>
                </Animated.View>
              )}

              {/* Divider */}
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-[1px] bg-[#F0F0F0]" />
                <Text className="px-4 text-[13px] font-light text-[#999999]">
                  {receiptImageUrl ? 'edita los datos' : 'o ingresa manualmente'}
                </Text>
                <View className="flex-1 h-[1px] bg-[#F0F0F0]" />
              </View>

              {/* Amount Input */}
              <Animated.View entering={SlideInDown.duration(300).delay(200)}>
                <Text className="text-[13px] font-light text-[#666666] mb-2">Monto *</Text>
                <View
                  className="p-5 flex-row items-center"
                  style={{
                    borderWidth: 1,
                    borderColor: '#000000',
                  }}
                >
                  <Text className="text-[16px] font-light text-[#1A1A1A] mr-1">
                    {currencySymbol}
                  </Text>
                  <TextInput
                    className="flex-1 text-[16px] font-light text-[#1A1A1A]"
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
                  className="p-5 flex-row items-center justify-between active:opacity-60"
                  style={{ borderWidth: 1, borderColor: '#000000' }}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  disabled={isSaving || isProcessing}
                >
                  <Text
                    className="text-[16px]"
                    style={{ color: category ? '#1A1A1A' : '#999999' }}
                  >
                    {category ? CATEGORY_LABELS[category] : 'Seleccionar'}
                  </Text>
                  <ChevronDown size={20} strokeWidth={1.5} color="#999999" />
                </Pressable>

                {showCategoryPicker && (
                  <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: '#000000' }}>
                    {CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        className="p-5 active:bg-[#FAFAFA]"
                        style={{ borderBottomWidth: 1, borderBottomColor: '#000000' }}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryPicker(false);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Text
                          className="text-[15px]"
                          style={{
                            color: category === cat ? '#1A1A1A' : '#666666',
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
                  className="p-5"
                  style={{
                    borderWidth: 1,
                    borderColor: '#000000',
                  }}
                >
                  <TextInput
                    className="text-[16px] font-light text-[#1A1A1A]"
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
                  className="p-4 flex-row items-center justify-between active:opacity-60"
                  style={{
                    borderWidth: 1,
                    borderColor: '#000000',
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
                    <Text className="text-[16px] font-light text-[#1A1A1A] ml-2">
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
                  className="p-5"
                  style={{
                    borderWidth: 1,
                    borderColor: '#000000',
                  }}
                >
                  <TextInput
                    className="text-[16px] font-light text-[#1A1A1A]"
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
                className="mt-10"
              >
                <Pressable
                  className="py-5 items-center active:opacity-60"
                  style={{
                    backgroundColor: isValid && !isSaving && !isProcessing ? '#1A1A1A' : '#F0F0F0',
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
              borderRadius: 24,
              padding: 24,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-[18px] font-medium text-[#1A1A1A] mb-6">
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
                textColor="#1A1A1A"
                style={{ backgroundColor: '#FFFFFF' }}
              />
            </View>

            <View className="flex-row mt-6" style={{ gap: 16 }}>
              <Pressable
                onPress={() => {
                  setIsDatePickerVisible(false);
                  setTempExpenseDate(expenseDate);
                }}
                className="flex-1 py-3 items-center active:opacity-60"
                style={{ borderWidth: 1, borderColor: '#000000' }}
              >
                <Text className="text-[15px] font-normal text-[#1A1A1A]">
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
