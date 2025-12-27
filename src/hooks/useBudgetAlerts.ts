import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { getBudgets } from '@/lib/supabase-budgets';
import type { Budget } from '@/types/budget';
import { startOfMonth, startOfYear, isAfter, isBefore } from 'date-fns';

export interface BudgetAlert {
  budgetId: string;
  category: string;
  status: 'ALERTA' | 'PASADO';
  percentage: number;
  spent: number;
  limit: number;
}

export interface BudgetAlertsResult {
  hasAlerts: boolean;
  hasExceeded: boolean;
  alerts: BudgetAlert[];
  alertCount: number;
  count: number; // Alias para compatibilidad
  isLoading: boolean;
}

const ALERT_THRESHOLD = 80; // Porcentaje para mostrar alerta (80%)
const EXCEEDED_THRESHOLD = 100; // Porcentaje para considerar excedido (100%)

/**
 * Hook para detectar alertas de presupuesto
 * Retorna información sobre presupuestos que están cerca o excedidos
 */
export function useBudgetAlerts(): BudgetAlertsResult {
  const currentUser = useAppStore((s) => s.currentUser);
  const expenses = useAppStore((s) => s.expenses);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load budgets
  const loadBudgets = useCallback(async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getBudgets(currentUser.id);
      setBudgets(data);
    } catch (error) {
      console.error('Error loading budgets for alerts:', error);
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Reload budgets when expenses change
  useEffect(() => {
    if (!isLoading) {
      loadBudgets();
    }
  }, [expenses.length]);

  // Calculate spent amount for a budget
  const calculateSpent = useCallback(
    (budget: Budget): number => {
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
    },
    [expenses]
  );

  // Calculate alerts
  const alerts = budgets
    .filter((budget) => budget.activo)
    .map((budget) => {
      const spent = calculateSpent(budget);
      const limit = budget.amount;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      // Determine status
      let status: 'ALERTA' | 'PASADO' | null = null;
      if (percentage >= EXCEEDED_THRESHOLD) {
        status = 'PASADO';
      } else if (percentage >= ALERT_THRESHOLD) {
        status = 'ALERTA';
      }

      if (!status) return null;

      return {
        budgetId: budget.id,
        category: budget.category,
        status,
        percentage: Math.round(percentage),
        spent,
        limit,
      } as BudgetAlert;
    })
    .filter((alert): alert is BudgetAlert => alert !== null);

  const hasExceeded = alerts.some((alert) => alert.status === 'PASADO');
  const hasAlerts = alerts.length > 0;
  const alertCount = alerts.length;

  return {
    hasAlerts,
    hasExceeded,
    alerts,
    alertCount,
    count: alertCount, // Alias para compatibilidad
    isLoading,
  };
}

