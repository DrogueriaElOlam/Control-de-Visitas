/**
 * Utilidades de fecha para Droguería El Olam.
 * Garantiza que la fecha y hora se calculen siempre en la zona horaria local de Guatemala (America/Guatemala, UTC-6)
 * evitando el desfase de UTC donde a las 6:00 PM (18:00) se saltaba al día siguiente.
 */

export const GUATEMALA_TIMEZONE = 'America/Guatemala';

// Formato YYYY-MM-DD en hora de Guatemala (UTC-6)
export function getLocalDateString(d = new Date()) {
  try {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : (d || new Date());
    if (isNaN(dateObj.getTime())) return '';
    
    // Usar Intl.DateTimeFormat con zona horaria de Guatemala
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: GUATEMALA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(dateObj); // Retorna "YYYY-MM-DD"
  } catch (e) {
    // Respaldo manual seguro usando desfase de zona local
    const now = d instanceof Date ? d : new Date(d);
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().split('T')[0];
  }
}

// Fecha de ayer en hora de Guatemala
export function getLocalYesterdayString() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return getLocalDateString(yesterday);
}

// Primer día del mes actual en hora de Guatemala
export function getLocalStartOfMonthString() {
  const todayStr = getLocalDateString();
  const [year, month] = todayStr.split('-');
  return `${year}-${month}-01`;
}
