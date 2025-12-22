// Helper functions for invoice operations

import { differenceInDays, parseISO } from 'date-fns';

/**
 * Increment invoice number in Honduran format
 * Example: "000-001-01-00000001" -> "000-001-01-00000002"
 * Flexible format: handles XXX-XXX-XX-XXXXXXXX or any dash-separated format
 */
export function incrementInvoiceNumber(current: string): string {
  if (!current || typeof current !== 'string') {
    console.warn('Invalid invoice number provided:', current);
    return current;
  }

  // Try to parse the standard format XXX-XXX-XX-XXXXXXXX
  const parts = current.split('-');
  
  if (parts.length < 2) {
    // No dashes, try to increment the whole string as a number
    const asNumber = parseInt(current, 10);
    if (!isNaN(asNumber)) {
      return (asNumber + 1).toString().padStart(current.length, '0');
    }
    // If not a number, just return as-is (user will need to update manually)
    console.warn('Cannot auto-increment invoice number:', current);
    return current;
  }

  // Standard format with dashes
  try {
    // Get the last part (correlative number)
    const lastPart = parts[parts.length - 1];
    const correlative = parseInt(lastPart, 10);
    
    if (isNaN(correlative)) {
      console.warn('Last part is not a number:', lastPart);
      return current;
    }

    // Increment and pad to same length as original
    const newCorrelative = (correlative + 1).toString().padStart(lastPart.length, '0');
    
    // Rebuild the invoice number
    const newParts = [...parts.slice(0, -1), newCorrelative];
    return newParts.join('-');
  } catch (error) {
    console.error('Error incrementing invoice number:', error);
    return current;
  }
}

/**
 * Check if invoice number is within range
 * Flexible validation: handles various formats
 */
export function isInvoiceNumberInRange(
  current: string,
  start: string,
  end: string
): boolean {
  if (!current || !start || !end) {
    return true; // If range not set, allow any number
  }

  try {
    // Try standard format XXX-XXX-XX-XXXXXXXX
    const currentParts = current.split('-');
    const startParts = start.split('-');
    const endParts = end.split('-');

    // If all have same number of parts, compare them
    if (currentParts.length === startParts.length && 
        currentParts.length === endParts.length &&
        currentParts.length >= 2) {
      
      // Compare prefix parts (all but last)
      const prefixLength = currentParts.length - 1;
      const currentPrefix = currentParts.slice(0, prefixLength).join('-');
      const startPrefix = startParts.slice(0, prefixLength).join('-');
      const endPrefix = endParts.slice(0, prefixLength).join('-');

      // If prefixes match, compare correlative numbers
      if (currentPrefix === startPrefix && currentPrefix === endPrefix) {
        const currentNum = parseInt(currentParts[prefixLength], 10);
        const startNum = parseInt(startParts[prefixLength], 10);
        const endNum = parseInt(endParts[prefixLength], 10);

        if (!isNaN(currentNum) && !isNaN(startNum) && !isNaN(endNum)) {
          return currentNum >= startNum && currentNum <= endNum;
        }
      }
    }

    // Fall back to numeric comparison (extract all digits)
    const currentNum = parseInt(current.replace(/\D/g, ''), 10);
    const startNum = parseInt(start.replace(/\D/g, ''), 10);
    const endNum = parseInt(end.replace(/\D/g, ''), 10);

    if (!isNaN(currentNum) && !isNaN(startNum) && !isNaN(endNum)) {
      return currentNum >= startNum && currentNum <= endNum;
    }

    // Last resort: string comparison
    return current >= start && current <= end;
  } catch (error) {
    console.warn('Error checking invoice range:', error);
    return true; // Allow if validation fails
  }
}

/**
 * Validate invoice number format
 * Flexible validation: accepts various formats
 * Standard format: XXX-XXX-XX-XXXXXXXX
 * Also accepts: any non-empty string (user-configured format)
 */
export function isValidInvoiceNumberFormat(invoiceNumber: string): boolean {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') {
    return false;
  }

  // Accept any non-empty string with reasonable length
  const trimmed = invoiceNumber.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }

  // Optional: Check for standard format XXX-XXX-XX-XXXXXXXX
  const standardPattern = /^\d{3}-\d{3}-\d{2}-\d{8}$/;
  if (standardPattern.test(trimmed)) {
    return true;
  }

  // Accept any format with dashes and numbers
  const flexiblePattern = /^[\d-]+$/;
  if (flexiblePattern.test(trimmed)) {
    return true;
  }

  // Accept any alphanumeric format with dashes
  const alphanumericPattern = /^[A-Za-z0-9-]+$/;
  return alphanumericPattern.test(trimmed);
}

/**
 * Check if CAI is expired or expiring soon
 * Returns: { isExpired: boolean, daysUntilExpiry: number, isExpiringSoon: boolean }
 */
export function checkCAIExpiration(expirationDate: string): {
  isExpired: boolean;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
} {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = parseISO(expirationDate);
    expiry.setHours(0, 0, 0, 0);
    
    const daysUntilExpiry = differenceInDays(expiry, today);
    
    return {
      isExpired: daysUntilExpiry < 0,
      daysUntilExpiry,
      isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
    };
  } catch {
    return {
      isExpired: false,
      daysUntilExpiry: 999,
      isExpiringSoon: false,
    };
  }
}

/**
 * Calculate line item total
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  subtotal: number,
  discountPercentage?: number,
  discountAmount?: number
): number {
  if (discountAmount && discountAmount > 0) {
    return Math.min(discountAmount, subtotal);
  }
  if (discountPercentage && discountPercentage > 0) {
    return Math.round(subtotal * (discountPercentage / 100) * 100) / 100;
  }
  return 0;
}

/**
 * Calculate invoice totals with discount
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unit_price: number }>,
  taxRate: number = 0.15,
  discountPercentage?: number,
  discountAmount?: number
): {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateLineTotal(item.quantity, item.unit_price);
  }, 0);

  const discount = calculateDiscount(subtotal, discountPercentage, discountAmount);
  const taxableAmount = Math.round((subtotal - discount) * 100) / 100;
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
  const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return { subtotal, discount, taxableAmount, taxAmount, total };
}

/**
 * Format currency for Honduras (Lempiras)
 */
export function formatCurrency(amount: number): string {
  return `L ${amount.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

