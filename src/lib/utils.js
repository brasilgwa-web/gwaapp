
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function createPageUrl(path) {
  return path;
}

// Robust UTC-agnostic date formatter
// Treats YYYY-MM-DD strings as local dates by forcing noon time
export const formatDateAsLocal = (dateStr, formatString = "d 'de' MMMM, yyyy") => {
  if (!dateStr) return '-';
  try {
    // Handle both YYYY-MM-DD and ISO strings safely
    const rawDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = rawDate.split('-').map(Number);

    // Create date at noon local time (12:00:00) to avoid timezone shifts
    // month is 0-indexed in JS Date
    const localDate = new Date(year, month - 1, day, 12, 0, 0);

    return format(localDate, formatString, { locale: ptBR });
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateStr; // Fallback
  }
};