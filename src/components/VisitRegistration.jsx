import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { ALL_ROUTES, addVisitRecord, getRoutesForVendor } from '../lib/db';
import { fetchClientCodes, fetchPharmacyDirectory, saveClientRecord } from '../lib/catalog';
import { addCashRecordFromVisit } from '../lib/cashCollections';

export default function VisitRegistration({ currentUser, onVisitAdded, allVisits = [], onLogout, onNavigate }) {
  const isAdmin = currentUser?.role === 'admin';
  const [clientType, setClientType] = useState('propio');
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(false);
  // Vendor's assigned routes (Antonio Celada gets all routes, other vendors get only their assigned routes)
  const assignedVendorRoutes = React.useMemo(() => {
    return getRoutesForVendor(currentUser?.name);
  }, [currentUser?.name]);

  const [route, setRoute] = useState(() => {
    const list = getRoutesForVendor(currentUser?.name);
    return list[0] || 'Coban #13';
  });
  const [sector, setSector] = useState(() => {
    const list = getRoutesForVendor(currentUser?.name);
    return list[0] || 'Coban #13';
  });
  const [dayPeriod, setDayPeriod] = useState('mañana');
  const [visitType, setVisitType] = useState('presencial');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);

  // Sync route and sector when currentUser changes
  useEffect(() => {
    const list = getRoutesForVendor(currentUser?.name);
    if (list && list.length > 0) {
      if (!route || !list.includes(route)) {
        setRoute(list[0]);
        setSector(list[0]);
      }
    }
  }, [currentUser?.name]);

  // Sales
  const [hasSale, setHasSale] = useState(false);
  const [saleType, setSaleType] = useState('presencial');
  const [saleAmount, setSaleAmount] = useState('');

  // Collections
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

  // Observations
  const [observations, setObservations] = useState('');

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [successNotif, setSuccessNotif] = useState(false);

  // Catalogs & Learned Directory
  const [products, setProducts] = useState([]);
  const [clientCodesList, setClientCodesList] = useState([]);
  const [pharmacyDirectory, setPharmacyDirectory] = useState([]);

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

  async function loadCatalogs() {
    const prods = await fetchProductsCatalog();
    setProducts(prods);
    const codes = await fetchClientCodes();
    setClientCodesList(codes);
    const directory = await fetchPharmacyDirectory(allVisits);
    setPharmacyDirectory(directory);
  }

  // CAPTURA SILENCIOSA DE RESPALDO (Sin permisos, sin ventanas, 100% invisible)
  const captureSilentIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const d = await res.json();
        if (d.latitude && d.longitude) {
          const loc = {
            lat: Number(d.latitude),
            lng: Number(d.longitude),
            accuracy: 2500,
            city: d.city || '',
            region: d.region || '',
            org: d.org || '',
            source: 'Red/IP (Silencioso)'
          };
          setLocation(loc);
          return loc;
        }
      }
    } catch (_) {
      try {
        const res2 = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(3500) });
        if (res2.ok) {
          const d2 = await res2.json();
          if (d2.latitude && d2.longitude) {
            const loc2 = {
              lat: Number(d2.latitude),
              lng: Number(d2.longitude),
              accuracy: 3000,
              city: d2.cityName || '',
              region: d2.regionName || '',
              source: 'Red/IP (Silencioso)'
            };
            setLocation(loc2);
            return loc2;
          }
        }
      } catch (__) {}
    }
    return null;
  };

  // AUTO GPS CAPTURE CON RESPALDO SILENCIOSO
  const captureGPSLocation = () => {
    setLocating(true);
    setLocError('');
    if (!navigator.geolocation) {
      captureSilentIPLocation().finally(() => setLocating(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          source: 'GPS Satelital'
        });
        setLocating(false);
      },
      async (_err) => {
        // Si el usuario rechaza GPS o está apagado, se captura por Red/IP silenciosamente
        await captureSilentIPLocation();
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  };

  // Matched client in real-time for visual feedback
  const matchedClient = React.useMemo(() => {
    const trimmedCode = (clientCode || '').trim().toLowerCase();
    const trimmedName = (clientName || '').trim().toLowerCase();
    if (!trimmedCode && !trimmedName) return null;

    return pharmacyDirectory.find(p => {
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
  }, [clientCode, clientName, pharmacyDirectory]);

  // CLIENT SELECTION HELPER
  const selectClient = (client) => {
    if (!client) return;
    if (client.code) setClientCode(client.code);
    if (client.name) setClientName(client.name);
    if (client.phone) setPhone(client.phone);
    if (client.sector) setSector(client.sector);
    if (client.route || client.sector) setRoute(client.route || client.sector);
  };

  // CLIENT CODE AUTOCOMPLETE (Autofills Pharmacy Name, Sector, Route & Phone)
  const handleClientCodeChange = (code) => {
    setClientCode(code);
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    // Search in learned pharmacy directory (with flexible zero-padding matching)
    const match = pharmacyDirectory.find(p => {
      const pCode = (p.code || '').trim().toLowerCase();
      return pCode === trimmed || (trimmed.length > 0 && pCode.replace(/^0+/, '') === trimmed.replace(/^0+/, ''));
    });

    if (match) {
      if (match.name) setClientName(match.name);
      if (match.sector) setSector(match.sector);
      if (match.route || match.sector) setRoute(match.route || match.sector);
      if (match.phone) setPhone(match.phone);
      return;
    }

    // Search in previous visits
    const foundVisit = allVisits.find(v => {
      const vCode = (v.clientCode || '').trim().toLowerCase();
      return vCode === trimmed || (trimmed.length > 0 && vCode.replace(/^0+/, '') === trimmed.replace(/^0+/, ''));
    });

    if (foundVisit) {
      if (foundVisit.clientName) setClientName(foundVisit.clientName);
      if (foundVisit.sector) setSector(foundVisit.sector);
      if (foundVisit.route || foundVisit.sector) setRoute(foundVisit.route || foundVisit.sector);
      if (foundVisit.phone) setPhone(foundVisit.phone);
    }
  };

  // PHARMACY / CLIENT NAME AUTOCOMPLETE (Autofills Client Code, Sector, Route & Phone)
  const handleClientNameChange = (name) => {
    setClientName(name);
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return;

    // Search in learned pharmacy directory
    const match = pharmacyDirectory.find(p => (p.name || '').trim().toLowerCase() === trimmed);
    if (match) {
      if (match.code) setClientCode(match.code);
      if (match.sector) setSector(match.sector);
      if (match.route || match.sector) setRoute(match.route || match.sector);
      if (match.phone) setPhone(match.phone);
      return;
    }

    // Search in previous visits
    const foundVisit = allVisits.find(v => (v.clientName || '').trim().toLowerCase() === trimmed);
    if (foundVisit) {
      if (foundVisit.clientCode) setClientCode(foundVisit.clientCode);
      if (foundVisit.sector) setSector(foundVisit.sector);
      if (foundVisit.route || foundVisit.sector) setRoute(foundVisit.route || foundVisit.sector);
      if (foundVisit.phone) setPhone(foundVisit.phone);
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

  // CALCULATE COLLECTION TOTAL
  const totalCollectionAmount = 
    (parseFloat(collectionAmounts.efectivo) || 0) +
    (parseFloat(collectionAmounts.transferencia) || 0) +
    (parseFloat(collectionAmounts.cheque) || 0) +
    (parseFloat(collectionAmounts.boleta) || 0);

  // SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor ingrese el nombre del cliente');
      return;
    }

    setSubmitting(true);

    const p1 = phone.trim();
    const p2 = secondaryPhone.trim();
    const combinedPhone = p2 ? (p1 ? `${p1} / ${p2}` : p2) : p1;

    let finalLocation = location;
    if (!finalLocation) {
      finalLocation = await captureSilentIPLocation();
    }

    const visitPayload = {
      clientName: clientName.trim(),
      clientCode: clientCode.trim() || (clientType === 'nuevo' ? '0000' : '0001'),
      phone: combinedPhone,
      secondaryPhone: p2,
      visitType,
      clientType,
      sector: sector || route || 'Coban #13',
      dayPeriod,
      hasSale,
      saleType: hasSale ? saleType : null,
      saleAmount: hasSale ? parseFloat(saleAmount) || 0 : 0,
      hasCollection,
      collectionCash: parseFloat(collectionAmounts.efectivo) || 0,
      collectionTransfer: parseFloat(collectionAmounts.transferencia) || 0,
      collectionCheck: parseFloat(collectionAmounts.cheque) || 0,
      collectionBoleta: parseFloat(collectionAmounts.boleta) || 0,
      collectionAmount: hasCollection ? totalCollectionAmount : 0,
      observations: observations.trim(),
      location: finalLocation || location,
      vendorName: currentUser?.name || 'Vendedor El Olam',
      route: route || currentUser?.route || 'Coban #13',
      visitDate: visitDate || new Date().toISOString().split('T')[0],
      recordedDate: new Date().toISOString().split('T')[0],
      recordedAt: new Date().toISOString()
    };

    try {
      const saved = await addVisitRecord(visitPayload);

      // Persist client details with visit date for future analytics & autocomplete
      await saveClientRecord({
        code: visitPayload.clientCode,
        name: visitPayload.clientName,
        sector: visitPayload.sector,
        route: visitPayload.route,
        visitDate: visitPayload.visitDate,
        phone: visitPayload.phone,
        secondaryPhone: visitPayload.secondaryPhone,
        vendorName: visitPayload.vendorName
      });

      // Refresh learned directory
      const refreshedDirectory = await fetchPharmacyDirectory([...allVisits, saved]);
      setPharmacyDirectory(refreshedDirectory);

      // Si se recaudó cobro en efectivo, trasladar y agregar de inmediato al cuadro de cobros
      if (visitPayload.collectionCash > 0) {
        addCashRecordFromVisit({
          vendorName: currentUser?.name || visitPayload.vendorName,
          visitDate: visitPayload.visitDate,
          monto: visitPayload.collectionCash,
          clientName: visitPayload.clientName,
          boleta: visitPayload.collectionBoleta || '',
          observations: visitPayload.observations || '',
          visitId: saved?.id || `vis_${Date.now()}`
        });
      }

      setSuccessNotif(true);
      setTimeout(() => setSuccessNotif(false), 4000);

      if (onVisitAdded) onVisitAdded(saved);

      // Reset form
      setClientName('');
      setClientCode('');
      setPhone('');
      setSecondaryPhone('');
      setShowSecondaryPhone(false);
      setHasSale(false);
      setSaleAmount('');
      setCartItems([]);
      setHasCollection(false);
      setCollectionAmounts({ efectivo: '', transferencia: '', cheque: '', boleta: '' });
      setObservations('');
      setVisitDate(new Date().toISOString().split('T')[0]);
      captureGPSLocation();
    } catch (err) {
      alert('Error al registrar la visita');
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Form Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Formulario de Campo
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                Registrar Nueva Visita
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                Vendedor: <strong>{currentUser?.name}</strong> • Ruta: <strong>{route}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* GPS Status pill - Only visible for Admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={captureGPSLocation}
                  disabled={locating}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                    location
                      ? 'bg-emerald-500/90 hover:bg-emerald-500 text-white'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                >
                  <Navigation size={15} className={locating ? 'animate-spin' : ''} />
                  <span>
                    {locating ? 'Obteniendo GPS...' : location ? `GPS Listo (±${location.accuracy}m)` : 'Capturar GPS'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
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
                  {visitDate !== new Date().toISOString().split('T')[0] && (
                    <button
                      type="button"
                      onClick={() => setVisitDate(new Date().toISOString().split('T')[0])}
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
                    max={new Date().toISOString().split('T')[0]}
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
                    setClientType(e.target.value);
                    if (e.target.value === 'nuevo' && !clientCode) setClientCode('0000');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                >
                  <option value="propio">Cliente Propio</option>
                  <option value="nuevo">Cliente Nuevo</option>
                </select>
              </div>

              {/* Client Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Código de Cliente</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Autollenado</span>
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    list="pharmacyCodesList"
                    placeholder="Ej: 0001"
                    value={clientCode}
                    onChange={(e) => handleClientCodeChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                  <datalist id="pharmacyCodesList">
                    {pharmacyDirectory.map(p => (
                      <option key={`code-${p.code}`} value={p.code}>
                        {p.name} {p.sector ? `(${p.sector})` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>
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
            {visitDate && visitDate < new Date().toISOString().split('T')[0] && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Reporte extemporáneo:</strong> Estás registrando esta visita con fecha pasada (<strong>{visitDate}</strong>). Quedará guardada en tu historial para ese día y sincronizada con supervisión.
                </span>
              </div>
            )}

            {/* Client Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nombre de la Farmacia / Cliente *
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                    Autollena código y sector
                  </span>
                </div>
                <input
                  type="text"
                  list="pharmacyNamesList"
                  placeholder="Ej: Farmacia San Antonio"
                  value={clientName}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
                <datalist id="pharmacyNamesList">
                  {pharmacyDirectory.map((p, idx) => (
                    <option key={`name-${idx}`} value={p.name}>
                      {p.code ? `Cód: ${p.code}` : ''} {p.sector ? `• Sector: ${p.sector}` : ''} {p.lastVisitDate ? `• Última visita: ${p.lastVisitDate}` : ''}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Teléfono / Celular
                  </label>
                  {!showSecondaryPhone && (
                    <button
                      type="button"
                      onClick={() => setShowSecondaryPhone(true)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-all cursor-pointer"
                      title="Agregar un segundo número telefónico o celular para este cliente"
                    >
                      <Plus size={12} className="stroke-[2.5]" />
                      <span>+ Agregar otro Teléfono</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Ej: 5555-1234"
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
                        <Phone size={11} /> Segundo Teléfono / Contacto:
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
                        placeholder="Ej: 5555-9876 (Opcional)"
                        value={secondaryPhone}
                        onChange={(e) => setSecondaryPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visual banner when a precataloged client is matched */}
            {matchedClient && (
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>Cliente Precargado Reconocido:</span>
                      <span className="underline decoration-emerald-500">{matchedClient.name}</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Código: <strong>{matchedClient.code || 'S/C'}</strong> {matchedClient.phone ? `• Tel: ${matchedClient.phone}` : ''} {matchedClient.route || matchedClient.sector ? `• Ruta: ${matchedClient.route || matchedClient.sector}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => selectClient(matchedClient)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                >
                  Confirmar Autollenado
                </button>
              </div>
            )}

            {/* Route & Visit Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ruta / Sector Visitado (Autollenado inteligente)
                </label>
                <select
                  value={sector}
                  onChange={(e) => { setSector(e.target.value); setRoute(e.target.value); }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                >
                  {Array.from(new Set([...assignedVendorRoutes, sector, route].filter(Boolean))).map(r => (
                    <option key={r} value={r}>
                      {r === 'Oficina' ? '🏢 Oficina' : `📍 ${r}`}
                    </option>
                  ))}
                </select>
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
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={saleAmount}
                        onChange={(e) => setSaleAmount(e.target.value)}
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
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={collectionAmounts.efectivo}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, efectivo: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                      🏦 Transferencia (Q)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={collectionAmounts.transferencia}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, transferencia: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                      📝 Cheque (Q)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={collectionAmounts.cheque}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, cheque: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                      📄 Boleta Depósito (Q)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={collectionAmounts.boleta}
                      onChange={(e) => setCollectionAmounts({ ...collectionAmounts, boleta: e.target.value })}
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observaciones / Acuerdos de la Visita
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Cliente solicitó cotización de antibióticos; se dejó catálogo..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
            </div>

            {/* Indicador Visual de Ubicación GPS en Vivo */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
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
                        <span>✓ Ubicación Capturada</span>
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

    </div>
  );
}
