import { Platform } from 'react-native';
import { ExpenseCategory } from './types';

// Helper to format date as YYYY-MM-DD in LOCAL timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface VoiceExpenseData {
  vendor?: string;
  amount?: number;
  date?: string;
  category?: ExpenseCategory;
  notes?: string;
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
};

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeAudio(audioUri: string, apiKey: string): Promise<string | null> {
  try {
    console.log('Voice AI: Starting transcription...');

    // Create form data for the API request
    const formData = new FormData();

    // Append the audio file
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob);

    formData.append('model', 'whisper-1');
    formData.append('language', 'es');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('Voice AI: Transcription result:', data.text);
    return data.text;
  } catch (error) {
    console.error('Voice AI: Transcription error:', error);
    return null;
  }
}

/**
 * Extract expense data from transcribed text using GPT-4o-mini
 */
async function extractExpenseData(text: string, apiKey: string): Promise<VoiceExpenseData | null> {
  try {
    console.log('Voice AI: Extracting expense data from:', text);

    // Use LOCAL timezone, not UTC
    const today = formatLocalDate(new Date());
    const yesterday = formatLocalDate(new Date(Date.now() - 86400000));

    // First, check if the transcription seems valid (contains numbers or expense-related keywords)
    const hasExpenseKeywords = /\b(gast|pag|compr|invert|cost|precio|gast|prest|loan|amount|cantidad|lempir|cable|luz|agua|gasolina|renta|alquil|sal|bono|sueldo)\b/i.test(text);
    const hasNumbers = /\d+|mil|cien|quinientos|dos mil|tres mil|cuatro mil|cinco mil/i.test(text);

    if (!hasExpenseKeywords && !hasNumbers) {
      console.log('Voice AI: Text does not appear to be about expenses');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente que extrae información de GASTOS de texto en español de Honduras.
IMPORTANTE: Solo responde si el texto trata sobre GASTOS/DINERO. Si no es sobre gastos, responde: {"invalid": true}

Si ES sobre gastos, extrae información y sé FLEXIBLE - no requieres información perfecta.

REGLAS:
1. Entiende números: "mil"=1000, "quinientos"=500, "doscientos"=200, "treinta"=30
2. Entiende lenguaje coloquial: "la luz"=ENEE+servicios, "el agua"=SANAA+servicios, "gasolina"=Gasolinera+transporte
3. Si no hay cantidad clara, usa 0 - el usuario puede editarlo
4. Si dice solo "500" sin contexto, usa category="otros"
5. SIEMPRE retorna JSON válido

Categorías:
- mercaderia: productos para vender, inventario
- servicios: luz (ENEE), agua (SANAA), internet, teléfono
- marketing: publicidad, ads
- transporte: gasolina, taxi, envíos
- operacion: útiles de oficina, limpieza
- personal: salarios, sueldos
- instalaciones: alquiler, renta, mantenimiento
- impuestos: SAR, impuestos
- equipamiento: máquinas, computadoras
- alimentacion: comida, restaurante
- otros: lo demás

RESPONSE (JSON SOLO, sin texto extra):
Si es gasto válido: {"amount": número, "category": "cat", "vendor": "nombre", "date": "YYYY-MM-DD", "notes": "texto"}
Si NO es sobre gastos: {"invalid": true}

EJEMPLOS:
"gasté 500 en Walmart" → {"amount": 500, "category": "alimentacion", "vendor": "Walmart", "date": "${today}", "notes": null}
"mil en gasolina" → {"amount": 1000, "category": "transporte", "vendor": "Gasolinera", "date": "${today}", "notes": null}
"pagué la luz" → {"amount": 0, "category": "servicios", "vendor": "ENEE", "date": "${today}", "notes": "Pago de luz"}
"subtítulos de amara" → {"invalid": true}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GPT API error:', errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Voice AI: No content in GPT response');
      return null;
    }

    console.log('Voice AI: GPT response:', content);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error('Voice AI: No JSON found in response');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);

    // Check if this is marked as invalid
    if (result.invalid === true) {
      console.log('Voice AI: Text does not appear to be about expenses');
      return null;
    }

    // Map category to our types
    const categoryLower = result.category?.toLowerCase().trim() || '';
    const mappedCategory = CATEGORY_MAP[categoryLower] || 'otros';

    // Ensure amount is a valid number
    const amount = result.amount ? Number(result.amount) : 0;

    return {
      vendor: result.vendor || 'Gasto general',
      amount: amount > 0 ? amount : undefined,
      date: result.date || today,
      category: mappedCategory,
      notes: result.notes || undefined,
    };
  } catch (error) {
    console.error('Voice AI: Extraction error:', error);
    return null;
  }
}

/**
 * Process voice recording to extract expense data
 */
export async function processVoiceExpense(audioUri: string): Promise<VoiceExpenseData | null> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    console.error('Voice AI: OpenAI API key no configurada');
    return null;
  }

  // Step 1: Transcribe audio
  const transcription = await transcribeAudio(audioUri, apiKey);
  if (!transcription) {
    return null;
  }

  // Step 2: Extract expense data
  const expenseData = await extractExpenseData(transcription, apiKey);
  return expenseData;
}

/**
 * Check if Voice AI is available (API key configured and not on web)
 */
export function isVoiceAIEnabled(): boolean {
  // Voice AI is not available on web platform
  if (Platform.OS === 'web') {
    return false;
  }
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  return !!apiKey && apiKey.trim().length > 0;
}
