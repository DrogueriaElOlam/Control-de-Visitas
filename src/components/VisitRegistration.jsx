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
  AlertCircle
} from 'lucide-react';
import { ALL_ROUTES, addVisitRecord } from '../lib/db';
import { fetchProductsCatalog, fetchClientCodes } from '../lib/catalog';

export default function VisitRegistration({ currentUser, onVisitAdded, allVisits = [] }) {
  const isAdmin = currentUser?.role === 'admin';
  const [clientType, setClientType] = useState('propio');
  const [clientCode, setClientCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [route, setRoute] = useState(currentUser?.route || 'Coban #13');
  const [sector, setSector] = useState(currentUser?.route || 'Coban #13');
  const [dayPeriod, setDayPeriod] = useState('mañana');
  const [visitType, setVisitType] = useState('presencial');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);

  // Sales
  const [hasSale, setHasSale] = useState(false);
  const [saleType, setSaleType] = useState('presencial');
  const [saleAmount, setSaleAmount] = useState('');
  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [cartItems, setCartItems] = useState([]);

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

  // Catalogs
  const [products, setProducts] = useState([]);
  const [clientCodesList, setClientCodesList] = useState([]);

  useEffect(() => {
    loadCatalogs();
    captureGPSLocation();
  }, []);

  async function loadCatalogs() {
    const prods = await fetchProductsCatalog();
    setProducts(prods);
    const codes = await fetchClientCodes();
    setClientCodesList(codes);
  }

  // AUTO GPS CAPTURE
  const captureGPSLocation = () => {
    setLocating(true);
    setLocError('');
    if (!navigator.geolocation) {
      if (isAdmin) setLocError('Geolocalización no soportada en este navegador');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
        setLocating(false);
      },
      (err) => {
        if (isAdmin) setLocError('No se pudo obtener la ubicación GPS (permiso denegado o sin señal)');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // CLIENT CODE AUTOCOMPLETE
  const handleClientCodeChange = (code) => {
    setClientCode(code);
    const trimmed = code.trim();
    if (!trimmed) return;

    // Check predefined list
    const foundCode = clientCodesList.find(c => c.code.toLowerCase() === trimmed.toLowerCase());
    if (foundCode) {
      setClientName(foundCode.name);
      return;
    }

    // Check previous visits
    const foundVisit = allVisits.find(v => v.clientCode && v.clientCode.toLowerCase() === trimmed.toLowerCase());
    if (foundVisit) {
      setClientName(foundVisit.clientName);
      if (foundVisit.phone) setPhone(foundVisit.phone);
      if (foundVisit.sector) setSector(foundVisit.sector);
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

    const visitPayload = {
      clientName: clientName.trim(),
      clientCode: clientCode.trim() || (clientType === 'nuevo' ? '0000' : '0001'),
      phone: phone.trim(),
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
      location,
      vendorName: currentUser?.name || 'Vendedor El Olam',
      route: route || currentUser?.route || 'Coban #13',
      visitDate
    };

    try {
      const saved = await addVisitRecord(visitPayload);
      setSuccessNotif(true);
      setTimeout(() => setSuccessNotif(false), 4000);

      if (onVisitAdded) onVisitAdded(saved);

      // Reset form
      setClientName('');
      setClientCode('');
      setPhone('');
      setHasSale(false);
      setSaleAmount('');
      setCartItems([]);
      setHasCollection(false);
      setCollectionAmounts({ efectivo: '', transferencia: '', cheque: '', boleta: '' });
      setObservations('');
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
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={24} className="animate-bounce" />
          <div>
            <h4 className="font-extrabold text-sm">¡Visita Registrada con Éxito!</h4>
            <p className="text-xs text-emerald-100">
              Datos guardados localmente y sincronizados con la base de datos de Droguería El Olam.
            </p>
          </div>
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

            {/* GPS Status pill - Only visible for Admin */}
            {isAdmin && (
              <div className="flex items-center gap-2">
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
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Section 1: Client & General Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <User size={15} /> 1. Datos del Cliente & Ruta
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
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
                  <span className="text-[10px] text-slate-400">Autocompleta nombre</span>
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ej: 0001"
                    value={clientCode}
                    onChange={(e) => handleClientCodeChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
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

            {/* Client Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Farmacia / Cliente *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Farmacia San Antonio"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Teléfono / Celular
                </label>
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
              </div>
            </div>

            {/* Route & Visit Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ruta / Sector Visitado
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                >
                  {ALL_ROUTES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Modalidad de la Visita
                </label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                >
                  <option value="presencial">Presencial (En establecimiento)</option>
                  <option value="telefonica">Llamada Telefónica</option>
                  <option value="telemarketing">Telemarketing</option>
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
                  onChange={(e) => setHasSale(e.target.checked)}
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

                {/* Quick Product Order Selector Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowProductCatalog(!showProductCatalog)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <Package size={14} />
                    <span>{showProductCatalog ? 'Ocultar catálogo rápido de productos' : 'Abrir catálogo rápido de productos El Olam (+ cotizar pedido)'}</span>
                  </button>

                  {showProductCatalog && (
                    <div className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <span className="text-[11px] font-bold uppercase text-slate-400 block">
                        Haz clic en un producto para agregarlo al pedido de la visita:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {products.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => handleAddProduct(p)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-all"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                            <span className="font-bold text-emerald-600 shrink-0 ml-2">Q{p.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Cart Items List */}
                      {cartItems.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Productos en el pedido ({cartItems.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {cartItems.map(item => (
                              <span 
                                key={item.id} 
                                onClick={() => handleRemoveProduct(item.id)}
                                className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                                title="Clic para eliminar"
                              >
                                {item.name} x{item.qty} (Q{(item.price * item.qty).toFixed(2)}) ✕
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

            {/* GPS Warning if not captured - Only visible for Admin */}
            {isAdmin && locError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle size={14} /> {locError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
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

        </form>

      </div>

    </div>
  );
}
