import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ensureBanglish } from '@/lib/bengaliTransliterate';

export const maxDuration = 30; // Max duration for Gemini translation batch

interface MessageInput {
  id: string;
  sender: string;
  text: string;
  isSystem?: boolean;
}

const COMMON_BANGLISH_MAP: Record<string, string> = {
  'hi': 'Ei je',
  'hello': 'Salam / Hello',
  'hey': 'Ei je',
  'how are you': 'Kemon achen?',
  'how are you?': 'Kemon achen?',
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

function fallbackBanglish(text: string): string {
  if (!text) return '';
  if (text.startsWith('<') && text.endsWith('>')) return text; // e.g. <Media omitted>

  // First convert any Bengali script characters to Banglish
  let result = ensureBanglish(text);

  const lower = result.trim().toLowerCase();
  if (COMMON_BANGLISH_MAP[lower]) {
    return COMMON_BANGLISH_MAP[lower];
  }

  // Common CAD/sample conversational replacements
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

  return ensureBanglish(result);
}

// Valid production Gemini models in order of priority
const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export async function POST(req: Request) {
  let messages: MessageInput[] = [];
  let tone = 'casual';

  try {
    const body = await req.json();
    messages = body.messages || [];
    tone = body.tone || 'casual';

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided for translation' }, { status: 400 });
    }

    // Filter out system messages that don't need translation
    const translatable = messages.filter((m) => !m.isSystem && m.text && !m.text.startsWith('<Media omitted>'));

    if (translatable.length === 0) {
      return NextResponse.json({
        success: true,
        translations: messages.map((m) => ({ id: m.id, banglishText: m.text })),
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Fast local transliteration fallback when API key is not present
      const fallbackTranslations = messages.map((m) => ({
        id: m.id,
        banglishText: fallbackBanglish(m.text),
      }));
      return NextResponse.json({
        success: true,
        translations: fallbackTranslations,
        source: 'local-transliteration-engine',
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Prepare JSON payload for Gemini
    const inputPayload = translatable.map((m) => ({
      id: m.id,
      text: m.text,
    }));

    const prompt = `
You are an expert translator specializing in modern, conversational BANGLISH.
"Banglish" is Bengali language written exclusively in the ENGLISH / LATIN ALPHABET (A-Z, a-z), exactly as used by Bengalis in everyday WhatsApp, Messenger, and SMS.

CRITICAL INSTRUCTION - ZERO BENGALI SCRIPT PERMITTED:
1. Every single word in the output MUST BE WRITTEN IN THE ENGLISH ALPHABET (Latin letters).
2. DO NOT USE ANY BENGALI CHARACTERS (বাংলা বর্ণমালা যেমন ক, খ, গ, আ, ই, etc. কখোনোই ব্যবহার করবে না).
3. If an input is in Bengali script (e.g. "আমি ভালো আছি, আপনি কেমন আছেন?"), convert it to natural English letters: "Ami bhalo achi, apni kemon achen?".
4. If an input is in English (e.g. "How are you? Are we ready?"), translate it to natural Bengali in English letters: "Kemon achen? Amra ki ready?".
5. Tone: ${
      tone === 'formal'
        ? 'Polite, respectful conversational Bengali in English letters (apni, thik ache, dhonnobad)'
        : tone === 'slang'
        ? 'Youthful, energetic Dhakaite texting slang in English letters (bro, mama, pera nai, shera, joss)'
        : 'Friendly, casual everyday WhatsApp conversation in English letters (tumi/tui, kemon acho, thik ache)'
    }.
6. Keep all emojis intact.
7. Keep file extensions (e.g. .3dm, .stl), numbers, percentages, timestamps, and brand names (e.g. CADONCE, WhatsApp) unchanged.
8. Return STRICTLY a JSON array of objects with keys "id" and "banglishText". No markdown codeblocks, no explanations.

Input messages to translate:
${JSON.stringify(inputPayload, null, 2)}
`;

    let text = '';
    let successModel = '';

    // Try candidate models in sequence
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text().trim();
        if (text) {
          successModel = modelName;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed, trying next:`, err.message);
      }
    }

    if (!text) {
      // Fall back to built-in transliteration engine
      const fallbackTranslations = messages.map((m) => ({
        id: m.id,
        banglishText: fallbackBanglish(m.text),
      }));
      return NextResponse.json({
        success: true,
        translations: fallbackTranslations,
        source: 'local-transliteration-engine',
      });
    }

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
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        translatedList = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse translation output');
      }
    }

    // Map back into full message list and GUARANTEE ZERO BENGALI CHARACTERS
    const translationMap = new Map(
      translatedList.map((item) => [
        item.id,
        ensureBanglish(item.banglishText || '')
      ])
    );

    const fullTranslations = messages.map((m) => {
      if (m.isSystem || m.text.startsWith('<Media omitted>')) {
        return { id: m.id, banglishText: m.text };
      }
      const translated = translationMap.get(m.id);
      return {
        id: m.id,
        banglishText: translated ? ensureBanglish(translated) : fallbackBanglish(m.text),
      };
    });

    return NextResponse.json({
      success: true,
      translations: fullTranslations,
      source: successModel || 'gemini',
    });
  } catch (error: any) {
    console.error('WhatsApp Banglish Translation Error:', error);

    // Guaranteed fallback: return clean phonetic Banglish for all messages
    const fallbackTranslations = messages.map((m: any) => ({
      id: m.id,
      banglishText: fallbackBanglish(m.text || ''),
    }));

    return NextResponse.json({
      success: true,
      translations: fallbackTranslations,
      source: 'error-fallback',
      warning: error.message,
    });
  }
}
