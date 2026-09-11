import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Up to 60 seconds for Gemini translation batch

interface MessageInput {
  id: string;
  sender: string;
  text: string;
  isSystem?: boolean;
}

// Fallback dictionary for common phrases in case Gemini API key is not configured
const COMMON_BANGLISH_MAP: Record<string, string> = {
  'hi': 'Ei je',
  'hello': 'Salam / Hello',
  'hey': 'Ei je',
  'how are you': 'Kemon achho?',
  'how are you?': 'Kemon achho?',
  'i am fine': 'Ami bhalo achi',
  'what are you doing': 'Ki korteso?',
  'where are you': 'Koi tumi?',
  'yes': 'Hae',
  'no': 'Na',
  'okay': 'Thik ache',
  'ok': 'Thik ache',
  'thanks': 'Dhonnobad',
  'thank you': 'Onek dhonnobad',
  'see you later': 'Pore dekha hobe',
  'good morning': 'Shuprobhat',
  'good night': 'Shubho ratri',
  'bye': 'Allah hafez',
  'call me': 'Amake call diyo',
  'on the way': 'Ami rastay achi',
};

function simpleBanglishFallback(text: string): string {
  if (!text) return '';
  if (text.startsWith('<') && text.endsWith('>')) return text; // e.g. <Media omitted>

  const lower = text.trim().toLowerCase();
  if (COMMON_BANGLISH_MAP[lower]) {
    return COMMON_BANGLISH_MAP[lower];
  }

  // Pre-translated sample lines fallback
  if (lower.includes('diamond ring') && lower.includes('cad model')) {
    return 'Ei bro! Diamond ring er CAD model ta ki review korsen?';
  }
  if (lower.includes('3d viewport') && lower.includes('prong')) {
    return 'Hae, ami 3D viewport check korsi. Prong er height ekhon besh bhalo lagche.';
  }
  if (lower.includes('ready to send') && lower.includes('client')) {
    return 'Great! Amra ki client ke final files pathanor jonno ready?';
  }
  if (lower.includes('almost done') || lower.includes('micro-pave')) {
    return 'Pray shesh. Ami micro-pave stone gulo seshbarer moto check kortesi.';
  }
  if (lower.includes('3dm') && lower.includes('stl')) {
    return 'Thik ache cool. 3 PM er age ki 3DM ar STL files export korte parben?';
  }
  if (lower.includes('pin-protected') || lower.includes('cadonce')) {
    return 'Obosshoi! Ami CADONCE er PIN-protected transfer diye upload kore dicchi.';
  }
  if (lower.includes('client will love')) {
    return 'Jossh, dhonnobad! Client er ei design ta onek pochondo hobe.';
  }
  if (lower.includes('screenshot preview') || lower.includes('rendered band')) {
    return 'Eita holo rendered band er screenshot preview.';
  }
  if (lower.includes('awesome') || lower.includes('wrap it up')) {
    return 'Wow, darun lagche! Cholo eita wrap up kore feli!';
  }

  return text;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, tone = 'casual' }: { messages: MessageInput[]; tone?: string } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided for translation' }, { status: 400 });
    }

    // Filter out system messages that don't need translation
    const translatable = messages.filter((m) => !m.isSystem && m.text && !m.text.startsWith('<Media omitted>'));

    if (!process.env.GEMINI_API_KEY) {
      // Graceful fallback when API key is not present
      const fallbackTranslations = messages.map((m) => ({
        id: m.id,
        banglishText: simpleBanglishFallback(m.text),
      }));
      return NextResponse.json({
        success: true,
        translations: fallbackTranslations,
        source: 'fallback',
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-2.5-flash or gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare JSON payload for Gemini
    const inputPayload = translatable.map((m) => ({
      id: m.id,
      text: m.text,
    }));

    const prompt = `
You are an expert translator specializing in modern, conversational BANGLISH.
"Banglish" is Bengali language written phonetically in the English / Latin alphabet, exactly as used in everyday WhatsApp, Messenger, and text messaging by Bengalis (in Dhaka, Kolkata, and worldwide).

Translate every message into natural, fluent Banglish.

Rules:
1. Output MUST be in English/Latin letters (e.g. "Kemon acho?", "Ki obostha bhai?", "Ami ekhon rastay achi", "Kal shokale kotha hobe").
2. Tone: ${tone === 'formal' ? 'Polite, respectful conversational Bengali (using apni, thik ache, dhonnobad)' : tone === 'slang' ? 'Youthful, energetic Dhakaite texting slang (using bro, mama, pera nai, shera)' : 'Friendly, casual everyday WhatsApp conversation (using tumi/tui as appropriate)'}.
3. Keep all emojis in their original place.
4. Keep technical terms, file names (e.g., .3dm, .stl), numbers, percentages, timestamps, and brand names (e.g., CADONCE, WhatsApp, Zoom, Google) unchanged.
5. If an input is already in Banglish or Bengali, polish it into natural, clean Banglish.
6. Return STRICTLY a JSON array of objects with keys "id" and "banglishText". No markdown codeblocks, no extra explanation.

Input messages to translate:
${JSON.stringify(inputPayload, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean up markdown fences if present
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

    let translatedList: { id: string; banglishText: string }[] = [];
    try {
      translatedList = JSON.parse(text);
    } catch (parseErr) {
      console.warn('Failed to parse Gemini JSON, attempting regex extraction:', parseErr);
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        translatedList = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse translation output');
      }
    }

    // Map back into full message list
    const translationMap = new Map(translatedList.map((item) => [item.id, item.banglishText]));

    const fullTranslations = messages.map((m) => {
      if (m.isSystem || m.text.startsWith('<Media omitted>')) {
        return { id: m.id, banglishText: m.text };
      }
      return {
        id: m.id,
        banglishText: translationMap.get(m.id) || simpleBanglishFallback(m.text),
      };
    });

    return NextResponse.json({
      success: true,
      translations: fullTranslations,
      source: 'gemini',
    });
  } catch (error: any) {
    console.error('WhatsApp Banglish Translation Error:', error);

    // Provide seamless fallback so UI never breaks
    try {
      const body = await req.clone().json();
      const messages = body.messages || [];
      const fallbackTranslations = messages.map((m: any) => ({
        id: m.id,
        banglishText: simpleBanglishFallback(m.text),
      }));

      return NextResponse.json({
        success: true,
        translations: fallbackTranslations,
        source: 'error-fallback',
        warning: error.message,
      });
    } catch {
      return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
    }
  }
}
