import { z } from "zod";

/**
 * Currency configuration for display and formatting
 */
export interface CurrencyConfig {
  /** ISO 4217 currency code */
  code: string;
  /** Display symbol (e.g., "$", "£", "AED") */
  symbol: string;
  /** Full currency name */
  name: string;
  /** Primary locale for Intl.NumberFormat */
  locale: string;
  /** Standard decimal places (0 for JPY, 2 for most) */
  decimalPlaces: number;
  /** Symbol position for manual formatting fallback */
  symbolPosition: "before" | "after";
  /** Lowercase code for Stripe API */
  stripeCurrency: string;
  /** Flag emoji for visual identification */
  flag: string;
}

/**
 * Supported currencies with full metadata
 * Ordered by common usage in tour operations
 */
export const SUPPORTED_CURRENCIES = {
  // Gulf Region (Primary market)
  AED: {
    code: "AED",
    symbol: "AED",
    name: "UAE Dirham",
    locale: "en-AE",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "aed",
    flag: "🇦🇪",
  },
  SAR: {
    code: "SAR",
    symbol: "SAR",
    name: "Saudi Riyal",
    locale: "ar-SA",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "sar",
    flag: "🇸🇦",
  },
  QAR: {
    code: "QAR",
    symbol: "QAR",
    name: "Qatari Riyal",
    locale: "ar-QA",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "qar",
    flag: "🇶🇦",
  },
  BHD: {
    code: "BHD",
    symbol: "BHD",
    name: "Bahraini Dinar",
    locale: "ar-BH",
    decimalPlaces: 3, // BHD uses 3 decimal places
    symbolPosition: "before",
    stripeCurrency: "bhd",
    flag: "🇧🇭",
  },
  KWD: {
    code: "KWD",
    symbol: "KWD",
    name: "Kuwaiti Dinar",
    locale: "ar-KW",
    decimalPlaces: 3, // KWD uses 3 decimal places
    symbolPosition: "before",
    stripeCurrency: "kwd",
    flag: "🇰🇼",
  },
  OMR: {
    code: "OMR",
    symbol: "OMR",
    name: "Omani Rial",
    locale: "ar-OM",
    decimalPlaces: 3, // OMR uses 3 decimal places
    symbolPosition: "before",
    stripeCurrency: "omr",
    flag: "🇴🇲",
  },

  // Major World Currencies
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    locale: "en-US",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "usd",
    flag: "🇺🇸",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    locale: "de-DE",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "eur",
    flag: "🇪🇺",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    locale: "en-GB",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "gbp",
    flag: "🇬🇧",
  },
  CHF: {
    code: "CHF",
    symbol: "CHF",
    name: "Swiss Franc",
    locale: "de-CH",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "chf",
    flag: "🇨🇭",
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    locale: "ja-JP",
    decimalPlaces: 0, // No decimal places for JPY
    symbolPosition: "before",
    stripeCurrency: "jpy",
    flag: "🇯🇵",
  },

  // Asia Pacific
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    locale: "en-IN",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "inr",
    flag: "🇮🇳",
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    locale: "en-SG",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "sgd",
    flag: "🇸🇬",
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    locale: "en-AU",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "aud",
    flag: "🇦🇺",
  },
  NZD: {
    code: "NZD",
    symbol: "NZ$",
    name: "New Zealand Dollar",
    locale: "en-NZ",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "nzd",
    flag: "🇳🇿",
  },
  HKD: {
    code: "HKD",
    symbol: "HK$",
    name: "Hong Kong Dollar",
    locale: "zh-HK",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "hkd",
    flag: "🇭🇰",
  },
  THB: {
    code: "THB",
    symbol: "฿",
    name: "Thai Baht",
    locale: "th-TH",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "thb",
    flag: "🇹🇭",
  },
  MYR: {
    code: "MYR",
    symbol: "RM",
    name: "Malaysian Ringgit",
    locale: "ms-MY",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "myr",
    flag: "🇲🇾",
  },
  PHP: {
    code: "PHP",
    symbol: "₱",
    name: "Philippine Peso",
    locale: "en-PH",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "php",
    flag: "🇵🇭",
  },
  IDR: {
    code: "IDR",
    symbol: "Rp",
    name: "Indonesian Rupiah",
    locale: "id-ID",
    decimalPlaces: 0, // IDR typically shows no decimals
    symbolPosition: "before",
    stripeCurrency: "idr",
    flag: "🇮🇩",
  },

  // Americas
  CAD: {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    locale: "en-CA",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "cad",
    flag: "🇨🇦",
  },
  MXN: {
    code: "MXN",
    symbol: "MX$",
    name: "Mexican Peso",
    locale: "es-MX",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "mxn",
    flag: "🇲🇽",
  },
  BRL: {
    code: "BRL",
    symbol: "R$",
    name: "Brazilian Real",
    locale: "pt-BR",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "brl",
    flag: "🇧🇷",
  },

  // Africa & Middle East
  ZAR: {
    code: "ZAR",
    symbol: "R",
    name: "South African Rand",
    locale: "en-ZA",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "zar",
    flag: "🇿🇦",
  },
  EGP: {
    code: "EGP",
    symbol: "E£",
    name: "Egyptian Pound",
    locale: "ar-EG",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "egp",
    flag: "🇪🇬",
  },
  MAD: {
    code: "MAD",
    symbol: "MAD",
    name: "Moroccan Dirham",
    locale: "ar-MA",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "mad",
    flag: "🇲🇦",
  },
  TRY: {
    code: "TRY",
    symbol: "₺",
    name: "Turkish Lira",
    locale: "tr-TR",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "try",
    flag: "🇹🇷",
  },
  ILS: {
    code: "ILS",
    symbol: "₪",
    name: "Israeli Shekel",
    locale: "he-IL",
    decimalPlaces: 2,
    symbolPosition: "before",
    stripeCurrency: "ils",
    flag: "🇮🇱",
  },

  // Europe
  SEK: {
    code: "SEK",
    symbol: "kr",
    name: "Swedish Krona",
    locale: "sv-SE",
    decimalPlaces: 2,
    symbolPosition: "after",
    stripeCurrency: "sek",
    flag: "🇸🇪",
  },
  NOK: {
    code: "NOK",
    symbol: "kr",
    name: "Norwegian Krone",
    locale: "nb-NO",
    decimalPlaces: 2,
    symbolPosition: "after",
    stripeCurrency: "nok",
    flag: "🇳🇴",
  },
  DKK: {
    code: "DKK",
    symbol: "kr",
    name: "Danish Krone",
    locale: "da-DK",
    decimalPlaces: 2,
    symbolPosition: "after",
    stripeCurrency: "dkk",
    flag: "🇩🇰",
  },
  PLN: {
    code: "PLN",
    symbol: "zł",
    name: "Polish Zloty",
    locale: "pl-PL",
    decimalPlaces: 2,
    symbolPosition: "after",
    stripeCurrency: "pln",
    flag: "🇵🇱",
  },
  CZK: {
    code: "CZK",
    symbol: "Kč",
    name: "Czech Koruna",
    locale: "cs-CZ",
    decimalPlaces: 2,
    symbolPosition: "after",
    stripeCurrency: "czk",
    flag: "🇨🇿",
  },
  HUF: {
    code: "HUF",
    symbol: "Ft",
    name: "Hungarian Forint",
    locale: "hu-HU",
    decimalPlaces: 0, // HUF typically shows no decimals
    symbolPosition: "after",
    stripeCurrency: "huf",
    flag: "🇭🇺",
  },
  RON: {
    code: "RON",
    symbol: "lei",
    name: "Romanian Leu",
    locale: "ro-RO",
    decimalPlaces: 2,
    symbolPosition: "after",
    stripeCurrency: "ron",
    flag: "🇷🇴",
  },
} as const;

