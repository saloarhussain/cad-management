import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Allow up to 60 seconds for Gemini API

// Verified active vision models for the current API version
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash'
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gemini API Key missing in environment. Please enter details manually.',
        fallbackToManual: true 
      }, { status: 200 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type || 'image/jpeg',
        },
      },
    ];

    const prompt = `
    Extract the following manual payment details from the attached receipt image. 
    Respond strictly in JSON format with no markdown formatting or backticks.
    Use these exact keys:
    - platform: The bank name or payment app (e.g. Kotak811, GPay, PhonePe, Chase, PayPal, Wire Transfer).
    - transactionId: The unique transaction ID or reference number.
    - recipientName: The name of the person or business that received the money.
    - date: The date of the transaction in YYYY-MM-DD format.
    - time: The time of the transaction in HH:MM (24-hour) format.
    - amountPaid: The exact numeric amount paid (omit currency symbols, just the number).
    
    If you cannot find a specific field, leave it as an empty string.
    `;

    let text = '';
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, ...imageParts]);
          const response = await result.response;
          text = response.text()?.trim() || '';
          if (text) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[Receipt Parser] Model ${modelName} (attempt ${attempt + 1}) failed:`, err?.message || err);
          if (err?.message?.includes('503') || err?.message?.includes('429') || err?.status === 503 || err?.status === 429) {
            await sleep(600 * (attempt + 1));
          } else {
            break; // Skip to next candidate model if not a temporary load issue
          }
        }
      }
      if (text) break;
    }

    if (!text) {
      return NextResponse.json({ 
        success: false, 
        error: 'AI receipt scanner is currently busy. Please enter payment details manually below.',
        fallbackToManual: true 
      }, { status: 200 });
    }

    // Clean up potential markdown formatting from Gemini
    let cleaned = text;
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI response was not valid JSON format.');
      }
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Gemini Receipt Parse Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Receipt auto-scanning unavailable. Please enter payment details manually below.',
      fallbackToManual: true
    }, { status: 200 });
  }
}
