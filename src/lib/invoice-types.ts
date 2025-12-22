// Invoice types for the MANU app

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  client_name: string;
  client_rtn?: string;
  client_address?: string;
  invoice_date: string; // YYYY-MM-DD format
  subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_amount: number;
  total: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  quantity: number;
  description: string;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface CreateInvoice {
  invoice_number: string;
  client_name: string;
  client_rtn?: string;
  client_address?: string;
  invoice_date: string;
  subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_amount: number;
  total: number;
}

export interface CreateInvoiceItem {
  quantity: number;
  description: string;
  unit_price: number;
  total: number;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

