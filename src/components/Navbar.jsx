import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  LogOut, 
  Users, 
  PlusCircle, 
  ListFilter, 
  BarChart3, 
  MapPin, 
  FileSpreadsheet, 
  Moon, 
  Sun,
  ShieldAlert,
  Target,
  FileText,
  Banknote,
  CheckCircle2,
  Database,
  Shield,
  Settings,
  MessageSquare,
  Wifi,
  Bell,
  Key,
  Cloud,
  X
} from 'lucide-react';
import { getOtpKeysStats, getLogoutOtpKeysStats } from '../lib/security';
import { isSuperUser, normalizeText } from '../lib/formsPermissions';

export default function Navbar({ 
  currentUser, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  darkMode, 
  setDarkMode, 
  syncStatus,
  onOpenReportModal,
  onOpenCashModal,
  onOpenDirectoryModal,
  onOpenFormulariosModal,
  onOpenSupervisionModal,
  onOpenAjustesModal,
  onOpenSupportTicketsModal,
  onOpenVendorSupportChat,
  onOpenConnectionsModal,
  onOpenOtpModal,
  onOpenLogoutOtpModal,
  onOpenRemindersModal,
  onOpenSupabaseModal,
  pendingTicketsCount = 0,
  onlineVendors = {},
  connectionNotifications = [],
  onClearConnectionNotifications,
  onMarkNotificationsRead
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isSuper = isAdmin || isSuperUser(currentUser) || (currentUser?.name && normalizeText(currentUser.name).includes('antonio celada')) || currentUser?.role === 'supervisor';
  const onlineVendorsCount = Object.values(onlineVendors || {}).filter(u => u?.role === 'vendor' || (u?.name && u?.name !== 'Administrador')).length;

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifMenuRef = useRef(null);

  // Cerrar el menú desplegable al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    }
    if (showNotifMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifMenu]);

  const unreadNotifsCount = connectionNotifications.filter(n => n.unread).length;
  const latestNotif = connectionNotifications[0];

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white shadow-xl backdrop-blur-md border-b border-blue-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Company Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(isAdmin ? 'dashboard' : 'register')}>
            <div className="bg-white p-1.5 rounded-xl shadow-md flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Droguería El Olam" 
                className="h-9 sm:h-11 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden h-9 w-9 items-center justify-center text-blue-900 font-bold">
                <Building2 size={24} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-2xl tracking-tight text-white drop-shadow-sm">
                  Droguería El Olam
                </h1>
                {isAdmin ? (
                  <span className="bg-amber-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full uppercase shadow">
                    Admin
                  </span>
                ) : isSuper ? (
                  <span className="bg-amber-400 text-slate-900 text-xs font-black px-2.5 py-0.5 rounded-full uppercase shadow border border-amber-300">
                    Supervisor
                  </span>
                ) : (
                  <span className="bg-emerald-500/90 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow">
                    Vendedor
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 hidden sm:block">
                Sistema Integral de Control de Visitas & Rendimiento
              </p>
            </div>
          </div>

          {/* User info & quick actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Vendor badge / route */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-white">
                {currentUser?.name}
              </span>
              <span className="text-xs text-blue-200">
                {isAdmin ? 'Panel de Administración' : 'Vendedor Autorizado'}
              </span>
            </div>

            {/* Centro de Notificaciones de Conexión en Tiempo Real (Admin / Supervisor) */}
            {isSuper && (
              <div className="relative" ref={notifMenuRef}>
                <button 
                  onClick={() => {
                    const nextState = !showNotifMenu;
                    setShowNotifMenu(nextState);
                    if (nextState && onMarkNotificationsRead) {
                      onMarkNotificationsRead();
                    }
                  }} 
                  className={`cursor-pointer flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95 border ${
                    unreadNotifsCount > 0
                      ? 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-400 text-emerald-200 animate-pulse'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-300'
                  }`}
                  title="Ver notificaciones de conexión en tiempo real"
                >
                  {/* Campana con indicador de estado y badge */}
                  <div className="relative flex items-center justify-center">
                    <Bell size={16} className={unreadNotifsCount > 0 ? 'text-emerald-300 animate-bounce' : 'text-emerald-400'} />
                    {unreadNotifsCount > 0 ? (
                      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-black text-slate-950 shadow border border-emerald-200 animate-ping">
                        {unreadNotifsCount}
                      </span>
                    ) : (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                    )}
                  </div>

                  {/* Texto interactivo de la última conexión en tiempo real */}
                  <div className="hidden sm:flex items-center gap-1.5 max-w-[210px] truncate text-left">
                    {latestNotif ? (
                      <span className="truncate">
                        <span className="text-emerald-200 font-black">🟢 {latestNotif.name.split(' ')[0]}:</span>{' '}
                        <span className="text-blue-100 font-semibold">{latestNotif.time}</span>
                      </span>
                    ) : (
                      <span>{onlineVendorsCount} {onlineVendorsCount === 1 ? 'en línea' : 'en línea'}</span>
                    )}
                  </div>

                  {/* En dispositivos móviles pequeños: conteo rápido */}
                  <span className="sm:hidden text-[11px] font-bold text-emerald-300">
                    {onlineVendorsCount}
                  </span>
                </button>

                {/* Panel Desplegable de Notificaciones de Conexión en Vivo */}
                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-[92vw] sm:w-[410px] max-w-md bg-slate-900/95 backdrop-blur-2xl text-white rounded-2xl shadow-2xl border-2 border-emerald-500/40 z-[9999] overflow-hidden animate-fadeIn">
                    
                    {/* Encabezado del Dropdown */}
                    <div className="p-3.5 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/40 shadow-inner">
                          <Wifi size={17} className="animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-white tracking-wide">
                              Conexiones al Sistema
                            </h4>
                            <span className="bg-emerald-500/25 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-400/50 shadow-sm animate-pulse">
                              🟢 EN VIVO
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-200/80 mt-0.5">
                            {onlineVendorsCount} {onlineVendorsCount === 1 ? 'vendedor activo en este momento' : 'vendedores activos en este momento'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {connectionNotifications.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearConnectionNotifications && onClearConnectionNotifications();
                            }}
                            className="text-[10px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            title="Limpiar lista de notificaciones"
                          >
                            Limpiar
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifMenu(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                          title="Cerrar notificaciones"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Lista con scroll de conexiones en tiempo real */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/80 p-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                      {connectionNotifications.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 px-4">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                            <Wifi size={24} />
                          </div>
                          <p className="text-xs font-bold text-slate-300">
                            No hay notificaciones de conexión recientes
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                            Cuando un vendedor inicie sesión en el sistema, lo verás reflejado aquí inmediatamente en tiempo real.
                          </p>
                        </div>
                      ) : (
                        connectionNotifications.map((notif) => {
                          const isCurrentlyOnline = Object.values(onlineVendors || {}).some(
                            v => v?.name?.trim().toLowerCase() === notif.name?.trim().toLowerCase()
                          );

                          return (
                            <div 
                              key={notif.id}
                              className={`p-3 rounded-xl transition-all hover:bg-slate-800/70 flex items-start justify-between gap-3 ${
                                notif.unread ? 'bg-blue-950/40 border-l-4 border-emerald-400' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                {/* Avatar con estado en vivo */}
                                <div className="relative shrink-0 mt-0.5">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-emerald-600 flex items-center justify-center text-white text-xs font-black shadow-md border border-white/20">
                                    {notif.name ? notif.name.slice(0, 2).toUpperCase() : 'VN'}
                                  </div>
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                                    {isCurrentlyOnline && (
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-slate-900 ${
                                      isCurrentlyOnline ? 'bg-emerald-400' : 'bg-slate-500'
                                    }`}></span>
                                  </span>
                                </div>

                                {/* Detalles del Vendedor */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                                      {notif.name}
                                    </p>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                                      isCurrentlyOnline 
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' 
                                        : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {isCurrentlyOnline ? '🟢 En línea' : '⚪ Desconectado'}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-blue-200 truncate mt-0.5 font-medium">
                                    📍 {notif.route || 'Ruta asignada en campo'}
                                  </p>

                                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="font-semibold text-slate-300">🕒 {notif.time}</span>
                                    <span className="text-slate-600">•</span>
                                    <span className="truncate max-w-[150px] text-slate-400">
                                      {notif.device || 'Dispositivo móvil'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Botón Ver en Mapa */}
                              <div className="shrink-0 flex flex-col items-end gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNotifMenu(false);
                                    setActiveTab('map');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-emerald-500/40 flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Ver ubicación en el Mapa de Rastreo GPS"
                                >
                                  <MapPin size={12} />
                                  <span>Mapa</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Pie de Panel con Acceso a Auditoría */}
                    <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNotifMenu(false);
                          onOpenConnectionsModal && onOpenConnectionsModal();
                        }}
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Wifi size={14} className="text-emerald-300" />
                        <span>Auditoría Completa de Conexiones & Excel</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sync Status / Supabase Cloud Reanudación */}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => onOpenSupabaseModal && onOpenSupabaseModal()}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-400/50 rounded-full text-xs font-bold text-emerald-200 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                title="Estado de la base de datos Supabase y reanudación en 1 clic"
              >
                <Cloud size={14} className="text-emerald-300 animate-pulse" />
                <span className="hidden sm:inline">Nube Supabase</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-xs text-blue-100" title="Sincronización en la nube activa">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>En Línea</span>
              </div>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-blue-100 hover:text-white"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Logout / Return to Login button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-red-500/30 border border-red-500/40 cursor-pointer"
              title="Regresar a la pantalla principal de login (Cerrar Sesión)"
            >
              <LogOut size={15} className="shrink-0" />
              <span>Regresar / Salir</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu (Tablets & Desktops) con scroll horizontal ultra-estético */}
        <nav className="hidden md:flex items-center gap-2.5 overflow-x-auto py-2 px-1 border-t border-blue-700/50 scrollbar-thin scrollbar-thumb-blue-400/40 hover:scrollbar-thumb-blue-300/60 scrollbar-track-blue-950/20 text-xs sm:text-sm">
          {isAdmin ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap shadow-sm ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <BarChart3 size={15} />
                <span>Dashboard & Métricas</span>
              </button>

              <button
                onClick={() => setActiveTab('vendors')}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap shadow-sm ${
                  activeTab === 'vendors'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Users size={15} />
                <span>Gestión de Vendedores</span>
              </button>

              <button
                onClick={() => setActiveTab('frequency')}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap shadow-sm ${
                  activeTab === 'frequency'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Target size={15} />
                <span>Análisis de Frecuencia</span>
              </button>

              <button
                onClick={() => setActiveTab('visits')}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap shadow-sm ${
                  activeTab === 'visits'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <ListFilter size={15} />
                <span>Historial de Visitas</span>
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap shadow-sm ${
                  activeTab === 'map'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
                title="Rastreo en tiempo real, recorridos diarios e histórico de vendedores"
              >
                <MapPin size={15} className="text-emerald-300" />
                <span>Rastreo GPS en Vivo</span>
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap shadow-sm ${
                  activeTab === 'export'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <FileSpreadsheet size={15} />
                <span>Exportar Excel / PDF</span>
              </button>

              <button
                onClick={() => onOpenDirectoryModal && onOpenDirectoryModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-indigo-500/25 text-indigo-100 hover:bg-indigo-500 hover:text-white border border-indigo-400/40 shadow-sm cursor-pointer"
                title="Cargar y gestionar directorio de farmacias y clientes desde Excel"
              >
                <Building2 size={15} />
                <span>Cargar Clientes (Excel)</span>
              </button>

              <button
                onClick={() => onOpenCashModal && onOpenCashModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-amber-500/20 text-amber-200 hover:bg-amber-500 hover:text-white border border-amber-400/40 shadow-sm"
                title="Reporte Cobros en Efectivo (Boletas y Bancos)"
              >
                <Banknote size={15} />
                <span>Cobros en Efectivo</span>
              </button>

              <button
                onClick={() => onOpenFormulariosModal && onOpenFormulariosModal()}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-blue-500/35 text-white hover:bg-blue-500 border border-blue-400/60 shadow-md cursor-pointer animate-pulse hover:animate-none"
                title="Formularios Droguería El Olam (Aperturas, Viáticos, Recibos y Boletas)"
              >
                <FileText size={15} className="text-amber-300" />
                <span>Formularios Droguería El Olam</span>
              </button>

              {/* Botón Chat & Solicitudes de Vendedores (Admin) */}
              <button
                onClick={() => onOpenSupportTicketsModal && onOpenSupportTicketsModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-rose-500/25 text-rose-100 hover:bg-rose-500 hover:text-white border border-rose-400/40 shadow-sm relative cursor-pointer"
                title="Bandeja de Solicitudes y Chat de Soporte con Vendedores"
              >
                <MessageSquare size={15} />
                <span>Chat & Solicitudes</span>
                {pendingTicketsCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse ml-0.5 shadow">
                    {pendingTicketsCount}
                  </span>
                )}
              </button>

              {/* Botón Registro y Control de Conexiones en Línea (Admin) */}
              <button
                onClick={() => onOpenConnectionsModal && onOpenConnectionsModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500 hover:text-white border border-emerald-400/40 shadow-sm cursor-pointer"
                title="Historial de conexiones de vendedores, fechas, horas y exportación elegante a Excel"
              >
                <Wifi size={15} />
                <span>Registro Conexiones</span>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ml-0.5">
                  {onlineVendorsCount} En Línea
                </span>
              </button>

              {/* Botón Bóveda Claves 2.0 (OTP) en Navbar */}
              <button
                onClick={() => onOpenOtpModal && onOpenOtpModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-amber-500/25 text-amber-200 hover:bg-amber-500 hover:text-white border border-amber-400/40 shadow-sm cursor-pointer"
                title="Bóveda de 50 claves de un solo toque para inicio de sesión"
              >
                <Key size={15} className="text-amber-300" />
                <span>Claves 2.0 (OTP)</span>
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ml-0.5">
                  {getOtpKeysStats().available} Disp.
                </span>
              </button>

              {/* Botón Bóveda Claves Cierre Sesión (OTP) en Navbar */}
              <button
                onClick={() => onOpenLogoutOtpModal && onOpenLogoutOtpModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-rose-500/25 text-rose-200 hover:bg-rose-500 hover:text-white border border-rose-400/40 shadow-sm cursor-pointer"
                title="Bóveda de 50 contraseñas de un toque para autorizar salida de vendedores"
              >
                <LogOut size={15} className="text-rose-300" />
                <span>Claves Salida (OTP)</span>
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ml-0.5">
                  {getLogoutOtpKeysStats().available} Disp.
                </span>
              </button>

              {/* Botón Recordatorios & Seguimiento (Admin) */}
              <button
                onClick={() => onOpenRemindersModal && onOpenRemindersModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-indigo-500/30 text-indigo-100 hover:bg-indigo-500 hover:text-white border border-indigo-400/50 shadow-sm cursor-pointer"
                title="Monitoreo y auditoría de recordatorios de seguimiento a clientes"
              >
                <Bell size={15} className="text-amber-300 animate-pulse" />
                <span>Recordatorios & Seguimiento</span>
              </button>

              {/* Botón Reanudar / Servidor Supabase (Admin) */}
              <button
                onClick={() => onOpenSupabaseModal && onOpenSupabaseModal()}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap bg-teal-500/25 text-teal-100 hover:bg-teal-500 hover:text-white border border-teal-400/40 shadow-sm cursor-pointer"
                title="Monitorear conexión y reanudar servidor de Supabase en 1 clic"
              >
                <Cloud size={15} className="text-teal-300" />
                <span>Nube Supabase</span>
                <span className="bg-teal-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  ⚡ Reanudar
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('register')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'register'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <PlusCircle size={15} />
                <span>Registrar Visita</span>
              </button>

              {/* Apartado de Visitas a la par de Registro para información de primera mano */}
              <button
                onClick={() => setActiveTab('my_visits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'my_visits'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
                title="Ver tus visitas registradas hoy de primera mano"
              >
                <CheckCircle2 size={15} />
                <span>Visitas</span>
              </button>

              {/* Apartado de Información General con acceso a Base de Datos e Historial */}
              <button
                onClick={() => setActiveTab('info_general')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'info_general'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
                title="Acceder a la base de datos de visitas: Visitas de Hoy e Historial completo"
              >
                <Database size={15} />
                <span>Información General</span>
              </button>

              <button
                onClick={() => onOpenReportModal ? onOpenReportModal() : setActiveTab('report')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500 hover:text-white border border-emerald-400/40 shadow-sm"
                title="Generar y Exportar Reporte Oficial con Gráficas y Métricas"
              >
                <FileText size={15} />
                <span>Exportar Reporte</span>
              </button>

              <button
                onClick={() => onOpenCashModal && onOpenCashModal()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap bg-amber-500/25 text-amber-200 hover:bg-amber-500 hover:text-white border border-amber-400/40 shadow-sm"
                title="Reporte Cobros en Efectivo (Boletas y Bancos)"
              >
                <Banknote size={15} />
                <span>Cobros en Efectivo</span>
              </button>

              <button
                onClick={() => onOpenFormulariosModal && onOpenFormulariosModal()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap bg-blue-500/30 text-white hover:bg-blue-500 border border-blue-400/60 shadow-md cursor-pointer animate-pulse hover:animate-none"
                title="Formularios Droguería El Olam (Aperturas, Viáticos, Recibos y Boletas)"
              >
                <FileText size={15} className="text-amber-300" />
                <span>Formularios Droguería El Olam</span>
              </button>

              {/* Botón Soporte Admin (Vendedor) */}
              <button
                onClick={() => onOpenVendorSupportChat && onOpenVendorSupportChat()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap bg-indigo-500/30 text-indigo-100 hover:bg-indigo-500 hover:text-white border border-indigo-400/50 shadow-sm cursor-pointer"
                title="Abrir chat de soporte privado con la Administración"
              >
                <MessageSquare size={15} />
                <span>Soporte Admin</span>
              </button>

              {/* Botón Recordatorios (Vendedor / Supervisor) */}
              <button
                onClick={() => onOpenRemindersModal && onOpenRemindersModal()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap bg-amber-500/30 text-amber-200 hover:bg-amber-500 hover:text-white border border-amber-400/50 shadow-sm cursor-pointer"
                title="Ver y gestionar recordatorios de clientes agendados"
              >
                <Bell size={15} className="text-amber-300 animate-pulse" />
                <span>Recordatorios</span>
              </button>

              {/* Botón Directorio Maestro de Clientes (Supervisor Antonio Celada) */}
              {isSuper && (
                <button
                  onClick={() => onOpenDirectoryModal && onOpenDirectoryModal()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap bg-indigo-500/25 text-indigo-100 hover:bg-indigo-500 hover:text-white border border-indigo-400/40 shadow-sm cursor-pointer"
                  title="Directorio Maestro de Clientes de todos los vendedores"
                >
                  <Building2 size={15} />
                  <span>Directorio de Clientes</span>
                </button>
              )}
            </>
          )}
        </nav>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Phones & Small Tablets) */}
      <nav 
        aria-label="Navegación Móvil" 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-2 py-1.5 flex justify-around items-center"
      >
        {isAdmin ? (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <BarChart3 size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5">Métricas</span>
            </button>

            <button
              onClick={() => setActiveTab('vendors')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'vendors'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Users size={20} className={activeTab === 'vendors' ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5">Equipo</span>
            </button>

            <button
              onClick={() => setActiveTab('visits')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'visits'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <ListFilter size={20} className={activeTab === 'visits' ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5">Visitas</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'map'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <MapPin size={20} className={activeTab === 'map' ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5">GPS</span>
            </button>

            <button
              onClick={() => onOpenReportModal ? onOpenReportModal() : setActiveTab('export')}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
            >
              <FileText size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Reportes</span>
            </button>

            <button
              onClick={() => onOpenCashModal && onOpenCashModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-amber-600 dark:text-amber-400 hover:text-amber-700"
              title="Reporte Cobros en Efectivo"
            >
              <Banknote size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Cobros</span>
            </button>

            <button
              onClick={() => onOpenFormulariosModal && onOpenFormulariosModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-blue-400 hover:text-blue-300"
              title="Formularios Droguería El Olam"
            >
              <FileText size={20} className="text-amber-400" />
              <span className="text-[10px] mt-0.5 font-bold">Formularios</span>
            </button>

            <button
              onClick={() => onOpenConnectionsModal && onOpenConnectionsModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 relative"
              title="Registro de Conexiones de Vendedores"
            >
              <div className="relative">
                <Wifi size={20} />
                {onlineVendorsCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[8px] font-black px-1 rounded-full border border-slate-900 shadow">
                    {onlineVendorsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-bold">Conexión</span>
            </button>

            <button
              onClick={() => onOpenOtpModal && onOpenOtpModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-amber-500 hover:text-amber-600"
              title="Bóveda de Claves 2.0 (OTP)"
            >
              <Key size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Claves 2.0</span>
            </button>

            <button
              onClick={() => onOpenLogoutOtpModal && onOpenLogoutOtpModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-rose-500 hover:text-rose-600"
              title="Claves de Cierre de Sesión (OTP)"
            >
              <LogOut size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Salida OTP</span>
            </button>

            <button
              onClick={() => onOpenSupabaseModal && onOpenSupabaseModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-teal-400 hover:text-teal-300"
              title="Estado y Reanudación de Supabase"
            >
              <Cloud size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Supabase</span>
            </button>

            <button
              onClick={onLogout}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-red-500 hover:text-red-600 active:scale-95"
              title="Regresar al inicio de sesión"
            >
              <LogOut size={20} className="stroke-[2.2]" />
              <span className="text-[10px] mt-0.5 font-bold">Salir</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'register'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <PlusCircle size={22} className={activeTab === 'register' ? 'stroke-[2.5] text-blue-600 dark:text-blue-400' : ''} />
              <span className="text-[10px] mt-0.5">Registrar</span>
            </button>

            {/* Apartado Visitas a la par de Registrar para celulares */}
            <button
              onClick={() => setActiveTab('my_visits')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'my_visits'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="Ver visitas de hoy de primera mano"
            >
              <CheckCircle2 size={20} className={activeTab === 'my_visits' ? 'stroke-[2.5] text-blue-600 dark:text-blue-400' : ''} />
              <span className="text-[10px] mt-0.5 font-bold">Visitas</span>
            </button>

            {/* Apartado Información General para celulares */}
            <button
              onClick={() => setActiveTab('info_general')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'info_general'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="Información General (Base de datos e Historial)"
            >
              <Database size={20} className={activeTab === 'info_general' ? 'stroke-[2.5] text-blue-600 dark:text-blue-400' : ''} />
              <span className="text-[10px] mt-0.5 font-bold">Info General</span>
            </button>

            <button
              onClick={() => onOpenReportModal ? onOpenReportModal() : setActiveTab('report')}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
            >
              <FileText size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Reporte</span>
            </button>

            <button
              onClick={() => onOpenCashModal && onOpenCashModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-amber-600 dark:text-amber-400 hover:text-amber-700"
              title="Reporte Cobros en Efectivo"
            >
              <Banknote size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Cobros</span>
            </button>

            <button
              onClick={() => onOpenFormulariosModal && onOpenFormulariosModal()}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-blue-400 hover:text-blue-300"
              title="Formularios Droguería El Olam"
            >
              <FileText size={20} className="text-amber-400" />
              <span className="text-[10px] mt-0.5 font-bold">Formularios</span>
            </button>

            <button
              onClick={onLogout}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-red-500 hover:text-red-600 active:scale-95"
              title="Regresar al inicio de sesión"
            >
              <LogOut size={20} className="stroke-[2.2]" />
              <span className="text-[10px] mt-0.5 font-bold">Salir</span>
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
