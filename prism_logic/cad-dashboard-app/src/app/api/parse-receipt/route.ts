import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Allow up to 60 seconds for Gemini API

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key missing in environment' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type,
        },
      },
    ];

    const prompt = `
    Extract the following manual payment details from the attached receipt image. 
    Respond strictly in JSON format with no markdown formatting or backticks.
    Use these exact keys:
    - platform: The bank name or payment app (e.g. Kotak811, GPay, PhonePe, Chase, PayPal).
    - transactionId: The unique transaction ID or reference number.
    - recipientName: The name of the person or business that received the money.
    - date: The date of the transaction in YYYY-MM-DD format.
    - time: The time of the transaction in HH:MM (24-hour) format.
    - amountPaid: The exact numeric amount paid (omit currency symbols, just the number).
    
    If you cannot find a specific field, leave it as an empty string.
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown formatting from Gemini
    if (text.startsWith('```json')) {
      text = text.substring(7);
      if (text.endsWith('```')) {
        text = text.substring(0, text.length - 3);
      }
    } else if (text.startsWith('```')) {
      text = text.substring(3);
      if (text.endsWith('```')) {
        text = text.substring(0, text.length - 3);
      }
    }
    
    text = text.trim();
    const parsedData = JSON.parse(text);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Gemini Receipt Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse receipt' }, { status: 500 });
  }
}
