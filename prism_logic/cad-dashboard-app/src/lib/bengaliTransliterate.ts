/**
 * Comprehensive Bengali Script to Banglish (English letters) Transliteration Engine.
 * Converts Bengali script (বাংলা লিপি) phonetically into natural, colloquial Banglish (Latin letters).
 */

const WORD_DICTIONARY: Record<string, string> = {
  'হ্যাঁ': 'Hae',
  'হ্যা': 'Hae',
  'না': 'Na',
  'ভালো': 'bhalo',
  'ভাল': 'bhalo',
  'কেমন': 'kemon',
  'আছো': 'acho',
  'আছিস': 'achish',
  'আছেন': 'achen',
  'আছি': 'achi',
  'কোথায়': 'kothay',
  'কোথা': 'kothay',
  'কি': 'ki',
  'কী': 'ki',
  'কেন': 'keno',
  'ঠিক': 'thik',
  'ধন্যবাদ': 'dhonnobad',
  'কাল': 'kal',
  'আজ': 'aaj',
  'আজকে': 'aajke',
  'আসছি': 'ashchi',
  'আসতেছি': 'astesi',
  'বুঝতে': 'bujhte',
  'পারছি': 'parchi',
  'ভাই': 'bhai',
  'আপু': 'apu',
  'দাদা': 'dada',
  'দোস্ত': 'dosto',
  'বন্ধু': 'bondhu',
  'টাকা': 'taka',
  'কাজ': 'kaj',
  'হয়েছে': 'hoyeche',
  'হবে': 'hobe',
  'হচ্ছে': 'hocche',
  'কর': 'koro',
  'করো': 'koro',
  'করছি': 'korchi',
  'করছ': 'korcho',
  'করছো': 'korcho',
  'করছেন': 'korchen',
  'করতে': 'korte',
  'পারব': 'parbo',
  'পারবো': 'parbo',
  'পারবেন': 'parben',
  'যে': 'je',
  'সে': 'she',
  'তুই': 'tui',
  'তুমি': 'tumi',
  'আপনি': 'apni',
  'আমরা': 'amra',
  'তোমরা': 'tomra',
  'তারা': 'tara',
  'এরা': 'era',
  'ওই': 'oi',
  'এই': 'ei',
  'সেই': 'shei',
  'এখন': 'ekhon',
  'তখন': 'tokhon',
  'কখন': 'kokhon',
  'যখন': 'jokhon',
  'যদি': 'jodi',
  'তবে': 'tobe',
  'কিন্তু': 'kintu',
  'আর': 'ar',
  'এবং': 'ebong',
  'বা': 'ba',
  'অথবা': 'othoba',
  'তাই': 'tai',
  'জন্য': 'jonno',
  'সাথে': 'sathe',
  'কাছে': 'kache',
  'থেকে': 'theke',
  'দিয়ে': 'diye',
  'মধ্যে': 'moddhe',
  'উপর': 'upor',
  'নিচে': 'niche',
  'সামনে': 'shamne',
  'পিছনে': 'pichone',
  'এখানে': 'ekhane',
  'সেখানে': 'shekhane',
  'কত': 'koto',
  'কয়টা': 'koyta',
  'অনেক': 'onek',
  'একটু': 'ektu',
  'খুব': 'khub',
  'বেশি': 'beshi',
  'কম': 'kom',
  'সব': 'shob',
  'সবাই': 'shobai',
  'কেউ': 'keu',
  'কিছু': 'kichu',
  'সুন্দর': 'shundor',
  'দারুণ': 'darun',
  'খারাপ': 'kharap',
  'নতুন': 'notun',
  'পুরানো': 'purano',
  'বড়': 'boro',
  'ছোট': 'choto',
  'তাড়াতাড়ি': 'taratari',
  'জলদি': 'joldi',
  'সত্যি': 'shotti',
  'মনে': 'mone',
  'হয়': 'hoy',
  'ছিল': 'chilo',
  'থাকুন': 'thakun',
  'বলুন': 'bolun',
  'বলো': 'bolo',
  'বল': 'bol',
  'শুনুন': 'shunun',
  'শোনো': 'shono',
  'দেখুন': 'dekhun',
  'দেখো': 'dekho',
  'যাও': 'jao',
  'যান': 'jan',
  'আসো': 'asho',
  'আসুন': 'ashun',
  'খাও': 'khao',
  'খান': 'khan',
  'নাও': 'nao',
  'নিন': 'nin',
  'দাও': 'dao',
  'দিন': 'din',
  'তৈরি': 'toiri',
  'রেডি': 'ready',
  'মডেল': 'model',
  'রিভিউ': 'review'
};

