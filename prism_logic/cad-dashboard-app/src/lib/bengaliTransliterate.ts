/**
 * Comprehensive Bengali Script to Banglish (English letters) Transliteration Engine.
 * Converts Bengali script (বাংলা লিপি) phonetically into natural, colloquial Banglish (Latin letters).
 * Guarantees 100% Latin output with ZERO leftover Bengali script characters.
 */

// Frequent conversational dictionary: mapped to colloquial, natural Banglish
export const BANGLISH_WORD_DICTIONARY: Record<string, string> = {
  // Greetings & Religious
  'আসসালামু': 'Assalamu',
  'আলাইকুম': 'Alaikum',
  'ওয়ালাইকুম': 'Walaikum',
  'আলহামদুলিল্লাহ': 'Alhamdulillah',
  'ইনশাআল্লাহ': 'Inshallah',
  'ইনশা-আল্লাহ': 'Inshallah',
  'মাশাআল্লাহ': 'Mashaallah',
  'সুবহানাল্লাহ': 'Subhanallah',
  'আল্লাহ': 'Allah',
  'হাফেজ': 'hafez',
  'আদাব': 'adab',
  'নমস্কার': 'nomoshkar',
  'হ্যালো': 'hello',
  'হাই': 'hi',

  // Pronouns
  'আমি': 'ami',
  'আমাকে': 'amake',
  'আমার': 'amar',
  'আমরা': 'amra',
  'আমাদের': 'amader',
  'তুমি': 'tumi',
  'তোমাকে': 'tomake',
  'তোমার': 'tomar',
  'তোমরা': 'tomra',
  'তোমাদের': 'tomader',
  'তুই': 'tui',
  'তোকে': 'toke',
  'তোর': 'tor',
  'তোরা': 'tora',
  'তোদের': 'toder',
  'আপনি': 'apni',
  'আপনাকে': 'apnake',
  'আপনার': 'apnar',
  'আপনারা': 'apnara',
  'আপনাদের': 'apnader',
  'সে': 'she',
  'তাকে': 'take',
  'তার': 'tar',
  'তারা': 'tara',
  'তাদের': 'tader',
  'তিনি': 'tini',
  'তাঁকে': 'take',
  'তাঁর': 'tar',
  'এরা': 'era',
  'ওরা': 'ora',
  'এই': 'ei',
  'ওই': 'oi',
  'সেই': 'shei',
  'এটা': 'eta',
  'ওটা': 'ota',
  'সেটা': 'sheta',
  'এইটা': 'eita',
  'ওইটা': 'oita',
  'সেইটা': 'sheita',
  'এগুলো': 'egulo',
  'ওগুলো': 'ogulo',
  'সেগুলো': 'shegulo',
  'এগুলা': 'egula',
  'ওগুলা': 'ogula',
  'সেগুলা': 'shegula',

  // Questions
  'কি': 'ki',
  'কী': 'ki',
  'কেন': 'keno',
  'কোথায়': 'kothay',
  'কোথায়': 'kothay',
  'কখন': 'kokhon',
  'কিভাবে': 'kibhabe',
  'কীভাবে': 'kibhabe',
  'কেমন': 'kemon',
  'কত': 'koto',
  'কয়টা': 'koyta',
  'কয়টা': 'koyta',
  'কোনটা': 'konta',
  'কোন': 'kon',
  'কোনো': 'kono',
  'কে': 'ke',
  'কাকে': 'kake',
  'কার': 'kar',
  'কারা': 'kara',
  'কিসের': 'kisher',

  // Affirmations & Negations
  'হ্যাঁ': 'hae',
  'হ্যা': 'hae',
  'হাঁ': 'hae',
  'না': 'na',
  'নাহ': 'nah',
  'নাই': 'nai',
  'নেই': 'nei',
  'নি': 'ni',
  'হুম': 'hum',
  'হুমম': 'humm',
  'আচ্ছা': 'accha',
  'ঠিক': 'thik',
  'অবশ্যই': 'obosshoi',
  'একদম': 'ekdom',
  'সত্যি': 'shotti',
  'হয়তো': 'hoyto',
  'হয়তো': 'hoyto',

  // Common Verbs - Be/Have/Exist
  'ভালো': 'bhalo',
  'ভাল': 'bhalo',
  'আছি': 'achi',
  'আছেন': 'achen',
  'আছো': 'acho',
  'আছিস': 'achish',
  'ছিল': 'chilo',
  'ছিলাম': 'chilam',
  'ছিলেন': 'chilen',
  'ছিলে': 'chile',
  'থাকব': 'thakbo',
  'থাকবো': 'thakbo',
  'থাকবেন': 'thakben',
  'থাকিস': 'thakish',
  'থাকি': 'thaki',
  'থাকুন': 'thakun',
  'থাকো': 'thako',
  'হবে': 'hobe',
  'হচ্ছে': 'hocche',
  'হয়েছে': 'hoyeche',
  'হয়েছে': 'hoyeche',
  'হয়': 'hoy',
  'হয়': 'hoy',
  'হল': 'holo',
  'হলো': 'holo',
  'হব': 'hobo',
  'হবো': 'hobo',

  // Common Verbs - Do
  'করব': 'korbo',
  'করবো': 'korbo',
  'করবেন': 'korben',
  'করছি': 'korchi',
  'করছেন': 'korchen',
  'করছে': 'korche',
  'করছ': 'korcho',
  'করছো': 'korcho',
  'করিস': 'korish',
  'করতে': 'korte',
  'কর': 'koro',
  'করো': 'koro',
  'করেন': 'koren',
  'করলাম': 'korlam',
  'করলেন': 'korlen',
  'করলে': 'korle',

  // Common Verbs - Can / Ability
  'পারব': 'parbo',
  'পারবো': 'parbo',
  'পারবেন': 'parben',
  'পারছি': 'parchi',
  'পারছিলে': 'parchile',
  'পারছেন': 'parchen',
  'পারি': 'pari',
  'পারো': 'paro',
  'পারেন': 'paren',
  'পারিস': 'parish',
  'পারলাম': 'parlam',

  // Common Verbs - Send / Give / Receive
  'পাঠাব': 'pathabo',
  'পাঠাবো': 'pathabo',
  'পাঠাবেন': 'pathaben',
  'পাঠিয়ে': 'pathiye',
  'পাঠিয়ে': 'pathiye',
  'পাঠাও': 'pathao',
  'পাঠান': 'pathan',
  'পাঠাচ্ছি': 'pathacchi',
  'পাঠালে': 'pathale',
  'পাঠালেন': 'pathalen',
  'দিব': 'dibo',
  'দিবো': 'dibo',
  'দেবেন': 'deben',
  'দিয়ে': 'diye',
  'দিয়ে': 'diye',
  'দাও': 'dao',
  'দিন': 'din',
  'দিচ্ছি': 'dichhi',
  'দিলে': 'dile',
  'দিলাম': 'dilam',
  'নিন': 'nin',
  'নাও': 'nao',
  'নিব': 'nibo',
  'নিবো': 'nibo',
  'নিচ্ছি': 'nicchi',
  'নিলাম': 'nilam',
  'পাব': 'pabo',
  'পাবো': 'pabo',
  'পাবেন': 'paben',
  'পেয়েছি': 'peyechi',
  'পেয়েছেন': 'peyechen',
  'পেলাম': 'pelam',
  'পাইছি': 'paichi',

  // Common Verbs - See / Say / Listen / Go / Come
  'দেখা': 'dekha',
  'দেখুন': 'dekhun',
  'দেখো': 'dekho',
  'দেখ': 'dekho',
  'দেখছি': 'dekhchi',
  'দেখলাম': 'dekhlam',
  'দেখবেন': 'dekhben',
  'বলুন': 'bolun',
  'বলো': 'bolo',
  'বল': 'bolo',
  'বলছি': 'bolchi',
  'বললেন': 'bollen',
  'বললাম': 'bollam',
  'শুনুন': 'shunun',
  'শোনো': 'shono',
  'শোন': 'shono',
  'শুনছি': 'shunchi',
  'শুনলাম': 'shunlam',
  'যাব': 'jabo',
  'যাবো': 'jabo',
  'যান': 'jan',
  'যাও': 'jao',
  'যাই': 'jai',
  'যাচ্ছি': 'jachhi',
  'গেলাম': 'gelam',
  'গেছি': 'gechi',
  'গেছেন': 'gechen',
  'গেছো': 'gecho',
  'আসুন': 'ashun',
  'আসো': 'asho',
  'আসছি': 'ashchi',
  'আসবেন': 'ashben',
  'আসবে': 'ashbe',
  'আসিস': 'ashish',
  'এসেছি': 'eshechi',
  'এসেছেন': 'eshechen',
  'এলাম': 'elam',

  // Connectives & Prepositions
  'এবং': 'ebong',
  'কিন্তু': 'kintu',
  'আর': 'ar',
  'তবে': 'tobe',
  'যদি': 'jodi',
  'তাই': 'tai',
  'কারণ': 'karon',
  'জন্য': 'jonno',
  'সাথে': 'sathe',
  'কাছে': 'kache',
  'থেকে': 'theke',
  'মধ্যে': 'moddhe',
  'ভেতর': 'bhetor',
  'ভিতরে': 'bhitore',
  'বাইরে': 'baire',
  'ওপর': 'opor',
  'উপর': 'upor',
  'নিচে': 'niche',
  'সামনে': 'shamne',
  'পেছনে': 'pechone',
  'পিছনে': 'pichone',
  'এখানে': 'ekhane',
  'সেখানে': 'shekhane',
  'কোথাও': 'kothao',

  // Time & Adverbs
  'এখন': 'ekhon',
  'তখন': 'tokhon',
  'যখন': 'jokhon',
  'কখনো': 'kokhono',
  'আজ': 'aaj',
  'আজকে': 'aajke',
  'কাল': 'kal',
  'কালকে': 'kalke',
  'পরশু': 'porshu',
  'সকাল': 'shokal',
  'সকালে': 'shokale',
  'দুপুর': 'dupur',
  'দুপুরে': 'dupure',
  'বিকাল': 'bikal',
  'বিকেল': 'bikel',
  'বিকালের': 'bikaler',
  'বিকেলের': 'bikeler',
  'সন্ধ্যা': 'shondha',
  'সন্ধ্যার': 'shondhar',
  'রাত': 'raat',
  'রাতে': 'rate',
  'দেরি': 'deri',
  'দেরী': 'deri',
  'তাড়াতাড়ি': 'taratari',
  'তাড়াতাড়ি': 'taratari',
  'জলদি': 'joldi',
  'তাড়া': 'tara',
  'তাড়া': 'tara',
  'সময়': 'shomoy',
  'সময়': 'shomoy',
  'সময়মতো': 'shomoymoto',
  'সময়মতো': 'shomoymoto',
  'অনেক': 'onek',
  'খুব': 'khub',
  'একটু': 'ektu',
  'বেশি': 'beshi',
  'কম': 'kom',
  'সব': 'shob',
  'সবাই': 'shobai',
  'কেউ': 'keu',
  'কিছু': 'kichu',
  'শুধু': 'shudhu',
  'মাত্র': 'matro',
  'আবার': 'abar',
  'বার': 'bar',

  // People & Relations
  'ভাই': 'bhai',
  'আপু': 'apu',
  'আপা': 'apa',
  'দোস্ত': 'dosto',
  'বন্ধু': 'bondhu',
  'দাদা': 'dada',
  'মামা': 'mama',
  'স্যার': 'sir',
  'ম্যাডাম': 'madam',
  'বস': 'boss',

  // Work & Technology
  'কাজ': 'kaj',
  'কাজটা': 'kajta',
  'কাজের': 'kajer',
  'ডিজাইন': 'design',
  'ডিজাইনটা': 'designta',
  'মডেল': 'model',
  'ফাইল': 'file',
  'ফাইলটা': 'fileta',
  'ক্লায়েন্ট': 'client',
  'ক্লায়েন্টের': 'clienter',
  'ক্লায়েন্ট': 'client',
  'লিংক': 'link',
  'ড্রাইভ': 'drive',
  'ড্রাইভে': 'drive-e',
  'গুগল': 'google',
  'আপলোড': 'upload',
  'ডাউনলোড': 'download',
  'চেক': 'check',
  'রিভিউ': 'review',
  'সমস্যা': 'shomossha',
  'টাকা': 'taka',
  'ব্যাংক': 'bank',
  'ব্যাংকের': 'banker',
  'ট্রান্সফার': 'transfer',
  'ফোন': 'phone',
  'কল': 'call',
  'মেসেজ': 'message',
  'ধন্যবাদ': 'dhonnobad',
  'অসংখ্য': 'oshonkho',
  'প্লিজ': 'please',
  'প্লীজ': 'please',
  'রেডি': 'ready',
  'কমপ্লিট': 'complete',
  'শেষ': 'shesh',
  'শুরু': 'shuru',
  'ফ্রি': 'free',
  'ব্যস্ত': 'byasto',
  'ওকে': 'ok',
  'বাই': 'bye',
  'খবর': 'khobor',
  'ছবি': 'chhobi',
  'কথা': 'kotha',
  'অফিস': 'office',
  'বাসা': 'basha',
  'বাড়ি': 'bari',
  'রাস্তা': 'rasta',
  'গাড়ি': 'gari',
};

