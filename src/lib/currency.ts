export const SUPPORTED_CURRENCIES = ['GBP', 'USD', 'EUR', 'JPY', 'AUD', 'CAD', 'CHF'] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

export function currencySymbol(code?: string): string {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'AUD': return 'A$';
    case 'CAD': return 'C$';
    case 'CHF': return 'CHF ';
    case 'GBP': return '£';
    default: return '£';
  }
}

export function formatCurrency(value: number, code?: string): string {
  const symbol = currencySymbol(code);
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function guessCurrencyFromLocale(): CurrencyCode {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale.includes('US')) return 'USD';
    if (locale.includes('GB') || locale.includes('UK')) return 'GBP';
    if (locale.includes('JP')) return 'JPY';
    if (locale.includes('AU')) return 'AUD';
    if (locale.includes('CA')) return 'CAD';
    if (locale.includes('CH')) return 'CHF';
    if (['DE','FR','ES','IT','NL','PT','IE','AT','BE','FI','GR'].some(c => locale.includes(c))) return 'EUR';
    return 'GBP';
  } catch {
    return 'GBP';
  }
}
