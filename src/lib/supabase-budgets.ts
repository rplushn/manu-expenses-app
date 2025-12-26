import { supabase } from './supabase';
import { Budget, BudgetFormData } from '@/types/budget';
import { ExpenseCategory } from './types';

/**
 * Get all budgets for the current user
 */
export async function getBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('user_id', userId)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new budget
 */
export async function createBudget(
  userId: string,
  budgetData: BudgetFormData
): Promise<Budget> {
  const { data, error } = await supabase
    .from('presupuestos')
    .insert({
      user_id: userId,
      category: budgetData.category,
      amount: budgetData.amount,
      period: budgetData.period,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating budget:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing budget
 */
export async function updateBudget(
  budgetId: string,
  budgetData: Partial<BudgetFormData>
): Promise<Budget> {
  const { data, error } = await supabase
    .from('presupuestos')
    .update({
      ...budgetData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', budgetId)
    .select()
    .single();

  if (error) {
    console.error('Error updating budget:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a budget (soft delete by setting activo = false)
 */
export async function deleteBudget(budgetId: string): Promise<void> {
  const { error } = await supabase
    .from('presupuestos')
    .update({ activo: false })
    .eq('id', budgetId);

  if (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
}

/**
 * Get expense categories for budget creation
 */
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  // Return all available categories
  return [
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
}
