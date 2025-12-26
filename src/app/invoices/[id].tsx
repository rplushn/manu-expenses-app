import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Printer, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { Invoice, InvoiceItem } from '@/lib/invoice-types';
import { formatCurrency } from '@/lib/invoice-helpers';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAppStore((s) => s.currentUser);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load invoice and items
  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Load invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      // Load items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading invoice:', error);
      Alert.alert('Error', 'No se pudo cargar la factura');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // Convert image to base64 using fetch + FileReader (works on iOS/Android)
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      console.log('🖼️ Converting logo to Base64 for PDF...');
      console.log('📍 Logo URL:', url);
      
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          console.log('✅ Logo Base64 ready for PDF');
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Error converting logo to base64:', error);
      throw error;
    }
  };

  // Generate PDF HTML
  const generateInvoiceHTML = async (): Promise<string> => {
    if (!invoice || !currentUser) return '';

    const invoiceDate = format(parseISO(invoice.invoice_date), "d 'de' MMMM, yyyy", { locale: es });
    const discount = invoice.discount_amount || 
      (invoice.discount_percentage ? invoice.subtotal * (invoice.discount_percentage / 100) : 0);
    const taxableAmount = invoice.subtotal - discount;

    // Convert logo to base64 if exists
    let logoBase64 = '';
    if (currentUser.empresaLogoUrl) {
      try {
        console.log('🖼️ Converting logo to Base64 for PDF...');
        console.log('📍 Logo URL:', currentUser.empresaLogoUrl);
        
        logoBase64 = await imageUrlToBase64(currentUser.empresaLogoUrl);
        
        console.log('✅ Logo Base64 ready for PDF');
        console.log('📝 Base64 preview:', logoBase64.substring(0, 100) + '...');
      } catch (error) {
        console.error('❌ Error converting logo to base64:', error);
        console.log('⚠️ PDF will be generated without logo');
      }
    } else {
      console.log('⚠️ No logo URL found in currentUser');
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #000;
    }
    .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
    .company-info { font-size: 11px; margin-bottom: 3px; }
    .section { margin-bottom: 15px; }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .info-row { margin-bottom: 4px; }
    .label { font-weight: bold; display: inline-block; width: 120px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th {
      background-color: #f0f0f0;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #000;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #000;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals {
      margin-top: 20px;
      float: right;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .total-row.final {
      border-top: 2px solid #000;
      margin-top: 5px;
      padding-top: 8px;
      font-size: 14px;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #000;
      font-size: 10px;
      text-align: center;
    }
    .clearfix::after {
      content: "";
      display: table;
      clear: both;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    ${logoBase64 ? `
    <div style="text-align: center; margin-bottom: 15px;">
      <img 
        src="${logoBase64}" 
        style="
          width: 100px;
          height: 100px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        " 
        alt="Logo" 
      />
    </div>` : ''}
    <div class="company-name">${currentUser.empresaNombre || currentUser.nombreNegocio || 'MI EMPRESA'}</div>
    ${currentUser.empresaRtn ? `<div class="company-info">RTN: ${currentUser.empresaRtn}</div>` : ''}
    ${currentUser.empresaCai ? `<div class="company-info">CAI: ${currentUser.empresaCai}</div>` : ''}
    ${currentUser.caiFechaVencimiento ? `<div class="company-info">Fecha vencimiento CAI: ${format(parseISO(currentUser.caiFechaVencimiento), 'dd/MM/yyyy')}</div>` : ''}
    ${currentUser.empresaDireccion ? `<div class="company-info">Dirección: ${currentUser.empresaDireccion}</div>` : ''}
    ${currentUser.empresaTelefono ? `<div class="company-info">Tel: ${currentUser.empresaTelefono}</div>` : ''}
    ${currentUser.empresaEmail ? `<div class="company-info">Email: ${currentUser.empresaEmail}</div>` : ''}
  </div>

  <!-- Invoice Info -->
  <div class="section">
    <div class="section-title">Factura</div>
    <div class="info-row"><span class="label">Número:</span> ${invoice.invoice_number}</div>
    <div class="info-row"><span class="label">Fecha:</span> ${invoiceDate}</div>
    ${currentUser.empresaCai ? `<div class="info-row"><span class="label">CAI:</span> ${currentUser.empresaCai}</div>` : ''}
    ${currentUser.caiFechaVencimiento ? `<div class="info-row"><span class="label">Vencimiento CAI:</span> ${format(parseISO(currentUser.caiFechaVencimiento), 'dd/MM/yyyy')}</div>` : ''}
  </div>

  <!-- Client Info -->
  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="info-row"><span class="label">Nombre:</span> ${invoice.client_name}</div>
    ${invoice.client_rtn ? `<div class="info-row"><span class="label">RTN:</span> ${invoice.client_rtn}</div>` : ''}
    ${invoice.client_address ? `<div class="info-row"><span class="label">Dirección:</span> ${invoice.client_address}</div>` : ''}
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 60px;">Cant.</th>
        <th>Descripción</th>
        <th class="text-right" style="width: 100px;">Precio Unit.</th>
        <th class="text-right" style="width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td class="text-center">${item.quantity}</td>
          <td>${item.description}</td>
          <td class="text-right">${formatCurrency(item.unit_price)}</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="clearfix">
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      ${discount > 0 ? `
        <div class="total-row">
          <span>Descuento:</span>
          <span>-${formatCurrency(discount)}</span>
        </div>
        <div class="total-row">
          <span>Subtotal con descuento:</span>
          <span>${formatCurrency(taxableAmount)}</span>
        </div>
      ` : ''}
      <div class="total-row">
        <span>ISV (15%):</span>
        <span>${formatCurrency(invoice.tax_amount)}</span>
      </div>
      <div class="total-row final">
        <span>TOTAL:</span>
        <span>${formatCurrency(invoice.total)}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Gracias por su preferencia</p>
    <p>Factura generada electrónicamente - Original</p>
  </div>
</body>
</html>
    `;
  };

  // Generate and share PDF
  const handlePrintInvoice = async () => {
    if (!invoice) return;

    setIsGeneratingPDF(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      console.log('📄 Starting PDF generation...');
      const html = await generateInvoiceHTML();
      console.log('📄 HTML generated, length:', html.length);
      
      // Log if logo is in HTML
      const hasLogo = html.includes('data:image');
      console.log('🖼️ Logo in HTML:', hasLogo ? 'YES' : 'NO');
      
      // Generate PDF
      console.log('📄 Calling Print.printToFileAsync...');
      const { uri } = await Print.printToFileAsync({
        html,
      });
      console.log('✅ PDF generated at:', uri);

      // Share PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Factura ${invoice.invoice_number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'No se puede compartir el PDF en este dispositivo');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = () => {
    if (!invoice) return;

    Alert.alert(
      'Eliminar Factura',
      `¿Estás seguro de que deseas eliminar la factura ${invoice.invoice_number}? Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              console.log('🗑️ Deleting invoice:', invoice.id);

              // Delete invoice (items will be deleted automatically due to CASCADE)
              const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', invoice.id);

              if (error) {
                console.error('❌ Delete error:', {
                  message: error.message,
                  details: error.details,
                  hint: error.hint,
                  code: error.code,
                });
                throw error;
              }

              console.log('✅ Invoice deleted successfully');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Éxito', 'Factura eliminada correctamente', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              console.error('❌ Error deleting invoice:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              
              let errorMessage = 'No se pudo eliminar la factura.';
              if (error?.message) {
                errorMessage += `\n\nError: ${error.message}`;
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text className="text-[15px] text-[#666666] mt-4">Cargando factura...</Text>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-[15px] text-[#666666]">Factura no encontrada</Text>
      </SafeAreaView>
    );
  }

  const invoiceDate = format(parseISO(invoice.invoice_date), "d 'de' MMMM, yyyy", { locale: es });
  const discount = invoice.discount_amount || 
    (invoice.discount_percentage ? invoice.subtotal * (invoice.discount_percentage / 100) : 0);
  const taxableAmount = invoice.subtotal - discount;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(200)}
        className="px-5 pt-4 pb-6 border-b border-[#F0F0F0]"
      >
        <View className="flex-row justify-between items-center mb-4">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center active:opacity-60"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} strokeWidth={1.5} color="#1A1A1A" />
            <Text className="text-[17px] text-black ml-1">Facturas</Text>
          </Pressable>
          <View className="flex-row" style={{ gap: 8 }}>
            <Pressable
              onPress={handlePrintInvoice}
              className="flex-row items-center border border-black px-3 py-2 active:opacity-60"
              disabled={isGeneratingPDF || isDeleting}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <>
                  <Printer size={18} strokeWidth={1.5} color="#1A1A1A" />
                  <Text className="text-[14px] text-black ml-2">Imprimir</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={handleDeleteInvoice}
              className="flex-row items-center border border-[#DC2626] px-3 py-2 active:opacity-60"
              disabled={isGeneratingPDF || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Trash2 size={18} strokeWidth={1.5} color="#DC2626" />
                  <Text className="text-[14px] text-[#DC2626] ml-2">Eliminar</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-6">
          {/* Company Header */}
          <View className="mb-6 border border-[#F0F0F0] p-4 bg-[#F9FAFB]">
            {currentUser?.empresaLogoUrl && (
              <View className="items-center mb-3">
                <Image
                  source={{ uri: currentUser.empresaLogoUrl }}
                  style={{ width: 100, height: 100 }}
                  resizeMode="contain"
                />
              </View>
            )}
            <Text className="text-[20px] font-bold text-black mb-3 text-center">
              {currentUser?.empresaNombre || currentUser?.nombreNegocio || 'MI EMPRESA'}
            </Text>
            {currentUser?.empresaRtn && (
              <Text className="text-[13px] text-[#666666] text-center mb-1">
                RTN: {currentUser.empresaRtn}
              </Text>
            )}
            {currentUser?.empresaCai && (
              <Text className="text-[13px] text-[#666666] text-center mb-1">
                CAI: {currentUser.empresaCai}
              </Text>
            )}
            {currentUser?.caiFechaVencimiento && (
              <Text className="text-[13px] text-[#666666] text-center mb-1">
                Fecha vencimiento CAI: {format(parseISO(currentUser.caiFechaVencimiento), 'dd/MM/yyyy')}
              </Text>
            )}
            {currentUser?.empresaDireccion && (
              <Text className="text-[13px] text-[#666666] text-center mb-1">
                Dirección: {currentUser.empresaDireccion}
              </Text>
            )}
            <View className="flex-row justify-center flex-wrap" style={{ gap: 8 }}>
              {currentUser?.empresaTelefono && (
                <Text className="text-[13px] text-[#666666]">
                  Tel: {currentUser.empresaTelefono}
                </Text>
              )}
              {currentUser?.empresaEmail && (
                <Text className="text-[13px] text-[#666666]">
                  {currentUser.empresaEmail}
                </Text>
              )}
            </View>
          </View>

          {/* Invoice Details */}
          <View className="mb-6 border border-[#F0F0F0] p-4">
            <Text className="text-[13px] text-[#999999] mb-2 uppercase tracking-wide">
              Factura
            </Text>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[14px] text-[#666666]">Número:</Text>
              <Text className="text-[16px] font-bold text-black">
                {invoice.invoice_number}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[14px] text-[#666666]">Fecha:</Text>
              <Text className="text-[14px] text-black">
                {invoiceDate}
              </Text>
            </View>
            {currentUser?.empresaCai && (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-[14px] text-[#666666]">CAI:</Text>
                <Text className="text-[14px] text-black font-mono">
                  {currentUser.empresaCai}
                </Text>
              </View>
            )}
            {currentUser?.caiFechaVencimiento && (
              <View className="flex-row justify-between items-center">
                <Text className="text-[14px] text-[#666666]">Vencimiento CAI:</Text>
                <Text className="text-[14px] text-black">
                  {format(parseISO(currentUser.caiFechaVencimiento), 'dd/MM/yyyy')}
                </Text>
              </View>
            )}
          </View>

          {/* Client Info */}
          <View className="mb-6 border border-[#F0F0F0] p-4">
            <Text className="text-[13px] text-[#999999] mb-2 uppercase tracking-wide">
              Cliente
            </Text>
            <Text className="text-[16px] text-black font-medium mb-1">
              {invoice.client_name}
            </Text>
            {invoice.client_rtn && (
              <Text className="text-[14px] text-[#666666]">
                RTN: {invoice.client_rtn}
              </Text>
            )}
            {invoice.client_address && (
              <Text className="text-[14px] text-[#666666] mt-1">
                {invoice.client_address}
              </Text>
            )}
          </View>

          {/* Line Items */}
          <View className="mb-6">
            <Text className="text-[13px] text-[#999999] mb-3 uppercase tracking-wide">
              Artículos
            </Text>
            {items.map((item, index) => (
              <View
                key={item.id}
                className="border border-[#F0F0F0] p-4 mb-2"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-[15px] text-black font-medium">
                      {item.description}
                    </Text>
                    <Text className="text-[13px] text-[#666666] mt-1">
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </Text>
                  </View>
                  <Text className="text-[16px] text-black font-semibold">
                    {formatCurrency(item.total)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View className="border-t border-[#F0F0F0] pt-4 mb-8">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[15px] text-[#666666]">Subtotal</Text>
              <Text className="text-[15px] text-black">
                {formatCurrency(invoice.subtotal)}
              </Text>
            </View>
            {discount > 0 && (
              <>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[15px] text-[#666666]">Descuento</Text>
                  <Text className="text-[15px] text-[#DC2626]">
                    -{formatCurrency(discount)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[15px] text-[#666666]">Subtotal con descuento</Text>
                  <Text className="text-[15px] text-black">
                    {formatCurrency(taxableAmount)}
                  </Text>
                </View>
              </>
            )}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[15px] text-[#666666]">ISV (15%)</Text>
              <Text className="text-[15px] text-black">
                {formatCurrency(invoice.tax_amount)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center pt-3 border-t border-[#F0F0F0]">
              <Text className="text-[20px] font-bold text-black">Total</Text>
              <Text className="text-[20px] font-bold text-black">
                {formatCurrency(invoice.total)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

