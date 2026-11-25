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
  BarChart3,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Package,
  MessageCircle,
  Filter,
  EyeOff,
  DollarSign
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
  sanitizeWhatsAppPhone,
  getCanonicalPhoneKey,
  getStoredVisibilityConfig,
  syncVisibilityConfigFromCloud,
  saveVisibilityConfigToCloud,
  resolveVisibilityForVendor
} from '../lib/tiendaVendors';
import {
  fetchTiendaViewLogs,
  computeTiendaAnalytics,
  clearTiendaViewLogs,
  exportTiendaLogsToExcel
} from '../lib/tiendaAnalytics';
import {
  fetchTiendaOrders,
  updateTiendaOrderStatus,
  deleteTiendaOrder,
  computeTiendaOrdersStats,
  exportTiendaOrdersToExcel
} from '../lib/tiendaOrders';

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
  // Para Supervisor (Antonio Celada): inicia con su propio perfil y puede cambiar a cualquier vendedor o Catálogo General.
  // Para Administrador: inicia en Catálogo General y puede seleccionar cualquier vendedor.
  const defaultSelectedVendor = currentUser?.role === 'admin' ? '' : myCanonicalName;
  const [selectedVendorName, setSelectedVendorName] = useState(defaultSelectedVendor);
  const [phoneInput, setPhoneInput] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [phonesVersion, setPhonesVersion] = useState(0);
  const iframeRef = useRef(null);

  // Control centralizado de visibilidad (Solo Admin / Supervisor -> Supabase -> Vendedores y Clientes)
  const [catalogLabs, setCatalogLabs] = useState([]);
  const [visibilityConfig, setVisibilityConfig] = useState(() => getStoredVisibilityConfig());
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [showShareFilterModal, setShowShareFilterModal] = useState(false);
  const [visibilityModalTab, setVisibilityModalTab] = useState('prices'); // 'prices' | 'labs'
  const [visibilityEditTarget, setVisibilityEditTarget] = useState('__global__'); // '__global__' | nombre del vendedor
  const [labFilterSearch, setLabFilterSearch] = useState('');

  // Panel activo (solo Admin / Supervisor pueden cambiar a 'orders' o 'logs')
  const [activePanel, setActivePanel] = useState('catalog'); // 'catalog' | 'orders' | 'logs'

  // Estado del Log y Contador de Visualizaciones (solo Admin / Supervisor)
  const [viewLogs, setViewLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSourceFilter, setLogSourceFilter] = useState('all'); // all | cliente_link | app_interna
  const [logSellerFilter, setLogSellerFilter] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Estado del Historial de Pedidos de la Tienda (solo Admin / Supervisor)
  const [ordersList, setOrdersList] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // all | Pendiente | Atendido | Anulado
  const [orderSourceFilter, setOrderSourceFilter] = useState('all'); // all | cliente_link | app_interna
  const [orderSellerFilter, setOrderSellerFilter] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

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

  const loadOrdersHistory = async () => {
    if (!canAdmin) return;
    setLoadingOrders(true);
    try {
      const list = await fetchTiendaOrders({ limit: 2000 });
      setOrdersList(list);
    } catch (_) {
    } finally {
      setLoadingOrders(false);
    }
  };

  const analytics = useMemo(() => computeTiendaAnalytics(viewLogs), [viewLogs]);
  const ordersStats = useMemo(() => computeTiendaOrdersStats(ordersList), [ordersList]);

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

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return ordersList.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (orderSourceFilter !== 'all' && o.source !== orderSourceFilter) return false;
      if (orderSellerFilter && o.sellerName !== orderSellerFilter) return false;
      if (orderDateFilter && o.date !== orderDateFilter) return false;
      if (q) {
        const itemsText = (o.items || []).map((it) => `${it.code} ${it.name}`).join(' ');
        const hay = `${o.orderNumber} ${o.clientName} ${o.sellerName} ${o.device} ${o.date} ${itemsText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ordersList, orderStatusFilter, orderSourceFilter, orderSellerFilter, orderDateFilter, orderSearch]);

  const activeProfileName = canAdmin ? selectedVendorName : myCanonicalName;

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVendorName(defaultSelectedVendor);
    setActivePanel('catalog');
    setStatusMsg('');
    setErrorMsg('');

    if (canAdmin) {
      loadViewLogs();
      loadOrdersHistory();
    }

    syncVisibilityConfigFromCloud().then((cloudVis) => {
      if (cloudVis) setVisibilityConfig(cloudVis);
    });

    syncVendorPhonesFromCloud(availableVendors).then(() => {
      const targetName = defaultSelectedVendor;
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

  // Visibilidad efectiva para el perfil activo (vendedor actual o seleccionado por Admin)
  const activeEffectiveVisibility = useMemo(
    () => resolveVisibilityForVendor(visibilityConfig, activeProfileName || ''),
    [visibilityConfig, activeProfileName]
  );

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
        // REGLA ESTRICTA: solo Administrador y Supervisor (Antonio Celada) tienen acceso al botón Administrar y a controlar visibilidad
        allowAdmin: canAdmin,
        vendorName: activeProfileName || '',
        vendorPhone: activePhone || '',
        lockVendor: !canAdmin,
        sellersList: sellersPayload,
        allVendorsList: allVendorsPayload,
        // Para vendedores regulares: impone las reglas de visibilidad en su propia tienda y en los enlaces que compartan
        enforcedVisibility: !canAdmin
          ? {
              excludedIds: activeEffectiveVisibility.excludedIds,
              hideZeroPrice: activeEffectiveVisibility.hideZeroPrice,
              hideDisponibleCodes: activeEffectiveVisibility.hideDisponibleCodes,
              hidePrices: activeEffectiveVisibility.hidePrices
            }
          : null,
        // Para Admin/Supervisor: sincroniza la preferencia del enlace que genere desde dentro de la tienda
        shareFilterPrefs: canAdmin
          ? {
              excludedIds: activeEffectiveVisibility.excludedIds,
              hideZeroPrice: activeEffectiveVisibility.hideZeroPrice,
              hideDisponibleCodes: activeEffectiveVisibility.hideDisponibleCodes,
              hidePrices: activeEffectiveVisibility.hidePrices
            }
          : null
      },
      window.location.origin
    );
  };

  useEffect(() => {
    if (isOpen && iframeReady) {
      sendAuthContextToIframe();
    }
  }, [isOpen, iframeReady, canAdmin, activeProfileName, savedPhone, availableVendors, phonesVersion, activeEffectiveVisibility]);

  // Escuchar mensajes del iframe: handshake READY y guardado de teléfonos (SOLO Admin/Supervisor)
  useEffect(() => {
    if (!isOpen) return;
    const handleIframeMessage = async (ev) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'OLAM_CATALOG_READY') {
        if (Array.isArray(msg.labs) && msg.labs.length > 0) {
          setCatalogLabs(msg.labs.map((l) => ({ id: String(l.id), name: String(l.name || '') })));
        }
        setIframeReady(true);
        sendAuthContextToIframe();
        return;
      }

      if (msg.type === 'OLAM_CATALOG_LABS_UPDATED') {
        if (Array.isArray(msg.labs) && msg.labs.length > 0) {
          setCatalogLabs(msg.labs.map((l) => ({ id: String(l.id), name: String(l.name || '') })));
        }
        return;
      }

      if (msg.type === 'OLAM_CATALOG_SHARE_PREFS_CHANGED') {
        if (!canAdmin) return; // Bloqueo estricto: vendedores nunca modifican visibilidad
        const nextEx = Array.isArray(msg.excludedIds) ? msg.excludedIds.map((x) => String(x)) : [];
        const nextNz = Boolean(msg.hideZeroPrice);
        const nextNd = Boolean(msg.hideDisponibleCodes);
        const nextNp = Boolean(msg.hidePrices);
        setVisibilityConfig((prev) => {
          const nextCfg = {
            ...prev,
            global: {
              excludedIds: nextEx,
              hideZeroPrice: nextNz,
              hideDisponibleCodes: nextNd,
              hidePrices: nextNp
            }
          };
          saveVisibilityConfigToCloud(nextCfg).catch(() => {});
          return nextCfg;
        });
        return;
      }

      if (msg.type === 'OLAM_CATALOG_OPEN_LOGS') {
        if (canAdmin) {
          setActivePanel('logs');
          loadViewLogs();
        }
        return;
      }

      if (msg.type === 'OLAM_CATALOG_OPEN_ORDERS') {
        if (canAdmin) {
          setActivePanel('orders');
          loadOrdersHistory();
        }
        return;
      }

      if (msg.type === 'OLAM_CATALOG_ORDER_CREATED') {
        if (canAdmin) {
          setTimeout(() => loadOrdersHistory(), 600);
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

  const allLabIds = useMemo(() => catalogLabs.map((l) => l.id), [catalogLabs]);

  // Datos del objetivo actualmente seleccionado dentro del modal "Controlar qué ven" (solo Admin/Supervisor)
  const isEditingGlobalTarget = visibilityEditTarget === '__global__';
  const editVendorKey = isEditingGlobalTarget ? '' : getCanonicalPhoneKey(visibilityEditTarget);
  const editVendorEntry = !isEditingGlobalTarget && editVendorKey ? visibilityConfig.perVendor?.[editVendorKey] : null;
  const editUsesCustomRule = isEditingGlobalTarget ? true : Boolean(editVendorEntry?.useCustom);

  const editExcludedIds = useMemo(() => {
    if (isEditingGlobalTarget) return visibilityConfig.global?.excludedIds || [];
    if (editUsesCustomRule) return editVendorEntry?.excludedIds || [];
    return visibilityConfig.global?.excludedIds || [];
  }, [isEditingGlobalTarget, editUsesCustomRule, editVendorEntry, visibilityConfig]);

  const editHideZeroPrice = isEditingGlobalTarget
    ? Boolean(visibilityConfig.global?.hideZeroPrice)
    : (editUsesCustomRule ? Boolean(editVendorEntry?.hideZeroPrice) : Boolean(visibilityConfig.global?.hideZeroPrice));

  const editHideDisponibleCodes = isEditingGlobalTarget
    ? Boolean(visibilityConfig.global?.hideDisponibleCodes)
    : (editUsesCustomRule ? Boolean(editVendorEntry?.hideDisponibleCodes) : Boolean(visibilityConfig.global?.hideDisponibleCodes));

  const editExcludedSet = useMemo(() => new Set(editExcludedIds), [editExcludedIds]);
  const editIncludedCount = useMemo(() => {
    if (!catalogLabs.length) return 1;
    return catalogLabs.filter((l) => !editExcludedSet.has(l.id)).length;
  }, [catalogLabs, editExcludedSet]);
  const editExcludedValidCount = useMemo(() => {
    if (!catalogLabs.length) return editExcludedIds.length;
    return catalogLabs.filter((l) => editExcludedSet.has(l.id)).length;
  }, [catalogLabs, editExcludedSet, editExcludedIds]);

  const activeExcludedSet = useMemo(() => new Set(activeEffectiveVisibility.excludedIds || []), [activeEffectiveVisibility]);
  const activeIncludedCount = useMemo(() => {
    if (!catalogLabs.length) return 1;
    return catalogLabs.filter((l) => !activeExcludedSet.has(l.id)).length;
  }, [catalogLabs, activeExcludedSet]);
  const activeExcludedValidCount = useMemo(() => {
    if (!catalogLabs.length) return (activeEffectiveVisibility.excludedIds || []).length;
    return catalogLabs.filter((l) => activeExcludedSet.has(l.id)).length;
  }, [catalogLabs, activeExcludedSet, activeEffectiveVisibility]);

  const customVendorsCount = useMemo(() => {
    return Object.values(visibilityConfig.perVendor || {}).filter((v) => v?.useCustom).length;
  }, [visibilityConfig]);

  const filteredLabsForPicker = useMemo(() => {
    const q = labFilterSearch.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return catalogLabs;
    return catalogLabs.filter((l) =>
      l.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    );
  }, [catalogLabs, labFilterSearch]);

  const applyDraftVisibilityRule = (nextExcluded, nextHideZero, nextHideDisponible, forceUseCustom = true) => {
    const cleanEx = Array.from(new Set((nextExcluded || []).map((x) => String(x)).filter(Boolean)));
    const cleanNz = Boolean(nextHideZero);
    const cleanNd = Boolean(nextHideDisponible);
    setVisibilityConfig((prev) => {
      if (isEditingGlobalTarget) {
        return {
          ...prev,
          global: {
            ...(prev.global || {}),
            excludedIds: cleanEx,
            hideZeroPrice: cleanNz,
            hideDisponibleCodes: cleanNd
          }
        };
      }
      if (!editVendorKey) return prev;
      const existingVendor = prev.perVendor?.[editVendorKey] || {};
      return {
        ...prev,
        perVendor: {
          ...(prev.perVendor || {}),
          [editVendorKey]: {
            ...existingVendor,
            useCustom: Boolean(forceUseCustom),
            excludedIds: cleanEx,
            hideZeroPrice: cleanNz,
            hideDisponibleCodes: cleanNd
          }
        }
      };
    });
  };

  const handleToggleVendorCustomMode = (enableCustom) => {
    if (isEditingGlobalTarget || !editVendorKey) return;
    setVisibilityConfig((prev) => {
      const existing = prev.perVendor?.[editVendorKey] || {};
      return {
        ...prev,
        perVendor: {
          ...(prev.perVendor || {}),
          [editVendorKey]: {
            ...existing,
            useCustom: Boolean(enableCustom),
            excludedIds: existing?.excludedIds || prev.global?.excludedIds || [],
            hideZeroPrice: existing?.hideZeroPrice != null ? Boolean(existing.hideZeroPrice) : Boolean(prev.global?.hideZeroPrice),
            hideDisponibleCodes: existing?.hideDisponibleCodes != null ? Boolean(existing.hideDisponibleCodes) : Boolean(prev.global?.hideDisponibleCodes)
          }
        }
      };
    });
  };

  // Control rápido de precios: global (todos) o por vendedor individual
  const handleSetAllPricesVisibility = (shouldHideAll) => {
    setVisibilityConfig((prev) => {
      const nextPerVendor = {};
      Object.entries(prev.perVendor || {}).forEach(([k, val]) => {
        nextPerVendor[k] = {
          ...(val || {}),
          priceMode: 'inherit'
        };
      });
      return {
        ...prev,
        global: {
          ...(prev.global || {}),
          hidePrices: Boolean(shouldHideAll)
        },
        perVendor: nextPerVendor
      };
    });
  };

  const handleToggleGlobalCatalogPriceVisibility = (shouldHide) => {
    setVisibilityConfig((prev) => ({
      ...prev,
      global: {
        ...(prev.global || {}),
        hidePrices: Boolean(shouldHide)
      }
    }));
  };

  const handleToggleSingleVendorPriceVisibility = (vendorName, shouldShowPrice) => {
    const key = getCanonicalPhoneKey(vendorName || '');
    if (!key) return;
    setVisibilityConfig((prev) => {
      const existing = prev.perVendor?.[key] || {};
      return {
        ...prev,
        perVendor: {
          ...(prev.perVendor || {}),
          [key]: {
            useCustom: Boolean(existing.useCustom),
            excludedIds: Array.isArray(existing.excludedIds) ? existing.excludedIds : (prev.global?.excludedIds || []),
            hideZeroPrice: existing.hideZeroPrice != null ? Boolean(existing.hideZeroPrice) : Boolean(prev.global?.hideZeroPrice),
            hideDisponibleCodes: existing.hideDisponibleCodes != null ? Boolean(existing.hideDisponibleCodes) : Boolean(prev.global?.hideDisponibleCodes),
            priceMode: shouldShowPrice ? 'show' : 'hide'
          }
        }
      };
    });
  };

  const pricesSummaryStats = useMemo(() => {
    const total = availableVendors.length;
    let visibleCount = 0;
    let hiddenCount = 0;
    availableVendors.forEach((v) => {
      const resolved = resolveVisibilityForVendor(visibilityConfig, v.name);
      if (resolved.hidePrices) hiddenCount++;
      else visibleCount++;
    });
    const globalHidden = Boolean(visibilityConfig.global?.hidePrices);
    return { total, visibleCount, hiddenCount, globalHidden };
  }, [availableVendors, visibilityConfig]);

  const pricesButtonBadgeText = useMemo(() => {
    if (pricesSummaryStats.total === 0) return pricesSummaryStats.globalHidden ? 'Ocultos' : 'Visibles';
    if (pricesSummaryStats.hiddenCount === pricesSummaryStats.total && pricesSummaryStats.globalHidden) return 'Ocultos';
    if (pricesSummaryStats.hiddenCount === 0 && !pricesSummaryStats.globalHidden) return 'Visibles';
    return `${pricesSummaryStats.visibleCount}/${pricesSummaryStats.total} ven`;
  }, [pricesSummaryStats]);

  const toggleLabExcluded = (labId) => {
    if (!isEditingGlobalTarget && !editUsesCustomRule) return;
    const next = new Set(editExcludedIds);
    if (next.has(labId)) next.delete(labId);
    else next.add(labId);
    applyDraftVisibilityRule(Array.from(next), editHideZeroPrice, editHideDisponibleCodes, true);
  };

  const handleHideInternalLabsQuick = () => {
    if (!isEditingGlobalTarget && !editUsesCustomRule) return;
    const internalIds = catalogLabs
      .filter((l) => {
        const nm = l.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nm === 'disponible' || nm === 'especiales' || nm.startsWith('disponible');
      })
      .map((l) => l.id);
    applyDraftVisibilityRule(internalIds, editHideZeroPrice, editHideDisponibleCodes, true);
  };

  const handleSaveVisibilityToCloud = async () => {
    if (!canAdmin) return;
    if (catalogLabs.length > 0 && editIncludedCount === 0 && (isEditingGlobalTarget || editUsesCustomRule)) {
      setErrorMsg('Deja al menos 1 laboratorio visible antes de guardar.');
      return;
    }
    setSavingVisibility(true);
    setErrorMsg('');
    try {
      const saved = await saveVisibilityConfigToCloud(visibilityConfig);
      setVisibilityConfig(saved);
      setStatusMsg('¡Control de visibilidad guardado en la nube! Ya aplica automáticamente a tus vendedores y enlaces.');
      setTimeout(() => setStatusMsg(''), 4500);
      setShowShareFilterModal(false);
    } catch (err) {
      setErrorMsg(err?.message || 'Error al guardar la configuración de visibilidad en la nube.');
    } finally {
      setSavingVisibility(false);
    }
  };

  const shareFilterBadgeText = useMemo(() => {
    const globalExCount = (visibilityConfig.global?.excludedIds || []).length;
    const globalNz = Boolean(visibilityConfig.global?.hideZeroPrice);
    const globalNd = Boolean(visibilityConfig.global?.hideDisponibleCodes);
    if (activeExcludedValidCount > 0 || activeEffectiveVisibility.hideZeroPrice || activeEffectiveVisibility.hideDisponibleCodes) {
      const parts = [];
      if (activeExcludedValidCount > 0) {
        parts.push(
          catalogLabs.length > 0 && activeIncludedCount <= catalogLabs.length / 2
            ? `Solo ${activeIncludedCount}`
            : `${activeExcludedValidCount} ${activeExcludedValidCount === 1 ? 'oculto' : 'ocultos'}`
        );
      }
      if (activeEffectiveVisibility.hideZeroPrice) parts.push('sin Q0');
      if (activeEffectiveVisibility.hideDisponibleCodes) parts.push('sin DISP.');
      if (customVendorsCount > 0 && !activeProfileName) parts.push(`${customVendorsCount} pers.`);
      return parts.join(' · ');
    }
    if (customVendorsCount > 0) return `${customVendorsCount} ${customVendorsCount === 1 ? 'vendedor' : 'vendedores'}`;
    if (globalExCount > 0 || globalNz || globalNd) return `${globalExCount} ocultos`;
    return 'Todos';
  }, [visibilityConfig, activeExcludedValidCount, activeIncludedCount, activeEffectiveVisibility, catalogLabs.length, customVendorsCount, activeProfileName]);

  if (!isOpen) return null;

  const shareUrl = buildPublicCatalogUrl({
    vendorName: activeProfileName,
    vendorPhone: savedPhone,
    allLabIds,
    excludedLabIds: activeEffectiveVisibility.excludedIds || [],
    hideZeroPrice: Boolean(activeEffectiveVisibility.hideZeroPrice),
    hideDisponibleCodes: Boolean(activeEffectiveVisibility.hideDisponibleCodes),
    hidePrices: Boolean(activeEffectiveVisibility.hidePrices)
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
    if (catalogLabs.length > 0 && activeIncludedCount === 0) {
      setErrorMsg('Todos los laboratorios están ocultos para este perfil. Habilita al menos 1 en "Controlar qué ven".');
      return;
    }
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
    if (catalogLabs.length > 0 && activeIncludedCount === 0) {
      setErrorMsg('Todos los laboratorios están ocultos para este perfil. Habilita al menos 1 en "Controlar qué ven".');
      return;
    }
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

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
            {canAdmin && activePanel !== 'catalog' && (
              <button
                type="button"
                onClick={() => setActivePanel('catalog')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border bg-white text-blue-950 border-white shadow-sm hover:bg-blue-50"
                title="Regresar a la vista del Catálogo"
              >
                <ArrowLeft size={14} />
                <span>Catálogo</span>
              </button>
            )}

            {canAdmin && (
              <button
                type="button"
                onClick={() => {
                  const next = activePanel === 'orders' ? 'catalog' : 'orders';
                  setActivePanel(next);
                  if (next === 'orders') loadOrdersHistory();
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                  activePanel === 'orders'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
                }`}
                title="Historial de todos los pedidos generados desde cualquier dispositivo (guardados en Supabase)"
              >
                <ClipboardList size={15} className={activePanel === 'orders' ? 'text-slate-950' : 'text-amber-300'} />
                <span className="hidden sm:inline">Historial Pedidos</span>
                <span className="sm:hidden">Pedidos</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activePanel === 'orders' ? 'bg-slate-950 text-emerald-300' : 'bg-amber-400 text-slate-950'
                }`}>
                  {ordersStats.totalOrders}
                </span>
              </button>
            )}

            {canAdmin && (
              <button
                type="button"
                onClick={() => {
                  const next = activePanel === 'logs' ? 'catalog' : 'logs';
                  setActivePanel(next);
                  if (next === 'logs') loadViewLogs();
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                  activePanel === 'logs'
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
                }`}
                title="Ver log y contador de personas que visualizan la tienda virtual"
              >
                <Eye size={15} className={activePanel === 'logs' ? 'text-slate-950' : 'text-emerald-300'} />
                <span className="hidden sm:inline">Log Visitas</span>
                <span className="sm:hidden">Visitas</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activePanel === 'logs' ? 'bg-slate-950 text-amber-300' : 'bg-emerald-500 text-slate-950'
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
              {canAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setVisibilityModalTab('prices');
                    setShowShareFilterModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                    pricesSummaryStats.hiddenCount > 0 || pricesSummaryStats.globalHidden
                      ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700'
                  }`}
                  title="Control exclusivo Admin/Supervisor: decide qué vendedores muestran precios y cuáles los ocultan (manteniendo pedidos activos)"
                >
                  <DollarSign size={13} />
                  <span>Precios</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    pricesSummaryStats.hiddenCount > 0 || pricesSummaryStats.globalHidden
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {pricesButtonBadgeText}
                  </span>
                </button>
              )}

              {canAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setLabFilterSearch('');
                    setVisibilityEditTarget(selectedVendorName || '__global__');
                    setVisibilityModalTab('labs');
                    setShowShareFilterModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                    activeExcludedValidCount > 0 || activeEffectiveVisibility.hideZeroPrice || activeEffectiveVisibility.hideDisponibleCodes || customVendorsCount > 0
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600'
                  }`}
                  title="Control exclusivo Admin/Supervisor: elige qué pueden ver tus vendedores en sus tiendas y enlaces compartidos"
                >
                  <Filter size={13} />
                  <span>Controlar qué ven</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeExcludedValidCount > 0 || activeEffectiveVisibility.hideZeroPrice || activeEffectiveVisibility.hideDisponibleCodes || customVendorsCount > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                  }`}>
                    {shareFilterBadgeText}
                  </span>
                </button>
              )}

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

        {/* PANEL DE HISTORIAL DE PEDIDOS DE TODOS LOS DISPOSITIVOS (SOLO ADMIN / SUPERVISOR) */}
        {canAdmin && activePanel === 'orders' ? (
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto p-3 sm:p-5 space-y-4">
            {/* Encabezado */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardList size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Historial de Pedidos de la Tienda Virtual (Base de Datos)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Todos los pedidos generados desde cualquier celular, tablet o computadora se almacenan automáticamente en Supabase para consulta y control.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={loadOrdersHistory}
                  disabled={loadingOrders}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loadingOrders ? 'animate-spin' : ''} />
                  <span>Actualizar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fname = exportTiendaOrdersToExcel(filteredOrders);
                    setStatusMsg(`Excel de pedidos descargado: ${fname}`);
                    setTimeout(() => setStatusMsg(''), 4000);
                  }}
                  disabled={filteredOrders.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>Exportar Excel (2 hojas)</span>
                </button>
              </div>
            </div>

            {/* Tarjetas KPI de Pedidos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Pedidos</div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{ordersStats.totalOrders.toLocaleString('es-GT')}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {ordersStats.clientLinkOrders} por link cliente • {ordersStats.internalOrders} internos
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Monto Acumulado</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  Q{ordersStats.totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Este mes: <strong>Q{ordersStats.monthAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Pedidos Hoy</div>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{ordersStats.todayOrders}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Monto hoy: <strong>Q{ordersStats.todayAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Estado de Atención</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{ordersStats.pendingCount}</span>
                  <span className="text-xs font-bold text-slate-400">pend.</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 ml-1">{ordersStats.attendedCount}</span>
                  <span className="text-xs font-bold text-slate-400">atend.</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Anulados: <strong>{ordersStats.cancelledCount}</strong>
                </div>
              </div>
            </div>

            {/* Desglose por Vendedor */}
            {ordersStats.bySeller.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-2.5 flex items-center justify-between">
                  <span>Pedidos por Vendedor / Enlace (clic para filtrar)</span>
                  {orderSellerFilter && (
                    <button
                      type="button"
                      onClick={() => setOrderSellerFilter('')}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Quitar filtro ({orderSellerFilter})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ordersStats.bySeller.map((s) => {
                    const active = orderSellerFilter === s.sellerName;
                    return (
                      <button
                        key={s.sellerName}
                        type="button"
                        onClick={() => setOrderSellerFilter(active ? '' : s.sellerName)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <span>{s.sellerName}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                          active ? 'bg-white text-emerald-700' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {s.count} ped.
                        </span>
                        <span className="text-[10px] opacity-85">
                          Q{s.amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Barra de Filtros de Pedidos */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: 'all', label: `Todos (${ordersList.length})` },
                  { id: 'Pendiente', label: `Pendientes (${ordersStats.pendingCount})` },
                  { id: 'Atendido', label: `Atendidos (${ordersStats.attendedCount})` },
                  { id: 'Anulado', label: `Anulados (${ordersStats.cancelledCount})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      orderStatusFilter === tab.id
                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={orderSourceFilter}
                onChange={(e) => setOrderSourceFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Todos los orígenes</option>
                <option value="cliente_link">Solo Clientes (Link)</option>
                <option value="app_interna">Solo App Interna</option>
              </select>

              <input
                type="date"
                value={orderDateFilter}
                onChange={(e) => setOrderDateFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />

              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buscar cliente, No. pedido, vendedor o producto..."
                className="flex-1 min-w-[200px] text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />

              {(orderStatusFilter !== 'all' || orderSourceFilter !== 'all' || orderDateFilter || orderSellerFilter || orderSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter('all');
                    setOrderSourceFilter('all');
                    setOrderSellerFilter('');
                    setOrderDateFilter('');
                    setOrderSearch('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Lista de Pedidos con Detalle Expandible */}
            <div className="space-y-2.5">
              {loadingOrders ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-12 text-center text-xs font-semibold text-slate-400">
                  Cargando historial de pedidos desde Supabase...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-12 text-center text-xs text-slate-400 px-4">
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-slate-500">No hay pedidos registrados con estos filtros.</p>
                  <p className="mt-1">Cada vez que un cliente o vendedor envíe un pedido desde cualquier dispositivo, quedará guardado aquí automáticamente.</p>
                </div>
              ) : (
                filteredOrders.slice(0, 200).map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const statusBadgeStyle =
                    order.status === 'Atendido'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                      : order.status === 'Anulado'
                        ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300';

                  return (
                    <div
                      key={order.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                      <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-[220px] flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                              {order.orderNumber}
                            </span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {order.clientName}
                            </span>
                            {order.source === 'cliente_link' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <Globe size={10} /> Cliente (Link)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                App Interna
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>📅 <strong>{order.date}</strong> • {order.time}</span>
                            <span>👤 Vendedor: <strong className="text-slate-700 dark:text-slate-200">{order.sellerName}</strong></span>
                            {order.sellerPhone && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{order.sellerPhone}</span>}
                            <span>📱 {order.device}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="text-right mr-1">
                            <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400">
                              Q{Number(order.totalAmount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              {order.itemsCount} prod. ({order.totalUnits} unds.)
                            </div>
                          </div>

                          {/* Selector de Estado persistido en Supabase */}
                          <select
                            value={order.status || 'Pendiente'}
                            onChange={async (e) => {
                              const newSt = e.target.value;
                              try {
                                await updateTiendaOrderStatus(order, newSt);
                                setOrdersList((prev) => prev.map((it) => (it.id === order.id ? { ...it, status: newSt } : it)));
                                setStatusMsg(`Pedido ${order.orderNumber} marcado como "${newSt}".`);
                                setTimeout(() => setStatusMsg(''), 3000);
                              } catch (err) {
                                setErrorMsg(err.message || 'No se pudo actualizar el estado.');
                              }
                            }}
                            className={`text-xs font-black px-2.5 py-1.5 rounded-lg border cursor-pointer ${statusBadgeStyle}`}
                            title="Cambiar estado del pedido en la base de datos"
                          >
                            <option value="Pendiente">⏳ Pendiente</option>
                            <option value="Atendido">✅ Atendido</option>
                            <option value="Anulado">❌ Anulado</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all cursor-pointer"
                          >
                            <span>Detalle</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Detalle expandible de productos del pedido */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 sm:p-4 space-y-3">
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase">
                                  <th className="py-2 px-3">Clave</th>
                                  <th className="py-2 px-3">Producto</th>
                                  <th className="py-2 px-3 text-right">Cant.</th>
                                  <th className="py-2 px-3 text-right">Precio Unit.</th>
                                  <th className="py-2 px-3 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(order.items || []).map((it, iIdx) => (
                                  <tr key={`${order.id}_it_${iIdx}`}>
                                    <td className="py-1.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">{it.code}</td>
                                    <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{it.name || it.rawDesc}</td>
                                    <td className="py-1.5 px-3 text-right font-black text-blue-700 dark:text-blue-400">{it.qty}</td>
                                    <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">Q{Number(it.unitPrice || 0).toFixed(2)}</td>
                                    <td className="py-1.5 px-3 text-right font-bold text-slate-900 dark:text-white">Q{Number(it.subtotal || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={async () => {
                                  const cleanForMiNegocio = (s) => String(s || '').replace(/\*+/g, ' ').replace(/->/g, ' ').replace(/:/g, ' ').replace(/\s+/g, ' ').trim();
                                  const exactFormat = `Nombre: ${cleanForMiNegocio(order.clientName)}\n\n${(order.items || []).map((it) => `*${it.qty} -> ${cleanForMiNegocio(it.rawDesc || it.name)} :${String(it.code || '').replace(/\*+/g, '').trim()}`).join('\n')}\n\nTotal estimado: Q${Number(order.totalAmount || 0).toFixed(2)}`;
                                  try { await navigator.clipboard.writeText(exactFormat); } catch (_) {}
                                  setStatusMsg(`Pedido ${order.orderNumber} copiado limpio para MiNegocio.`);
                                  setTimeout(() => setStatusMsg(''), 3000);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <Copy size={12} />
                                <span>Copiar Pedido</span>
                              </button>

                              {order.sellerPhone && (
                                <a
                                  href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(order.sellerPhone)}&text=${encodeURIComponent(
                                    `Nombre: ${String(order.clientName || '').replace(/\*+/g, ' ').replace(/->/g, ' ').replace(/:/g, ' ').replace(/\s+/g, ' ').trim()}\n\n${(order.items || []).map((it) => `*${it.qty} -> ${String(it.rawDesc || it.name || '').replace(/\*+/g, ' ').replace(/->/g, ' ').replace(/:/g, ' ').replace(/\s+/g, ' ').trim()} :${String(it.code || '').replace(/\*+/g, '').trim()}`).join('\n')}\n\nTotal estimado: Q${Number(order.totalAmount || 0).toFixed(2)}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                >
                                  <MessageCircle size={12} />
                                  <span>Abrir en WhatsApp</span>
                                </a>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`¿Eliminar permanentemente el pedido ${order.orderNumber} de "${order.clientName}"?`)) return;
                                try {
                                  await deleteTiendaOrder(order);
                                  setOrdersList((prev) => prev.filter((it) => it.id !== order.id));
                                  setStatusMsg(`Pedido ${order.orderNumber} eliminado del historial.`);
                                  setTimeout(() => setStatusMsg(''), 3000);
                                } catch (err) {
                                  setErrorMsg(err.message || 'No se pudo eliminar el pedido.');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : canAdmin && activePanel === 'logs' ? (
          /* PANEL DE LOG Y CONTADOR DE VISUALIZACIONES (SOLO ADMIN / SUPERVISOR) */
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

        {/* SUB-MODAL EXCLUSIVO ADMIN / SUPERVISOR: CONTROL DE VISIBILIDAD POR VENDEDOR */}
        {canAdmin && showShareFilterModal && (
          <div
            className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3"
            onClick={(e) => { if (e.target === e.currentTarget) setShowShareFilterModal(false); }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck size={18} className="text-amber-300 shrink-0" />
                  <h3 className="text-sm sm:text-base font-black truncate">
                    Control de Visibilidad de Tiendas (Solo Admin / Supervisor)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareFilterModal(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* PESTAÑAS DEL CONTROL DE VISIBILIDAD: PRECIOS VS LABORATORIOS */}
              <div className="px-4 pt-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibilityModalTab('prices')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-t-lg border-b-2 transition-all cursor-pointer ${
                    visibilityModalTab === 'prices'
                      ? 'border-indigo-700 text-indigo-800 dark:text-indigo-300 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <DollarSign size={14} />
                  <span>Precios por Vendedor</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    pricesSummaryStats.hiddenCount > 0 || pricesSummaryStats.globalHidden
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {pricesButtonBadgeText}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityModalTab('labs')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-t-lg border-b-2 transition-all cursor-pointer ${
                    visibilityModalTab === 'labs'
                      ? 'border-indigo-700 text-indigo-800 dark:text-indigo-300 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Filter size={14} />
                  <span>Laboratorios y Códigos</span>
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {visibilityModalTab === 'prices' ? (
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Elige exactamente qué vendedores pueden <strong>mostrar precios</strong> en sus tiendas (y en los enlaces a sus clientes), o bien oculta los precios para <strong>todos</strong>. Aunque los precios estén ocultos, <strong>los clientes sí pueden agregar productos al carrito y enviar su pedido</strong> para cotizar e interactuar con el vendedor.
                    </p>

                    {/* BOTONES RÁPIDOS DE 1 CLIC PARA TODOS */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Acciones rápidas para todos:
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetAllPricesVisibility(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
                        >
                          <EyeOff size={13} />
                          <span>Ocultar precios a TODOS (nadie ve)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllPricesVisibility(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Mostrar precios a TODOS</span>
                        </button>
                      </div>
                    </div>

                    {/* CATÁLOGO GENERAL */}
                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                          🌐 Catálogo General (enlace sin vendedor asignado)
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          {visibilityConfig.global?.hidePrices
                            ? 'Precios ocultos por defecto — los clientes envían pedido para cotización.'
                            : 'Precios visibles por defecto en el catálogo general.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleGlobalCatalogPriceVisibility(!visibilityConfig.global?.hidePrices)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all border ${
                          visibilityConfig.global?.hidePrices
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {visibilityConfig.global?.hidePrices ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{visibilityConfig.global?.hidePrices ? 'Precios Ocultos' : 'Precios Visibles'}</span>
                      </button>
                    </div>

                    {/* LISTA INDIVIDUAL DE VENDEDORES */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Control individual por vendedor ({pricesSummaryStats.visibleCount} visibles · {pricesSummaryStats.hiddenCount} ocultos)
                        </span>
                        <span className="text-[11px] text-slate-500">Haz clic para cambiar cada vendedor</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                        {availableVendors.map((v) => {
                          const resolved = resolveVisibilityForVendor(visibilityConfig, v.name);
                          const isHidden = Boolean(resolved.hidePrices);
                          return (
                            <div
                              key={v.name}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all ${
                                isHidden
                                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70'
                                  : 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/70'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={v.name}>
                                  {v.name}
                                </div>
                                <div className={`text-[10px] font-bold ${isHidden ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                  {isHidden ? 'Solo pedidos / cotización' : 'Ve y muestra precios'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleSingleVendorPriceVisibility(v.name, isHidden)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer shrink-0 transition-all shadow-sm ${
                                  isHidden
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                title={isHidden ? `Clic para MOSTRAR precios a ${v.name}` : `Clic para OCULTAR precios a ${v.name}`}
                              >
                                {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                <span>{isHidden ? 'Ocultos' : 'Visibles'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Define qué laboratorios pueden y cuáles <strong>no</strong> pueden ver tus vendedores en sus tiendas y en los enlaces que comparten a sus clientes. <strong>Ningún vendedor tiene acceso para cambiar estas reglas.</strong>
                </p>

                {/* SELECTOR DE ALCANCE: REGLA GENERAL VS VENDEDOR INDIVIDUAL */}
                <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                    ¿Para quién deseas configurar la visibilidad?
                  </label>
                  <select
                    value={visibilityEditTarget}
                    onChange={(e) => setVisibilityEditTarget(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="__global__">
                      🌐 Regla General — Todos los vendedores por defecto ({(visibilityConfig.global?.excludedIds || []).length} ocultos)
                    </option>
                    {availableVendors.map((v) => {
                      const vk = getCanonicalPhoneKey(v.name);
                      const custom = visibilityConfig.perVendor?.[vk];
                      const tag = custom?.useCustom
                        ? `Personalizado (${(custom.excludedIds || []).length} ocultos)`
                        : 'Usa Regla General';
                      return (
                        <option key={v.name} value={v.name}>
                          👤 {v.name} — {tag}
                        </option>
                      );
                    })}
                  </select>

                  {!isEditingGlobalTarget && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleVendorCustomMode(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                          !editUsesCustomRule
                            ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        Usar Regla General
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVendorCustomMode(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                          editUsesCustomRule
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        Personalizar solo para {visibilityEditTarget}
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingGlobalTarget && !editUsesCustomRule ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {visibilityEditTarget} hereda automáticamente la Regla General.
                    </div>
                    <div>
                      Actualmente tiene <strong>{editIncludedCount}</strong> de <strong>{catalogLabs.length}</strong> laboratorios visibles
                      {editExcludedValidCount > 0 ? ` (${editExcludedValidCount} ocultos)` : ' (todos visibles)'}
                      {editHideZeroPrice ? ' · sin productos Q0' : ''}
                      {editHideDisponibleCodes ? ' · sin códigos DISPONIBLE' : ''}.
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Si quieres darle un catálogo diferente solo a este vendedor, presiona <strong>&ldquo;Personalizar solo para {visibilityEditTarget}&rdquo;</strong> arriba.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyDraftVisibilityRule([], editHideZeroPrice, editHideDisponibleCodes, true)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-800 border border-slate-300 cursor-pointer"
                      >
                        Marcar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDraftVisibilityRule(allLabIds, editHideZeroPrice, editHideDisponibleCodes, true)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                      >
                        Desmarcar todos
                      </button>
                      <button
                        type="button"
                        onClick={handleHideInternalLabsQuick}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer"
                      >
                        <EyeOff size={13} />
                        <span>Ocultar Disponible y Especiales</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={labFilterSearch}
                      onChange={(e) => setLabFilterSearch(e.target.value)}
                      placeholder="Buscar laboratorio para permitir u ocultar..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {catalogLabs.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        Cargando lista de laboratorios del catálogo...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60">
                        {filteredLabsForPicker.map((lab) => {
                          const checked = !editExcludedSet.has(lab.id);
                          return (
                            <label
                              key={lab.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all select-none ${
                                checked
                                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-indigo-400'
                                  : 'bg-slate-100/80 dark:bg-slate-900/50 border-transparent text-slate-400 line-through'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLabExcluded(lab.id)}
                                className="w-4 h-4 accent-indigo-700 rounded cursor-pointer shrink-0"
                              />
                              <span className="truncate" title={lab.name}>{lab.name}</span>
                            </label>
                          );
                        })}
                        {filteredLabsForPicker.length === 0 && (
                          <div className="col-span-full text-center py-4 text-xs text-slate-500">
                            No se encontró ningún laboratorio con ese nombre.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editHideZeroPrice}
                          onChange={(e) => applyDraftVisibilityRule(editExcludedIds, e.target.checked, editHideDisponibleCodes, true)}
                          className="w-4 h-4 accent-indigo-700 rounded cursor-pointer shrink-0"
                        />
                        <span>Ocultar también productos con precio Q0</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs font-semibold text-amber-950 dark:text-amber-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editHideDisponibleCodes}
                          onChange={(e) => applyDraftVisibilityRule(editExcludedIds, editHideZeroPrice, e.target.checked, true)}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer shrink-0"
                        />
                        <span>Ocultar todos los códigos/productos que digan &ldquo;DISPONIBLE&rdquo; (en todos los laboratorios)</span>
                      </label>
                    </div>

                    {catalogLabs.length > 0 && editIncludedCount === 0 && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                        Deja al menos 1 laboratorio visible antes de guardar.
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Vista para <strong>{isEditingGlobalTarget ? 'todos los vendedores (Regla General)' : visibilityEditTarget}</strong>:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">{editIncludedCount}</strong> de <strong>{catalogLabs.length}</strong> laboratorios visibles
                      {editExcludedValidCount > 0 && ` (${editExcludedValidCount} ${editExcludedValidCount === 1 ? 'oculto' : 'ocultos'})`}
                      {editHideZeroPrice && ' · sin productos Q0'}
                      {editHideDisponibleCodes && ' · sin códigos DISPONIBLE'}.
                    </div>
                  </>
                )}
                  </>
                )}
              </div>

              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowShareFilterModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveVisibilityToCloud}
                  disabled={savingVisibility || (visibilityModalTab === 'labs' && catalogLabs.length > 0 && editIncludedCount === 0 && (isEditingGlobalTarget || editUsesCustomRule))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-sm cursor-pointer"
                >
                  <Save size={14} />
                  <span>{savingVisibility ? 'Guardando en la nube...' : 'Guardar Cambios en la Nube'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
