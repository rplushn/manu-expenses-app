import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useAppStore } from '@/lib/store';
import { Budget, BudgetFormData } from '@/types/budget';
import { ExpenseCategory } from '@/lib/types';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from '@/lib/supabase-budgets';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetModal } from '@/components/budgets/BudgetModal';
import { startOfMonth, startOfYear, isAfter, isBefore } from 'date-fns';

export default function BudgetsScreen() {
  const navigation = useNavigation();
  const currentUser = useAppStore((s) => s.currentUser);
  const expenses = useAppStore((s) => s.expenses);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showModal, setShowModal] = useState(false);

  const userCurrency = currentUser?.currencyCode || 'HNL';

  // Configure header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            setSelectedBudget(null);
            setShowModal(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginRight: 16 }}
        >
          <Plus size={24} color="#1A1A1A" strokeWidth={1.8} />
        </Pressable>
      ),
    });
  }, [navigation]);

  // Load budgets
  const loadBudgets = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const data = await getBudgets(currentUser.id);
      setBudgets(data);
    } catch (error) {
      console.error('Error loading budgets:', error);
      Alert.alert('Error', 'No se pudieron cargar los presupuestos');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Calculate spent amount for a budget
  const calculateSpent = (budget: Budget): number => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (budget.period === 'mensual') {
      startDate = startOfMonth(now);
    } else {
      startDate = startOfYear(now);
    }

    return expenses
      .filter((expense) => {
        if (expense.category !== budget.category) return false;

        // expenseDate is in YYYY-MM-DD format, convert to Date
        const [year, month, day] = expense.expenseDate.split('-').map(Number);
        const expenseDate = new Date(year, month - 1, day);

        return (
          (isAfter(expenseDate, startDate) || expenseDate.getTime() >= startDate.getTime()) &&
          (isBefore(expenseDate, endDate) || expenseDate.getTime() <= endDate.getTime())
        );
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  // Handle save budget
  const handleSave = async (data: BudgetFormData) => {
    if (!currentUser) return;

    try {
      if (selectedBudget) {
        await updateBudget(selectedBudget.id, data);
      } else {
        await createBudget(currentUser.id, data);
      }
      await loadBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
      throw error;
    }
  };

  // Handle delete budget
  const handleDelete = (budget: Budget) => {
    Alert.alert(
      'Eliminar presupuesto',
      '¿Estás seguro de que deseas eliminar este presupuesto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(budget.id);
              await loadBudgets();
            } catch (error) {
              console.error('Error deleting budget:', error);
              Alert.alert('Error', 'No se pudo eliminar el presupuesto');
            }
          },
        },
      ]
    );
  };

  // Handle edit budget
  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={[]}>
        {budgets.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: 12 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#000000',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Sin presupuestos
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '400',
                color: '#666666',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              Crea un presupuesto para comenzar a controlar tus gastos por categoría
            </Text>
            <Pressable
              onPress={() => {
                setSelectedBudget(null);
                setShowModal(true);
              }}
              style={{
                backgroundColor: '#000000',
                borderWidth: 1.8,
                borderColor: '#2A2A2A',
                borderRadius: 8,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}
              >
                Crear Presupuesto
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={budgets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <BudgetCard
                budget={item}
                spent={calculateSpent(item)}
                onPress={() => handleEdit(item)}
              />
            )}
          />
        )}

        <BudgetModal
          visible={showModal}
          budget={selectedBudget}
          onClose={() => {
            setShowModal(false);
            setSelectedBudget(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          currencyCode={userCurrency}
        />
      </SafeAreaView>
    </View>
  );
}

