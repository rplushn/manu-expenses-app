import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Expense, ExpenseCategory } from './types';
import { supabase, DbExpense } from './supabase';
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths, differenceInDays } from 'date-fns';
import { decode } from 'base64-arraybuffer';

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'HNL', name: 'Lempira hondureño', symbol: 'L' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$' }
] as const;

export type CurrencyCode = 'HNL' | 'USD';

// Currency symbols mapping
export const currencySymbols: Record<string, string> = {
  HNL: 'L',
  USD: '$'
};

// Helper to log errors properly
const logError = (message: string, error: unknown) => {
  if (error && typeof error === 'object') {
    console.error(message, JSON.stringify(error, null, 2));
  } else {
    console.error(message, error);
  }
};

// Helper to format date as YYYY-MM-DD in LOCAL timezone
// This ensures we save the actual calendar date the user sees, not UTC
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export type Period = 'today' | 'week' | 'month';

export interface CurrentUser {
  id: string;
  email: string;
  nombreNegocio: string;
  plan: string;
  currencyCode: string; // Default 'HNL' if not from DB
  empresaNombre?: string;
  empresaLogoUrl?: string;
  empresaRtn?: string;
  empresaCai?: string;
  empresaDireccion?: string;
  empresaTelefono?: string;
  empresaEmail?: string;
  tasaImpuesto?: number;
  facturaRangoInicio?: string;
  facturaRangoFin?: string;
  facturaProximoNumero?: string;
  caiFechaVencimiento?: string;
}

export interface CategorySummary {
  category: ExpenseCategory;
  total: number;
  percentage: number;
  count: number;
}

export interface PeriodStats {
  total: number;
  count: number;
  averageDaily: number;
  change: number;
  changePercent: number;
}

interface AppState {
  // User
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;

  // Expenses
  expenses: Expense[];
  isLoading: boolean;
  syncStatus: 'synced' | 'syncing' | 'error';

  // Actions
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<boolean>;
  updateExpense: (id: string, expense: Partial<Omit<Expense, 'id'>>) => Promise<boolean>;
  removeExpense: (id: string) => Promise<boolean>;
  uploadPhoto: (localUri: string) => Promise<string | null>;
  uploadReceiptImage: (imageUri: string) => Promise<string | null>;

  // Period-based calculations
  getExpensesByPeriod: (period: Period) => Expense[];
  getPeriodStats: (period: Period) => PeriodStats;
  getCategorySummary: (period: Period) => CategorySummary[];

  // Search and filter
  searchExpenses: (query: string, period: Period, category?: ExpenseCategory) => Expense[];

  // Legacy computed
  getTodayExpenses: () => Expense[];
  getTodayTotal: () => number;
  getExpensesByDate: (date: Date) => Expense[];

  // Clear on logout
  clearStore: () => void;
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Get date range for a period
const getDateRange = (period: Period): { start: Date; end: Date } => {
  const now = new Date();
  const today = startOfDay(now);

  switch (period) {
    case 'today':
      return { start: today, end: now };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
    case 'month':
      return { start: startOfMonth(now), end: now };
  }
};

// Get previous period date range
const getPreviousPeriodRange = (period: Period): { start: Date; end: Date } => {
  const now = new Date();

  switch (period) {
    case 'today':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: yesterday };
    case 'week':
      const lastWeekEnd = subWeeks(now, 1);
      return { start: startOfWeek(lastWeekEnd, { weekStartsOn: 1 }), end: lastWeekEnd };
    case 'month':
      const lastMonthEnd = subMonths(now, 1);
      return { start: startOfMonth(lastMonthEnd), end: lastMonthEnd };
  }
};

// Migrate old categories to new ones
const migrateCategoryToNew = (oldCategory: string): ExpenseCategory => {
  const categoryMap: Record<string, ExpenseCategory> = {
    'inventario': 'mercaderia',
    'servicios': 'servicios',
    'alquiler': 'instalaciones',
    'empleados': 'personal',
    'transporte': 'transporte',
    'otros': 'otros',
    // New categories (already valid)
    'mercaderia': 'mercaderia',
    'marketing': 'marketing',
    'operacion': 'operacion',
    'personal': 'personal',
    'instalaciones': 'instalaciones',
    'impuestos': 'impuestos',
    'equipamiento': 'equipamiento',
    'alimentacion': 'alimentacion',
  };

  return categoryMap[oldCategory.toLowerCase()] || 'otros';
};