/** Default currency for the system */
export const DEFAULT_CURRENCY = "AED" as const;

/** Array of all supported currency codes */
export const CURRENCY_CODES = Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[];

/** Type for supported currency codes */
export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

/** Zod schema for currency validation */
export const currencyCodeSchema = z.enum(
  CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]]
);

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code in SUPPORTED_CURRENCIES;
}

/**
 * Get currency configuration, with fallback to default
 */
export function getCurrencyConfig(code: string): CurrencyConfig {
  if (isSupportedCurrency(code)) {
    return SUPPORTED_CURRENCIES[code];
  }
  return SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
}

/**
 * Get currencies grouped by region for UI display
 */
export function getCurrenciesByRegion(): Record<string, CurrencyConfig[]> {
  return {
    "Gulf Region": [
      SUPPORTED_CURRENCIES.AED,
      SUPPORTED_CURRENCIES.SAR,
      SUPPORTED_CURRENCIES.QAR,
      SUPPORTED_CURRENCIES.BHD,
      SUPPORTED_CURRENCIES.KWD,
      SUPPORTED_CURRENCIES.OMR,
    ],
    "Major Currencies": [
      SUPPORTED_CURRENCIES.USD,
      SUPPORTED_CURRENCIES.EUR,
      SUPPORTED_CURRENCIES.GBP,
      SUPPORTED_CURRENCIES.CHF,
      SUPPORTED_CURRENCIES.JPY,
    ],
    "Asia Pacific": [
      SUPPORTED_CURRENCIES.INR,
      SUPPORTED_CURRENCIES.SGD,
      SUPPORTED_CURRENCIES.AUD,
      SUPPORTED_CURRENCIES.NZD,
      SUPPORTED_CURRENCIES.HKD,
      SUPPORTED_CURRENCIES.THB,
      SUPPORTED_CURRENCIES.MYR,
      SUPPORTED_CURRENCIES.PHP,
      SUPPORTED_CURRENCIES.IDR,
    ],
    "Americas": [
      SUPPORTED_CURRENCIES.CAD,
      SUPPORTED_CURRENCIES.MXN,
      SUPPORTED_CURRENCIES.BRL,
    ],
    "Europe": [
      SUPPORTED_CURRENCIES.SEK,
      SUPPORTED_CURRENCIES.NOK,
      SUPPORTED_CURRENCIES.DKK,
      SUPPORTED_CURRENCIES.PLN,
      SUPPORTED_CURRENCIES.CZK,
      SUPPORTED_CURRENCIES.HUF,
      SUPPORTED_CURRENCIES.RON,
    ],
    "Africa & Middle East": [
      SUPPORTED_CURRENCIES.ZAR,
      SUPPORTED_CURRENCIES.EGP,
      SUPPORTED_CURRENCIES.MAD,
      SUPPORTED_CURRENCIES.TRY,
      SUPPORTED_CURRENCIES.ILS,
    ],
  };
}

/**
 * Search currencies by code or name
 */
export function searchCurrencies(query: string): CurrencyConfig[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return Object.values(SUPPORTED_CURRENCIES);

  return Object.values(SUPPORTED_CURRENCIES).filter(
    (currency) =>
      currency.code.toLowerCase().includes(normalizedQuery) ||
      currency.name.toLowerCase().includes(normalizedQuery) ||
      currency.symbol.toLowerCase().includes(normalizedQuery)
  );
}
