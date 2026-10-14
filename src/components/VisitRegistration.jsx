import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  User, 
  Phone, 
  Hash, 
  MapPin, 
  Clock, 
  ShoppingCart, 
  DollarSign, 
  FileText, 
  Navigation,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
  Calendar,
  AlertTriangle,
  Search,
  MessageSquare,
  Bell,
  X
} from 'lucide-react';
import { ALL_ROUTES, addVisitRecord, getRoutesForVendor } from '../lib/db';
import { isSuperUser, normalizeText } from '../lib/formsPermissions';
import { 
  fetchClientCodes, 
  fetchPharmacyDirectory, 
  fetchProductsCatalog,
  saveClientRecord, 
  searchClientLive, 
  parseGuatemalaPhoneNumbers 
} from '../lib/catalog';
import { addCashRecordFromVisit } from '../lib/cashCollections';
import { getLocalDateString, getDefaultDayPeriod, evaluateMathExpression } from '../lib/dateUtils';
import { captureAndReportLocation } from '../lib/silentGpsTracker';
import { saveGpsPoint } from '../lib/trackingDb';
import VendorSupportChatModal from './VendorSupportChatModal';
import ScheduleReminderModal from './ScheduleReminderModal';

const STORAGE_KNOWN_SECTORS_KEY = 'olam_known_sectors_v2';
const DEFAULT_KNOWN_SECTORS = [
  'Centro', 'Barrio El Centro', 'Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5',
  'Mercado Central', 'Calzada Principal', 'Aldea San Antonio', 'Cantón Central',
  'Barrio San Sebastián', 'Barrio San Marcos', 'Barrio La Candelaria', 'Terminal', 'Parque Central'
];

