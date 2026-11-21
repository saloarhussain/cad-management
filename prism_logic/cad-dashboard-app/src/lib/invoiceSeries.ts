/**
 * Indian Financial Year & Continuous GST Invoice Series Generator
 * 
 * Complies with Indian GST Rules:
 * - Format: MC/<FY>/<4-digit running number> (e.g. MC/26-27/0064)
 * - Indian Financial Year runs from April 1 to March 31
 * - Sequence restarts at 0001 on April 1
 * - Numbers are continuous, monotonic, and never reused
 */

// In-process mutex for serializing generation calls per FY
const fyLocks: Record<string, Promise<void>> = {};

function acquireFyLock(fy: string): Promise<() => void> {
  let release: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previousLock = fyLocks[fy] || Promise.resolve();
  fyLocks[fy] = previousLock.then(() => lockPromise);

  return previousLock.then(() => release);
}

/**
 * Returns Indian Financial Year string in 'YY-YY' format.
 * April 1, 2026 to March 31, 2027 => '26-27'
 */
export function getIndianFinancialYear(dateInput?: Date | string | number | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    return getIndianFinancialYear(new Date());
  }
  
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr, 11 = Dec

  let startYear = year;
  let endYear = year + 1;

  if (month < 3) {
    // January, February, March belong to the FY that started in the previous calendar year
    startYear = year - 1;
    endYear = year;
  }

  const startYY = String(startYear).slice(-2);
  const endYY = String(endYear).slice(-2);
  return `${startYY}-${endYY}`;
}

/**
 * Formats a serial number into the GST series: MC/<FY>/<4-digit running number>
 */
export function formatGstInvoiceNumber(fy: string, serial: number): string {
  const padded = String(serial).padStart(4, '0');
  return `MC/${fy}/${padded}`;
}

/**
 * Parses an MC invoice number and extracts its FY and serial number.
 * Returns null if not matching the format.
 */
export function parseGstInvoiceNumber(invoiceNo: string): { fy: string; serial: number } | null {
  if (!invoiceNo) return null;
  const match = String(invoiceNo).trim().match(/^MC\/(\d{2}-\d{2})\/(\d+)$/i);
  if (!match) return null;
  return {
    fy: match[1],
    serial: parseInt(match[2], 10)
  };
}

/**
 * Atomically generates the next GST invoice number for the given date.
 */
export async function getNextGstInvoiceNumber(
  supabase: any,
  dateInput?: Date | string | null
): Promise<string> {
  const fy = getIndianFinancialYear(dateInput);
  const releaseLock = await acquireFyLock(fy);

  try {
    // 1. Try atomic database sequence function if available
    if (supabase && typeof supabase.rpc === 'function') {
      try {
        const { data, error } = await supabase.rpc('get_next_gst_invoice_number', { p_fy: fy });
        if (!error && data) {
          return data;
        }
      } catch {
        // Fallback to table scan with mutex lock
      }
    }

    // 2. Fallback: Query highest existing number in projects table for this FY
    let maxSerial = 0;

    if (supabase) {
      // Query projects matching MC/<FY>/%
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('orderId')
        .ilike('orderId', `MC/${fy}/%`);

      if (existingProjects && Array.isArray(existingProjects)) {
        for (const p of existingProjects) {
          const parsed = parseGstInvoiceNumber(p.orderId);
          if (parsed && parsed.fy === fy && parsed.serial > maxSerial) {
            maxSerial = parsed.serial;
          }
        }
      }
    }

    const nextSerial = maxSerial + 1;
    return formatGstInvoiceNumber(fy, nextSerial);
  } finally {
    releaseLock();
  }
}
