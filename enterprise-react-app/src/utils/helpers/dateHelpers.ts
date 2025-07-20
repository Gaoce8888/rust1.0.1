import { DATE_FORMAT, DATETIME_FORMAT } from '../../config/constants';

/**
 * Format a date string or Date object to a specific format
 * @param date - Date string or Date object
 * @param format - Format string (default: DATE_FORMAT)
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date, format: string = DATE_FORMAT): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Simple date formatting (you can replace this with a library like date-fns)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Format a date to datetime format
 * @param date - Date string or Date object
 * @returns Formatted datetime string
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, DATETIME_FORMAT);
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export const getRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateObj);
  }
};

/**
 * Check if a date is today
 * @param date - Date string or Date object
 * @returns Boolean indicating if the date is today
 */
export const isToday = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Add days to a date
 * @param date - Date string or Date object
 * @param days - Number of days to add
 * @returns New Date object
 */
export const addDays = (date: string | Date, days: number): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};