import { ExpenseCategory } from '@/lib/types';

export type BudgetStatus = 'OK' | 'ALERTA' | 'PASADO';

export interface Budget {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  amount: number;
  period: 'mensual' | 'anual';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetFormData {
  category: ExpenseCategory;
  amount: number;
  period: 'mensual' | 'anual';
}