const BENGALI_VOWELS: Record<string, string> = {
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
  'ঔ': 'ou',
};

const BENGALI_KARS: Record<string, string> = {
  'া': 'a',
  'ি': 'i',
  'ী': 'i',
  'ু': 'u',
  'ূ': 'u',
  'ৃ': 'ri',
  'ে': 'e',
  'ৈ': 'oi',
  'ো': 'o',
  'ৌ': 'ou',
};

const BENGALI_CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
};

const BENGALI_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

/**
 * Check if string contains any Bengali script characters or Bengali punctuation.
 */
export function containsBengaliScript(text: string): boolean {
  if (!text) return false;
  return /[\u0980-\u09FF\u0964\u0965]/.test(text);
}

/**
 * Transliterates a single Bengali word phonetically into Banglish.
 */
function transliterateBengaliWord(w: string): string {
  if (!w) return '';

  // Normalize nukta variants & zero-width joiners
  let word = w
    .replace(/ড়/g, 'r')
    .replace(/ঢ়/g, 'rh')
    .replace(/য়/g, 'y')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Exact dictionary match
  if (BANGLISH_WORD_DICTIONARY[word]) {
    return BANGLISH_WORD_DICTIONARY[word];
  }

  // Common Bengali suffixes (টা, টি, গুলো, গুলা, দের, এর, তে, কে, র, ইত্যাদি)
  const suffixes = [
    'গুলো', 'গুলা', 'দের', 'টারেই', 'টারও', 'টাতে', 'টায়', 'টার',
    'টাই', 'টা', 'টি', 'কে', 'এর', 'তে', 'র', 'ও', 'ই'
  ];
  for (const suf of suffixes) {
    if (word.endsWith(suf) && word.length > suf.length + 1) {
      const stem = word.slice(0, -suf.length);
      if (BANGLISH_WORD_DICTIONARY[stem]) {
        const sufTr = transliterateBengaliWord(suf);
        return BANGLISH_WORD_DICTIONARY[stem] + sufTr;
      }
    }
  }

  let result = '';
  const len = word.length;
  const HASANTA = '\u09CD'; // ্

  for (let i = 0; i < len; i++) {
    const char = word[i];
    const nextChar = i + 1 < len ? word[i + 1] : '';
    const isHasantaNext = nextChar === HASANTA;

    if (BENGALI_DIGITS[char]) {
      result += BENGALI_DIGITS[char];
    } else if (BENGALI_VOWELS[char]) {
      result += BENGALI_VOWELS[char];
    } else if (BENGALI_KARS[char]) {
      result += BENGALI_KARS[char];
    } else if (char === HASANTA) {
      continue;
    } else if (BENGALI_CONSONANTS[char]) {
      const cons = BENGALI_CONSONANTS[char];

      // Handle Conjuncts (যুক্তবর্ণ)
      if (isHasantaNext && i + 2 < len) {
        const conjunctSecond = word[i + 2];

        // Ja-phala (্য)
        if (conjunctSecond === 'য') {
          if (i === 0) {
            result += cons + 'y';
          } else {
            // Medial/terminal doubling, e.g. জন্য -> jonno, ধন্যবাদ -> dhonnobad
            result += cons + cons;
          }
          i += 2;
          continue;
        }

        // Ra-phala (্র)
        if (conjunctSecond === 'র') {
          result += cons + 'r';
          i += 2;
          continue;
        }

        // Ba-phala (্ব)
        if (conjunctSecond === 'ব') {
          if (i === 0) {
            result += cons;
          } else {
            result += cons + cons;
          }
          i += 2;
          continue;
        }

        // Special conjunct: ক্ষ -> kkh / kh
        if (char === 'ক' && conjunctSecond === 'ষ') {
          result += i === 0 ? 'kh' : 'kkh';
          i += 2;
          continue;
        }

        // Special conjunct: জ্ঞ -> gyo
        if (char === 'জ' && conjunctSecond === 'ঞ') {
          result += 'gyo';
          i += 2;
          continue;
        }

        // Standard conjunct fallback
        if (BENGALI_CONSONANTS[conjunctSecond]) {
          result += cons + BENGALI_CONSONANTS[conjunctSecond];
          i += 2;
          continue;
        }
      }

      result += cons;

      // Inherent vowel logic
      const isNextKar = BENGALI_KARS[nextChar] !== undefined;
      const isWordEnd = i === len - 1 || !/[\u0980-\u09FF]/.test(nextChar);

      if (!isNextKar && !isHasantaNext && !isWordEnd) {
        // Natural inherent vowel 'o'
        result += 'o';
      }
    } else if (char === '়' || char === 'ঽ') {
      // Ignore Nukta / Avagraha marks
      continue;
    } else {
      // Non-bengali characters
      result += char;
    }
  }

  return result;
}

/**
 * Transliterates text completely into Banglish (English letters).
 * - Converts Bengali Dari (।) to dot (.)
 * - Converts Bengali numerals (০-৯) to 0-9
 * - Transliterates all Bengali script words phonetically
 * - Guarantees 100% Latin alphabet output with ZERO leftover Bengali script characters
 */
export function ensureBanglish(text: string): string {
  if (!text) return '';
  if (!containsBengaliScript(text)) return text;

  // 1. Replace Bengali Dari (।) and Double Dari (॥) with standard period
  let output = text.replace(/[\u0964\u0965]/g, '.');

  // 2. Replace Bengali numerals with Latin numerals
  output = output.replace(/[০-৯]/g, (digit) => BENGALI_DIGITS[digit] || digit);

  // 3. Transliterate all Bengali script sequences
  output = output.replace(/[\u0980-\u09FF\u200B-\u200D]+/g, (match) => {
    return transliterateBengaliWord(match);
  });

  // 4. Absolute Safety Guarantee: Strip any unhandled Bengali Unicode glyphs
  // so NO Bengali writing can ever display in Banglish view mode
  output = output.replace(/[\u0980-\u09FF\u0964\u0965]/g, '');

  return output;
}
