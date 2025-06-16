/**
 * Date utility functions for collectors
 * 
 * Provides common date manipulation functions used across different collectors
 */

/**
 * Gets the date range for a specific year and month
 * Returns Date objects for start and end of the month
 */
export function getDateRangeForMonth(year: number, month: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return { startDate, endDate };
}

/**
 * Gets the date range for a specific year and month in ISO string format
 * Returns ISO strings for start and end of the month (used by GitHub API)
 */
export function getDateRangeForMonthIso(year: number, month: number): { since: string; until: string } {
  const { startDate, endDate } = getDateRangeForMonth(year, month);
  
  return {
    since: startDate.toISOString(),
    until: endDate.toISOString()
  };
}

/**
 * Formats a date to YYYY-MM-DD format
 */
export function formatDateYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validates if a year and month combination is valid
 */
export function isValidYearMonth(year: number, month: number): boolean {
  return year > 0 && month >= 1 && month <= 12;
} 