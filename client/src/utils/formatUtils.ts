/**
 * Currency formatting utilities for the Mishin Learn Platform
 * Ensures consistent formatting of monetary values throughout the application
 */

/**
 * Formats a number as currency with exactly 2 decimal places
 * @param amount - The amount to format
 * @param currency - The currency symbol (default: '$')
 * @returns Formatted currency string (e.g., "$3.00", "$3.90")
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = '$'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency}0.00`;
  }
  
  return `${currency}${Number(amount).toFixed(2)}`;
};

/**
 * Formats a number to 2 decimal places without currency symbol
 * @param number - The number to format
 * @returns Formatted number string (e.g., "3.00", "3.90")
 */
export const formatDecimal = (number: number | null | undefined): string => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0.00';
  }
  
  return Number(number).toFixed(2);
};

/**
 * Safely calculates percentage with proper rounding
 * @param value - Current value
 * @param total - Total value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "75.50%")
 */
export const formatPercentage = (value: number, total: number, decimals: number = 2): string => {
  if (total === 0) return '0.00%';
  const percentage = (value / total) * 100;
  return `${Number(percentage).toFixed(decimals)}%`;
};

/**
 * Rounds a number to specified decimal places
 * @param number - The number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 */
export const roundToDecimals = (number: number, decimals: number = 2): number => {
  return Number(Math.round(Number(number + 'e' + decimals)) + 'e-' + decimals);
};