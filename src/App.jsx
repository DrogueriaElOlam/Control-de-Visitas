import React, { useState, useEffect, useRef } from 'react';
import { Wifi, X } from 'lucide-react';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import AdminDashboard from './components/AdminDashboard';
import AdminVendorManagement from './components/AdminVendorManagement';
import VendorAnalytics from './components/VendorAnalytics';
import VisitRegistration from './components/VisitRegistration';
import VisitsListAndFilters from './components/VisitsListAndFilters';
import InteractiveMapModal from './components/InteractiveMapModal';
import LiveVendorTrackingMap from './components/LiveVendorTrackingMap';
import ExportModal from './components/ExportModal';
import DailyGoalWidget from './components/DailyGoalWidget';
import VendorReportModal from './components/VendorReportModal';
import CashCollectionsModal from './components/CashCollectionsModal';
import FormulariosOlamModal from './components/FormulariosOlamModal';
import AdminClientDirectoryModal from './components/AdminClientDirectoryModal';
import SupervisorLogoutModal from './components/SupervisorLogoutModal';
import CentralSupervisionModal from './components/CentralSupervisionModal';
import AjustesSistemaModal from './components/AjustesSistemaModal';
import AdminSupportTicketsModal from './components/AdminSupportTicketsModal';
import VendorSupportChatModal from './components/VendorSupportChatModal';
import AdminVendorConnectionsModal from './components/AdminVendorConnectionsModal';
import VisualFeedbackSelector from './components/VisualFeedbackSelector';

import { supabase } from './lib/supabase';
import { 
  recordVendorLoginSession, 
  playVendorOnlineSound 
} from './lib/vendorConnections';