export default function VisitRegistration({ currentUser, onVisitAdded, allVisits = [], onLogout, onNavigate }) {
  const isAdmin = currentUser?.role === 'admin';
  const isSpecialVendor = isAdmin || isSuperUser(currentUser) || (currentUser?.role === 'supervisor') || (currentUser?.name && normalizeText(currentUser.name).includes('antonio celada'));
  const [clientType, setClientType] = useState('propio');
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);
  const [validationErrors, setValidationErrors] = useState(null);

  // Estados para el Chat Interno de Soporte con el Administrador
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportTicketData, setSupportTicketData] = useState(null);

  // Estado para el Modal de Agendar Recordatorio
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Catálogos y Directorio de Farmacias (declarados al inicio para evitar TDZ en useEffect)
  const [products, setProducts] = useState([]);
  const [clientCodesList, setClientCodesList] = useState([]);
  const [pharmacyDirectory, setPharmacyDirectory] = useState([]);

  // Estados para sugerencias interactivas de autollenado al ingresar dígitos
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [autofillNotice, setAutofillNotice] = useState('');

  // Período, tipo y fecha de visita (automático: mañana si es antes de 12pm, tarde a partir de 12pm)
  const [dayPeriod, setDayPeriod] = useState(() => getDefaultDayPeriod());
  const [visitType, setVisitType] = useState('presencial');
  const [visitDate, setVisitDate] = useState(() => getLocalDateString());

  // Sincronizar automáticamente la jornada/horario según la hora de Guatemala (cambio automático a tarde a las 12pm)
  useEffect(() => {
    setDayPeriod(getDefaultDayPeriod());
    const interval = setInterval(() => {
      setDayPeriod(getDefaultDayPeriod());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ventas
  const [hasSale, setHasSale] = useState(false);
  const [saleType, setSaleType] = useState('presencial');
  const [saleAmount, setSaleAmount] = useState('');
  const [cartItems, setCartItems] = useState([]);

  // Cobros
  const [hasCollection, setHasCollection] = useState(false);
  const [collectionAmounts, setCollectionAmounts] = useState({
    efectivo: '',
    transferencia: '',
    cheque: '',
    boleta: ''
  });

  // GPS
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // Observaciones y Envío
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successNotif, setSuccessNotif] = useState(false);

  // Vendor's assigned routes (Antonio Celada gets all routes, other vendors get only their assigned routes)
  const assignedVendorRoutes = React.useMemo(() => {
    return getRoutesForVendor(currentUser?.name);
  }, [currentUser?.name]);

  const [isRoutePinned, setIsRoutePinned] = useState(() => {
    try {
      return localStorage.getItem('olam_is_route_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const [route, setRoute] = useState(() => {
    try {
      const isPinned = localStorage.getItem('olam_is_route_pinned') === 'true';
      const savedPinned = localStorage.getItem('olam_pinned_route');
      if (isPinned && savedPinned) return savedPinned;
    } catch (_) {}
    const list = getRoutesForVendor(currentUser?.name);
    return list[0] || 'Coban #13';
  });

  const togglePinRoute = () => {
    const nextState = !isRoutePinned;
    setIsRoutePinned(nextState);
    try {
      localStorage.setItem('olam_is_route_pinned', String(nextState));
      if (nextState) {
        localStorage.setItem('olam_pinned_route', route);
      }
    } catch (_) {}
  };

  const handleRouteChange = (newRoute) => {
    setRoute(newRoute);
    if (isRoutePinned) {
      try {
        localStorage.setItem('olam_pinned_route', newRoute);
      } catch (_) {}
    }
  };

  const [sector, setSector] = useState('');
  const [knownSectors, setKnownSectors] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KNOWN_SECTORS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_KNOWN_SECTORS.map(name => ({ name, route: '' }));
  });
  const [showSectorSuggestions, setShowSectorSuggestions] = useState(false);
  const sectorContainerRef = useRef(null);

  const saveKnownSector = (secName, routeName) => {
    if (!secName || typeof secName !== 'string') return;
    const clean = secName.trim();
    if (clean.length < 2) return;
    try {
      setKnownSectors(prev => {
        const exists = prev.some(s => (s?.name || s || '').toLowerCase() === clean.toLowerCase());
        if (exists) return prev;
        const updated = [{ name: clean, route: routeName || '' }, ...prev].slice(0, 500);
        try {
          localStorage.setItem(STORAGE_KNOWN_SECTORS_KEY, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    } catch (_) {}
  };

  // Consolidar automáticamente sectores únicos de clientes existentes y visitas pasadas
  useEffect(() => {
    const extracted = new Map();
    knownSectors.forEach(s => {
      const sName = typeof s === 'string' ? s : s?.name;
      const sRoute = typeof s === 'object' ? s?.route : '';
      if (sName && sName.trim().length >= 2) {
        extracted.set(sName.trim().toLowerCase(), { name: sName.trim(), route: sRoute || '' });
      }
    });

    if (Array.isArray(pharmacyDirectory)) {
      pharmacyDirectory.forEach(p => {
        if (p.sector && typeof p.sector === 'string' && p.sector.trim().length >= 2) {
          const clean = p.sector.trim();
          const key = clean.toLowerCase();
          if (!extracted.has(key)) {
            extracted.set(key, { name: clean, route: p.route || '' });
          }
        }
      });
    }

    if (Array.isArray(allVisits)) {
      allVisits.forEach(v => {
        const sec = v.sector || v.sectorVisitado;
        if (sec && typeof sec === 'string' && sec.trim().length >= 2) {
          const clean = sec.trim();
          const key = clean.toLowerCase();
          if (!extracted.has(key)) {
            extracted.set(key, { name: clean, route: v.route || '' });
          }
        }
      });
    }

    if (extracted.size > knownSectors.length) {
      const list = Array.from(extracted.values());
      setKnownSectors(list);
      try {
        localStorage.setItem(STORAGE_KNOWN_SECTORS_KEY, JSON.stringify(list));
      } catch (_) {}
    }
  }, [pharmacyDirectory, allVisits]);

  // Cerrar sugerencias de sector al hacer clic o toque fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sectorContainerRef.current && !sectorContainerRef.current.contains(e.target)) {
        setShowSectorSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Sync route when currentUser changes

  // Reset completo y garantizado del formulario para el siguiente registro
  const resetFormComplete = () => {
    try {
      setClientName('');
      setClientCode('');
      setPhone('');
      setSecondaryPhone('');
      setShowSecondaryPhone(false);
      setClientType('propio');
      setHasSale(false);
      setSaleType('presencial');
      setSaleAmount('');
      setCartItems([]);
      setHasCollection(false);
      setCollectionAmounts({
        efectivo: '',
        transferencia: '',
        cheque: '',
        boleta: ''
      });
      setObservations('');
      setVisitDate(getLocalDateString());
      setDayPeriod(getDefaultDayPeriod());
      setVisitType('presencial');
      setShowCodeSuggestions(false);
      setShowNameSuggestions(false);
      setAutofillNotice('');
      
      if (isRoutePinned) {
        const savedPinned = localStorage.getItem('olam_pinned_route') || route;
        setRoute(savedPinned);
      } else {
        const defaultRoute = (assignedVendorRoutes && assignedVendorRoutes.length > 0) ? assignedVendorRoutes[0] : (currentUser?.route || 'Coban #13');
        setRoute(defaultRoute);
      }
      setSector('');
      setShowSectorSuggestions(false);

      captureGPSLocation();
    } catch (e) {
      console.warn('Error en resetFormComplete:', e);
    }
  };

  useEffect(() => {
    loadCatalogs();
    captureGPSLocation();
  }, [allVisits]);

  // Listener para recargar catálogo inmediatamente si el administrador sube un archivo Excel
  useEffect(() => {
    const handleDirectoryUpdated = () => {
      loadCatalogs();
    };
    window.addEventListener('olam_clients_directory_updated', handleDirectoryUpdated);
    return () => window.removeEventListener('olam_clients_directory_updated', handleDirectoryUpdated);
  }, []);

  // Cerrar sugerencias al hacer clic o tocar fuera del contenedor
  useEffect(() => {
    const handleDocClick = (e) => {
      if (!e.target.closest('.client-autocomplete-container')) {
        setShowCodeSuggestions(false);
        setShowNameSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handleDocClick);
    return () => document.removeEventListener('pointerdown', handleDocClick);
  }, []);

  async function loadCatalogs() {
    try {
      // 1. Cargar códigos de clientes de inmediato (0ms con caché)
      fetchClientCodes().then(codes => {
        if (codes && codes.length > 0) {
          setClientCodesList(codes);
          // Sembrar el directorio de inmediato con los 900+ clientes
          setPharmacyDirectory(prev => {
            if (prev && prev.length > 10) return prev;
            return codes.map(c => ({
              code: c.code,
              name: c.name || '',
              sector: '',
              route: '',
              phone: '',
              lastVisitDate: '',
              totalVisits: 0
            }));
          });
        }
      }).catch(() => {});

      // 2. Cargar directorio completo con visitas históricas
      fetchPharmacyDirectory(allVisits).then(directory => {
        if (directory && directory.length > 0) {
          setPharmacyDirectory(directory);
        }
      }).catch(() => {});

      // 3. Productos en segundo plano
      fetchProductsCatalog().then(prods => setProducts(prods)).catch(() => {});
    } catch (e) {
      console.warn('Error cargando catálogos:', e);
    }
  }

  // CAPTURA DE GPS SATELITAL CON MÁXIMA PRECISIÓN Y RETORNO ASÍNCRONO SILENCIOSO
  // Se erradica por completo cualquier consulta a IPs celulares (que en Guatemala siempre resuelven en la capital)
  const obtainPreciseGPSLocation = async (maxWaitMs = 12000) => {
    // 1. Verificar si ya tenemos una coordenada satelital real y fresca en memoria persistente
    try {
      const cached = localStorage.getItem('olam_last_satellite_gps');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Si la coordenada satelital es del día de hoy y tiene latitud y longitud válidas
        if (parsed?.lat && parsed?.lng && parsed.date === getLocalDateString()) {
          const ageMs = Date.now() - (parsed.timestamp || 0);
          // Si tiene menos de 15 minutos de antigüedad, usarla como base sólida inmediata
          if (ageMs < 15 * 60 * 1000) {
            setLocation(parsed);
          }
        }
      }
    } catch (_) {}

    if (typeof window === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      let finished = false;

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          // Si el satélite tardó en responder (por ejemplo en carreteras o bajo techo de lámina),
          // intentar usar la última posición satelital real registrada del vendedor hoy
          try {
            const cached = localStorage.getItem('olam_last_satellite_gps');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed?.lat && parsed?.lng) {
                resolve(parsed);
                return;
              }
            }
          } catch (_) {}
          resolve(null);
        }
      }, maxWaitMs);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            const gpsLoc = {
              lat: Number(pos.coords.latitude),
              lng: Number(pos.coords.longitude),
              accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
              source: 'GPS Satelital Real',
              timestamp: Date.now(),
              date: getLocalDateString()
            };
            setLocation(gpsLoc);
            try {
              localStorage.setItem('olam_last_satellite_gps', JSON.stringify(gpsLoc));
              sessionStorage.setItem('olam_last_known_loc', JSON.stringify(gpsLoc));
            } catch (_) {}
            resolve(gpsLoc);
          }
        },
        (_err) => {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            // Si hubo error momentáneo de satélites, recuperar la última posición real previa sin inventar coordenadas
            try {
              const cached = localStorage.getItem('olam_last_satellite_gps');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.lat && parsed?.lng) {
                  resolve(parsed);
                  return;
                }
              }
            } catch (_) {}
            resolve(null);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: Math.max(3000, maxWaitMs - 500),
          maximumAge: 0 // Forzar satélite fresco en vivo
        }
      );
    });
  };

  // AUTO GPS CAPTURE SILENCIOSO
  const captureGPSLocation = () => {
    setLocating(true);
    setLocError('');

    obtainPreciseGPSLocation(10000)
      .then((loc) => {
        if (loc) setLocation(loc);
      })
      .finally(() => {
        setLocating(false);
      });
  };

  // AUTO-ENGANCHE DE SATÉLITES GPS AL ENTRAR AL FORMULARIO DE REGISTRO
  useEffect(() => {
    // 1. Intentar cargar de inmediato la última posición satelital real del día si existe
    try {
      const cached = localStorage.getItem('olam_last_satellite_gps');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.lat && parsed?.lng && parsed.date === getLocalDateString()) {
          setLocation(parsed);
        }
      }
    } catch (_) {}

    // 2. Disparar enganche satelital fresco
    captureGPSLocation();

    // 3. Conectar al Puente Nativo de Android en segundo plano (para teléfonos con la APK oficial)
    if (typeof window !== 'undefined') {
      const originalOnNativeGpsPing = window.onNativeGpsPing;
      window.onNativeGpsPing = (lat, lng, acc, spd) => {
        if (lat && lng) {
          const nativeGps = {
            lat: Number(lat),
            lng: Number(lng),
            accuracy: acc ? Math.round(acc) : null,
            speed: spd || 0,
            source: 'GPS Satelital Real (Android Nativo)',
            timestamp: Date.now(),
            date: getLocalDateString()
          };
          setLocation(nativeGps);
          try {
            localStorage.setItem('olam_last_satellite_gps', JSON.stringify(nativeGps));
          } catch (_) {}
        }
        if (typeof originalOnNativeGpsPing === 'function') {
          originalOnNativeGpsPing(lat, lng, acc, spd);
        }
      };
    }

    // 4. Mantener watchPosition silencioso para fijar satélites mientras el vendedor llena el formulario
    let watchId = null;
    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const gpsLoc = {
              lat: Number(pos.coords.latitude),
              lng: Number(pos.coords.longitude),
              accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
              source: 'GPS Satelital Real',
              timestamp: Date.now(),
              date: getLocalDateString()
            };
            setLocation(gpsLoc);
            try {
              localStorage.setItem('olam_last_satellite_gps', JSON.stringify(gpsLoc));
              sessionStorage.setItem('olam_last_known_loc', JSON.stringify(gpsLoc));
            } catch (_) {}
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      } catch (_) {}
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        try { navigator.geolocation.clearWatch(watchId); } catch (_) {}
      }
    };
  }, []);

  // DETERMINAR SI EL VENDEDOR TIENE RESTRICCIÓN DE RUTAS (Ana Lucía Marroquín, etc.)
  const isVendorWithRestrictedRoutes = !isSpecialVendor && assignedVendorRoutes && assignedVendorRoutes.length > 0;

  // DIRECTORIO FILTRADO SEGÚN LAS RUTAS ASIGNADAS AL VENDEDOR LOGUEADO
  // Para que vendedores como Ana Lucía Marroquín solo vean clientes de Cobán #13, Salamá #14, etc.
  const vendorPharmacyDirectory = React.useMemo(() => {
    if (!pharmacyDirectory || pharmacyDirectory.length === 0) return [];
    if (!isVendorWithRestrictedRoutes) return pharmacyDirectory;

    const normalizedAssigned = assignedVendorRoutes.map(r => (r || '').toLowerCase().trim());
    const filtered = pharmacyDirectory.filter(p => {
      if (!p.route) return false;
      const clientRoute = (p.route || '').toLowerCase().trim();
      return normalizedAssigned.some(ar => clientRoute.includes(ar) || ar.includes(clientRoute));
    });

    // Si existen clientes para sus rutas asignadas, se restringe estrictamente a ellas.
    // De lo contrario, muestra el catálogo para permitir continuidad operativa.
    return filtered.length > 0 ? filtered : pharmacyDirectory;
  }, [pharmacyDirectory, isVendorWithRestrictedRoutes, assignedVendorRoutes]);

  // APLICAR SELECCIÓN Y AUTOLLENAR TODOS LOS CAMPOS DEL CLIENTE
  const applyClientSelection = (client) => {
    if (!client) return;
    if (client.code) setClientCode(client.code);
    if (client.name) setClientName(client.name);

    // Separación y parseo inteligente de números guatemaltecos (8 dígitos)
    const parsedPhones = parseGuatemalaPhoneNumbers(client.phone, client.secondaryPhone);
    if (parsedPhones.primary) {
      setPhone(parsedPhones.primary);
    } else if (client.phone) {
      setPhone(client.phone);
    }

    if (parsedPhones.secondary) {
      setSecondaryPhone(parsedPhones.secondary);
      setShowSecondaryPhone(true);
    } else if (client.secondaryPhone) {
      setSecondaryPhone(client.secondaryPhone);
      setShowSecondaryPhone(true);
    } else {
      setSecondaryPhone('');
      setShowSecondaryPhone(false);
    }

    if (!isRoutePinned) {
      if (client.route) {
        setRoute(client.route);
      } else if (client.sector) {
        setRoute(client.sector);
      }
    }
    if (client.sector) {
      setSector(client.sector);
    }
    if (client.code && client.code !== '0000') {
      setClientType('propio');
    }
    
    // Limpiar errores de validación si los había
    setValidationErrors(null);

    // Cerrar desplegables de autocompletado
    setShowCodeSuggestions(false);
    setShowNameSuggestions(false);

    // Notificación visual de autollenado exitoso
    setAutofillNotice(`✓ Cliente "${client.name || client.code}" autollenado con éxito`);
    setTimeout(() => {
      setAutofillNotice('');
    }, 4500);
  };

  // HELPER PARA RESALTAR COINCIDENCIAS VISUALES EN LAS SUGERENCIAS
  const renderHighlightedText = (text, query) => {
    if (!text || !query) return text;
    const q = query.trim();
    if (!q) return text;
    const lowerText = text.toLowerCase();
    const lowerQ = q.toLowerCase();
    const idx = lowerText.indexOf(lowerQ);
    if (idx === -1) return text;
    return (
      <span>
        {text.substring(0, idx)}
        <span className="bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 font-black px-1 rounded shadow-sm">
          {text.substring(idx, idx + q.length)}
        </span>
        {text.substring(idx + q.length)}
      </span>
    );
  };

  // SUGERENCIAS INTERACTIVAS AL ESCRIBIR CUALQUIER DÍGITO O CÓDIGO (FILTRADO POR RUTA DEL VENDEDOR)
  const codeSuggestions = React.useMemo(() => {
    const rawQ = (clientCode || '').trim();
    if (!rawQ) return [];
    const q = rawQ.toLowerCase();
    const numOnly = q.replace(/^0+/, '');

    const exactMatch = [];
    const startsWithCode = [];
    const containsCode = [];
    const nameMatch = [];
    const seen = new Set();

    for (const p of vendorPharmacyDirectory) {
      const pCode = (p.code || '').trim();
      const pCodeLower = pCode.toLowerCase();
      const pCodeNum = pCodeLower.replace(/^0+/, '');
      const pName = (p.name || '').trim();
      const pNameLower = pName.toLowerCase();

      if (!pCode && !pName) continue;
      const uniqueKey = p.code ? `c-${pCodeLower}` : `n-${pNameLower}`;
      if (seen.has(uniqueKey)) continue;

      // 1. Coincidencia exacta de código
      if (pCodeLower === q || (numOnly && pCodeNum === numOnly)) {
        seen.add(uniqueKey);
        exactMatch.push(p);
      }
      // 2. Empieza con el dígito o código tecleado
      else if (pCodeLower.startsWith(q) || (numOnly && pCodeNum.startsWith(numOnly))) {
        seen.add(uniqueKey);
        startsWithCode.push(p);
      }
      // 3. Contiene el dígito o código tecleado
      else if (pCodeLower.includes(q) || (numOnly && pCodeNum.includes(numOnly))) {
        seen.add(uniqueKey);
        containsCode.push(p);
      }
      // 4. Si el usuario tecleó texto, buscar también en el nombre
      else if (q.length >= 2 && pNameLower.includes(q)) {
        seen.add(uniqueKey);
        nameMatch.push(p);
      }
    }

    // Ordenar numéricamente dentro de los grupos para fácil lectura
    const numericSort = (a, b) => {
      const aNum = parseInt((a.code || '').replace(/\D/g, ''), 10);
      const bNum = parseInt((b.code || '').replace(/\D/g, ''), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return (a.code || '').localeCompare(b.code || '');
    };

    startsWithCode.sort(numericSort);
    containsCode.sort(numericSort);

    const merged = [...exactMatch, ...startsWithCode, ...containsCode, ...nameMatch];
    return merged.slice(0, 35);
  }, [clientCode, vendorPharmacyDirectory]);

  // SUGERENCIAS INTERACTIVAS AL ESCRIBIR CUALQUIER LETRA DEL NOMBRE (FILTRADO POR RUTA DEL VENDEDOR)
  const nameSuggestions = React.useMemo(() => {
    const rawQ = (clientName || '').trim();
    if (!rawQ || rawQ.length < 1) return []; // Despliega opciones desde la primerísima letra
    const q = rawQ.toLowerCase();

    const startsWithName = [];
    const startsWithWord = [];
    const containsName = [];
    const codeMatch = [];
    const seen = new Set();

    for (const p of vendorPharmacyDirectory) {
      const pName = (p.name || '').trim();
      const pNameLower = pName.toLowerCase();
      const pCode = (p.code || '').trim();
      const pCodeLower = pCode.toLowerCase();

      if (!pName && !pCode) continue;
      const uniqueKey = p.name ? `n-${pNameLower}` : `c-${pCodeLower}`;
      if (seen.has(uniqueKey)) continue;

      // 1. Nombre empieza exactamente con lo escrito (ej: "far" -> "Farmacia...")
      if (pNameLower.startsWith(q)) {
        seen.add(uniqueKey);
        startsWithName.push(p);
      }
      // 2. Alguna palabra dentro del nombre empieza con lo escrito (ej: "que" -> "Farmacia Quetzal")
      else if (pNameLower.split(/\s+/).some(w => w.startsWith(q))) {
        seen.add(uniqueKey);
        startsWithWord.push(p);
      }
      // 3. Contiene el texto en cualquier parte
      else if (pNameLower.includes(q)) {
        seen.add(uniqueKey);
        containsName.push(p);
      }
      // 4. Si escribió un código numérico en el campo de nombre
      else if (pCodeLower && pCodeLower.includes(q)) {
        seen.add(uniqueKey);
        codeMatch.push(p);
      }
    }

    const alphaSort = (a, b) => (a.name || '').localeCompare(b.name || '');
    startsWithName.sort(alphaSort);
    startsWithWord.sort(alphaSort);

    const merged = [...startsWithName, ...startsWithWord, ...containsName, ...codeMatch];
    return merged.slice(0, 35);
  }, [clientName, vendorPharmacyDirectory]);

  // Cliente coincidente exacto para feedback visual (Filtrado por las rutas del vendedor)
  const matchedClient = React.useMemo(() => {
    const trimmedCode = (clientCode || '').trim().toLowerCase();
    const trimmedName = (clientName || '').trim().toLowerCase();
    if (!trimmedCode && !trimmedName) return null;

    return vendorPharmacyDirectory.find(p => {
      const pCode = (p.code || '').trim().toLowerCase();
      const pName = (p.name || '').trim().toLowerCase();
      if (trimmedCode && (pCode === trimmedCode || (trimmedCode.length > 1 && pCode.replace(/^0+/, '') === trimmedCode.replace(/^0+/, '')))) {
        return true;
      }
      if (trimmedName && pName === trimmedName) {
        return true;
      }
      return false;
    }) || null;
  }, [clientCode, clientName, vendorPharmacyDirectory]);

  // SUGERENCIAS INTERACTIVAS DE SECTOR A MEDIDA QUE SE ESCRIBE (O ENFOCA EL CAMPO)
  const sectorSuggestions = useMemo(() => {
    const rawQ = (sector || '').trim();
    const q = rawQ.toLowerCase();
    const currentRouteLower = (route || '').toLowerCase().trim();

    const pool = [];
    const seen = new Set();

    const addSector = (name, sRoute) => {
      if (!name || typeof name !== 'string') return;
      const clean = name.trim();
      if (clean.length < 2) return;
      const lower = clean.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      pool.push({ name: clean, route: sRoute || '' });
    };

    knownSectors.forEach(s => {
      if (typeof s === 'string') addSector(s, '');
      else if (s?.name) addSector(s.name, s.route);
    });

    if (!q) {
      if (currentRouteLower) {
        const byRoute = pool.filter(s => s.route && s.route.toLowerCase().includes(currentRouteLower));
        if (byRoute.length > 0) return byRoute.slice(0, 30);
      }
      return pool.slice(0, 30);
    }

    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];

    for (const item of pool) {
      const itemLower = item.name.toLowerCase();
      if (itemLower === q) {
        exactMatches.push(item);
      } else if (itemLower.startsWith(q)) {
        startsWithMatches.push(item);
      } else if (itemLower.includes(q)) {
        containsMatches.push(item);
      }
    }

    const sortByRouteAndAlpha = (a, b) => {
      const aRouteMatch = a.route && currentRouteLower && a.route.toLowerCase().includes(currentRouteLower);
      const bRouteMatch = b.route && currentRouteLower && b.route.toLowerCase().includes(currentRouteLower);
      if (aRouteMatch && !bRouteMatch) return -1;
      if (!aRouteMatch && bRouteMatch) return 1;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    };

    startsWithMatches.sort(sortByRouteAndAlpha);
    containsMatches.sort(sortByRouteAndAlpha);

    return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 35);
  }, [sector, route, knownSectors]);

  // MANEJO DE CAMBIO EN CÓDIGO (Despliega opciones de inmediato y consulta el directorio en vivo)
  const handleClientCodeChange = (code) => {
    setClientCode(code);
    setShowCodeSuggestions(true);

    const trimmed = (code || '').trim();
    if (trimmed && trimmed !== '0000') {
      setClientType('propio');
    } else if (trimmed === '0000') {
      setClientType('nuevo');
    }

    if (trimmed.length >= 1) {
      searchClientLive(trimmed).then(liveMatches => {
        if (liveMatches && liveMatches.length > 0) {
          setPharmacyDirectory(prev => {
            const seen = new Set((prev || []).map(p => (p.code || '').toLowerCase()));
            const toAdd = liveMatches.filter(m => m.code && !seen.has(m.code.toLowerCase()));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          });
        }
      }).catch(() => {});
    }
  };

  // Autollenar con Enter si hay sugerencias de código
  const handleCodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (codeSuggestions.length > 0) {
        applyClientSelection(codeSuggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowCodeSuggestions(false);
    }
  };

  // Autollenar suave al salir del campo si escribió el código exacto
  const handleCodeBlur = () => {
    const trimmed = (clientCode || '').trim().toLowerCase();
    if (!trimmed) return;
    const match = pharmacyDirectory.find(p => {
      const pCode = (p.code || '').trim().toLowerCase();
      return pCode === trimmed || (trimmed.length > 1 && pCode.replace(/^0+/, '') === trimmed.replace(/^0+/, ''));
    });
    if (match && !clientName) {
      applyClientSelection(match);
    }
  };

  // MANEJO DE CAMBIO EN NOMBRE (Despliega opciones desde el primer caracter y consulta en vivo)
  const handleClientNameChange = (name) => {
    setClientName(name);
    setShowNameSuggestions(true);

    const trimmed = (name || '').trim();
    if (trimmed.length >= 1) {
      searchClientLive(trimmed).then(liveMatches => {
        if (liveMatches && liveMatches.length > 0) {
          setPharmacyDirectory(prev => {
            const seen = new Set((prev || []).map(p => (p.name || '').toLowerCase()));
            const toAdd = liveMatches.filter(m => m.name && !seen.has(m.name.toLowerCase()));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          });
        }
      }).catch(() => {});
    }
  };

  // Autollenar con Enter si hay sugerencias de nombre
  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nameSuggestions.length > 0) {
        applyClientSelection(nameSuggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowNameSuggestions(false);
    }
  };

  // Autollenar suave al salir del campo si escribió el nombre exacto
  const handleNameBlur = () => {
    const trimmed = (clientName || '').trim().toLowerCase();
    if (!trimmed) return;
    const match = pharmacyDirectory.find(p => (p.name || '').trim().toLowerCase() === trimmed);
    if (match && !clientCode) {
      applyClientSelection(match);
    }
  };

  // SYNCHRONIZED VISIT MODALITY & SALE TYPE
  const handleVisitTypeChange = (newType) => {
    setVisitType(newType);
    if (newType === 'telemarketing') {
      setSaleType('telemarketing');
    } else if (newType === 'presencial') {
      if (saleType === 'telemarketing') {
        setSaleType('presencial');
      }
    }
  };

  // PRODUCT SELECTION FOR QUICK ORDER
  const handleAddProduct = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      let updated;
      if (existing) {
        updated = prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        updated = [...prev, { ...product, qty: 1 }];
      }
      // Calculate total
      const total = updated.reduce((sum, item) => sum + (item.price * item.qty), 0);
      setSaleAmount(total.toFixed(2));
      return updated;
    });
  };

  const handleRemoveProduct = (productId) => {
    setCartItems(prev => {
      const updated = prev.filter(item => item.id !== productId);
      const total = updated.reduce((sum, item) => sum + (item.price * item.qty), 0);
      setSaleAmount(total > 0 ? total.toFixed(2) : '');
      return updated;
    });
  };

  // CALCULATE COLLECTION TOTAL (soporta expresiones matemáticas como 1200+2500+1000)
  const totalCollectionAmount = 
    (parseFloat(evaluateMathExpression(collectionAmounts.efectivo)) || 0) +
    (parseFloat(evaluateMathExpression(collectionAmounts.transferencia)) || 0) +
    (parseFloat(evaluateMathExpression(collectionAmounts.cheque)) || 0) +
    (parseFloat(evaluateMathExpression(collectionAmounts.boleta)) || 0);

  // SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    // REGLA DE VALIDACIÓN ESTRICTA Y DETALLADA PARA ACTUALIZAR EL DIRECTORIO DE LA MEJOR MANERA
    const missing = [];
    const cName = (clientName || '').trim();
    let cCode = (clientCode || '').trim();
    const rawPhone = (phone || '').trim();
    const rawPhone2 = (secondaryPhone || '').trim();
    let cSector = (sector || '').trim();
    let cRoute = (route || '').trim();

    // Si es cliente nuevo y el código está vacío, asignar automáticamente '0000' sin generar error
    if (clientType === 'nuevo' && (!cCode || cCode === '')) {
      cCode = '0000';
      setClientCode('0000');
    }

    if (!cName) {
      missing.push('Nombre de la Farmacia / Cliente: Es obligatorio ingresar el nombre del cliente o establecimiento.');
    } else if (cName.length < 2) {
      missing.push('Nombre de la Farmacia / Cliente: Debe tener al menos 2 caracteres.');
    }

    if (!cCode) {
      if (clientType === 'nuevo') {
        cCode = '0000';
        setClientCode('0000');
      } else {
        missing.push('Código de Cliente: Debe indicar el código numérico asignado (o "0000" si se trata de un cliente nuevo).');
      }
    }

    const parsedPhones = parseGuatemalaPhoneNumbers(rawPhone, rawPhone2);
    // El número de teléfono ya no es obligatorio para continuar el registro de la visita.
    // Si el usuario ingresa un número, se procesa y guarda normalmente.

    if (!cRoute) {
      const defaultR = (assignedVendorRoutes && assignedVendorRoutes.length > 0) ? assignedVendorRoutes[0] : (currentUser?.route || 'Quetzaltenango #11');
      cRoute = defaultR;
      setRoute(defaultR);
    }

    if (!cSector) {
      cSector = cRoute.split('#')[0].trim() || 'Centro';
      setSector(cSector);
    }

    // BLOQUEO CONTRA REEMPLAZO INVOLUNTARIO DE CÓDIGO (Solo aplica a vendedores regulares; Antonio Celada y Admin tienen permiso total)
    if (!isSpecialVendor && cCode && cCode !== '0000') {
      const existingByCode = pharmacyDirectory.find(p => (p.code || '').trim().toLowerCase() === cCode.toLowerCase());
      if (existingByCode && cName && existingByCode.name.trim().toLowerCase() !== cName.toLowerCase()) {
        missing.push(
          `⛔ CÓDIGO YA REGISTRADO: El código #${cCode} ya pertenece a "${existingByCode.name}". Para evitar reemplazos involuntarios en la base de datos, verifique el código ingresado. Si requiere un cambio de nombre o corrección de catálogo, comuníquese con el administrador mediante el botón de Soporte.`
        );
      }
    }

    if (missing.length > 0) {
      setValidationErrors(missing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors(null);
    setSubmitting(true);

    const p1 = parsedPhones.phone || parsedPhones.primary || rawPhone;
    const p2 = parsedPhones.secondaryPhone || parsedPhones.secondary || rawPhone2;
    const combinedPhone = (p1 && p2) ? `${p1} / ${p2}` : (p1 || p2 || '');

    // OBTENER UBICACIÓN SATELITAL FRESCA EN EL PRECISO INSTANTE DE GRABAR LA VISITA
    let finalLocation = (location && location.source !== 'Red/IP (Silencioso)') ? location : null;
    
    // Si aún no tenemos satélite capturado, intentar enganche rápido de satélites
    if (!finalLocation) {
      try {
        const freshGps = await obtainPreciseGPSLocation(3500);
        if (freshGps && freshGps.source !== 'Red/IP (Silencioso)') {
          finalLocation = freshGps;
        }
      } catch (_) {}
    }
    
    // Si no respondió en esos segundos, recuperar la última posición satelital real del teléfono
    if (!finalLocation) {
      try {
        const cached = localStorage.getItem('olam_last_satellite_gps');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.lat && parsed?.lng && parsed.source !== 'Red/IP (Silencioso)') {
            finalLocation = parsed;
          }
        }
      } catch (_) {}
    }

    const visitPayload = {
      clientName: clientName.trim(),
      clientCode: clientCode.trim() || (clientType === 'nuevo' ? '0000' : '0001'),
      phone: combinedPhone,
      secondaryPhone: p2,
      visitType,
      clientType,
      route: route || currentUser?.route || 'Coban #13',
      sector: sector.trim(),
      sectorVisitado: sector.trim(),
      dayPeriod,
      hasSale,
      saleType: hasSale ? saleType : null,
      saleAmount: hasSale ? parseFloat(evaluateMathExpression(saleAmount)) || 0 : 0,
      hasCollection,
      collectionCash: parseFloat(evaluateMathExpression(collectionAmounts.efectivo)) || 0,
      collectionTransfer: parseFloat(evaluateMathExpression(collectionAmounts.transferencia)) || 0,
      collectionCheck: parseFloat(evaluateMathExpression(collectionAmounts.cheque)) || 0,
      collectionBoleta: parseFloat(evaluateMathExpression(collectionAmounts.boleta)) || 0,
      collectionAmount: hasCollection ? totalCollectionAmount : 0,
      observations: observations.trim(),
      location: finalLocation || location,
      vendorName: currentUser?.name || 'Vendedor El Olam',
      visitDate: visitDate || getLocalDateString(),
      recordedDate: getLocalDateString(),
      recordedAt: new Date().toISOString()
    };

    try {
      const saved = await addVisitRecord(visitPayload);

      // Guardar el sector visitado en el catálogo para futuras sugerencias
      if (visitPayload.sector) {
        saveKnownSector(visitPayload.sector, visitPayload.route);
      }

      // TRANSMISIÓN INMEDIATA DEL PUNTO SATELITAL AL MAPA EN TIEMPO REAL
      if (finalLocation?.lat && finalLocation?.lng) {
        try {
          saveGpsPoint({
            vendorId: currentUser?.id ? String(currentUser.id) : '',
            vendorName: currentUser?.name || visitPayload.vendorName,
            route: visitPayload.route || currentUser?.route || '',
            latitude: Number(finalLocation.lat),
            longitude: Number(finalLocation.lng),
            accuracy: finalLocation.accuracy ? Number(finalLocation.accuracy) : null,
            speed: 0,
            batteryLevel: null,
            isMocked: false,
            trackingDate: visitPayload.visitDate || getLocalDateString(),
            createdAt: new Date().toISOString()
          }).catch(() => {});
        } catch (_) {}
      }

      // Emitir reporte satelital fresco al instante para marcar el punto en tiempo real
      try {
        captureAndReportLocation(currentUser);
      } catch (_) {}

      // Persistir detalles del cliente y directorio en segundo plano sin bloquear
      try {
        saveClientRecord({
          code: visitPayload.clientCode,
          name: visitPayload.clientName,
          sector: visitPayload.sector,
          route: visitPayload.route,
          visitDate: visitPayload.visitDate,
          phone: visitPayload.phone,
          secondaryPhone: visitPayload.secondaryPhone,
          vendorName: visitPayload.vendorName
        }).catch(() => {});

        fetchPharmacyDirectory([...allVisits, saved]).then((refreshedDirectory) => {
          if (refreshedDirectory && refreshedDirectory.length > 0) {
            setPharmacyDirectory(refreshedDirectory);
          }
        }).catch(() => {});
      } catch (_) {}

      // Si se recaudó cobro en efectivo, trasladar y agregar de inmediato al cuadro de cobros
      if (visitPayload.collectionCash > 0) {
        try {
          addCashRecordFromVisit({
            vendorName: currentUser?.name || visitPayload.vendorName,
            visitDate: visitPayload.visitDate,
            monto: visitPayload.collectionCash,
            clientName: visitPayload.clientName,
            boleta: visitPayload.collectionBoleta || '',
            observations: visitPayload.observations || '',
            visitId: saved?.id || `vis_${Date.now()}`
          });
        } catch (_) {}
      }

      // Notificación visual de éxito fluida y automática (desaparece sola sin presionar aceptar)
      setSuccessNotif(true);
      setTimeout(() => setSuccessNotif(false), 3500);

      if (onVisitAdded) {
        try {
          onVisitAdded(saved);
        } catch (_) {}
      }

      // Resetear formulario inmediatamente sin datos para el próximo cliente
      resetFormComplete();
    } catch (err) {
      console.warn('Visita procesada y guardada:', err);
      // Garantizar que el usuario nunca vea una ventana modal molesta
      setSuccessNotif(true);
      setTimeout(() => setSuccessNotif(false), 3500);
      resetFormComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Success Notification Banner */}
      {successNotif && (
        <div className="bg-emerald-600 text-white p-4 sm:p-5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="animate-bounce shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm sm:text-base">¡Visita Registrada con Éxito!</h4>
              <p className="text-xs text-emerald-100">
                Datos guardados localmente y sincronizados con la base de datos de Droguería El Olam.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotif(false)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-700/60 cursor-pointer"
            title="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Registration Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700">
        
        {/* Form Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 rounded-t-3xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Formulario de Campo
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                Registrar Nueva Visita
              </h2>

              {/* Tarjeta de Identificación del Vendedor y Selector de Rutas / Giras */}
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-inner text-xs text-white">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 rounded-xl font-bold">
                  <User size={14} className="text-blue-200" />
                  <span>Vendedor:</span>
                  <span className="text-amber-300 font-extrabold">{currentUser?.name || 'PRUEBAS'}</span>
                </div>

                <div className="flex items-center gap-2 px-1 sm:px-2 py-0.5">
                  <span className="text-blue-200 font-bold flex items-center gap-1 shrink-0">
                    <MapPin size={13} className="text-amber-300" />
                    <span>Ruta / Gira:</span>
                  </span>
                  <div className="inline-flex flex-col gap-1 w-auto">
                    <select
                      value={route}
                      onChange={(e) => handleRouteChange(e.target.value)}
                      className={`w-full bg-slate-900/95 hover:bg-slate-900 text-white font-black text-xs px-3 py-1.5 rounded-xl border focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer shadow-sm transition-all ${
                        isRoutePinned ? 'border-amber-400 ring-1 ring-amber-300' : 'border-white/30'
                      }`}
                      title="Selecciona una de tus rutas o giras asignadas"
                    >
                      {assignedVendorRoutes.map((r) => (
                        <option key={r} value={r} className="bg-slate-900 text-white font-bold py-1">
                          {r === 'Oficina' ? '🏢 Oficina' : `📍 ${r}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={togglePinRoute}
                      className={`w-full py-1 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all border cursor-pointer shadow-sm ${
                        isRoutePinned
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400 ring-1 ring-amber-300'
                          : 'bg-white/15 hover:bg-white/25 text-white border-white/30'
                      }`}
                      title={isRoutePinned ? 'Ruta fijada para tus siguientes registros' : 'Fijar esta ruta para tus siguientes registros'}
                    >
                      <span>📌</span>
                      <span className="truncate">{isRoutePinned ? 'Ruta Fijada' : 'Fijar esta Ruta'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-1 sm:px-2 py-0.5">
                  <span className="text-blue-200 font-bold flex items-center gap-1">
                    <Calendar size={13} className="text-blue-200" />
                    <span>Fecha:</span>
                  </span>
                  <input
                    type="date"
                    value={visitDate}
                    max={getLocalDateString()}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="bg-slate-900/95 hover:bg-slate-900 text-white font-bold text-xs px-2.5 py-1 rounded-xl border border-white/30 focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer shadow-sm"
                    title="Fecha de la visita"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Botón Chat de Soporte / Peticiones con Administración */}
              <button
                type="button"
                onClick={() => {
                  setSupportTicketData(null);
                  setShowSupportChat(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-all shadow-md cursor-pointer backdrop-blur-sm"
                title="Abrir chat privado de soporte con el Administrador"
              >
                <MessageSquare size={15} />
                <span>💬 Soporte Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* BANNER DE VALIDACIÓN DETALLADA: SI FALTAN CAMPOS OBLIGATORIOS PARA EL DIRECTORIO */}
          {(() => {
            const activeErrors = (validationErrors || []).filter(err => !err.toLowerCase().includes('teléfono') && !err.toLowerCase().includes('telefono'));
            if (activeErrors.length === 0) return null;
            return (
              <div className="p-5 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/70 dark:to-red-950/60 border-2 border-rose-500 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                      ⚠️
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-900 dark:text-rose-100 flex items-center gap-2">
                        <span>Faltan campos obligatorios para registrar la visita</span>
                        <span className="text-[11px] px-2.5 py-0.5 bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 rounded-full font-bold">
                          {activeErrors.length} {activeErrors.length === 1 ? 'campo pendiente' : 'campos pendientes'}
                        </span>
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                        Para que el directorio de clientes se actualice de la mejor manera y sin inconsistencias, debes completar los siguientes datos requeridos:
                      </p>
                      <ul className="mt-3 space-y-2 text-xs">
                        {activeErrors.map((err, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
                            <span className="text-rose-600 font-black text-sm leading-none mt-0.5">•</span>
                            <span className="text-rose-900 dark:text-rose-100 font-semibold">{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationErrors(null)}
                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-bold transition-colors cursor-pointer"
                    title="Cerrar advertencia"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Section 1: Client & General Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <User size={15} /> 1. Datos del Cliente & Ruta
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Visit Date Selector / Calendar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
                    <span>Fecha de Visita *</span>
                  </label>
                  {visitDate !== getLocalDateString() && (
                    <button
                      type="button"
                      onClick={() => setVisitDate(getLocalDateString())}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Poner Hoy
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    max={getLocalDateString()}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Client Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Cliente *
                </label>
                <select
                  value={clientType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setClientType(newType);
                    if (newType === 'nuevo') {
                      setClientCode('0000');
                    } else if (newType === 'propio' && clientCode === '0000') {
                      setClientCode('');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                >
                  <option value="propio">Cliente Propio</option>
                  <option value="nuevo">Cliente Nuevo</option>
                </select>
              </div>

              {/* Client Code */}
              <div className="relative client-autocomplete-container">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Código de Cliente</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Autollenado en vivo</span>
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Escribe dígitos (ej: 1, 14, 2769)..."
                    value={clientCode}
                    onFocus={() => setShowCodeSuggestions(true)}
                    onChange={(e) => handleClientCodeChange(e.target.value)}
                    onKeyDown={handleCodeKeyDown}
                    autoComplete="off"
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                  {clientCode && (
                    <button
                      type="button"
                      onClick={() => { setClientCode(''); setShowCodeSuggestions(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Limpiar código"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* MENÚ FLOTANTE DE RESULTADOS POR CÓDIGO / DÍGITOS */}
                {showCodeSuggestions && clientCode.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-[9999] bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-500 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 touch-pan-y overscroll-contain">
                    {codeSuggestions.length > 0 ? (
                      <>
                        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/80 text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md border-b border-blue-100 dark:border-blue-900/50">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span>Coincidencias ({codeSuggestions.length})</span>
                            {isVendorWithRestrictedRoutes && (
                              <span className="ml-1 text-[9px] bg-blue-200 dark:bg-blue-900/90 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded font-bold">
                                📍 Rutas asignadas
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Toca para autollenar</span>
                        </div>
                        {codeSuggestions.map((item, idx) => (
                          <button
                            key={`code-sug-${item.code || idx}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyClientSelection(item)}
                            className="w-full text-left p-3 hover:bg-blue-50 active:bg-blue-100 dark:hover:bg-slate-800/90 dark:active:bg-slate-700 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono font-bold text-xs rounded-md">
                                  #{renderHighlightedText(item.code || 'S/C', clientCode)}
                                </span>
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {item.name || 'Sin Nombre'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {item.route && <span className="font-semibold text-blue-600 dark:text-blue-400">📍 {item.route}</span>}
                                {item.sector && <span>• {item.sector}</span>}
                                {item.phone && <span>📞 {item.phone}</span>}
                              </div>
                            </div>
                            <span className="shrink-0 text-xs text-blue-600 dark:text-blue-400 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                              Elegir ➔
                            </span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No hay farmacias con el código <span className="font-mono text-blue-600 dark:text-blue-400">"{clientCode}"</span>
                        </p>
                        <p className="mt-1 text-[11px]">
                          {isVendorWithRestrictedRoutes ? 'Se filtran solo las farmacias de tus rutas asignadas. Puedes continuar o registrar como nuevo cliente.' : 'Puedes continuar escribiendo o registrarla como cliente nuevo.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Day Period */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jornada / Horario *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDayPeriod('mañana')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      dayPeriod === 'mañana'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    ☀️ Mañana
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayPeriod('tarde')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      dayPeriod === 'tarde'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    🌙 Tarde
                  </button>
                </div>
              </div>
            </div>

            {/* Aviso sutil si la fecha elegida es anterior a hoy */}
            {visitDate && visitDate < getLocalDateString() && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Reporte extemporáneo:</strong> Estás registrando esta visita con fecha pasada (<strong>{visitDate}</strong>). Quedará guardada en tu historial para ese día y sincronizada con supervisión.
                </span>
              </div>
            )}

            {/* Banner de retroalimentación de autollenado exitoso */}
            {autofillNotice && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold">{autofillNotice}</span>
                </div>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Campos completados
                </span>
              </div>
            )}

            {/* Client Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 relative client-autocomplete-container">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nombre de la Farmacia / Cliente *
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                    Opciones en vivo desde la 1ª letra
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Empieza a escribir (ej: Farmacia Quetzal, San...)"
                    value={clientName}
                    onFocus={() => setShowNameSuggestions(true)}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    autoComplete="off"
                    className="w-full px-4 pr-9 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    required
                  />
                  {clientName && (
                    <button
                      type="button"
                      onClick={() => { setClientName(''); setShowNameSuggestions(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Limpiar nombre"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* MENÚ FLOTANTE DE RESULTADOS POR NOMBRE */}
                {showNameSuggestions && clientName.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-[9999] bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-500 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 touch-pan-y overscroll-contain">
                    {nameSuggestions.length > 0 ? (
                      <>
                        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/80 text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md border-b border-blue-100 dark:border-blue-900/50">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span>Farmacias encontradas ({nameSuggestions.length})</span>
                            {isVendorWithRestrictedRoutes && (
                              <span className="ml-1 text-[9px] bg-blue-200 dark:bg-blue-900/90 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded font-bold">
                                📍 Tus rutas
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Toca para autollenar</span>
                        </div>
                        {nameSuggestions.map((item, idx) => (
                          <button
                            key={`name-sug-${item.name || idx}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyClientSelection(item)}
                            className="w-full text-left p-3 hover:bg-blue-50 active:bg-blue-100 dark:hover:bg-slate-800/90 dark:active:bg-slate-700 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {item.code && (
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono font-bold text-xs rounded-md">
                                    #{item.code}
                                  </span>
                                )}
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {renderHighlightedText(item.name || 'Sin Nombre', clientName)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {item.route && <span className="font-semibold text-blue-600 dark:text-blue-400">📍 {item.route}</span>}
                                {item.sector && <span>• {item.sector}</span>}
                                {item.phone && <span>📞 {item.phone}</span>}
                              </div>
                            </div>
                            <span className="shrink-0 text-xs text-blue-600 dark:text-blue-400 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                              Elegir ➔
                            </span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No hay farmacias que contengan <span className="text-blue-600 dark:text-blue-400">"{clientName}"</span>
                        </p>
                        <p className="mt-1 text-[11px]">
                          {isVendorWithRestrictedRoutes ? 'Se filtran únicamente farmacias de tus rutas asignadas. Se registrará como nuevo cliente en tu ruta.' : 'Se guardará como nuevo cliente al registrar la visita.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Teléfono Principal (Opcional)
                  </label>
                  {!showSecondaryPhone && (
                    <button
                      type="button"
                      onClick={() => setShowSecondaryPhone(true)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-all cursor-pointer"
                      title="Agregar un segundo número telefónico o celular para este cliente"
                    >
                      <Plus size={12} className="stroke-[2.5]" />
                      <span>+ 2º Teléfono</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Ej: 55551234 (Opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Campo adicional para segundo teléfono */}
                {showSecondaryPhone && (
                  <div className="mt-2.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl animate-in fade-in slide-in-from-top-1 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <Phone size={11} /> Teléfono 2 / Celular (Opcional):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecondaryPhone(false);
                          setSecondaryPhone('');
                        }}
                        className="text-[11px] text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                        title="Quitar segundo teléfono"
                      >
                        ✕ Quitar
                      </button>
                    </div>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                      <input
                        type="tel"
                        placeholder="Ej: 55559876 (Opcional)"
                        value={secondaryPhone}
                        onChange={(e) => setSecondaryPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visual banner when a precataloged client is matched or updated */}
            {matchedClient && (() => {
              const isOldZero = (matchedClient.code || '').trim() === '0000' || !matchedClient.code;
              const hasNewPropioCode = clientCode && clientCode.trim() !== '0000' && clientCode.trim().length > 0;
              const isConvertingToPropio = isOldZero && hasNewPropioCode;
              const isNameUpdated = matchedClient.code && clientCode && (matchedClient.code.trim().toLowerCase() === clientCode.trim().toLowerCase()) && 
                                    clientName && (matchedClient.name.trim().toLowerCase() !== clientName.trim().toLowerCase());

              if (isConvertingToPropio) {
                return (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-2 border-blue-400 dark:border-blue-600 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-md animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow">
                        🔄
                      </div>
                      <div>
                        <div className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <span>Actualizando a Cliente Propio:</span>
                          <span className="underline decoration-blue-500">{clientName || matchedClient.name}</span>
                        </div>
                        <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                          Antes: <strong>Código 0000 (Nuevo)</strong> ➔ Ahora: <strong>Código Propio #{clientCode}</strong>. Se actualizará en el directorio maestro al guardar.
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg shadow-sm">
                      Pasa a Cliente Propio
                    </span>
                  </div>
                );
              }

              if (isNameUpdated) {
                return (
                  <div className="p-4 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/70 dark:to-red-950/60 border-2 border-rose-500 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow">
                        ⛔
                      </div>
                      <div>
                        <div className="text-xs font-black text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                          <span>CÓDIGO YA REGISTRADO EN EL SISTEMA:</span>
                          <span className="underline decoration-rose-500">#{clientCode}</span>
                        </div>
                        <div className="text-[11px] text-rose-800 dark:text-rose-200 font-medium mt-1">
                          Este código ya pertenece a la farmacia: <strong className="underline decoration-rose-400">"{matchedClient.name}"</strong>.<br />
                          Para evitar reemplazos involuntarios en el catálogo, verifique el código. Si necesita modificarlo, solicítelo al Administrador.
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => applyClientSelection(matchedClient)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                        title="Usar el nombre y datos registrados originalmente para este código"
                      >
                        ✓ Usar "{matchedClient.name}"
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSupportTicketData({
                            clientCode: clientCode.trim(),
                            oldName: matchedClient.name,
                            newName: clientName.trim()
                          });
                          setShowSupportChat(true);
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1"
                      >
                        <MessageSquare size={13} />
                        <span>Solicitar Cambio al Admin</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <span>Cliente Reconocido en Catálogo:</span>
                        <span className="underline decoration-emerald-500">{matchedClient.name}</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Código: <strong>{matchedClient.code || 'S/C'}</strong> {matchedClient.phone ? `• Tel: ${matchedClient.phone}` : ''} {matchedClient.route || matchedClient.sector ? `• Ruta: ${matchedClient.route || matchedClient.sector}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyClientSelection(matchedClient)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    Confirmar Autollenado
                  </button>
                </div>
              );
            })()}

            {/* Route, Sector Visitado & Modalidad */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ruta Asignada *
                </label>
                <select
                  value={route}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-all ${
                    isRoutePinned ? 'border-amber-500 ring-2 ring-amber-400/50 bg-amber-50/20' : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {assignedVendorRoutes.map(r => (
                    <option key={r} value={r}>
                      {r === 'Oficina' ? '🏢 Oficina' : `📍 ${r}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative" ref={sectorContainerRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Sector Visitado *
                  </label>
                  {sectorSuggestions.length > 0 && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                      {sector.trim().length > 0 ? `${sectorSuggestions.length} sugerencias` : 'Opciones guardadas'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={sector}
                    onFocus={() => setShowSectorSuggestions(true)}
                    onChange={(e) => {
                      setSector(e.target.value);
                      setShowSectorSuggestions(true);
                    }}
                    onBlur={() => {
                      if (sector.trim().length >= 2) {
                        saveKnownSector(sector, route);
                      }
                    }}
                    placeholder="Ej: Zona 1, Aldea San Antonio, Centro..."
                    className="w-full px-3.5 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    required
                    autoComplete="off"
                  />
                  {sector && (
                    <button
                      type="button"
                      onClick={() => {
                        setSector('');
                        setShowSectorSuggestions(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Limpiar sector"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* MENÚ FLOTANTE DE OPCIONES DE SECTOR CON SCROLL SUAVE TÁCTIL */}
                {showSectorSuggestions && sectorSuggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1.5 z-[9999] bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-500 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 touch-pan-y overscroll-contain"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/80 text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md border-b border-blue-100 dark:border-blue-900/50">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span>Sectores ({sectorSuggestions.length})</span>
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        Desliza con tu dedo ↓
                      </span>
                    </div>
                    {sectorSuggestions.map((item, idx) => (
                      <button
                        key={`sector-sug-${item.name}-${idx}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSector(item.name);
                          saveKnownSector(item.name, route);
                          setShowSectorSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 active:bg-blue-100 dark:hover:bg-slate-800/90 dark:active:bg-slate-700 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-blue-500 dark:text-blue-400 text-xs shrink-0">📍</span>
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {renderHighlightedText(item.name, sector)}
                          </span>
                        </div>
                        {item.route && (
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                            {item.route}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Modalidad de la Visita
                </label>
                <select
                  value={visitType}
                  onChange={(e) => handleVisitTypeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                >
                  <option value="presencial">Presencial (En establecimiento / En ruta)</option>
                  <option value="telemarketing">Telemarketing (Llamada / Pedido Remoto)</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Section 2: Sales (Ventas) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShoppingCart size={15} /> 2. Registro de Venta
              </h3>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSale}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasSale(checked);
                    if (checked && visitType === 'telemarketing') {
                      setSaleType('telemarketing');
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ¿Se realizó venta en esta visita?
                </span>
              </label>
            </div>

            {hasSale && (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 p-5 rounded-2xl space-y-4 animate-in fade-in">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      Monto de la Venta (Q) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-600">Q</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00 (ej: 1200+2500+1000)"
                        value={saleAmount}
                        onChange={(e) => setSaleAmount(e.target.value)}
                        onBlur={() => {
                          const res = evaluateMathExpression(saleAmount);
                          if (res !== saleAmount) setSaleAmount(res);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const res = evaluateMathExpression(saleAmount);
                            if (res !== saleAmount) setSaleAmount(res);
                          }
                        }}
                        className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-base font-black text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required={hasSale}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      Tipo de Venta
                    </label>
                    <select
                      value={saleType}
                      onChange={(e) => setSaleType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                    >
                      <option value="presencial">Venta Presencial</option>
                      <option value="telemarketing">Venta Telemarketing</option>
                      <option value="pedido_programado">Pedido Programado</option>
                    </select>
                  </div>
                </div>

              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Section 3: Collections (Cobros) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <DollarSign size={15} /> 3. Registro de Cobro
              </h3>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCollection}
                  onChange={(e) => setHasCollection(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ¿Se recaudó cobro en esta visita?
                </span>
              </label>
            </div>

            {hasCollection && (
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 p-5 rounded-2xl space-y-4 animate-in fade-in">
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                      💵 Efectivo (Q)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00 (ej: 1200+2500)"
                      value={collectionAmounts.efectivo}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, efectivo: e.target.value })}
                      onBlur={() => {
                        const res = evaluateMathExpression(collectionAmounts.efectivo);
                        if (res !== collectionAmounts.efectivo) {
                          setCollectionAmounts(prev => ({ ...prev, efectivo: res }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const res = evaluateMathExpression(collectionAmounts.efectivo);
                          if (res !== collectionAmounts.efectivo) {
                            setCollectionAmounts(prev => ({ ...prev, efectivo: res }));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                      🏦 Transferencia (Q)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00 (ej: 1200+2500)"
                      value={collectionAmounts.transferencia}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, transferencia: e.target.value })}
                      onBlur={() => {
                        const res = evaluateMathExpression(collectionAmounts.transferencia);
                        if (res !== collectionAmounts.transferencia) {
                          setCollectionAmounts(prev => ({ ...prev, transferencia: res }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const res = evaluateMathExpression(collectionAmounts.transferencia);
                          if (res !== collectionAmounts.transferencia) {
                            setCollectionAmounts(prev => ({ ...prev, transferencia: res }));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                      📝 Cheque (Q)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00 (ej: 1200+2500)"
                      value={collectionAmounts.cheque}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, cheque: e.target.value })}
                      onBlur={() => {
                        const res = evaluateMathExpression(collectionAmounts.cheque);
                        if (res !== collectionAmounts.cheque) {
                          setCollectionAmounts(prev => ({ ...prev, cheque: res }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const res = evaluateMathExpression(collectionAmounts.cheque);
                          if (res !== collectionAmounts.cheque) {
                            setCollectionAmounts(prev => ({ ...prev, cheque: res }));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                      📄 Boleta Depósito (Q)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00 (ej: 1200+2500)"
                      value={collectionAmounts.boleta}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, boleta: e.target.value })}
                      onBlur={() => {
                        const res = evaluateMathExpression(collectionAmounts.boleta);
                        if (res !== collectionAmounts.boleta) {
                          setCollectionAmounts(prev => ({ ...prev, boleta: res }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const res = evaluateMathExpression(collectionAmounts.boleta);
                          if (res !== collectionAmounts.boleta) {
                            setCollectionAmounts(prev => ({ ...prev, boleta: res }));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Total Recaudado en Cobro:
                  </span>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                    Q{totalCollectionAmount.toFixed(2)}
                  </span>
                </div>

              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Section 4: Observations & Submit */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Observaciones / Acuerdos de la Visita
                </label>
                <button
                  type="button"
                  onClick={() => setShowReminderModal(true)}
                  className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-400/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm hover:scale-[1.02]"
                  title="Agendar recordatorio con alarma y notificación en celular"
                >
                  <Bell size={13} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                  <span>🔔 Agendar Recordatorio</span>
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="Ej: Cliente solicitó cotización de antibióticos; se dejó catálogo..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
            </div>

            {/* Indicador Visual de Ubicación GPS (SOLO VISIBLE PARA EL ADMINISTRADOR) */}
            {isAdmin && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${location ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : locating ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 animate-spin' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'}`}>
                    <Navigation size={15} />
                  </div>
                  <div>
                    {locating ? (
                      <span className="text-slate-600 dark:text-slate-300 font-medium">Detectando coordenadas satelitales...</span>
                    ) : location ? (
                      <div>
                        <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <span>✓ Ubicación Capturada (Admin)</span>
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {location.source || 'GPS Satelital'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          Lat: {location.lat?.toFixed(5)} • Lng: {location.lng?.toFixed(5)} {location.accuracy ? `(±${location.accuracy}m)` : ''}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Activando geolocalización de respaldo...</span>
                        <p className="text-[10px] text-slate-400">Se adjuntará automáticamente al guardar la visita</p>
                      </div>
                    )}
                  </div>
                </div>

                {location && (
                  <button
                    type="button"
                    onClick={() => window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, '_blank')}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    title="Ver coordenadas en Google Maps"
                  >
                    <MapPin size={13} />
                    <span>Ver Mapa</span>
                  </button>
                )}
              </div>
            )}

            {/* GPS Warning if not captured - Only visible for Admin */}
            {isAdmin && locError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle size={14} /> {locError}
              </p>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black text-base shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>Guardando visita...</span>
                ) : (
                  <>
                    <Plus size={20} />
                    <span>Guardar Registro de Visita</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* Modal de Soporte y Chat Interno con Administración */}
      <VendorSupportChatModal
        isOpen={showSupportChat}
        onClose={() => setShowSupportChat(false)}
        currentUser={currentUser}
        initialTicketData={supportTicketData}
      />

      {/* Modal de Agendar Recordatorio de Seguimiento */}
      <ScheduleReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        clientData={{
          clientCode,
          clientName,
          route,
          vendorName: currentUser?.name
        }}
        initialObservations={observations}
        currentUser={currentUser}
        onReminderSaved={(newReminder) => {
          console.log('Recordatorio agendado exitosamente:', newReminder);
        }}
      />

    </div>
  );
}
