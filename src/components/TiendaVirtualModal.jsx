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
  Users
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

  const activeProfileName = canAdmin ? selectedVendorName : myCanonicalName;

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVendorName(canAdmin ? '' : myCanonicalName);
    setStatusMsg('');
    setErrorMsg('');

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

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition-all cursor-pointer shrink-0"
            title="Cerrar Tienda Virtual"
          >
            <X size={18} />
          </button>
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

        {/* IFRAME DEL CATÁLOGO VIRTUAL */}
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
      </div>
    </div>
  );
}
