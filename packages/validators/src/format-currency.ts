import {
  type CurrencyCode,
  type CurrencyConfig,
  getCurrencyConfig,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
} from "./currency";

export interface FormatCurrencyOptions {
  /** Show currency symbol/code (default: true) */
  showCurrency?: boolean;
  /** Use compact notation for large numbers (default: false) */
  compact?: boolean;
  /** Force a specific number of decimal places (overrides currency default) */
  decimals?: number;
  /** Show plus sign for positive numbers (default: false) */
  showPositiveSign?: boolean;
  /** Use accounting format for negative numbers (parentheses) */
  accountingFormat?: boolean;
}

/**
 * Get the minor unit multiplier for a currency
 * Most currencies use 100 (cents), some use 1000 (fils), JPY uses 1
 */
export function getMinorUnitMultiplier(currency: string): number {
  const config = getCurrencyConfig(currency);
  return Math.pow(10, config.decimalPlaces);
}

/**
 * Convert minor units (cents/fils) to major units (dollars/dirhams)
 */
export function fromMinorUnits(amount: number, currency: string): number {
  return amount / getMinorUnitMultiplier(currency);
}

/**
 * Convert major units (dollars/dirhams) to minor units (cents/fils)
 */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * getMinorUnitMultiplier(currency));
}

/**
 * Format a currency amount for display
 *
 * @param amount - The amount to format (in major units, e.g., 100.50 not 10050)
 * @param currency - ISO 4217 currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.50, "AED") // "AED 1,234.50"
 * formatCurrency(1234.50, "USD") // "$1,234.50"
 * formatCurrency(1234, "JPY") // "¥1,234"
 * formatCurrency(1234.567, "BHD") // "BHD 1,234.567"
 */
export function formatCurrency(
  amount: number | string,
  currency: string = DEFAULT_CURRENCY,
  options: FormatCurrencyOptions = {}
): string {
  const {
    showCurrency = true,
    compact = false,
    decimals,
    showPositiveSign = false,
    accountingFormat = false,
  } = options;

  const config = getCurrencyConfig(currency);
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return showCurrency ? `${config.symbol} 0` : "0";
  }

  const decimalPlaces = decimals ?? config.decimalPlaces;

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: showCurrency ? "currency" : "decimal",
      currency: showCurrency ? config.code : undefined,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      notation: compact ? "compact" : "standard",
      currencySign: accountingFormat ? "accounting" : "standard",
    });

    let formatted = formatter.format(numAmount);

    // Add positive sign if requested
    if (showPositiveSign && numAmount > 0) {
      formatted = `+${formatted}`;
    }

    return formatted;
  } catch {
    // Fallback for unsupported locales
    const absAmount = Math.abs(numAmount);
    const formattedNumber = absAmount.toLocaleString("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });

    const sign = numAmount < 0 ? "-" : showPositiveSign && numAmount > 0 ? "+" : "";

    if (!showCurrency) {
      return `${sign}${formattedNumber}`;
    }

    if (config.symbolPosition === "after") {
      return `${sign}${formattedNumber} ${config.symbol}`;
    }
    return `${sign}${config.symbol} ${formattedNumber}`;
  }
}

/**
 * Format a price for display (convenience wrapper)
 * Handles string prices from database (stored as decimal strings)
 */
export function formatPrice(
  price: string | number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  options: FormatCurrencyOptions = {}
): string {
  if (price === null || price === undefined) {
    return formatCurrency(0, currency, options);
  }
  return formatCurrency(price, currency, options);
}

/**
 * Format currency amount from minor units (cents/fils)
 * Use this when working with Stripe amounts
 */
export function formatFromMinorUnits(
  amountInMinorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  options: FormatCurrencyOptions = {}
): string {
  const majorUnits = fromMinorUnits(amountInMinorUnits, currency);
  return formatCurrency(majorUnits, currency, options);
}

/**
 * Parse a formatted currency string back to a number
 * Returns NaN if parsing fails
 */
