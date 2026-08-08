export function getTaxIdLabel(countryName: string): string {
  if (!countryName || countryName === 'N/A') return 'Tax ID';
  const country = countryName.trim().toLowerCase();
  
  const map: Record<string, string> = {
    // North America
    'united states': 'EIN', 'united states of america': 'EIN', 'usa': 'EIN', 'us': 'EIN',
    'canada': 'Business Number (BN)', 'mexico': 'RFC',
    
    // Europe
    'united kingdom': 'VAT Number', 'uk': 'VAT Number', 'great britain': 'VAT Number',
    'ireland': 'VAT Number', 'france': 'TVA (VAT)', 'germany': 'Steuernummer / USt-IdNr.',
    'italy': 'Partita IVA', 'spain': 'NIF / CIF', 'portugal': 'NIF / IPC',
    'netherlands': 'BTW / KVK', 'belgium': 'TVA / BTW', 'switzerland': 'UID / MWST',
    'austria': 'UID / Steuernummer', 'sweden': 'Momsregistreringsnummer', 'norway': 'Orgnr / MVA',
    'denmark': 'CVR', 'finland': 'Y-tunnus / ALV', 'poland': 'NIP',
    'czech republic': 'DIČ / IČO', 'greece': 'AFM (VAT)', 'hungary': 'Adószám',
    'romania': 'CUI / CIF', 'bulgaria': 'EIK / BULSTAT', 'croatia': 'OIB',
    'serbia': 'PIB', 'slovakia': 'IČO / DIČ', 'slovenia': 'Davčna številka',
    'estonia': 'KMKR', 'latvia': 'PVN', 'lithuania': 'PVM kodas',
    'cyprus': 'VAT Number', 'malta': 'VAT Number', 'luxembourg': 'TVA',
    'iceland': 'VSK / VSK-númer', 'monaco': 'TVA (VAT)',
    
    // Oceania
    'australia': 'ABN', 'au': 'ABN', 'new zealand': 'NZBN / IRD', 'nz': 'NZBN / IRD',
    
    // Asia
    'india': 'GST No', 'ind': 'GST No', 'china': 'USCC (Tax ID)', 'prc': 'USCC (Tax ID)',
    'japan': 'Corporate Number', 'south korea': 'Business Registration Number',
    'singapore': 'UEN', 'hong kong': 'BRN', 'taiwan': 'BAN',
    'malaysia': 'TIN / SST', 'indonesia': 'NPWP', 'thailand': 'TIN',
    'vietnam': 'Mã số thuế (TIN)', 'philippines': 'TIN', 'pakistan': 'NTN',
    'bangladesh': 'BIN / TIN', 'sri lanka': 'TIN',
    
    // Middle East
    'united arab emirates': 'TRN (VAT)', 'uae': 'TRN (VAT)', 'saudi arabia': 'TIN / VAT',
    'israel': 'Company Number (Osek Pators)', 'turkey': 'VKN (Tax ID)',
    'egypt': 'Tax Registration Number', 'qatar': 'TIN', 'kuwait': 'Tax ID',
    'bahrain': 'VAT Account Number', 'oman': 'VAT Number',
    
    // Africa
    'south africa': 'VAT / Tax Reference Number', 'nigeria': 'TIN', 'kenya': 'PIN',
    'ghana': 'TIN', 'morocco': 'ICE', 'algeria': 'NIF', 'tunisia': 'Matricule Fiscal',
    
    // South America
    'brazil': 'CNPJ', 'argentina': 'CUIT', 'colombia': 'NIT', 'chile': 'RUT',
    'peru': 'RUC', 'venezuela': 'RIF', 'ecuador': 'RUC', 'uruguay': 'RUT', 'bolivia': 'NIT'
  };

  return map[country] || 'Tax ID / VAT No';
}
