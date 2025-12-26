import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { Invoice } from '@/lib/invoice-types';
import { formatCurrency } from '@/lib/invoice-helpers';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function InvoicesScreen() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load invoices from Supabase
  const loadInvoices = useCallback(async () => {
    if (!currentUser?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('invoice_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      Alert.alert('Error', 'No se pudieron cargar las facturas');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Reload invoices when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  const handleCreateInvoice = () => {
    // Check if user has configured company info
    if (!currentUser?.empresaRtn || !currentUser?.empresaCai) {
      Alert.alert(
        'Configuración incompleta',
        'Debes configurar tu información de empresa (RTN y CAI) en el perfil antes de crear facturas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Perfil', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    if (!currentUser?.facturaRangoInicio || !currentUser?.facturaProximoNumero) {
      Alert.alert(
        'Rango de facturas no configurado',
        'Debes configurar el rango de facturas en tu perfil.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Perfil', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/invoices/new');
  };

  const handleInvoicePress = (invoice: Invoice) => {
    Haptics.selectionAsync();
    router.push(`/invoices/${invoice.id}`);
  };

  const renderInvoice = ({ item, index }: { item: Invoice; index: number }) => {
    const date = parseISO(item.invoice_date);
    const formattedDate = format(date, "d 'de' MMMM, yyyy", { locale: es });

    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(index * 50)}
      >
        <Pressable
          className="border border-[#2A2A2A] rounded-2xl p-5 mb-4 active:opacity-60"
          onPress={() => handleInvoicePress(item)}
        >
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-[16px] font-normal text-[#1A1A1A]">
                {item.invoice_number}
              </Text>
              <Text className="text-[14px] font-light text-[#666666] mt-1">
                {item.client_name}
              </Text>
            </View>
            <Text className="text-[18px] font-semibold text-[#1A1A1A]">
              {formatCurrency(item.total)}
            </Text>
          </View>
          <Text className="text-[13px] font-light text-[#999999]">
            {formattedDate}
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-2 pb-4 flex-row justify-between items-center">
          <Text className="text-[20px] font-medium text-[#1A1A1A]">Facturas</Text>
          <Pressable
            onPress={handleCreateInvoice}
            className="p-2 active:opacity-60"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={24} strokeWidth={1.5} color="#1A1A1A" />
          </Pressable>
        </View>

        {/* Invoices List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1A1A1A" />
            <Text className="text-[14px] font-light text-[#666666] mt-4">
              Cargando facturas...
            </Text>
          </View>
        ) : invoices.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-[16px] font-light text-[#999999] text-center mb-6">
              No tienes facturas aún
            </Text>
            <Pressable
              onPress={handleCreateInvoice}
              className="border border-black px-6 py-4 active:opacity-60"
            >
              <Text className="text-[14px] font-light text-[#1A1A1A]">Crear primera factura</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={invoices}
            renderItem={renderInvoice}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

