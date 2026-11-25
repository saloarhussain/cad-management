/**
 * GLOBAL PLATFORM CONFIGURATION (CADONCE FOUNDER SETTINGS)
 * These settings are managed by the platform owner (You).
 */
export const PLATFORM_CONFIG = {
  // The percentage taken from Designer payouts
  COMMISSION_RATE: 5, 
  
  // Platform Owner's Razorpay Keys (Where commissions are collected)
  RAZORPAY_KEY_ID: 'rzp_test_SkpDwr5coLX8wd', 
  RAZORPAY_KEY_SECRET: 'PSml4tkN9NhHZtonfJ9RbGsu',
  
  // Platform Owner's Wallet for manual settlements
  FOUNDER_ESCROW_WALLET: 'cadonce.treasury@paypal.com', // Replace with your ID
  
  // Platform Display Name
  PLATFORM_NAME: 'CADONCE',

  // Central Email Configuration (Founder's Email)
  FOUNDER_EMAIL: 'admin.cadonce@gmail.com',
  FOUNDER_EMAIL_PASSWORD: 'ssxa srxh qwjm xqen',
  FOUNDER_SENDER_NAME: 'CADONCE'
};

export const GLOBAL_CURRENCIES = [
  { label: 'US Dollar', code: 'USD', symbol: '$' },
  { label: 'Euro', code: 'EUR', symbol: '€' },
  { label: 'British Pound', code: 'GBP', symbol: '£' },
  { label: 'Indian Rupee', code: 'INR', symbol: '₹' },
  { label: 'Australian Dollar', code: 'AUD', symbol: 'A$' },
  { label: 'Canadian Dollar', code: 'CAD', symbol: 'C$' },
  { label: 'Singapore Dollar', code: 'SGD', symbol: 'S$' },
  { label: 'UAE Dirham', code: 'AED', symbol: 'د.إ' },
  { label: 'Saudi Riyal', code: 'SAR', symbol: '﷼' },
  { label: 'Japanese Yen', code: 'JPY', symbol: '¥' },
  { label: 'Chinese Yuan', code: 'CNY', symbol: '¥' },
  { label: 'Swiss Franc', code: 'CHF', symbol: 'CHF' },
  { label: 'South African Rand', code: 'ZAR', symbol: 'R' },
  { label: 'New Zealand Dollar', code: 'NZD', symbol: 'NZ$' },
  { label: 'Mexican Peso', code: 'MXN', symbol: '$' },
  { label: 'Brazilian Real', code: 'BRL', symbol: 'R$' },
  { label: 'Russian Ruble', code: 'RUB', symbol: '₽' },
  { label: 'Swedish Krona', code: 'SEK', symbol: 'kr' },
  { label: 'Norwegian Krone', code: 'NOK', symbol: 'kr' },
  { label: 'Turkish Lira', code: 'TRY', symbol: '₺' },
  { label: 'South Korean Won', code: 'KRW', symbol: '₩' },
  { label: 'Indonesian Rupiah', code: 'IDR', symbol: 'Rp' },
  { label: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM' },
  { label: 'Philippine Peso', code: 'PHP', symbol: '₱' },
  { label: 'Thai Baht', code: 'THB', symbol: '฿' },
];

export function getCurrencySymbol(code: string): string {
  if (!code) return '$';
  const trimmed = code.trim();
  const upper = trimmed.toUpperCase();
  const mapping: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    // Fallback for existing symbols in database
    '$': '$',
    '€': '€',
    '£': '£',
    '₹': '₹',
    '¥': '¥',
    'A$': 'A$',
    'C$': 'C$'
  };
  if (mapping[upper]) return mapping[upper];
  const found = GLOBAL_CURRENCIES.find(c => c.code === upper || c.symbol === trimmed);
  if (found) return found.symbol;
  return trimmed;
}

/**
 * Resolves a currency code or symbol (case-insensitive) to a 3-letter ISO code.
 */
export function resolveCurrencyCode(curr?: string | null, fallbackCode: string = 'USD'): string {
  if (!curr || !String(curr).trim()) return fallbackCode;
  const trimmed = String(curr).trim();
  const upper = trimmed.toUpperCase();

  const symbolAliases: Record<string, string> = {
    '$': 'USD',
    'US$': 'USD',
    '₹': 'INR',
    'RS': 'INR',
    'RS.': 'INR',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    'A$': 'AUD',
    'AU$': 'AUD',
    'C$': 'CAD',
    'CA$': 'CAD',
    'S$': 'SGD',
    'NZ$': 'NZD',
    'R$': 'BRL',
  };
  if (symbolAliases[upper]) return symbolAliases[upper];

  const found = GLOBAL_CURRENCIES.find(
    c => c.code === upper || c.symbol.toUpperCase() === upper
  );
  if (found) return found.code;

  return fallbackCode;
}

