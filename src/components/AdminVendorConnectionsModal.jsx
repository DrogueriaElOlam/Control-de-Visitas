import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Wifi, 
  Search, 
  Calendar, 
  User, 
  RefreshCw, 
  CheckCircle2, 
  Smartphone, 
  Laptop, 
  Clock, 
  Activity,
  Filter
} from 'lucide-react';
import { fetchVendorConnections, exportVendorConnectionsToExcel } from '../lib/vendorConnections';

export default function AdminVendorConnectionsModal({ isOpen, onClose, onlineVendors = {} }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('TODAY'); // 'TODAY', 'WEEK', 'ALL', 'CUSTOM'
  const [customDate, setCustomDate] = useState('');

  // Obtener fecha actual en formato YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchVendorConnections();
      setConnections(data);
    } catch (err) {
      console.error('Error cargando historial de conexiones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Escuchar conexiones nuevas en tiempo real
  useEffect(() => {
    const handleNewConnection = (e) => {
      if (e.detail) {
        setConnections(prev => [e.detail, ...prev.filter(c => c.id !== e.detail.id)]);
      }
    };
    window.addEventListener('olam_vendor_connected', handleNewConnection);
    return () => window.removeEventListener('olam_vendor_connected', handleNewConnection);
  }, []);

  // Lista única de nombres de vendedores encontrados
  const vendorNamesList = useMemo(() => {
    const set = new Set();
    connections.forEach(c => {
      if (c.vendor_name) set.add(c.vendor_name);
    });
    return Array.from(set).sort();
  }, [connections]);

  // Filtrado de conexiones
  const filteredConnections = useMemo(() => {
    return connections.filter(item => {
      // Filtro por vendedor
      if (selectedVendor !== 'ALL' && item.vendor_name !== selectedVendor) {
        return false;
      }

      // Filtro por fecha
      if (dateFilter === 'TODAY' && item.date !== todayStr) {
        return false;
      }
      if (dateFilter === 'CUSTOM' && customDate && item.date !== customDate) {
        return false;
      }
      if (dateFilter === 'WEEK') {
        const itemDate = new Date(item.date);
        const diffDays = (new Date() - itemDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      }

      // Búsqueda por texto (nombre, ruta, dispositivo)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vName = (item.vendor_name || '').toLowerCase();
        const route = (item.route || '').toLowerCase();
        const dev = (item.device || '').toLowerCase();
        if (!vName.includes(q) && !route.includes(q) && !dev.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [connections, selectedVendor, dateFilter, customDate, searchQuery, todayStr]);

  // Métricas rápidas
  const activeOnlineCount = useMemo(() => {
    return Object.values(onlineVendors || {}).filter(u => u?.role === 'vendor' || (u?.name && u?.name !== 'Administrador')).length;
  }, [onlineVendors]);

  const todayConnectionsCount = useMemo(() => {
    return connections.filter(c => c.date === todayStr).length;
  }, [connections, todayStr]);

  const lastConnection = connections[0] || null;

  const handleExport = async () => {
    if (filteredConnections.length === 0) {
      alert('No hay registros de conexión disponibles para exportar con los filtros seleccionados.');
      return;
    }
    setExporting(true);
    try {
      await exportVendorConnectionsToExcel(filteredConnections);
    } catch (err) {
      console.error('Error exportando conexiones:', err);
      alert('Ocurrió un error al generar el archivo de Excel.');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Encabezado Principal */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white px-5 py-4 flex items-center justify-between border-b border-blue-700/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/40 rounded-xl text-blue-200">
              <Wifi size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Registro y Control de Conexiones de Vendedores
                </h2>
                <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm">
                  Tiempo Real
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Droguería El Olam • Auditoría de ingresos, horarios, rutas y dispositivos en campo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* Tarjetas de Métricas Rápidas */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 p-3 rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">En Línea Ahora</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {activeOnlineCount} {activeOnlineCount === 1 ? 'Vendedor' : 'Vendedores'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/40 p-3 rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Conexiones Hoy</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                {todayConnectionsCount}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/40 p-3 rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <User size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Vendedores con Actividad</p>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {vendorNamesList.length}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/40 p-3 rounded-xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
              <Clock size={20} />
            </div>
            <div className="truncate">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Última Conexión</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {lastConnection ? `${lastConnection.vendor_name} (${lastConnection.time})` : 'Sin registros'}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros, Búsqueda y Exportación */}
        <div className="p-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Buscador de texto */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar vendedor, ruta, dispositivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
            </div>

            {/* Selector de Vendedor */}
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            >
              <option value="ALL">👥 Todos los vendedores</option>
              {vendorNamesList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Píldoras de Filtro de Fecha */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setDateFilter('TODAY')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  dateFilter === 'TODAY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setDateFilter('WEEK')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  dateFilter === 'WEEK'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => setDateFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  dateFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setDateFilter('CUSTOM')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  dateFilter === 'CUSTOM'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Fecha...
              </button>
            </div>

            {dateFilter === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="py-1 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
            )}
          </div>

          {/* Acciones: Recargar y Exportar a Excel */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors"
              title="Recargar desde la nube"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* BOTÓN EXPORTAR EXCEL CON CUADRO ELEGANTE Y LÍNEAS DELGADAS */}
            <button
              onClick={handleExport}
              disabled={exporting || filteredConnections.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer border border-blue-500/40"
              title="Descargar cuadro elegante en Excel con bordes delgados y títulos en azul"
            >
              <Download size={15} className={exporting ? 'animate-bounce' : ''} />
              <span>{exporting ? 'Generando Excel...' : 'Exportar Cuadro Elegante (Excel)'}</span>
            </button>
          </div>
        </div>

        {/* Tabla de Conexiones */}
        <div className="flex-1 overflow-auto p-4 sm:px-6">
          {filteredConnections.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <Wifi size={40} className="text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No se encontraron registros de conexión
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {searchQuery || selectedVendor !== 'ALL' || dateFilter !== 'ALL'
                  ? 'Intenta ajustar los filtros de fecha o búsqueda para ver más resultados.'
                  : 'Las conexiones de los vendedores se registrarán automáticamente conforme ingresen al sistema.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white uppercase text-[11px] font-bold tracking-wider">
                    <th className="py-3 px-3 text-center border border-blue-800/80 w-12">#</th>
                    <th className="py-3 px-3 text-center border border-blue-800/80 w-24">Fecha</th>
                    <th className="py-3 px-3 text-center border border-blue-800/80 w-28">Hora</th>
                    <th className="py-3 px-4 border border-blue-800/80">Vendedor</th>
                    <th className="py-3 px-3 border border-blue-800/80">Ruta Asignada</th>
                    <th className="py-3 px-3 border border-blue-800/80">Dispositivo</th>
                    <th className="py-3 px-3 text-center border border-blue-800/80 w-32">Estado Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredConnections.map((item, idx) => {
                    const isCurrentlyOnline = onlineVendors && (
                      onlineVendors[item.vendor_name] ||
                      Object.values(onlineVendors).some(v => v?.name === item.vendor_name)
                    );

                    return (
                      <tr 
                        key={item.id || idx}
                        className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap border border-slate-200 dark:border-slate-800">
                          {item.date}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap border border-slate-200 dark:border-slate-800">
                          {item.time}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>{item.vendor_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          {item.route || 'Sin ruta'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {item.device?.includes('Android') || item.device?.includes('iOS') ? (
                              <Smartphone size={13} className="text-emerald-500" />
                            ) : (
                              <Laptop size={13} className="text-blue-500" />
                            )}
                            {item.device}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center border border-slate-200 dark:border-slate-800 whitespace-nowrap">
                          {isCurrentlyOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              En línea ahora
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <CheckCircle2 size={11} className="text-slate-400" />
                              Registrado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-3 sm:px-6 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Mostrando <span className="font-bold text-slate-800 dark:text-slate-200">{filteredConnections.length}</span> registros de conexión
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
