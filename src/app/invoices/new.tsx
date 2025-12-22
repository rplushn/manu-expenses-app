import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Plus, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { CreateInvoiceItem } from '@/lib/invoice-types';
import {
  incrementInvoiceNumber,
  isInvoiceNumberInRange,
  checkCAIExpiration,
  calculateLineTotal,
  calculateInvoiceTotals,
  formatCurrency,
} from '@/lib/invoice-helpers';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface LineItem {
  id: string;
  quantity: string;
  description: string;
  unit_price: string;
}

export default function NewInvoiceScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  // Invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientRtn, setClientRtn] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', quantity: '', description: '', unit_price: '' },
  ]);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize invoice number and check CAI
  useEffect(() => {
    if (currentUser?.facturaProximoNumero) {
      setInvoiceNumber(currentUser.facturaProximoNumero);

      // Check if invoice number is within range
      if (currentUser.facturaRangoInicio && currentUser.facturaRangoFin) {
        const inRange = isInvoiceNumberInRange(
          currentUser.facturaProximoNumero,
          currentUser.facturaRangoInicio,
          currentUser.facturaRangoFin
        );

        if (!inRange) {
          Alert.alert(
            'Rango de facturas agotado',
            'El próximo número de factura está fuera del rango autorizado. Por favor, actualiza tu rango en el perfil.',
            [{ text: 'OK' }]
          );
        }
      }
    }

    // Check CAI expiration
    if (currentUser?.caiFechaVencimiento) {
      const { isExpired, daysUntilExpiry, isExpiringSoon } = checkCAIExpiration(
        currentUser.caiFechaVencimiento
      );

      if (isExpired) {
        Alert.alert(
          'CAI Vencido',
          'Tu CAI ha vencido. No puedes crear facturas hasta que actualices tu CAI en el perfil.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (isExpiringSoon) {
        Alert.alert(
          'CAI por vencer',
          `Tu CAI vence en ${daysUntilExpiry} días. Considera renovarlo pronto.`,
          [{ text: 'Entendido' }]
        );
      }
    }
  }, [currentUser, router]);

  // Add new line item
  const handleAddLineItem = () => {
    Haptics.selectionAsync();
    const newId = (lineItems.length + 1).toString();
    setLineItems([...lineItems, { id: newId, quantity: '', description: '', unit_price: '' }]);
  };

  // Remove line item
  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) {
      Alert.alert('Error', 'Debe haber al menos un artículo');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const validItems = lineItems
      .filter((item) => item.quantity && item.unit_price)
      .map((item) => ({
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price),
      }));

    const taxRate = currentUser?.tasaImpuesto || 0.15;
    const discPct = discountType === 'percentage' && discountPercentage ? parseFloat(discountPercentage) : undefined;
    const discAmt = discountType === 'amount' && discountAmount ? parseFloat(discountAmount) : undefined;
    
    return calculateInvoiceTotals(validItems, taxRate, discPct, discAmt);
  };

  const { subtotal, discount, taxableAmount, taxAmount, total } = calculateTotals();

  // Validate form
  const validateForm = (): string | null => {
    if (!clientName.trim()) {
      return 'El nombre del cliente es requerido';
    }

    if (lineItems.length === 0) {
      return 'Debe agregar al menos un artículo';
    }

    const hasValidItem = lineItems.some(
      (item) => item.quantity && item.description.trim() && item.unit_price
    );

    if (!hasValidItem) {
      return 'Debe completar al menos un artículo con cantidad, descripción y precio';
    }

    for (const item of lineItems) {
      if (item.quantity || item.description.trim() || item.unit_price) {
        if (!item.quantity) return 'Complete la cantidad del artículo';
        if (!item.description.trim()) return 'Complete la descripción del artículo';
        if (!item.unit_price) return 'Complete el precio del artículo';

        const qty = parseInt(item.quantity, 10);
        const price = parseFloat(item.unit_price);

        if (isNaN(qty) || qty <= 0) return 'La cantidad debe ser un número positivo';
        if (isNaN(price) || price < 0) return 'El precio debe ser un número válido';
      }
    }

    if (total <= 0) {
      return 'El total debe ser mayor a cero';
    }

    return null;
  };

  // Save invoice
  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error de validación', validationError);
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const invoiceDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Insert invoice
      // Ensure discount values are valid numbers or 0
      const discPct = discountType === 'percentage' && discountPercentage 
        ? parseFloat(discountPercentage) || 0 
        : 0;
      const discAmt = discountType === 'amount' && discountAmount 
        ? parseFloat(discountAmount) || 0 
        : 0;

      // Prepare invoice data
      const invoicePayload = {
        user_id: currentUser.id,
        invoice_number: invoiceNumber,
        client_name: clientName.trim(),
        client_rtn: clientRtn.trim() || null,
        client_address: clientAddress.trim() || null,
        invoice_date: invoiceDate,
        subtotal: Number(subtotal.toFixed(2)),
        discount_percentage: Number(discPct.toFixed(2)),
        discount_amount: Number(discAmt.toFixed(2)),
        tax_amount: Number(taxAmount.toFixed(2)),
        total: Number(total.toFixed(2)),
      };

      console.log('📝 Creating invoice with payload:', invoicePayload);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select()
        .single();

      if (invoiceError) {
        console.error('❌ Invoice creation error:', {
          message: invoiceError.message,
          details: invoiceError.details,
          hint: invoiceError.hint,
          code: invoiceError.code,
        });
        throw invoiceError;
      }

      console.log('✅ Invoice created successfully:', invoiceData.id);

      // Insert invoice items
      const validItems = lineItems
        .filter((item) => item.quantity && item.description.trim() && item.unit_price)
        .map((item) => ({
          invoice_id: invoiceData.id,
          quantity: parseInt(item.quantity, 10),
          description: item.description.trim(),
          unit_price: parseFloat(item.unit_price),
          total: calculateLineTotal(parseInt(item.quantity, 10), parseFloat(item.unit_price)),
        }));

      console.log('📦 Inserting invoice items:', validItems.length, 'items');

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(validItems);

      if (itemsError) {
        console.error('❌ Invoice items error:', {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
        });
        throw itemsError;
      }

      console.log('✅ Invoice items inserted successfully');

      // Update next invoice number
      const nextInvoiceNumber = incrementInvoiceNumber(invoiceNumber);
      console.log('🔢 Updating next invoice number:', nextInvoiceNumber);
      
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ factura_proximo_numero: nextInvoiceNumber })
        .eq('id', currentUser.id);

      if (updateError) {
        console.error('❌ Usuario update error:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        });
        throw updateError;
      }

      console.log('✅ Next invoice number updated');

      // Update local state
      setCurrentUser({
        ...currentUser,
        facturaProximoNumero: nextInvoiceNumber,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Éxito', 'Factura creada correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('❌ Error creating invoice:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Detailed error message for debugging
      let errorMessage = 'No se pudo crear la factura.';
      
      if (error?.message) {
        errorMessage += `\n\nError: ${error.message}`;
      }
      
      if (error?.details) {
        errorMessage += `\n\nDetalles: ${error.details}`;
      }
      
      if (error?.hint) {
        errorMessage += `\n\nSugerencia: ${error.hint}`;
      }
      
      if (error?.code) {
        errorMessage += `\n\nCódigo: ${error.code}`;
      }
      
      console.log('📋 Full error details:', JSON.stringify(error, null, 2));
      
      Alert.alert('Error al crear factura', errorMessage, [
        { text: 'OK', style: 'cancel' }
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = clientName.trim() && lineItems.some(
    (item) => item.quantity && item.description.trim() && item.unit_price
  );

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <Animated.View
            entering={FadeIn.duration(200)}
            className="flex-row justify-between items-center px-5 pt-4 pb-6 border-b border-[#E5E5E5]"
          >
            <Text className="text-[20px] font-semibold text-black">
              Nueva Factura
            </Text>
            <Pressable
              onPress={() => router.back()}
              className="p-2 active:opacity-60"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isSaving}
            >
              <X size={24} strokeWidth={1.5} color="#000000" />
            </Pressable>
          </Animated.View>

          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="px-5 pt-6">
              {/* Invoice Number */}
              <View className="mb-5">
                <Text className="text-[13px] text-[#666666] mb-2">
                  Número de factura
                </Text>
                <View className="border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-3">
                  <Text className="text-[16px] text-[#666666]">
                    {invoiceNumber || 'Sin configurar'}
                  </Text>
                </View>
              </View>

              {/* Client Name */}
              <View className="mb-5">
                <Text className="text-[13px] text-[#666666] mb-2">
                  Nombre del cliente *
                </Text>
                <TextInput
                  className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="Nombre completo o empresa"
                  placeholderTextColor="#999999"
                  editable={!isSaving}
                  maxLength={100}
                />
              </View>

              {/* Client RTN */}
              <View className="mb-5">
                <Text className="text-[13px] text-[#666666] mb-2">
                  RTN del cliente (opcional)
                </Text>
                <TextInput
                  className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                  value={clientRtn}
                  onChangeText={setClientRtn}
                  placeholder="0801199012345"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  editable={!isSaving}
                  maxLength={13}
                />
              </View>

              {/* Client Address */}
              <View className="mb-5">
                <Text className="text-[13px] text-[#666666] mb-2">
                  Dirección del cliente (opcional)
                </Text>
                <TextInput
                  className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                  value={clientAddress}
                  onChangeText={setClientAddress}
                  placeholder="Dirección completa"
                  placeholderTextColor="#999999"
                  editable={!isSaving}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  style={{ minHeight: 60 }}
                />
              </View>

              {/* Discount */}
              <View className="mb-5">
                <Text className="text-[13px] text-[#666666] mb-2">
                  Descuento (opcional)
                </Text>
                <View className="flex-row mb-2" style={{ gap: 8 }}>
                  <Pressable
                    className="flex-1 py-2 border items-center active:opacity-60"
                    style={{
                      borderColor: '#E5E5E5',
                      backgroundColor: discountType === 'percentage' ? '#000000' : '#FFFFFF',
                    }}
                    onPress={() => {
                      setDiscountType('percentage');
                      setDiscountAmount('');
                    }}
                    disabled={isSaving}
                  >
                    <Text
                      className="text-[14px]"
                      style={{ color: discountType === 'percentage' ? '#FFFFFF' : '#000000' }}
                    >
                      Porcentaje
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 py-2 border items-center active:opacity-60"
                    style={{
                      borderColor: '#E5E5E5',
                      backgroundColor: discountType === 'amount' ? '#000000' : '#FFFFFF',
                    }}
                    onPress={() => {
                      setDiscountType('amount');
                      setDiscountPercentage('');
                    }}
                    disabled={isSaving}
                  >
                    <Text
                      className="text-[14px]"
                      style={{ color: discountType === 'amount' ? '#FFFFFF' : '#000000' }}
                    >
                      Monto fijo
                    </Text>
                  </Pressable>
                </View>
                {discountType === 'percentage' ? (
                  <TextInput
                    className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                    value={discountPercentage}
                    onChangeText={setDiscountPercentage}
                    placeholder="0"
                    placeholderTextColor="#999999"
                    keyboardType="decimal-pad"
                    editable={!isSaving}
                    maxLength={5}
                  />
                ) : (
                  <TextInput
                    className="border border-[#E5E5E5] px-4 py-3 text-[16px] text-black"
                    value={discountAmount}
                    onChangeText={setDiscountAmount}
                    placeholder="0.00"
                    placeholderTextColor="#999999"
                    keyboardType="decimal-pad"
                    editable={!isSaving}
                  />
                )}
                {discount > 0 && (
                  <Text className="text-[12px] text-[#999999] mt-1">
                    Descuento aplicado: {formatCurrency(discount)}
                  </Text>
                )}
              </View>

              {/* Divider */}
              <View className="my-4 border-t border-[#E5E5E5]" />
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-[15px] font-medium text-black">
                  Artículos
                </Text>
                <Pressable
                  onPress={handleAddLineItem}
                  className="flex-row items-center active:opacity-60"
                  disabled={isSaving}
                >
                  <Plus size={18} strokeWidth={1.5} color="#000000" />
                  <Text className="text-[14px] text-black ml-1">Agregar</Text>
                </Pressable>
              </View>

              {/* Line Items */}
              {lineItems.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={SlideInDown.duration(300).delay(index * 50)}
                  className="mb-4 border border-[#E5E5E5] p-4"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-[14px] font-medium text-black">
                      Artículo {index + 1}
                    </Text>
                    {lineItems.length > 1 && (
                      <Pressable
                        onPress={() => handleRemoveLineItem(item.id)}
                        className="p-1 active:opacity-60"
                        disabled={isSaving}
                      >
                        <Trash2 size={18} strokeWidth={1.5} color="#DC2626" />
                      </Pressable>
                    )}
                  </View>

                  <View className="mb-3">
                    <Text className="text-[12px] text-[#666666] mb-1">
                      Descripción *
                    </Text>
                    <TextInput
                      className="border border-[#E5E5E5] px-3 py-2 text-[15px] text-black"
                      value={item.description}
                      onChangeText={(value) =>
                        updateLineItem(item.id, 'description', value)
                      }
                      placeholder="Producto o servicio"
                      placeholderTextColor="#999999"
                      editable={!isSaving}
                    />
                  </View>

                  <View className="flex-row" style={{ gap: 8 }}>
                    <View className="flex-1">
                      <Text className="text-[12px] text-[#666666] mb-1">
                        Cantidad *
                      </Text>
                      <TextInput
                        className="border border-[#E5E5E5] px-3 py-2 text-[15px] text-black"
                        value={item.quantity}
                        onChangeText={(value) =>
                          updateLineItem(item.id, 'quantity', value)
                        }
                        placeholder="1"
                        placeholderTextColor="#999999"
                        keyboardType="numeric"
                        editable={!isSaving}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[12px] text-[#666666] mb-1">
                        Precio unitario *
                      </Text>
                      <TextInput
                        className="border border-[#E5E5E5] px-3 py-2 text-[15px] text-black"
                        value={item.unit_price}
                        onChangeText={(value) =>
                          updateLineItem(item.id, 'unit_price', value)
                        }
                        placeholder="0.00"
                        placeholderTextColor="#999999"
                        keyboardType="decimal-pad"
                        editable={!isSaving}
                      />
                    </View>
                  </View>

                  {item.quantity && item.unit_price && (
                    <View className="mt-2 pt-2 border-t border-[#F5F5F5]">
                      <Text className="text-[13px] text-[#666666]">
                        Total: {formatCurrency(
                          calculateLineTotal(
                            parseInt(item.quantity, 10) || 0,
                            parseFloat(item.unit_price) || 0
                          )
                        )}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              ))}

              {/* Totals */}
              <View className="mt-4 border-t border-[#E5E5E5] pt-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[15px] text-[#666666]">Subtotal</Text>
                  <Text className="text-[15px] text-black">
                    {formatCurrency(subtotal)}
                  </Text>
                </View>
                {discount > 0 && (
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-[15px] text-[#666666]">Descuento</Text>
                    <Text className="text-[15px] text-[#DC2626]">
                      -{formatCurrency(discount)}
                    </Text>
                  </View>
                )}
                {discount > 0 && (
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-[15px] text-[#666666]">Subtotal con descuento</Text>
                    <Text className="text-[15px] text-black">
                      {formatCurrency(taxableAmount)}
                    </Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[15px] text-[#666666]">
                    ISV ({((currentUser?.tasaImpuesto || 0.15) * 100).toFixed(0)}%)
                  </Text>
                  <Text className="text-[15px] text-black">
                    {formatCurrency(taxAmount)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center pt-2 border-t border-[#E5E5E5]">
                  <Text className="text-[18px] font-semibold text-black">Total</Text>
                  <Text className="text-[18px] font-semibold text-black">
                    {formatCurrency(total)}
                  </Text>
                </View>
              </View>

              {/* Save Button */}
              <View className="mt-8 mb-8">
                <Pressable
                  className="py-4 items-center active:opacity-60"
                  style={{
                    backgroundColor: isValid && !isSaving ? '#000000' : '#E5E5E5',
                  }}
                  onPress={handleSave}
                  disabled={!isValid || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      className="text-[15px] font-medium"
                      style={{ color: isValid ? '#FFFFFF' : '#999999' }}
                    >
                      Crear factura
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

