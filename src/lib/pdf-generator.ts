import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Expense, ExpenseCategory, CATEGORY_LABELS } from './types';
import { Period, formatMoney } from './store';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PeriodStats {
  total: number;
  count: number;
  change?: number;
  changePercent?: number;
  averageDaily?: number;
}

interface CategorySummaryItem {
  category: ExpenseCategory;
  total: number;
  percentage: number;
  count: number;
}

// Format amount with Honduran locale
function formatAmount(amount: number): string {
  return amount.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Format date from YYYY-MM-DD to "DD MMM YYYY"
function formatDate(dateStr: string): string {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

// Format percentage
function formatPercentage(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}%`;
  }
  return `${value.toFixed(1)}%`;
}

// Get period display text
function getPeriodDisplay(period: Period): string {
  switch (period) {
    case 'today':
      return 'Hoy';
    case 'week':
      return 'Esta semana';
    case 'month':
      return 'Este mes';
    default:
      return 'Este mes';
  }
}

// Convert image URL to base64 for PDF embedding
async function imageUrlToBase64(url: string): Promise<string | null> {
  console.log('🔍 [imageUrlToBase64] Starting conversion for:', url);
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        console.log('✅ Base64 conversion successful');
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Error converting image to base64:', error);
    return null;
  }
}

export async function generateDetailedReport(
  expenses: Expense[],
  businessName: string,
  period: Period,
  stats: PeriodStats,
  categorySummary: CategorySummaryItem[],
  biggestExpense: Expense | null,
  averagePerExpense: number,
  topCategory: CategorySummaryItem | null,
  logoUrl?: string | null
): Promise<void> {
  try {
    const now = new Date();
    
    // Format date and time using date-fns
    const formattedDate = format(now, "d 'de' MMMM yyyy", { locale: es });
    const formattedTime = format(now, 'h:mm a', { locale: es });
    
    // Convert logo to base64 if available
    let logoBase64: string | null = null;
    if (logoUrl) {
      console.log('🔍 [PDF Generator] Received logo URL:', logoUrl);
      logoBase64 = await imageUrlToBase64(logoUrl);
      console.log('🔍 [PDF Generator] Base64 result:', logoBase64 ? `Success (${logoBase64.length} chars)` : 'NULL');
    }

    // Sort expenses by date (most recent first)
    const sortedExpenses = [...expenses].sort((a, b) =>
      b.expenseDate.localeCompare(a.expenseDate)
    );

    // Generate category rows
    const categoryRows = categorySummary
      .map(cat => `
        <tr>
          <td>${CATEGORY_LABELS[cat.category]}</td>
          <td style="text-align: right;">${formatMoney(cat.total, 'HNL')}</td>
          <td style="text-align: right;">${formatPercentage(cat.percentage)}</td>
        </tr>
      `)
      .join('');

    // Generate expense detail rows
    const expenseRows = sortedExpenses
      .map(expense => `
        <tr>
          <td style="white-space: nowrap;">${formatDate(expense.expenseDate)}</td>
          <td>${expense.provider || 'Sin proveedor'}</td>
          <td>${CATEGORY_LABELS[expense.category]}</td>
          <td style="text-align: right; white-space: nowrap;">${formatMoney(expense.amount, 'HNL')}</td>
        </tr>
      `)
      .join('');

    // Build HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      size: letter;
      margin: 1.5cm 1.5cm 1.5cm 1.5cm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      font-size: 10pt;
      line-height: 1.3;
      padding: 0;
      margin: 0;
    }
    .container {
      width: 100%;
      max-width: 100%;
      padding: 0;
      margin: 0;
    }
    .header {
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
    }
    .logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 8px auto;
      object-fit: contain;
      display: block;
    }
    h1 {
      font-size: 16pt;
      margin: 6px 0 3px 0;
      font-weight: 700;
      color: #000;
    }
    .subtitle {
      font-size: 11pt;
      margin: 3px 0;
      color: #333;
      font-weight: 600;
    }
    .meta {
      font-size: 8pt;
      color: #666;
      margin: 2px 0;
    }
    h2 {
      font-size: 11pt;
      margin: 16px 0 8px 0;
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section {
      margin: 16px 0;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 9pt;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tbody {
      display: table-row-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
      vertical-align: middle;
    }
    th {
      background-color: #f0f0f0;
      font-weight: 700;
      color: #000;
      font-size: 9pt;
    }
    .total-row {
      background-color: #f0f0f0;
      font-weight: 700;
      border-top: 2px solid #000;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      font-size: 8pt;
      color: #999;
      page-break-inside: avoid;
    }
    .summary-box {
      border: 1px solid #ccc;
      padding: 10px;
      background-color: #fafafa;
      page-break-inside: avoid;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 6px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .summary-item:last-child {
      border-bottom: none;
    }
    .summary-label {
      color: #555;
      font-size: 9pt;
    }
    .summary-value {
      font-weight: 700;
      color: #000;
      font-size: 9pt;
    }
    .summary-full {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #ccc;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo" />` : ''}
      <h1>${businessName}</h1>
      <div class="subtitle">Reporte de Gastos</div>
      <div class="meta">Período: ${getPeriodDisplay(period)}</div>
      <div class="meta">Generado: ${formattedDate} a las ${formattedTime}</div>
    </div>

    <!-- RESUMEN EJECUTIVO -->
    <div class="section">
      <h2>Resumen Ejecutivo</h2>
      <div class="summary-box">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Gastos:</span>
            <span class="summary-value">${formatMoney(stats.total, 'HNL')}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Número de Gastos:</span>
            <span class="summary-value">${stats.count}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Promedio por Gasto:</span>
            <span class="summary-value">${formatMoney(averagePerExpense, 'HNL')}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Gasto Más Alto:</span>
            <span class="summary-value">${biggestExpense ? formatMoney(biggestExpense.amount, 'HNL') : '-'}</span>
          </div>
        </div>
        <div class="summary-item summary-full">
          <span class="summary-label">Categoría Mayor Gasto:</span>
          <span class="summary-value">${topCategory 
            ? `${CATEGORY_LABELS[topCategory.category]} (${formatPercentage(topCategory.percentage)})`
            : '-'
          }</span>
        </div>
      </div>
    </div>

    <!-- GASTOS POR CATEGORÍA -->
    <div class="section">
      <h2>Gastos por Categoría</h2>
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th style="text-align: right; width: 120px;">Monto</th>
            <th style="text-align: right; width: 60px;">%</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td style="text-align: right;"><strong>${formatMoney(stats.total, 'HNL')}</strong></td>
            <td style="text-align: right;"><strong>100%</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- DETALLE DE GASTOS -->
    <div class="section">
      <h2>Detalle de Gastos</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 70px;">Fecha</th>
            <th>Proveedor</th>
            <th style="width: 110px;">Categoría</th>
            <th style="text-align: right; width: 90px;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${expenseRows}
        </tbody>
      </table>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      Reporte generado el ${formattedDate} a las ${formattedTime}
    </div>
  </div>
</body>
</html>
    `;

    // Generate PDF using Print.printToFileAsync with HTML template
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Share PDF directly
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error('Error generando PDF detallado:', error instanceof Error ? error.message : JSON.stringify(error));
    throw error;
  }
}