import { 
  getSavedSession, 
  clearSession, 
  getVendorsList, 
  getVisitsList,
  syncPendingVisits,
  triggerReactiveSync,
  getPendingSyncVisits,
  deduplicateVisitsList
} from './lib/db';
import { syncCashFromVisits } from './lib/cashCollections';
import { subscribeToOnlinePresence } from './lib/presence';
import { startSilentTracking, stopSilentTracking } from './lib/silentGpsTracker';
import { 
  getAdminSupportStats, 
  subscribeToInternalChat, 
  fetchRemoteChatMessages 
} from './lib/internalChat';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [targetMapVisit, setTargetMapVisit] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [showFormulariosModal, setShowFormulariosModal] = useState(false);
  const [showSupervisionModal, setShowSupervisionModal] = useState(false);
  const [showAjustesModal, setShowAjustesModal] = useState(false);
  const [showAdminTicketsModal, setShowAdminTicketsModal] = useState(false);
  const [showVendorChatModal, setShowVendorChatModal] = useState(false);
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

  const [vendors, setVendors] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [onlineVendors, setOnlineVendors] = useState({});
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [vendorOnlineToast, setVendorOnlineToast] = useState(null);
  const prevOnlineVendorsRef = useRef({});

  const [showLogoutSupervisorModal, setShowLogoutSupervisorModal] = useState(false);

  // Initialize session and theme
  useEffect(() => {
    const saved = getSavedSession();
    if (saved) {
      setCurrentUser(saved);
      setActiveTab(saved.role === 'admin' ? 'dashboard' : 'register');
    } else {
      setCurrentUser(null);
    }

    const savedTheme = localStorage.getItem('olam_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    }

    // Auto-abrir modal de formularios si se solicita por parámetro en la URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('modal_forms')) {
        setShowFormulariosModal(true);
      }
    }

    // Garantizar purga automática de bundles JS viejos en teléfonos y navegadores
    const APP_BUILD_REV = 'olam_rev_20261008_phone_free_v2';
    try {
      const storedRev = localStorage.getItem('olam_app_build_rev');
      if (storedRev !== APP_BUILD_REV) {
        localStorage.setItem('olam_app_build_rev', APP_BUILD_REV);
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      }
    } catch (_) {}

    loadInitialData();

    // Auto retry sync whenever internet connection is restored
    const handleOnline = () => {
      triggerReactiveSync();
      loadInitialData();
    };
    window.addEventListener('online', handleOnline);

    // Escuchar evento de sincronización exitosa en segundo plano para actualizar UI al instante
    const handleVisitsSynced = () => {
      getVisitsList().then(refreshed => {
        setVisits(deduplicateVisitsList(refreshed));
      }).catch(() => {});
    };
    window.addEventListener('olam_visits_synced', handleVisitsSynced);

    // Verificador periódico ligero de cola pendiente (cada 12 segundos)
    const queueInterval = setInterval(() => {
      const pending = getPendingSyncVisits();
      if (pending && pending.length > 0) {
        triggerReactiveSync();
      }
    }, 12000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('olam_visits_synced', handleVisitsSynced);
      clearInterval(queueInterval);
    };
  }, []);

  // Suscribirse a la presencia de vendedores en tiempo real y notificaciones
  useEffect(() => {
    if (!currentUser) return;

    // Si el usuario que ingresa es un vendedor, registrar de inmediato su sesión de conexión
    if (currentUser.role === 'vendor' || (currentUser.name && currentUser.name !== 'Administrador')) {
      recordVendorLoginSession(currentUser);
    }

    const cleanup = subscribeToOnlinePresence(currentUser, (presenceMap) => {
      setOnlineVendors(presenceMap || {});

      // Si el usuario actual es Administrador, detectar nuevos vendedores que se conectan
      if (currentUser.role === 'admin') {
        const prev = prevOnlineVendorsRef.current || {};
        Object.entries(presenceMap || {}).forEach(([key, info]) => {
          const isVendor = info?.role === 'vendor' || (info?.name && info?.name !== 'Administrador');
          if (isVendor && !prev[key]) {
            // Se acaba de conectar un nuevo vendedor
            const nowTime = new Date().toLocaleTimeString('es-GT', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            });
            setVendorOnlineToast({
              name: info.name || key,
              route: info.route || 'Ruta asignada',
              time: nowTime,
              device: info.device || 'Dispositivo en campo'
            });
            playVendorOnlineSound();
          }
        });
      }
      prevOnlineVendorsRef.current = { ...(presenceMap || {}) };
    });

    // Escuchar canal de Realtime para eventos directos de inicio de sesión de vendedores
    const channel = supabase.channel('olam_vendor_events_listener');
    channel
      .on('broadcast', { event: 'vendor_online_event' }, (payload) => {
        if (currentUser.role === 'admin' && payload?.payload) {
          const data = payload.payload;
          setVendorOnlineToast({
            name: data.vendor_name,
            route: data.route,
            time: data.time || new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true }),
            device: data.device
          });
          playVendorOnlineSound();
        }
      })
      .subscribe();

    // Escuchar evento local si se conecta en la misma ventana
    const handleLocalVendorConn = (e) => {
      if (currentUser.role === 'admin' && e.detail) {
        setVendorOnlineToast({
          name: e.detail.vendor_name,
          route: e.detail.route,
          time: e.detail.time,
          device: e.detail.device
        });
        playVendorOnlineSound();
      }
    };
    window.addEventListener('olam_vendor_connected', handleLocalVendorConn);

    return () => {
      cleanup();
      window.removeEventListener('olam_vendor_connected', handleLocalVendorConn);
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [currentUser]);

  // Temporizador para auto-ocultar la notificación Toast del vendedor conectado
  useEffect(() => {
    if (!vendorOnlineToast) return;
    const timer = setTimeout(() => {
      setVendorOnlineToast(null);
    }, 8000); // 8 segundos
    return () => clearTimeout(timer);
  }, [vendorOnlineToast]);

  // Iniciar rastreador silencioso e invisible de GPS si el usuario es vendedor
  useEffect(() => {
    if (currentUser?.role === 'vendor') {
      startSilentTracking(currentUser);
    } else {
      stopSilentTracking();
    }
    return () => {
      stopSilentTracking();
    };
  }, [currentUser]);

  // Sincronización en tiempo real de chat interno y peticiones de soporte
  useEffect(() => {
    const updateStats = () => {
      const stats = getAdminSupportStats();
      setPendingTicketsCount(stats.totalPending);
    };
    updateStats();

    fetchRemoteChatMessages().then(() => updateStats()).catch(() => {});

    const cleanupRealtime = subscribeToInternalChat(() => {
      updateStats();
    });

    const handleLocalUpdate = () => {
      updateStats();
    };
    window.addEventListener('olam_chat_updated', handleLocalUpdate);

    return () => {
      if (typeof cleanupRealtime === 'function') cleanupRealtime();
      window.removeEventListener('olam_chat_updated', handleLocalUpdate);
    };
  }, [currentUser]);

  // Theme switch effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('olam_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('olam_theme', 'light');
    }
  }, [darkMode]);

  async function loadInitialData() {
    try {
      // Depuración automática de visitas y puntos de prueba huérfanos de Josué y Elio en almacenamiento local
      try {
        const storedVisitsKey = 'drogueriaElOlamVisits_v129';
        const rawVisits = localStorage.getItem(storedVisitsKey);
        if (rawVisits) {
          const parsed = JSON.parse(rawVisits);
          const cleaned = parsed.filter(v => {
            const n = v.vendorName || '';
            return !n.includes('Josue') && !n.includes('Josué') && !n.includes('Elio');
          });
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(storedVisitsKey, JSON.stringify(cleaned));
          }
        }
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('olam_gps_tracking_')) {
            const rawPts = localStorage.getItem(k);
            if (rawPts) {
              const pts = JSON.parse(rawPts);
              const cleanedPts = pts.filter(p => {
                const n = p.vendorName || p.vendor_name || '';
                return !n.includes('Josue') && !n.includes('Josué') && !n.includes('Elio');
              });
              localStorage.setItem(k, JSON.stringify(cleanedPts));
            }
          }
        });
      } catch (_) {}

      // Sync any offline/retry visits first
      await syncPendingVisits();
      
      const [vList, viList] = await Promise.all([
        getVendorsList(),
        getVisitsList()
      ]);
      setVendors(vList);
      setVisits(deduplicateVisitsList(viList));
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoadingInitial(false);
    }
  }

  // Login handler
  const handleLoginSuccess = (session) => {
    setCurrentUser(session);
    setActiveTab(session.role === 'admin' ? 'dashboard' : 'register');
    if (session.role === 'vendor' || (session.name && session.name !== 'Administrador')) {
      recordVendorLoginSession(session);
    }
    loadInitialData();
  };

  // Logout handler
  const handleLogout = () => {
    // Si es un vendedor en campo, bloquear la salida con contraseña de supervisor
    if (currentUser?.role === 'vendor') {
      setShowLogoutSupervisorModal(true);
      return;
    }
    // Si es administrador, cerrar directamente
    executeLogout();
  };

  const executeLogout = () => {
    setShowLogoutSupervisorModal(false);
    stopSilentTracking();
    clearSession();
    setCurrentUser(null);
  };

  // When a visit is added
  const handleVisitAdded = (newVisit) => {
    if (!newVisit) return;
    setVisits(prev => deduplicateVisitsList([newVisit, ...prev]));
    syncCashFromVisits([newVisit], newVisit.vendorName || currentUser?.name);
  };

  // When vendors are updated
  const handleVendorUpdated = async () => {
    const updated = await getVendorsList();
    setVendors(updated);
  };

  // When clicking "Ver GPS" on a visit
  const handleOpenMapLocation = (visit) => {
    setTargetMapVisit(visit);
    setActiveTab('map');
  };

  // If not logged in, show Login
  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenReportModal={() => setShowReportModal(true)}
        onOpenCashModal={() => setShowCashModal(true)}
        onOpenDirectoryModal={() => setShowDirectoryModal(true)}
        onOpenFormulariosModal={() => setShowFormulariosModal(true)}
        onOpenSupervisionModal={() => setShowSupervisionModal(true)}
        onOpenAjustesModal={() => setShowAjustesModal(true)}
        onOpenSupportTicketsModal={() => setShowAdminTicketsModal(true)}
        onOpenVendorSupportChat={() => setShowVendorChatModal(true)}
        onOpenConnectionsModal={() => setShowConnectionsModal(true)}
        pendingTicketsCount={pendingTicketsCount}
        onlineVendors={onlineVendors}
      />

      {/* Notificación Toast Flotante: Vendedor en Línea (Visible para Administrador) */}
      {vendorOnlineToast && currentUser?.role === 'admin' && (
        <div className="fixed top-20 right-3 sm:right-6 z-[9999] max-w-sm w-[92vw] sm:w-96 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-400 backdrop-blur-xl animate-fadeIn transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-xl relative shrink-0 shadow-inner">
                <Wifi size={22} className="animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/50 shadow-sm">
                    🟢 En Línea Ahora
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium">{vendorOnlineToast.time}</span>
                </div>
                <p className="font-extrabold text-sm text-white mt-1 leading-snug">
                  {vendorOnlineToast.name}
                </p>
                <p className="text-xs text-blue-200 mt-0.5">
                  {vendorOnlineToast.route || 'Ruta en campo'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setVendorOnlineToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-300 truncate max-w-[190px]">
              {vendorOnlineToast.device || 'Dispositivo en campo'}
            </span>
            <button
              onClick={() => {
                setVendorOnlineToast(null);
                setShowConnectionsModal(true);
              }}
              className="px-2.5 py-1 bg-emerald-500/25 hover:bg-emerald-500 text-emerald-200 hover:text-white rounded-lg font-bold transition-all border border-emerald-400/40 cursor-pointer"
            >
              Ver Conexiones
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        
        {/* ADMIN VIEWS */}
        {currentUser.role === 'admin' && (
          <>
            {activeTab === 'dashboard' && (
              <AdminDashboard
                vendors={vendors}
                visits={visits}
                onNavigate={(tab) => setActiveTab(tab)}
                onLogout={handleLogout}
                onOpenDirectoryModal={() => setShowDirectoryModal(true)}
                onOpenFormulariosModal={() => setShowFormulariosModal(true)}
                onOpenSupervisionModal={() => setShowSupervisionModal(true)}
                onOpenAjustesModal={() => setShowAjustesModal(true)}
                onOpenConnectionsModal={() => setShowConnectionsModal(true)}
                onlineVendors={onlineVendors}
              />
            )}

            {activeTab === 'vendors' && (
              <AdminVendorManagement
                onVendorUpdated={handleVendorUpdated}
                onlineVendors={onlineVendors}
              />
            )}

            {activeTab === 'frequency' && (
              <VendorAnalytics
                vendors={vendors}
                visits={visits}
              />
            )}

            {activeTab === 'visits' && (
              <VisitsListAndFilters
                visits={visits}
                currentUser={currentUser}
                onVisitsChange={loadInitialData}
                onOpenMapLocation={handleOpenMapLocation}
                onOpenReportModal={() => setShowReportModal(true)}
              />
            )}

            {activeTab === 'map' && (
              <LiveVendorTrackingMap
                visits={visits}
                vendors={vendors}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'export' && (
              <ExportModal
                visits={visits}
                vendors={vendors}
              />
            )}
          </>
        )}

        {/* VENDOR VIEWS */}
        {currentUser.role === 'vendor' && (
          <>
            {activeTab === 'register' && (
              <VisitRegistration
                currentUser={currentUser}
                onVisitAdded={handleVisitAdded}
                allVisits={visits}
                onLogout={handleLogout}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {/* Apartado Visitas a la par de Registro: Información de primera mano de hoy */}
            {activeTab === 'my_visits' && (
              <VisitsListAndFilters
                visits={visits}
                currentUser={currentUser}
                onVisitsChange={loadInitialData}
                onOpenMapLocation={handleOpenMapLocation}
                onOpenReportModal={() => setShowReportModal(true)}
                onNavigate={(tab) => setActiveTab(tab)}
                pageTitle="Visitas del Día (Información de Primera Mano)"
                isFirstHandView={true}
              />
            )}

            {/* Apartado Información General: Base de Datos e Historial Completo */}
            {activeTab === 'info_general' && (
              <VisitsListAndFilters
                visits={visits}
                currentUser={currentUser}
                onVisitsChange={loadInitialData}
                onOpenMapLocation={handleOpenMapLocation}
                onOpenReportModal={() => setShowReportModal(true)}
                onNavigate={(tab) => setActiveTab(tab)}
                pageTitle="Información General de Visitas"
                isFirstHandView={false}
              />
            )}

            {activeTab === 'my_goal' && currentUser?.role === 'admin' && (
              <DailyGoalWidget
                currentUser={currentUser}
                visits={visits}
                vendors={vendors}
                onOpenReportModal={() => setShowReportModal(true)}
              />
            )}
          </>
        )}

      </main>

      {/* Official Vendor & Admin Report Modal */}
      <VendorReportModal
        isOpen={showReportModal || activeTab === 'report'}
        onClose={() => {
          setShowReportModal(false);
          if (activeTab === 'report') {
            setActiveTab(currentUser?.role === 'admin' ? 'dashboard' : 'my_visits');
          }
        }}
        currentUser={currentUser}
        visits={visits}
        vendors={vendors}
        onVisitAdded={handleVisitAdded}
        onOpenCashModal={() => setShowCashModal(true)}
      />

      {/* Modal Reporte Cobros en Efectivo (conforme formato PDF solicitado) */}
      <CashCollectionsModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        currentUser={currentUser}
        vendors={vendors}
        visits={visits}
      />

      {/* Modal Carga Masiva de Clientes desde Excel (Panel Administrador) */}
      <AdminClientDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        visits={visits}
      />

      {/* Módulo Oficial de Formularios Droguería El Olam */}
      <FormulariosOlamModal
        isOpen={showFormulariosModal}
        onClose={() => setShowFormulariosModal(false)}
        currentUser={currentUser}
      />

      {/* Modal de Bloqueo de Salida con Contraseña de Supervisor */}
      <SupervisorLogoutModal
        isOpen={showLogoutSupervisorModal}
        onClose={() => setShowLogoutSupervisorModal(false)}
        onConfirmLogout={executeLogout}
        vendorName={currentUser?.name}
      />

      {/* Modal Oficial: Panel Central de Supervisión (Compromisos, Ventas y Cobros) */}
      <CentralSupervisionModal
        isOpen={showSupervisionModal}
        onClose={() => setShowSupervisionModal(false)}
      />

      {/* Modal: Ajustes del Sistema (Configuración de Vendedores, Equipos y Metas) */}
      <AjustesSistemaModal
        isOpen={showAjustesModal}
        onClose={() => setShowAjustesModal(false)}
      />

      {/* Modal del Administrador: Gestión de Solicitudes y Chat de Soporte */}
      <AdminSupportTicketsModal
        isOpen={showAdminTicketsModal}
        onClose={() => {
          setShowAdminTicketsModal(false);
          const stats = getAdminSupportStats();
          setPendingTicketsCount(stats.totalPending);
        }}
        currentUser={currentUser}
      />

      {/* Modal del Vendedor: Chat Privado con el Administrador */}
      <VendorSupportChatModal
        isOpen={showVendorChatModal}
        onClose={() => setShowVendorChatModal(false)}
        currentUser={currentUser}
      />

      {/* Modal del Administrador: Historial y Registro de Conexiones de Vendedores en Línea */}
      <AdminVendorConnectionsModal
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        onlineVendors={onlineVendors}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 mb-16 md:mb-0 text-center text-xs text-slate-400">
        <p>© 2026 Droguería El Olam • Sistema de Control y Rendimiento de Visitas Diarias</p>
      </footer>
      {/* Selector / Marcador Visual para Modificar o Eliminar Elementos */}
      <VisualFeedbackSelector />

    </div>
  );
}