// Convert DB expense to app expense
const dbToAppExpense = (db: DbExpense): Expense => {
  // expenseDate: Keep as YYYY-MM-DD string (local calendar date)
  // This is the date the user sees - no timezone conversion needed
  const expenseDate = db.fecha;

  // createdAt: Keep as UTC ISO timestamp for ordering and time display
  const createdAt = db.created_at;

  return {
    id: db.id,
    amount: db.monto,
    category: migrateCategoryToNew(db.categoria),
    provider: db.proveedor,
    expenseDate,
    createdAt,
    currencyCode: db.currency_code || 'HNL',
    receiptUri: db.foto_url || undefined,
    notes: db.notas || undefined,
    receiptImageUrl: db.foto_url || undefined,
  };
};

// Check if expense date (YYYY-MM-DD string) is within date range
const isExpenseDateInRange = (expenseDateStr: string, startDateStr: string, endDateStr: string): boolean => {
  // Simple string comparison works because YYYY-MM-DD format is lexicographically sortable
  return expenseDateStr >= startDateStr && expenseDateStr <= endDateStr;
};

// Get date range as YYYY-MM-DD strings for a period
const getDateRangeStrings = (period: Period): { startStr: string; endStr: string } => {
  const now = new Date();
  const todayStr = formatLocalDate(now);

  switch (period) {
    case 'today':
      return { startStr: todayStr, endStr: todayStr };
    case 'week': {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      return { startStr: formatLocalDate(weekStart), endStr: todayStr };
    }
    case 'month': {
      const monthStart = startOfMonth(now);
      return { startStr: formatLocalDate(monthStart), endStr: todayStr };
    }
  }
};

