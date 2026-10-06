// Reglas de seguridad y permisos para los Formularios Droguería El Olam
// Garantiza que cada vendedor solo vea su propia información,
// mientras que Antonio Celada y Administradores tienen acceso total maestro.

export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Determina si el usuario actual es Super Usuario / Administrador con acceso maestro.
 * Antonio Celada tiene acceso total tanto en rol Vendedor como en Administrador.
 */
export function isSuperUser(currentUser) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  const nameNorm = normalizeText(currentUser.name);
  return nameNorm.includes('antonio celada') || nameNorm.includes('administrador');
}

/**
 * Comprueba si un registro pertenece al vendedor actual.
 */
export function matchesVendorUser(recordVendor, currentUserName) {
  if (!recordVendor || !currentUserName) return false;
  const rNorm = normalizeText(recordVendor);
  const uNorm = normalizeText(currentUserName);
  return rNorm === uNorm || rNorm.includes(uNorm) || uNorm.includes(rNorm);
}

/**
 * Filtra un array de registros según los permisos del usuario activo.
 * @param {Array} records - Lista de registros
 * @param {Object} currentUser - Usuario autenticado
 * @param {Function} getVendorName - Función para extraer el nombre del vendedor del registro
 */
export function filterRecordsByUser(records, currentUser, getVendorName) {
  if (!Array.isArray(records)) return [];
  if (isSuperUser(currentUser)) {
    return records; // Antonio Celada y Admin ven todo
  }
  const currentName = currentUser?.name;
  if (!currentName) return [];
  return records.filter(record => {
    const vendor = getVendorName(record);
    return matchesVendorUser(vendor, currentName);
  });
}

import { ALL_ROUTES, getRoutesForVendor } from './db';

export { ALL_ROUTES, getRoutesForVendor };

/**
 * Obtiene las rutas autorizadas para el usuario.
 * Si el usuario es Super Usuario (Antonio Celada o rol admin), tiene acceso a TODAS las rutas.
 * Si es un vendedor regular, solo tiene acceso a sus rutas asignadas.
 */
export function getPermittedRoutesForUser(currentUser, targetVendorName = null) {
  if (isSuperUser(currentUser)) {
    return ALL_ROUTES;
  }
  const vendor = targetVendorName || currentUser?.name;
  return getRoutesForVendor(vendor);
}

/**
 * Obtiene la ruta predeterminada para el usuario (idéntico a la pantalla de registro de visitas: list[0]).
 */
export function getDefaultRouteForUser(currentUser, targetVendorName = null) {
  if (currentUser?.route) {
    const permitted = getPermittedRoutesForUser(currentUser, targetVendorName);
    if (permitted.includes(currentUser.route)) {
      return currentUser.route;
    }
  }
  const routes = getPermittedRoutesForUser(currentUser, targetVendorName);
  return routes && routes.length > 0 ? routes[0] : 'Coban #13';
}


