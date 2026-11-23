import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Phone,
  Save,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Users,
  Eye,
  RefreshCw,
  Download,
  Trash2,
  ArrowLeft,
  Smartphone,
  Monitor,
  Globe,
  BarChart3
} from 'lucide-react';
import { DEFAULT_VENDORS, normalizeVendorName } from '../lib/db';
import {
  canAccessCatalogAdmin,
  getVendorWhatsAppPhone,
  saveVendorWhatsAppPhone,
  saveBatchVendorWhatsAppPhones,
  syncVendorPhonesFromCloud,
  buildPublicCatalogUrl,
  buildVendorSellersPayload,
  buildAllVendorsPayload,
  sanitizeWhatsAppPhone
} from '../lib/tiendaVendors';
import {
  fetchTiendaViewLogs,
  computeTiendaAnalytics,
  clearTiendaViewLogs,
  exportTiendaLogsToExcel
} from '../lib/tiendaAnalytics';

export default function TiendaVirtualModal({ isOpen, onClose, currentUser, vendors = [] }) {
  const canAdmin = canAccessCatalogAdmin(currentUser);
  const myCanonicalName = normalizeVendorName(currentUser?.name || '');

  const availableVendors = useMemo(() => {
    const source = Array.isArray(vendors) && vendors.length > 0 ? vendors : DEFAULT_VENDORS;
    const map = new Map();
    source.forEach((v) => {
      if (!v?.name || v.active === false) return;
      const canon = normalizeVendorName(v.name);
      const key = canon.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { ...v, name: canon });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [vendors]);

  // Para vendedores regulares: siempre bloqueado a SU propio perfil.
  // Para Admin / Supervisor (Antonio Celada): puede seleccionar cualquier vendedor o Catálogo General.
  const [selectedVendorName, setSelectedVendorName] = useState(canAdmin ? '' : myCanonicalName);
  const [phoneInput, setPhoneInput] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [phonesVersion, setPhonesVersion] = useState(0);
  const iframeRef = useRef(null);

  // Estado del Log y Contador de Visualizaciones (solo Admin / Supervisor)
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [viewLogs, setViewLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSourceFilter, setLogSourceFilter] = useState('all'); // all | cliente_link | app_interna
  const [logSellerFilter, setLogSellerFilter] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');

  const loadViewLogs = async () => {
    if (!canAdmin) return;
    setLoadingLogs(true);
    try {
      const list = await fetchTiendaViewLogs({ limit: 2000 });
      setViewLogs(list);
    } catch (_) {
    } finally {
      setLoadingLogs(false);
    }
  };

  const analytics = useMemo(() => computeTiendaAnalytics(viewLogs), [viewLogs]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return viewLogs.filter((l) => {
      if (logSourceFilter !== 'all' && l.source !== logSourceFilter) return false;
      if (logSellerFilter && l.sellerName !== logSellerFilter) return false;
      if (logDateFilter && l.date !== logDateFilter) return false;
      if (q) {
        const hay = `${l.sellerName} ${l.device} ${l.referrer} ${l.visitorId} ${l.date} ${l.time}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [viewLogs, logSourceFilter, logSellerFilter, logDateFilter, logSearch]);

  const activeProfileName = canAdmin ? selectedVendorName : myCanonicalName;

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVendorName(canAdmin ? '' : myCanonicalName);
    setShowLogsPanel(false);
    setStatusMsg('');
    setErrorMsg('');

    if (canAdmin) {
      loadViewLogs();
    }

    syncVendorPhonesFromCloud(availableVendors).then(() => {
      const targetName = canAdmin ? '' : myCanonicalName;
      if (targetName) {
        const p = getVendorWhatsAppPhone(targetName, availableVendors);
        setPhoneInput(p);
        setSavedPhone(p);
      } else {
        setPhoneInput('');
        setSavedPhone('');
      }
    });
  }, [isOpen, canAdmin, myCanonicalName, availableVendors]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeProfileName) {
      const p = getVendorWhatsAppPhone(activeProfileName, availableVendors);
      setPhoneInput(p);
      setSavedPhone(p);
    } else {
      setPhoneInput('');
      setSavedPhone('');
    }
    setStatusMsg('');
    setErrorMsg('');
  }, [activeProfileName, isOpen, availableVendors]);

  const sendAuthContextToIframe = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    const allVendorsPayload = buildAllVendorsPayload(availableVendors);
    const sellersPayload = allVendorsPayload.filter((v) => Boolean(v.phone));
    const activePhone = activeProfileName
      ? (savedPhone || getVendorWhatsAppPhone(activeProfileName, availableVendors))
      : '';

    win.postMessage(
      {
        type: 'OLAM_CATALOG_AUTH',
        // REGLA ESTRICTA: solo Administrador y Supervisor (Antonio Celada) tienen acceso al botón Administrar (sin contraseña extra)
        allowAdmin: canAdmin,
        vendorName: activeProfileName || '',
        vendorPhone: activePhone || '',
        lockVendor: !canAdmin,
        sellersList: sellersPayload,
        allVendorsList: allVendorsPayload
      },
      window.location.origin
    );
  };

  useEffect(() => {
    if (isOpen && iframeReady) {
      sendAuthContextToIframe();
    }
  }, [isOpen, iframeReady, canAdmin, activeProfileName, savedPhone, availableVendors, phonesVersion]);

  // Escuchar mensajes del iframe: handshake READY y guardado de teléfonos (SOLO Admin/Supervisor)
  useEffect(() => {
    if (!isOpen) return;
    const handleIframeMessage = async (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'OLAM_CATALOG_READY') {
        setIframeReady(true);
        sendAuthContextToIframe();
        return;
      }

      if (msg.type === 'OLAM_CATALOG_OPEN_LOGS') {
        if (canAdmin) {
          setShowLogsPanel(true);
          loadViewLogs();
        }
        return;
      }

      if (msg.type !== 'OLAM_CATALOG_SAVE_PHONES') return;
      if (!canAdmin) return; // Bloqueo estricto: solo Admin / Supervisor pueden guardar teléfonos

      try {
        const entries = Array.isArray(msg.entries) ? msg.entries : [];
        await saveBatchVendorWhatsAppPhones(entries, availableVendors);
        setPhonesVersion((v) => v + 1);
        if (activeProfileName) {
          const updatedPhone = getVendorWhatsAppPhone(activeProfileName, availableVendors);
          setPhoneInput(updatedPhone);
          setSavedPhone(updatedPhone);
        }
        setStatusMsg('Teléfonos de vendedores actualizados y sincronizados en la nube.');
        setTimeout(() => setStatusMsg(''), 4000);
      } catch (err) {
        setErrorMsg(err?.message || 'Error al sincronizar teléfonos de vendedores.');
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [isOpen, canAdmin, availableVendors, activeProfileName]);

  if (!isOpen) return null;

  const shareUrl = buildPublicCatalogUrl({
    vendorName: activeProfileName,
    vendorPhone: savedPhone
  });

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    if (!canAdmin) {
      setErrorMsg('Solo el Administrador o Supervisor puede modificar los teléfonos de vendedores.');
      return;
    }
    if (!activeProfileName) {
      setErrorMsg('Selecciona un vendedor primero para guardar su número.');
      return;
    }
    try {
      const clean = await saveVendorWhatsAppPhone(activeProfileName, phoneInput, availableVendors);
      setPhoneInput(clean);
      setSavedPhone(clean);
      setPhonesVersion((v) => v + 1);
      setStatusMsg(clean ? `WhatsApp guardado (+${clean}) para ${activeProfileName}.` : `WhatsApp eliminado para ${activeProfileName}.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo guardar el número.');
    }
  };

  const handleCopyShareLink = async () => {
    if (activeProfileName && !savedPhone) {
      setErrorMsg(canAdmin
        ? 'Primero asigna y guarda el número de WhatsApp de este vendedor en Configuración.'
        : 'Tu número de WhatsApp aún no ha sido asignado por Administración/Supervisión.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (__) {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setStatusMsg('¡Enlace público de cliente copiado! (Sin botón de Administrador)');
    setTimeout(() => {
      setCopied(false);
      setStatusMsg('');
    }, 3000);
  };

  const handleShareWhatsApp = () => {
    if (activeProfileName && !savedPhone) {
      setErrorMsg(canAdmin
        ? 'Primero asigna el número de WhatsApp de este vendedor antes de compartir su enlace.'
        : 'Tu número de WhatsApp aún no ha sido asignado por Administración/Supervisión.');
      return;
    }
    const msg = activeProfileName
      ? `Hola, te comparto nuestro catálogo virtual de Droguería El Olam (asesor: ${activeProfileName}): ${shareUrl}`
      : `Consulta el catálogo virtual de Droguería El Olam: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const iframeSrc = activeProfileName && savedPhone
    ? `/tienda/index.html?vn=${encodeURIComponent(activeProfileName)}&vp=${encodeURIComponent(sanitizeWhatsAppPhone(savedPhone))}&cliente=1`
    : '/tienda/index.html?cliente=1';

  return (
    <div className="fixed inset-0 z-[9995] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-[98vw] h-[96vh] flex flex-col overflow-hidden">

        {/* HEADER EMPRESARIAL */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white px-4 py-2.5 shrink-0 flex items-center justify-between gap-3 border-b border-blue-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                  Tienda Virtual y Catálogo — Droguería El Olam
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  canAdmin
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                }`}>
                  {canAdmin ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                  {canAdmin ? 'Admin / Supervisor (Edición Habilitada)' : `Vendedor: ${myCanonicalName}`}
                </span>
              </div>
              <p className="text-[11px] text-blue-200 hidden sm:block">
                {canAdmin
                  ? 'Acceso directo a "Administrar" sin contraseña adicional. Configura los teléfonos de todos los vendedores desde Configuración; los enlaces compartidos nunca muestran el botón Administrar.'
                  : 'Comparte tu enlace personalizado del catálogo con tus clientes para recibir pedidos directo en tu WhatsApp asignado.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canAdmin && (
              <button
                type="button"
                onClick={() => {
                  const next = !showLogsPanel;
                  setShowLogsPanel(next);
                  if (next) loadViewLogs();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                  showLogsPanel
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
                }`}
                title="Ver log y contador de personas que visualizan la tienda virtual"
              >
                {showLogsPanel ? <ArrowLeft size={15} /> : <Eye size={15} className="text-emerald-300" />}
                <span className="hidden sm:inline">{showLogsPanel ? 'Volver al Catálogo' : 'Log de Visitas'}</span>
                <span className="sm:hidden">{showLogsPanel ? 'Catálogo' : 'Visitas'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  showLogsPanel ? 'bg-slate-950 text-amber-300' : 'bg-emerald-500 text-slate-950'
                }`}>
                  {analytics.clientViews}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition-all cursor-pointer shrink-0"
              title="Cerrar Tienda Virtual"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BARRA DE CONFIGURACIÓN DE WHATSAPP DEL VENDEDOR Y ENLACE COMPARTIBLE */}
        <div className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-2.5 shrink-0">
          <form onSubmit={handleSavePhone} className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              {canAdmin && (
                <div className="flex items-center gap-1.5">
                  <Users size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <select
                    value={selectedVendorName}
                    onChange={(e) => setSelectedVendorName(e.target.value)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    title="Seleccionar vendedor para configurar su WhatsApp o copiar su enlace"
                  >
                    <option value="">Catálogo General (WhatsApp principal)</option>
                    {availableVendors.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {getVendorWhatsAppPhone(v.name, availableVendors) ? `(+${getVendorWhatsAppPhone(v.name, availableVendors)})` : '(Sin WhatsApp)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeProfileName && canAdmin && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Phone size={13} className="text-emerald-600" />
                    <span>WhatsApp de {activeProfileName}:</span>
                  </label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="502XXXXXXXX"
                    className="w-36 sm:w-44 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Save size={13} />
                    <span>Guardar</span>
                  </button>
                </div>
              )}

              {activeProfileName && !canAdmin && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                    <Phone size={13} className={savedPhone ? 'text-emerald-600' : 'text-amber-500'} />
                    {savedPhone ? (
                      <span>Mi WhatsApp asignado: <strong className="text-emerald-700 dark:text-emerald-400">+{savedPhone}</strong></span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">WhatsApp pendiente de asignar por Administración</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* ACCIONES DE COMPARTIR LINK PÚBLICO (SIN BOTÓN ADMIN) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Copiar enlace público del catálogo para enviar a clientes (sin botón de administrador)"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copiado' : (activeProfileName ? 'Copiar mi link' : 'Copiar link general')}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Compartir enlace del catálogo por WhatsApp"
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </button>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 text-xs font-semibold transition-all"
                title="Abrir vista exacta del cliente en nueva pestaña (sin botón de administrador)"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">Vista Cliente</span>
              </a>
            </div>
          </form>

          {(statusMsg || errorMsg) && (
            <div className={`mt-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
              errorMsg
                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}>
              {errorMsg || statusMsg}
            </div>
          )}
        </div>

        {/* PANEL DE LOG Y CONTADOR DE VISUALIZACIONES (SOLO ADMIN / SUPERVISOR) */}
        {canAdmin && showLogsPanel ? (
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto p-3 sm:p-5 space-y-4">
            {/* Encabezado del Log */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
                  <span>Contador y Log de Visualizaciones de la Tienda Virtual</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Registra automáticamente cada persona que abre el enlace de la tienda (clientes externos y accesos internos), sincronizado en Supabase.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={loadViewLogs}
                  disabled={loadingLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
                  <span>Actualizar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fname = exportTiendaLogsToExcel(filteredLogs);
                    setStatusMsg(`Excel descargado: ${fname}`);
                    setTimeout(() => setStatusMsg(''), 4000);
                  }}
                  disabled={filteredLogs.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>Exportar Excel</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('¿Deseas limpiar y reiniciar a CERO el contador y log de visualizaciones de la tienda?')) return;
                    try {
                      await clearTiendaViewLogs();
                      setViewLogs([]);
                      setStatusMsg('Log y contador de visualizaciones reiniciados a 0.');
                      setTimeout(() => setStatusMsg(''), 4000);
                    } catch (err) {
                      setErrorMsg(err.message || 'No se pudo limpiar el log.');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Reiniciar el contador y vaciar registros de prueba"
                >
                  <Trash2 size={13} />
                  <span>Reiniciar Log</span>
                </button>
              </div>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Visitas de Clientes (Link)</div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{analytics.clientViews.toLocaleString('es-GT')}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Total con internas: <strong>{analytics.totalViews.toLocaleString('es-GT')}</strong> ({analytics.internalViews} internas)
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Personas Únicas</div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{analytics.uniqueClientVisitors.toLocaleString('es-GT')}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Total dispositivos únicos: <strong>{analytics.uniqueVisitors.toLocaleString('es-GT')}</strong>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Visualizaciones Hoy</div>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{analytics.todayClientViews.toLocaleString('es-GT')}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Total hoy: <strong>{analytics.todayViews}</strong> ({analytics.todayUnique} personas)
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Este Mes & Dispositivos</div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{analytics.monthClientViews.toLocaleString('es-GT')}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5"><Smartphone size={11} /> {analytics.mobileViews}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5"><Monitor size={11} /> {analytics.desktopViews}</span>
                </div>
              </div>
            </div>

            {/* Desglose por Vendedor / Enlace */}
            {analytics.bySeller.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-2.5 flex items-center justify-between">
                  <span>Visualizaciones por Vendedor / Enlace (clic para filtrar)</span>
                  {logSellerFilter && (
                    <button
                      type="button"
                      onClick={() => setLogSellerFilter('')}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Quitar filtro ({logSellerFilter})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {analytics.bySeller.map((item) => {
                    const active = logSellerFilter === item.sellerName;
                    return (
                      <button
                        key={item.sellerName}
                        type="button"
                        onClick={() => setLogSellerFilter(active ? '' : item.sellerName)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          active
                            ? 'bg-blue-600 text-white border-blue-500 shadow'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <span>{item.sellerName}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                          active ? 'bg-white text-blue-700' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {item.clients} clientes
                        </span>
                        <span className="text-[10px] opacity-75">({item.total} total)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filtros del Log */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: 'all', label: `Todos (${viewLogs.length})` },
                  { id: 'cliente_link', label: `Clientes Link (${analytics.clientViews})` },
                  { id: 'app_interna', label: `App Interna (${analytics.internalViews})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLogSourceFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logSourceFilter === tab.id
                        ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="date"
                value={logDateFilter}
                onChange={(e) => setLogDateFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />

              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Buscar vendedor, dispositivo, visitante..."
                className="flex-1 min-w-[180px] text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />

              {(logDateFilter || logSearch || logSellerFilter || logSourceFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setLogSourceFilter('all');
                    setLogSellerFilter('');
                    setLogDateFilter('');
                    setLogSearch('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Tabla Cronológica de Visualizaciones */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Origen</th>
                      <th className="py-2.5 px-3">Vendedor / Enlace</th>
                      <th className="py-2.5 px-3">Dispositivo</th>
                      <th className="py-2.5 px-3">Referencia</th>
                      <th className="py-2.5 px-3">Visitante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingLogs ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 font-semibold">
                          Cargando log de visualizaciones desde Supabase...
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          Aún no hay visualizaciones registradas con estos filtros. Cada vez que alguien abra la tienda aparecerá aquí.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.slice(0, 300).map((log, idx) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{log.date}</div>
                            <div className="text-[11px] text-slate-500">{log.time}</div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {log.source === 'cliente_link' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60">
                                <Globe size={11} /> Cliente (Link)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                App Interna
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                            <div>{log.sellerName}</div>
                            {log.sellerPhone && (
                              <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">+{log.sellerPhone}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">{log.device}</div>
                            <div className="text-[10px] text-slate-400">{log.deviceType}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{log.referrer}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-400">{String(log.visitorId || '').slice(0, 14)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredLogs.length > 300 && (
                <div className="p-2.5 text-center text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                  Mostrando las 300 visualizaciones más recientes de {filteredLogs.length.toLocaleString('es-GT')}. Usa "Exportar Excel" para descargar el historial completo.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* IFRAME DEL CATÁLOGO VIRTUAL */
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative min-h-0">
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Tienda Virtual y Catálogo Droguería El Olam"
              className="w-full h-full border-0"
              onLoad={() => {
                setIframeReady(true);
                sendAuthContextToIframe();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
