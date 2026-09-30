import React from 'react';
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
  FileText
} from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  onLogout, 
  activeTab, 
  setActiveTab,
  darkMode, 
  setDarkMode,
  syncStatus,
  onOpenReportModal
}) {
  const isAdmin = currentUser?.role === 'admin';

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
                {isAdmin ? 'Panel de Administración' : `Ruta: ${currentUser?.route || 'General'}`}
              </span>
            </div>

            {/* Sync Status indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-xs text-blue-100" title="Sincronización en la nube activa">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>En Línea</span>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-blue-100 hover:text-white"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-all shadow-md hover:shadow-red-500/20"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu (Tablets & Desktops) */}
        <nav className="hidden md:flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 pt-1 border-t border-blue-700/40 scrollbar-none text-xs sm:text-sm">
          {isAdmin ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'map'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <MapPin size={15} />
                <span>Mapa GPS</span>
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'export'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <FileSpreadsheet size={15} />
                <span>Exportar Excel / PDF</span>
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

              <button
                onClick={() => setActiveTab('my_visits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'my_visits'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <ListFilter size={15} />
                <span>Mis Visitas de Hoy</span>
              </button>

              <button
                onClick={() => setActiveTab('my_goal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === 'my_goal'
                    ? 'bg-white text-blue-900 shadow-md font-bold'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Target size={15} />
                <span>Mi Meta Diaria</span>
              </button>

              <button
                onClick={() => onOpenReportModal ? onOpenReportModal() : setActiveTab('report')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500 hover:text-white border border-emerald-400/40 shadow-sm"
                title="Generar y Exportar Reporte Oficial con Gráficas y Métricas"
              >
                <FileText size={15} />
                <span>Exportar Reporte</span>
              </button>
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

            <button
              onClick={() => setActiveTab('my_visits')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'my_visits'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <ListFilter size={20} className={activeTab === 'my_visits' ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5">Mis Visitas</span>
            </button>

            <button
              onClick={() => setActiveTab('my_goal')}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                activeTab === 'my_goal'
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Target size={20} className={activeTab === 'my_goal' ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5">Mi Meta</span>
            </button>

            <button
              onClick={() => onOpenReportModal ? onOpenReportModal() : setActiveTab('report')}
              className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
            >
              <FileText size={20} />
              <span className="text-[10px] mt-0.5 font-bold">Reporte</span>
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