/**
 * Parses a numeric value from a stored amount string (e.g. "₹1,500", "1500").
 */
export function parseNumericAmount(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  if (!cleaned) return 0;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Extracts the effective designer expense for a project.
 * Falls back to the [MANUAL_PAYMENT] Amount Paid block in description when expense is 0/empty.
 */
export function getEffectiveExpense(project: any): number {
  const direct = parseNumericAmount(project?.expense);
  if (direct > 0) return direct;

  const desc = typeof project?.description === 'string'
    ? project.description
    : (typeof project?.brief === 'string' ? project.brief : '');
  if (desc && desc.includes('[MANUAL_PAYMENT]')) {
    const matches = [...desc.matchAll(/Amount Paid:\s*([^\n\r]+)/gi)];
    if (matches.length > 0) {
      const totalManual = matches.reduce((sum, m) => {
        const amt = parseNumericAmount(m[1]);
        return amt > 0 ? sum + amt : sum;
      }, 0);
      if (totalManual > 0) return totalManual;
    }
  }
  return direct > 0 ? direct : 0;
}

export function isProjectCancelled(p: any): boolean {
  const s = String(p?.status || '').toLowerCase();
  return (
    s === 'cancelled' ||
    Boolean(p?.cancelled_at) ||
    (Array.isArray(p?.tags) && p.tags.includes('STATUS:CANCELLED'))
  );
}

export function isProjectCompleted(p: any): boolean {
  const s = String(p?.status || '').toLowerCase();
  return s.includes('complete') || s.includes('done') || s.includes('delivered');
}

export function isProjectPaidOut(p: any): boolean {
  const payout = String(p?.payoutStatus || '').toLowerCase();
  const desc = typeof p?.description === 'string' ? p.description : '';
  return payout === 'paid' || desc.includes('[MANUAL_PAYMENT]');
}

/**
 * Parses YYYY-MM-DD in local time (avoiding UTC midnight day shifts) or ISO timestamps.
 */
export function parseProjectDate(dateInput?: string | number | null): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(dateInput).trim();
  if (!str) return null;
  const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Resolves the authoritative business date of a project (orderDate first, then createdAt, then numeric id).
 */
export function getProjectDate(p: any): Date | null {
  const fromOrder = parseProjectDate(p?.orderDate);
  if (fromOrder) return fromOrder;
  const fromCreated = parseProjectDate(p?.createdAt);
  if (fromCreated) return fromCreated;
  if (p?.id && !isNaN(Number(p.id)) && Number(p.id) > 1000000000000) {
    return parseProjectDate(Number(p.id));
  }
  return null;
}

export function getInvoiceCurrencyDetails(revenueCurrency?: string): { code: string; symbol: string } {
  const raw = (revenueCurrency || 'USD').trim();
  const upper = raw.toUpperCase();

  // 1. Direct match by 3-letter code
  const matchByCode = GLOBAL_CURRENCIES.find(c => c.code === upper);
  if (matchByCode) {
    let sym = matchByCode.symbol;
    // For dollar currencies (USD, AUD, CAD, NZD, SGD, MXN), on the invoice where header shows (AUD), (USD) etc, '$' is standard:
    if (['USD', 'AUD', 'CAD', 'NZD', 'SGD', 'MXN'].includes(matchByCode.code)) {
      sym = '$';
    }
    return { code: matchByCode.code, symbol: sym };
  }

  // 2. Direct match by symbol
  const symbolMapping: Record<string, { code: string; symbol: string }> = {
    '$': { code: 'USD', symbol: '$' },
    '€': { code: 'EUR', symbol: '€' },
    '£': { code: 'GBP', symbol: '£' },
    '₹': { code: 'INR', symbol: '₹' },
    '¥': { code: 'JPY', symbol: '¥' },
    'A$': { code: 'AUD', symbol: '$' },
    'AU$': { code: 'AUD', symbol: '$' },
    'C$': { code: 'CAD', symbol: '$' },
    'CA$': { code: 'CAD', symbol: '$' },
    'S$': { code: 'SGD', symbol: '$' },
    'NZ$': { code: 'NZD', symbol: '$' },
    'R$': { code: 'BRL', symbol: 'R$' },
  };

  if (symbolMapping[raw] || symbolMapping[upper]) {
    return symbolMapping[raw] || symbolMapping[upper];
  }

  const matchBySymbol = GLOBAL_CURRENCIES.find(c => c.symbol === raw);
  if (matchBySymbol) {
    let sym = matchBySymbol.symbol;
    if (['USD', 'AUD', 'CAD', 'NZD', 'SGD', 'MXN'].includes(matchBySymbol.code)) {
      sym = '$';
    }
    return { code: matchBySymbol.code, symbol: sym };
  }

  return { code: upper.length === 3 ? upper : 'USD', symbol: '$' };
}
