import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Expense, ExpenseCategory, CATEGORY_LABELS } from './types';

interface CategorySummary {
  category: ExpenseCategory;
  total: number;
  percentage: number;
  count: number;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Format date from YYYY-MM-DD string to display format
function formatDate(dateStr: string): string {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  // Parse YYYY-MM-DD as local date
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day.toString().padStart(2, '0')} ${months[month - 1]} ${year}`;
}

function formatFullDate(date: Date): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatPercentage(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}%`;
  }
  return `${value.toFixed(1)}%`;
}

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month];
}

function getCategorySummary(expenses: Expense[]): CategorySummary[] {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
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

  return Object.entries(categoryMap)
    .filter(([_, data]) => data.total > 0)
    .map(([category, data]) => ({
      category: category as ExpenseCategory,
      total: data.total,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);
}

function generateHTMLContent(
  expenses: Expense[],
  businessName: string,
  categorySummary: CategorySummary[]
): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Get first and last day of current month
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);

  // Calculate stats
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = expenses.length;
  const averageExpense = expenseCount > 0 ? totalAmount / expenseCount : 0;
  const highestExpense = expenses.length > 0
    ? Math.max(...expenses.map(e => e.amount))
    : 0;
  const topCategory = categorySummary.length > 0
    ? categorySummary[0]
    : null;

  // Sort expenses by expenseDate descending
  const sortedExpenses = [...expenses].sort((a, b) =>
    b.expenseDate.localeCompare(a.expenseDate)
  );

  // Generate category rows
  const categoryRows = categorySummary.map(cat => `
    <tr>
      <td>${CATEGORY_LABELS[cat.category]}</td>
      <td class="amount">L ${formatAmount(cat.total)}</td>
      <td style="text-align: center;">${formatPercentage(cat.percentage)}</td>
    </tr>
  `).join('');

  // Generate expense detail rows
  const expenseRows = sortedExpenses.map(expense => `
    <tr>
      <td>${formatDate(expense.expenseDate)}</td>
      <td>${expense.provider || 'Sin proveedor'}</td>
      <td>${CATEGORY_LABELS[expense.category]}</td>
      <td class="amount">L ${formatAmount(expense.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: letter; margin: 0.5in; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 10pt;
          color: #000;
          line-height: 1.4;
        }
        .header {
          text-align: center;
          border: 2px solid #000;
          padding: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 18pt;
          margin: 0 0 10px 0;
          letter-spacing: 2px;
        }
        .header .business-name {
          font-size: 14pt;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .header .period {
          font-size: 11pt;
          color: #333;
        }
        .header .generated {
          font-size: 9pt;
          color: #666;
          margin-top: 8px;
        }
        .section-title {
          font-size: 12pt;
          font-weight: 600;
          border-bottom: 2px solid #000;
          padding-bottom: 5px;
          margin-top: 25px;
          margin-bottom: 15px;
        }
        .summary-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }
        .summary-item {
          flex: 1;
          min-width: 150px;
          padding: 12px;
          background: #F5F5F5;
          border-left: 3px solid #000;
        }
        .summary-item .label {
          font-size: 9pt;
          color: #666;
          margin-bottom: 4px;
        }
        .summary-item .value {
          font-size: 14pt;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          padding: 10px 8px;
          text-align: left;
          border-bottom: 1px solid #E5E5E5;
        }
        th {
          font-weight: 600;
          background: #F5F5F5;
          border-bottom: 2px solid #000;
        }
        .amount {
          text-align: right;
          font-family: 'SF Mono', Menlo, monospace;
        }
        .total-row {
          font-weight: 600;
          border-top: 2px solid #000;
          background: #F5F5F5;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E5E5E5;
          font-size: 9pt;
          color: #999;
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MANU</h1>
        <div class="business-name">${businessName}</div>
        <div class="period">Reporte de Gastos</div>
        <div class="period">${firstDay.getDate()} - ${lastDay.getDate()} de ${getMonthName(currentMonth)} ${currentYear}</div>
        <div class="generated">Generado el ${formatFullDate(now)} a las ${now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div class="section-title">RESUMEN EJECUTIVO</div>
      <table>
        <tr>
          <td style="width: 50%;"><strong>Total Gastos:</strong></td>
          <td class="amount"><strong>L ${formatAmount(totalAmount)}</strong></td>
        </tr>
        <tr>
          <td><strong>Numero de Gastos:</strong></td>
          <td class="amount">${expenseCount}</td>
        </tr>
        <tr>
          <td><strong>Promedio por Gasto:</strong></td>
          <td class="amount">L ${formatAmount(averageExpense)}</td>
        </tr>
        <tr>
          <td><strong>Gasto Mas Alto:</strong></td>
          <td class="amount">L ${formatAmount(highestExpense)}</td>
        </tr>
        ${topCategory ? `
        <tr>
          <td><strong>Categoria Mayor Gasto:</strong></td>
          <td class="amount">${CATEGORY_LABELS[topCategory.category]} (${formatPercentage(topCategory.percentage)})</td>
        </tr>
        ` : ''}
      </table>

      <div class="section-title">GASTOS POR CATEGORIA</div>
      ${categorySummary.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th class="amount">Monto</th>
            <th style="text-align: center;">%</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
          <tr class="total-row">
            <td>TOTAL</td>
            <td class="amount">L ${formatAmount(totalAmount)}</td>
            <td style="text-align: center;">100%</td>
          </tr>
        </tbody>
      </table>
      ` : '<div class="no-data">No hay gastos registrados</div>'}

      <div class="section-title">DETALLE DE GASTOS</div>
      ${sortedExpenses.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Proveedor</th>
            <th>Categoria</th>
            <th class="amount">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${expenseRows}
        </tbody>
      </table>
      ` : '<div class="no-data">No hay gastos para mostrar</div>'}

      <div class="footer">
        Reporte generado por MANU el ${formatFullDate(now)} a las ${now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </body>
    </html>
  `;
}

export async function generateMonthlyReport(
  expenses: Expense[],
  businessName: string
): Promise<void> {
  try {
    // Get category summary
    const categorySummary = getCategorySummary(expenses);

    // Generate HTML content
    const htmlContent = generateHTMLContent(expenses, businessName, categorySummary);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
    });

    // Share PDF directly
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error('Error generando PDF:', error instanceof Error ? error.message : JSON.stringify(error));
    throw error;
  }
}
