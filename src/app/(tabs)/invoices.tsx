import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
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
  const navigation = useNavigation();
  const currentUser = useAppStore((s) => s.currentUser);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter invoices based on search query
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    
    const query = searchQuery.toLowerCase();
    return invoices.filter((invoice) => {
      const invoiceNumber = invoice.invoice_number?.toLowerCase() || '';
      const clientName = invoice.client_name?.toLowerCase() || '';
      const amount = formatCurrency(invoice.total).toLowerCase();
      const date = format(parseISO(invoice.invoice_date), "d 'de' MMMM, yyyy", { locale: es }).toLowerCase();
      
      return (
        invoiceNumber.includes(query) ||
        clientName.includes(query) ||
        amount.includes(query) ||
        date.includes(query)
      );
    });
  }, [invoices, searchQuery]);

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

  // Configure header with Plus button
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Facturas',
      headerShown: true,
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerTitleStyle: { fontSize: 20, fontWeight: '500', color: '#1A1A1A' },
      headerRight: () => (
        <View style={{ marginRight: 16 }}>
          <Pressable onPress={handleCreateInvoice}>
            <Plus size={24} color="#1A1A1A" strokeWidth={1.8} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, handleCreateInvoice]);

  const renderInvoice = ({ item, index }: { item: Invoice; index: number }) => {
    const date = parseISO(item.invoice_date);
    const formattedDate = format(date, "d 'de' MMMM, yyyy", { locale: es });

    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(index * 50)}
      >
        <Pressable
          style={{
            borderWidth: 1,
            borderColor: '#2A2A2A',
            borderRadius: 0,
            paddingVertical: 16,
            paddingHorizontal: 20,
            marginBottom: 13,
          }}
          className="active:opacity-60"
          onPress={() => handleInvoicePress(item)}
        >
          <View className="flex-row justify-between items-start" style={{ marginBottom: 6 }}>
            <View className="flex-1">
              <Text style={{ fontSize: 14, fontWeight: '400', color: '#1A1A1A' }}>
                {item.invoice_number}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '300', color: '#666666', marginTop: 3 }}>
                {item.client_name}
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              {formatCurrency(item.total)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '300', color: '#999999' }}>
            {formattedDate}
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
      <View className="flex-1">
        {/* Search Bar */}
        <View
          style={{
            width: '100%',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#2A2A2A',
            borderRadius: 0,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Search size={18} color="#666666" strokeWidth={1.5} style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 14,
                color: '#1A1A1A',
                padding: 0,
              }}
              placeholder="Buscar por factura, cliente o monto..."
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={{ padding: 4 }}
              >
                <X size={18} color="#666666" strokeWidth={1.5} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Invoices List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1A1A1A" />
            <Text className="text-[14px] font-light text-[#666666] mt-4">
              Cargando facturas...
            </Text>
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: 12 }}>
            <Text className="text-[16px] font-light text-[#999999] text-center mb-6">
              {searchQuery ? 'No se encontraron resultados' : 'No tienes facturas aún'}
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={handleCreateInvoice}
                className="border border-black px-6 py-4 active:opacity-60"
              >
                <Text className="text-[14px] font-light text-[#1A1A1A]">Crear primera factura</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredInvoices}
            renderItem={renderInvoice}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

