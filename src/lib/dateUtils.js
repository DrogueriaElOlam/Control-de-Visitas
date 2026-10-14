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

// Retorna la hora actual (0-23) en zona horaria de Guatemala
export function getGuatemalaHour(d = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: GUATEMALA_TIMEZONE,
      hour: 'numeric',
      hour12: false
    });
    return parseInt(formatter.format(d), 10);
  } catch (e) {
    return d.getHours();
  }
}

// Retorna 'mañana' o 'tarde' según la hora actual de Guatemala (12:00 PM o más = tarde)
export function getDefaultDayPeriod(d = new Date()) {
  const hour = getGuatemalaHour(d);
  return hour >= 12 ? 'tarde' : 'mañana';
}

/**
 * Evalúa expresiones matemáticas de suma, resta, multiplicación o división
 * Ejemplos: "1200+2500+1000" -> "4700"
 *           "500 + 250.50"    -> "750.5"
 *           "1500 - 300"      -> "1200"
 */
export function evaluateMathExpression(input) {
  if (input === null || input === undefined) return '';
  const str = String(input).trim();
  if (!str) return '';

  // Si no contiene operadores aritméticos (+, -, *, x, /), retornar directamente
  if (!/[+\-*\/xX]/.test(str)) {
    return str;
  }

  try {
    // Normalizar: remover comas y cambiar 'x' o 'X' por '*'
    let clean = str.replace(/,/g, '').replace(/[xX]/g, '*').trim();
    
    // Si termina en un operador incompleto (ej: "1200+"), no evaluar aún
    if (/[+\-*\/]$/.test(clean)) {
      return str;
    }

    // Validar estrictamente caracteres permitidos (números, operadores, espacios y puntos)
    if (!/^[0-9+\-*\/.\s()]+$/.test(clean)) {
      return str;
    }

    // Evaluar de forma segura
    const result = Function(`"use strict"; return (${clean})`)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      const rounded = Math.round(result * 100) / 100;
      return String(rounded);
    }
  } catch (e) {
    // Expresión malformada, conservar el texto original
  }
  return str;
}

