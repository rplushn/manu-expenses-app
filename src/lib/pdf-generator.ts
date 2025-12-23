import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Expense, ExpenseCategory, CATEGORY_LABELS } from './types';
import { Period } from './store';
import * as FileSystem from 'expo-file-system';
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
  try {
    if (typeof window !== 'undefined' && window.document) {
      // Web: Use Canvas API
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
          } catch (error) {
            console.error('Canvas conversion error:', error);
            resolve(null);
          }
        };
        
        img.onerror = () => {
          console.error('Image load error');
          resolve(null);
        };
        
        // Remove query parameters and add timestamp to avoid cache
        const cleanUrl = url.split('?')[0];
        img.src = `${cleanUrl}?nocache=${Date.now()}`;
      });
    } else {
      // Native: Download and convert
      try {
        // For remote URLs, download first
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const downloadResult = await FileSystem.downloadAsync(
            url,
            FileSystem.cacheDirectory + `logo_${Date.now()}.png`
          );
          
          if (downloadResult.uri) {
            const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return `data:image/png;base64,${base64}`;
          }
        } else {
          // Local file
          const base64 = await FileSystem.readAsStringAsync(url, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return `data:image/png;base64,${base64}`;
        }
      } catch (error) {
        console.error('Error reading image file:', error);
        return null;
      }
    }
  } catch (error) {
    console.error('Error converting image to base64:', error);
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
      logoBase64 = await imageUrlToBase64(logoUrl);
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
          <td style="text-align: right;">L ${formatAmount(cat.total)}</td>
          <td style="text-align: right;">${formatPercentage(cat.percentage)}</td>
        </tr>
      `)
      .join('');

    // Generate expense detail rows
    const expenseRows = sortedExpenses
      .map(expense => `
        <tr>
          <td>${formatDate(expense.expenseDate)}</td>
          <td>${expense.provider || 'Sin proveedor'}</td>
          <td>${CATEGORY_LABELS[expense.category]}</td>
          <td style="text-align: right;">L ${formatAmount(expense.amount)}</td>
        </tr>
      `)
      .join('');

    // Build HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #000000;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 10px;
      object-fit: contain;
    }
    h1 {
      font-size: 24px;
      margin: 5px 0;
      font-weight: bold;
    }
    h2 {
      font-size: 18px;
      margin: 20px 0 10px 0;
      font-weight: bold;
    }
    .section {
      margin: 30px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #E5E5E5;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #F9FAFB;
      font-weight: bold;
    }
    .total-row {
      background-color: #F9FAFB;
      font-weight: bold;
      border-top: 2px solid #000000;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E5E5;
      font-size: 12px;
      color: #999999;
    }
    .summary-box {
      border: 1px solid #E5E5E5;
      padding: 15px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #F5F5F5;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo" />` : ''}
    <h1>MANU</h1>
    <h2>${businessName}</h2>
    <p>Reporte de Gastos</p>
    <p style="font-size: 13px; color: #666;">Rango de fechas: ${getPeriodDisplay(period)}</p>
    <p style="font-size: 12px; color: #999;">Generado el ${formattedDate} a las ${formattedTime}</p>
  </div>

  <!-- RESUMEN EJECUTIVO -->
  <div class="section">
    <h2>RESUMEN EJECUTIVO</h2>
    <div class="summary-box">
      <div class="summary-row">
        <span>Total Gastos:</span>
        <strong>L ${formatAmount(stats.total)}</strong>
      </div>
      <div class="summary-row">
        <span>Número de Gastos:</span>
        <strong>${stats.count}</strong>
      </div>
      <div class="summary-row">
        <span>Promedio por Gasto:</span>
        <strong>L ${formatAmount(averagePerExpense)}</strong>
      </div>
      <div class="summary-row">
        <span>Gasto Más Alto:</span>
        <strong>${biggestExpense ? `L ${formatAmount(biggestExpense.amount)}` : '-'}</strong>
      </div>
      <div class="summary-row">
        <span>Categoría Mayor Gasto:</span>
        <strong>${topCategory 
          ? `${CATEGORY_LABELS[topCategory.category]} (${formatPercentage(topCategory.percentage)})`
          : '-'
        }</strong>
      </div>
    </div>
  </div>

  <!-- GASTOS POR CATEGORÍA -->
  <div class="section">
    <h2>GASTOS POR CATEGORÍA</h2>
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th style="text-align: right;">Monto</th>
          <th style="text-align: right;">%</th>
        </tr>
      </thead>
      <tbody>
        ${categoryRows}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align: right;">L ${formatAmount(stats.total)}</td>
          <td style="text-align: right;">100%</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- DETALLE DE GASTOS -->
  <div class="section">
    <h2>DETALLE DE GASTOS</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Proveedor</th>
          <th>Categoría</th>
          <th style="text-align: right;">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${expenseRows}
      </tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>Reporte generado por MANU el ${formattedDate} a las ${formattedTime}</p>
  </div>
</body>
</html>
    `;

    // Generate PDF using Print.printToFileAsync with HTML template
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
    });

    // Share PDF directly
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error('Error generando PDF detallado:', error instanceof Error ? error.message : JSON.stringify(error));
    throw error;
  }
}
