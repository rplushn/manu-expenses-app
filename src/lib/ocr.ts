import { ExpenseCategory } from './types';

export interface ReceiptData {
  vendor?: string;
  amount?: number;
  date?: string;
  category?: ExpenseCategory;
}

const CATEGORY_MAP: Record<string, ExpenseCategory> = {
  mercaderia: 'mercaderia',
  mercadería: 'mercaderia',
  servicios: 'servicios',
  marketing: 'marketing',
  transporte: 'transporte',
  operacion: 'operacion',
  operación: 'operacion',
  personal: 'personal',
  instalaciones: 'instalaciones',
  impuestos: 'impuestos',
  equipamiento: 'equipamiento',
  alimentacion: 'alimentacion',
  alimentación: 'alimentacion',
  otros: 'otros',
  // Legacy mappings
  inventario: 'mercaderia',
  alquiler: 'instalaciones',
  empleados: 'personal',
  suministros: 'operacion',
};

export async function processReceiptImage(base64Image: string): Promise<ReceiptData | null> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    if (!cleanBase64 || cleanBase64.length < 100) {
      console.error('OCR: base64 vacío o muy corto');
      return null;
    }

    console.log('OCR: base64 length:', cleanBase64.length);

    // Try both possible env var names
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    console.log('OCR: API key found, calling OpenAI...');

    if (!apiKey || apiKey.trim().length === 0) {
      console.error('OCR: OpenAI API key no configurada');
      return null;
    }

    // Use OpenAI directly (not OpenRouter)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae estos datos del recibo: vendor (nombre del negocio), amount (total en número), date (formato YYYY-MM-DD), category (elige la más apropiada entre: Mercadería, Servicios, Marketing, Transporte, Operación, Personal, Instalaciones, Impuestos, Equipamiento, Alimentación, Otros). Responde SOLO JSON válido: {"vendor":"Nombre","amount":123.45,"date":"2025-12-19","category":"Mercadería"}'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('OCR: No content in response');
      return null;
    }

    console.log('OCR response:', content);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      console.error('OCR: No JSON found in response');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);

    // Map category to our types
    const categoryLower = result.category?.toLowerCase() || '';
    const mappedCategory = CATEGORY_MAP[categoryLower] || 'otros';

    return {
      vendor: result.vendor || undefined,
      amount: result.amount ? Number(result.amount) : undefined,
      date: result.date || undefined,
      category: mappedCategory
    };

  } catch (error) {
    console.error('Error procesando recibo:', error);
    return null;
  }
}