export function parseCurrency(
  formatted: string,
  currency: string = DEFAULT_CURRENCY
): number {
  if (!formatted || typeof formatted !== "string") {
    return NaN;
  }

  const config = getCurrencyConfig(currency);

  // Remove currency symbols, codes, and common formatting
  let cleaned = formatted
    .replace(new RegExp(`\\s*${config.code}\\s*`, "gi"), "")
    .replace(new RegExp(`\\s*${config.symbol}\\s*`, "g"), "")
    .replace(/[()]/g, "") // Remove accounting parentheses
    .replace(/\s/g, "") // Remove spaces
    .trim();

  // Handle accounting format (negative in parentheses becomes negative)
  const isNegative = formatted.includes("(") && formatted.includes(")");

  // Determine decimal separator based on locale
  // Most locales use "." but some European locales use ","
  const testFormatter = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const testFormatted = testFormatter.format(1.1);
  const decimalSeparator = testFormatted.includes(",") ? "," : ".";

  // Handle different decimal separators
  if (decimalSeparator === ",") {
    // European format: 1.234,56 -> 1234.56
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // US format: 1,234.56 -> 1234.56
    cleaned = cleaned.replace(/,/g, "");
  }

  const result = parseFloat(cleaned);
  return isNegative ? -Math.abs(result) : result;
}

/**
 * Format a currency range (e.g., "AED 100 - AED 500")
 */
export function formatCurrencyRange(
  min: number | string,
  max: number | string,
  currency: string = DEFAULT_CURRENCY,
  options: FormatCurrencyOptions = {}
): string {
  const formattedMin = formatCurrency(min, currency, options);
  const formattedMax = formatCurrency(max, currency, options);
  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Get symbol only for a currency (e.g., "$", "AED", "£")
 */
export function getCurrencySymbol(currency: string): string {
  return getCurrencyConfig(currency).symbol;
}

/**
 * Compare two currency amounts
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareCurrencyAmounts(
  a: number | string,
  b: number | string
): -1 | 0 | 1 {
  const numA = typeof a === "string" ? parseFloat(a) : a;
  const numB = typeof b === "string" ? parseFloat(b) : b;

  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
}

/**
 * Check if amount is zero or effectively zero
 */
export function isZeroAmount(
  amount: number | string | null | undefined,
  currency: string = DEFAULT_CURRENCY
): boolean {
  if (amount === null || amount === undefined) return true;

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return true;

  // Consider amounts less than the smallest unit as zero
  const minUnit = 1 / getMinorUnitMultiplier(currency);
  return Math.abs(numAmount) < minUnit;
}

/**
 * Format balance due with special handling
 * Shows "Paid" for zero, red styling indicator for unpaid
 */
export function formatBalanceDue(
  amount: number | string | null | undefined,
  currency: string = DEFAULT_CURRENCY
): { text: string; isPaid: boolean; isOverdue?: boolean } {
  if (isZeroAmount(amount, currency)) {
    return { text: "Paid", isPaid: true };
  }

  const numAmount =
    typeof amount === "string" ? parseFloat(amount) : amount || 0;

  return {
    text: formatCurrency(numAmount, currency),
    isPaid: false,
    isOverdue: numAmount > 0,
  };
}

/**
 * Stripe-compatible currency code (lowercase)
 */
export function getStripeCurrency(currency: string): string {
  return getCurrencyConfig(currency).stripeCurrency;
}

/**
 * Validate that an amount has correct decimal places for a currency
 */
export function validateCurrencyPrecision(
  amount: number,
  currency: string
): boolean {
  const config = getCurrencyConfig(currency);
  const multiplier = getMinorUnitMultiplier(currency);
  const inMinorUnits = amount * multiplier;

  // Check if amount has more decimal places than allowed
  return Number.isInteger(Math.round(inMinorUnits * 100) / 100);
}

/**
 * Round amount to currency's decimal precision
 */
export function roundToCurrencyPrecision(
  amount: number,
  currency: string
): number {
  const config = getCurrencyConfig(currency);
  const multiplier = getMinorUnitMultiplier(currency);
  return Math.round(amount * multiplier) / multiplier;
}
