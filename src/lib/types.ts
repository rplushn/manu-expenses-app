export type ExpenseCategory =
  | 'mercaderia'
  | 'servicios'
  | 'marketing'
  | 'transporte'
  | 'operacion'
  | 'personal'
  | 'instalaciones'
  | 'impuestos'
  | 'equipamiento'
  | 'alimentacion'
  | 'otros';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  provider: string;
  /** Date string in YYYY-MM-DD format (local timezone, NOT UTC) */
  expenseDate: string;
  /** ISO timestamp of when the expense was created (UTC) */
  createdAt: string;
  currencyCode: string;
  receiptUri?: string;
  notes?: string;
  receiptImageUrl?: string;
}

export interface UserProfile {
  businessName: string;
  email: string;
  initials: string;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mercaderia: 'Mercadería',
  servicios: 'Servicios',
  marketing: 'Marketing',
  transporte: 'Transporte',
  operacion: 'Operación',
  personal: 'Personal',
  instalaciones: 'Instalaciones',
  impuestos: 'Impuestos',
  equipamiento: 'Equipamiento',
  alimentacion: 'Alimentación',
  otros: 'Otros',
};
