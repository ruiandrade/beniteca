/**
 * Date Utilities
 * Formatting and manipulation functions for dates
 */

/**
 * Format date to DD/MM/YYYY string
 * @param {Date|string} date - Date object or ISO date string
 * @returns {string} Formatted date string DD/MM/YYYY
 */
export const formatDateToDDMMYYYY = (date) => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date to YYYY-MM-DD string (ISO format)
 * @param {Date|string} date - Date object or ISO date string
 * @returns {string} Formatted date string YYYY-MM-DD
 */
export const formatDateToISO = (date) => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Get Monday of current week
 * @returns {Date} Monday date
 */
export const getMondayOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

/**
 * Get Friday of current week
 * @returns {Date} Friday date
 */
export const getFridayOfWeek = (date = new Date()) => {
  const monday = getMondayOfWeek(date);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
};