const VOWELS: Record<string, string> = {
  'অ': 'o',
  'আ': 'a',
  'ই': 'i',
  'ঈ': 'i',
  'উ': 'u',
  'ঊ': 'u',
  'ঋ': 'ri',
  'এ': 'e',
  'ঐ': 'oi',
  'ও': 'o',
  'ঔ': 'ou'
};

const KAR: Record<string, string> = {
  'া': 'a',
  'ি': 'i',
  'ী': 'i',
  'ু': 'u',
  'ূ': 'u',
  'ৃ': 'ri',
  'ে': 'e',
  'ৈ': 'oi',
  'ো': 'o',
  'ৌ': 'ou'
};

const CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n'
};

const NUMBERS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

// Check if string contains any Bengali characters (\u0980 - \u09FF)
export function containsBengaliScript(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

/**
 * Phonetically transliterates a Bengali word into Banglish
 */
function transliterateBengaliWord(word: string): string {
  // Check exact dictionary match
  if (WORD_DICTIONARY[word]) {
    return WORD_DICTIONARY[word];
  }

  // Strip punctuation, check dictionary, re-attach
  const cleanWord = word.replace(/^[^\u0980-\u09FF]+|[^\u0980-\u09FF]+$/g, '');
  if (WORD_DICTIONARY[cleanWord]) {
    return word.replace(cleanWord, WORD_DICTIONARY[cleanWord]);
  }

  let result = '';
  const len = word.length;
  const HASANTA = '\u09CD'; // ্

  for (let i = 0; i < len; i++) {
    const char = word[i];
    const nextChar = i + 1 < len ? word[i + 1] : '';
    const isHasantaNext = nextChar === HASANTA;

    if (NUMBERS[char]) {
      result += NUMBERS[char];
    } else if (VOWELS[char]) {
      result += VOWELS[char];
    } else if (KAR[char]) {
      result += KAR[char];
    } else if (char === HASANTA) {
      // Hasanta already handled
      continue;
    } else if (CONSONANTS[char]) {
      const cons = CONSONANTS[char];

      // Handle conjuncts (যুক্তবর্ণ)
      if (isHasantaNext && i + 2 < len) {
        const conjunctSecond = word[i + 2];
        if (CONSONANTS[conjunctSecond]) {
          // e.g. ক্ষ -> kkh
          if (char === 'ক' && conjunctSecond === 'ষ') {
            result += 'kkh';
            i += 2;
            continue;
          }
          // e.g. জ্ঞ -> gyo
          if (char === 'জ' && conjunctSecond === 'ঞ') {
            result += 'gyo';
            i += 2;
            continue;
          }
          // Default conjunct
          result += cons + CONSONANTS[conjunctSecond];
          i += 2;
          continue;
        }
      }

      result += cons;

      // Add inherent vowel 'o' if not followed by kar, hasanta, or word end
      const isNextKar = KAR[nextChar] !== undefined;
      const isNextHasanta = nextChar === HASANTA;
      const isWordEnd = i === len - 1 || !/[\u0980-\u09FF]/.test(nextChar);

      // In Bengali, certain terminal consonants don't take 'o', but medials usually take 'o' or 'a'
      if (!isNextKar && !isNextHasanta && !isWordEnd) {
        // e.g. কর -> koro, কলম -> kolom
        result += 'o';
      }
    } else if (char === '।') {
      result += '.';
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Transliterates entire text: transforms any Bengali script into Banglish
 * while preserving English words, numbers, emojis, and punctuation.
 */
export function ensureBanglish(text: string): string {
  if (!text) return '';
  if (!containsBengaliScript(text)) return text;

  // Split into tokens (words and separators)
  return text.replace(/[\u0980-\u09FF]+/g, (match) => {
    return transliterateBengaliWord(match);
  });
}
