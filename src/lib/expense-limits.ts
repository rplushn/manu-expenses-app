import { supabase } from './supabase';

export const EXPENSE_LIMITS = {
  FREE: 20,
  PRO: Infinity,
};

/**
 * Check if user can add more expenses this month
 * @param userId - The user ID
 * @param isPro - Whether user has Pro subscription
 * @returns Object with canAdd boolean and remaining count
 */
export const checkExpenseLimit = async (
  userId: string | undefined,
  isPro: boolean
): Promise<{ canAdd: boolean; remaining: number; used: number }> => {
  if (!userId) {
    return { canAdd: false, remaining: 0, used: 0 };
  }

  // Pro users have unlimited expenses
  if (isPro) {
    return { canAdd: true, remaining: Infinity, used: 0 };
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { count, error } = await supabase
      .from('gastos')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', userId)
      .gte('fecha', monthStart.toISOString().split('T')[0])
      .lte('fecha', monthEnd.toISOString().split('T')[0]);

    if (error) {
      console.error('Error checking expense limit:', error);
      // Default to allowing if there's an error
      return { canAdd: true, remaining: EXPENSE_LIMITS.FREE, used: 0 };
    }

    const used = count || 0;
    const remaining = Math.max(0, EXPENSE_LIMITS.FREE - used);

    return {
      canAdd: remaining > 0,
      remaining,
      used,
    };
  } catch (error) {
    console.error('Error checking expense limit:', error);
    return { canAdd: true, remaining: EXPENSE_LIMITS.FREE, used: 0 };
  }
};

/**
 * Get monthly usage stats
 * @param userId - The user ID
 * @returns Object with usage statistics
 */
export const getMonthlyUsage = async (
  userId: string | undefined
): Promise<{ used: number; limit: number; percentage: number }> => {
  if (!userId) {
    return { used: 0, limit: EXPENSE_LIMITS.FREE, percentage: 0 };
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { count, error } = await supabase
      .from('gastos')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', userId)
      .gte('fecha', monthStart.toISOString().split('T')[0])
      .lte('fecha', monthEnd.toISOString().split('T')[0]);

    if (error) {
      console.error('Error getting monthly usage:', error);
      return { used: 0, limit: EXPENSE_LIMITS.FREE, percentage: 0 };
    }

    const used = count || 0;
    const percentage = Math.min(100, (used / EXPENSE_LIMITS.FREE) * 100);

    return {
      used,
      limit: EXPENSE_LIMITS.FREE,
      percentage,
    };
  } catch (error) {
    console.error('Error getting monthly usage:', error);
    return { used: 0, limit: EXPENSE_LIMITS.FREE, percentage: 0 };
  }
};