// Get previous period date range as strings
const getPreviousPeriodRangeStrings = (period: Period): { startStr: string; endStr: string } => {
  const now = new Date();

  switch (period) {
    case 'today': {
      const yesterday = subDays(now, 1);
      const yesterdayStr = formatLocalDate(yesterday);
      return { startStr: yesterdayStr, endStr: yesterdayStr };
    }
    case 'week': {
      const lastWeekEnd = subWeeks(now, 1);
      const lastWeekStart = startOfWeek(lastWeekEnd, { weekStartsOn: 1 });
      return { startStr: formatLocalDate(lastWeekStart), endStr: formatLocalDate(lastWeekEnd) };
    }
    case 'month': {
      const lastMonthEnd = subMonths(now, 1);
      const lastMonthStart = startOfMonth(lastMonthEnd);
      return { startStr: formatLocalDate(lastMonthStart), endStr: formatLocalDate(lastMonthEnd) };
    }
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      // Expenses
      expenses: [],
      isLoading: false,
      syncStatus: 'synced',

      // Load expenses from Supabase
      loadExpenses: async () => {
        const { currentUser } = get();
        if (!currentUser) {
          console.warn('[loadExpenses] No current user, skipping');
          return;
        }

        console.log('[loadExpenses] Starting load for user:', currentUser.id);
        set({ isLoading: true, syncStatus: 'syncing' });

        try {
          // Load last 3 months of data
          const threeMonthsAgo = subMonths(new Date(), 3);
          const startDate = formatLocalDate(threeMonthsAgo);

          console.log('[loadExpenses] Query params:', {
            userId: currentUser.id,
            startDate: startDate,
            queryTime: new Date().toISOString(),
          });

          const { data, error } = await supabase
            .from('gastos')
            .select('*')
            .eq('usuario_id', currentUser.id)
            .gte('fecha', startDate)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false });

          if (error) {
            console.error('[loadExpenses] Supabase error:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              status: (error as any).status,
              fullError: JSON.stringify(error, null, 2),
            });
            logError('Error loading expenses:', error);
            set({ syncStatus: 'error', isLoading: false });
            return;
          }

          console.log('[loadExpenses] Success! Loaded expenses:', {
            count: (data || []).length,
            timestamp: new Date().toISOString(),
          });

          const expenses = (data || []).map(dbToAppExpense);
          set({ expenses, syncStatus: 'synced', isLoading: false });
        } catch (error) {
          console.error('[loadExpenses] Network/JS error:', {
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            errorType: error?.constructor?.name,
            fullError: JSON.stringify(error, null, 2),
            timestamp: new Date().toISOString(),
          });
          logError('Error loading expenses:', error);
          set({ syncStatus: 'error', isLoading: false });
        }
      },

      // Add expense to Supabase
      addExpense: async (expense) => {
        const { currentUser } = get();
        if (!currentUser) return false;

        console.log('[addExpense] Starting add for user:', currentUser.id);
        set({ syncStatus: 'syncing' });

        try {
          // Upload photo if exists
          let photoUrl: string | null = null;
          if (expense.receiptUri) {
            photoUrl = await get().uploadPhoto(expense.receiptUri);
          }

          // Use receiptImageUrl if available (from camera/gallery upload)
          const finalPhotoUrl = expense.receiptImageUrl || photoUrl;

          // Use expenseDate directly (already YYYY-MM-DD format)
          // If not provided, use today's date in local timezone
          const localDateString = expense.expenseDate || formatLocalDate(new Date());

          console.log('[addExpense] Inserting:', {
            amount: expense.amount,
            category: expense.category,
            date: localDateString,
            hasPhoto: !!finalPhotoUrl,
          });

          const { data, error } = await supabase
            .from('gastos')
            .insert({
              usuario_id: currentUser.id,
              monto: expense.amount,
              moneda: 'L',
              categoria: expense.category,
              proveedor: expense.provider,
              fecha: localDateString,
              currency_code: currentUser.currencyCode || 'HNL',
              foto_url: finalPhotoUrl,
              notas: expense.notes || null,
            })
            .select()
            .single();

          if (error) {
            console.error('[addExpense] Supabase error:', {
              message: error.message,
              code: error.code,
              details: error.details,
            });
            logError('Error adding expense:', error);
            set({ syncStatus: 'error' });
            return false;
          }

          console.log('[addExpense] Success! ID:', data.id);

          // Send webhook notification (non-blocking)
          if (data) {
            try {
              const webhookBody = {
                id: data.id,
                usuario_id: data.usuario_id,
                monto: data.monto,
                moneda: data.moneda || 'HNL',
                categoria: data.categoria,
                proveedor: data.proveedor || '',
                notas: data.notas || '',
                foto_url: data.foto_url || '',
                numero_caja: '',
              };

              console.log('[addExpense] Sending webhook with data:', webhookBody);

              await fetch('https://n8n.srv1009646.hstgr.cloud/webhook/ea0d35fa-c502-4ded-a618-22ed76af9f20', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookBody),
              });

              console.log('[addExpense] Webhook sent successfully');
            } catch (webhookError) {
              console.error('[addExpense] Webhook error:', {
                message: webhookError instanceof Error ? webhookError.message : String(webhookError),
                error: webhookError
              });
            }
          }

          // Add to local state
          const newExpense = dbToAppExpense(data);
          // Ensure currencyCode is set from currentUser if not in DB response
          if (!newExpense.currencyCode) {
            newExpense.currencyCode = currentUser.currencyCode || 'HNL';
          }
          set((state) => ({
            expenses: [newExpense, ...state.expenses],
            syncStatus: 'synced',
          }));

          return true;
        } catch (error) {
          console.error('[addExpense] Network/JS error:', {
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          logError('Error adding expense:', error);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      // Remove expense from Supabase
      removeExpense: async (id) => {
        const { currentUser } = get();
        if (!currentUser) return false;

        set({ syncStatus: 'syncing' });

        try {
          const { error } = await supabase
            .from('gastos')
            .delete()
            .eq('id', id)
            .eq('usuario_id', currentUser.id);

          if (error) {
            logError('Error removing expense:', error);
            set({ syncStatus: 'error' });
            return false;
          }

          // Remove from local state
          set((state) => ({
            expenses: state.expenses.filter((e) => e.id !== id),
            syncStatus: 'synced',
          }));

          return true;
        } catch (error) {
          logError('Error removing expense:', error);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      // Upload photo to Supabase Storage
      uploadPhoto: async (localUri) => {
        const { currentUser } = get();
        if (!currentUser) return null;

        // Photo upload not available on web
        if (Platform.OS === 'web') {
          console.log('Photo upload not available on web');
          return null;
        }

        try {
          // Use fetch to read the file as blob, then convert to base64
          const response = await fetch(localUri);
          const blob = await response.blob();

          // Convert blob to base64 string
          const base64Promise = new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
              const base64 = base64String.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const base64 = await base64Promise;

          // Convert base64 to ArrayBuffer
          const arrayBuffer = decode(base64);

          const timestamp = Date.now();
          const filename = `gasto_${currentUser.id}_${timestamp}.jpg`;
          const filePath = `${currentUser.id}/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from('imagenes-recibos')
            .upload(filePath, arrayBuffer, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            logError('Error uploading photo:', uploadError);
            return null;
          }

          const { data: signedData, error: signedError } = await supabase.storage
            .from('imagenes-recibos')
            .createSignedUrl(filePath, 60 * 60 * 24 * 7);

          if (signedError) {
            logError('Error getting signed URL:', signedError);
            return filePath;
          }

          return signedData.signedUrl;
        } catch (error) {
          logError('Error uploading photo:', error);
          return null;
        }
      },

      // Upload receipt image to Supabase Storage (wrapper for uploadPhoto)
      uploadReceiptImage: async (imageUri) => {
        // Reuse the existing uploadPhoto function
        return get().uploadPhoto(imageUri);
      },

      // Update expense in Supabase
      updateExpense: async (id, updates) => {
        const { currentUser } = get();
        if (!currentUser) return false;

        console.log('[updateExpense] Starting update for ID:', id);
        set({ syncStatus: 'syncing' });

        try {
          const updateData: Record<string, unknown> = {};

          if (updates.amount !== undefined) updateData.monto = updates.amount;
          if (updates.category !== undefined) updateData.categoria = updates.category;
          if (updates.provider !== undefined) updateData.proveedor = updates.provider;
          if (updates.expenseDate !== undefined) {
            // expenseDate is already YYYY-MM-DD format
            updateData.fecha = updates.expenseDate;
          }
          if (updates.notes !== undefined) updateData.notas = updates.notes || null;
          if (updates.receiptImageUrl !== undefined) updateData.foto_url = updates.receiptImageUrl || null;

          console.log('[updateExpense] Update data:', {
            id: id,
            updates: JSON.stringify(updateData),
          });

          const { data, error } = await supabase
            .from('gastos')
            .update(updateData)
            .eq('id', id)
            .eq('usuario_id', currentUser.id)
            .select()
            .single();

          if (error) {
            console.error('[updateExpense] Supabase error:', {
              message: error.message,
              code: error.code,
              details: error.details,
            });
            logError('Error updating expense:', error);
            set({ syncStatus: 'error' });
            return false;
          }

          console.log('[updateExpense] Success! ID:', id);

          // Update local state
          const updatedExpense = dbToAppExpense(data);
          set((state) => ({
            expenses: state.expenses.map((e) => e.id === id ? updatedExpense : e),
            syncStatus: 'synced',
          }));

          return true;
        } catch (error) {
          console.error('[updateExpense] Network/JS error:', {
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          logError('Error updating expense:', error);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      // Get expenses by period (using string date comparison)
      getExpensesByPeriod: (period) => {
        const { startStr, endStr } = getDateRangeStrings(period);
        const filtered = get().expenses.filter((e) =>
          isExpenseDateInRange(e.expenseDate, startStr, endStr)
        );

        // Debug log for "today" period
        if (period === 'today') {
          console.log('[DEBUG] Today filter:', {
            startStr,
            endStr,
            totalExpenses: get().expenses.length,
            filteredExpenses: filtered.length,
            expenseDates: get().expenses.slice(0, 5).map(e => ({
              provider: e.provider,
              expenseDate: e.expenseDate,
            }))
          });
        }

        return filtered;
      },

      // Get period statistics
      getPeriodStats: (period) => {
        const { startStr, endStr } = getDateRangeStrings(period);
        const { startStr: prevStartStr, endStr: prevEndStr } = getPreviousPeriodRangeStrings(period);

        const currentExpenses = get().expenses.filter((e) =>
          isExpenseDateInRange(e.expenseDate, startStr, endStr)
        );
        const previousExpenses = get().expenses.filter((e) =>
          isExpenseDateInRange(e.expenseDate, prevStartStr, prevEndStr)
        );

        const total = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
        const previousTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0);
        const count = currentExpenses.length;

        // Calculate days in period using string dates
        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        const daysInPeriod = Math.max(1, differenceInDays(endDate, startDate) + 1);
        const averageDaily = total / daysInPeriod;

        // Calculate change
        const change = total - previousTotal;
        const changePercent = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

        return {
          total,
          count,
          averageDaily,
          change,
          changePercent,
        };
      },

      // Get category summary for period
      getCategorySummary: (period) => {
        const expenses = get().getExpensesByPeriod(period);
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Group by category
        const categoryMap: Record<ExpenseCategory, { total: number; count: number }> = {
          mercaderia: { total: 0, count: 0 },
          servicios: { total: 0, count: 0 },
          marketing: { total: 0, count: 0 },
          transporte: { total: 0, count: 0 },
          operacion: { total: 0, count: 0 },
          personal: { total: 0, count: 0 },
          instalaciones: { total: 0, count: 0 },
          impuestos: { total: 0, count: 0 },
          equipamiento: { total: 0, count: 0 },
          alimentacion: { total: 0, count: 0 },
          otros: { total: 0, count: 0 },
        };

        expenses.forEach((expense) => {
          // Safety check: ensure category exists in map
          if (categoryMap[expense.category]) {
            categoryMap[expense.category].total += expense.amount;
            categoryMap[expense.category].count += 1;
          } else {
            // Fallback to 'otros' if category doesn't exist
            categoryMap.otros.total += expense.amount;
            categoryMap.otros.count += 1;
          }
        });

        // Convert to sorted array
        return Object.entries(categoryMap)
          .filter(([_, data]) => data.total > 0)
          .map(([category, data]) => ({
            category: category as ExpenseCategory,
            total: data.total,
            percentage: total > 0 ? (data.total / total) * 100 : 0,
            count: data.count,
          }))
          .sort((a, b) => b.total - a.total);
      },

      // Search and filter expenses
      searchExpenses: (query, period, category) => {
        let expenses = get().getExpensesByPeriod(period);

        if (category) {
          expenses = expenses.filter((e) => e.category === category);
        }

        if (query.trim()) {
          const lowerQuery = query.toLowerCase().trim();
          expenses = expenses.filter((e) =>
            e.provider.toLowerCase().includes(lowerQuery)
          );
        }

        return expenses;
      },

      // Legacy computed (now using string date comparison)
      getTodayExpenses: () => {
        const todayStr = formatLocalDate(new Date());
        return get().expenses.filter((e) => e.expenseDate === todayStr);
      },
      getTodayTotal: () => {
        return get()
          .getTodayExpenses()
          .reduce((sum, e) => sum + e.amount, 0);
      },
      getExpensesByDate: (date) => {
        const dateStr = formatLocalDate(date);
        return get().expenses.filter((e) => e.expenseDate === dateStr);
      },

      // Clear store on logout
      clearStore: () => {
        set({
          currentUser: null,
          expenses: [],
          syncStatus: 'synced',
        });
      },
    }),
    {
      name: 'manu-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
      }),
    }
  )
);

// Función para formatear montos con moneda
export const formatMoney = (amount: number, currencyCode: string = 'HNL'): string => {
  // Si amount es null/undefined, usar 0
  const safeAmount = amount ?? 0;
  
  // Mapeo de símbolos (solo HNL y USD)
  const currencySymbols: Record<string, string> = {
    HNL: 'L',
    USD: '$'
  };
  
  const symbol = currencySymbols[currencyCode] || currencyCode;
  
  // Formato: símbolo antes, 2 decimales, separador de miles con coma
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeAmount);
  
  return `${symbol} ${formatted}`;
};
