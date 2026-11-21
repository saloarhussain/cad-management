/**
 * Indian Financial Year & Continuous GST Invoice Series Tests
 */

import { getIndianFinancialYear, formatGstInvoiceNumber, parseGstInvoiceNumber } from './invoiceSeries';

export function runInvoiceSeriesValidation() {
  console.log('--- TEST 1: Indian Financial Year Rollover ---');
  if (getIndianFinancialYear('2026-03-31T23:59:59') !== '25-26') throw new Error('FY test failed for 2026-03-31');
  if (getIndianFinancialYear('2026-04-01T00:00:00') !== '26-27') throw new Error('FY test failed for 2026-04-01');
  if (getIndianFinancialYear('2026-12-31T23:59:59') !== '26-27') throw new Error('FY test failed for 2026-12-31');
  if (getIndianFinancialYear('2027-01-01T00:00:00') !== '26-27') throw new Error('FY test failed for 2027-01-01');
  if (getIndianFinancialYear('2027-03-31T23:59:59') !== '26-27') throw new Error('FY test failed for 2027-03-31');
  if (getIndianFinancialYear('2027-04-01T00:00:00') !== '27-28') throw new Error('FY rollover test failed for 2027-04-01');
  console.log('✓ All FY calculation and rollover tests passed!');

  console.log('\n--- TEST 2: Formatting and Parsing ---');
  if (formatGstInvoiceNumber('26-27', 1) !== 'MC/26-27/0001') throw new Error('Format failed for 1');
  if (formatGstInvoiceNumber('26-27', 64) !== 'MC/26-27/0064') throw new Error('Format failed for 64');
  if (formatGstInvoiceNumber('26-27', 999) !== 'MC/26-27/0999') throw new Error('Format failed for 999');
  if (formatGstInvoiceNumber('26-27', 1000) !== 'MC/26-27/1000') throw new Error('Format failed for 1000');

  const parsed = parseGstInvoiceNumber('MC/26-27/0064');
  if (!parsed || parsed.fy !== '26-27' || parsed.serial !== 64) throw new Error('Parse failed for MC/26-27/0064');
  if (parseGstInvoiceNumber('FO8234038CF82') !== null) throw new Error('Parse failed for FO ID');
  console.log('✓ Formatting and parsing tests passed!');

  return true;
}
