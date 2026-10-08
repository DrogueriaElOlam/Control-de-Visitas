import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  RotateCw, 
  X, 
  BarChart3, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Download,
  CheckCircle,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';

// Datos por defecto idénticos a los del Panel Central de Supervisión oficial
const DEFAULT_COMPROMISOS = [
  { name: 'Danny Pérez', compromiso: 2040500.00, ruta: 'Coatepeque #24' },
  { name: 'Jessica Noriega', compromiso: 2012001.00, ruta: 'Suchi I #21' },
  { name: 'Wally Natareno', compromiso: 1988000.00, ruta: 'Peten I #73' },
  { name: 'Ana Lucía Marroquín', compromiso: 1968000.00, ruta: 'Escuintla I #A1' },
  { name: 'Josué Aguilar', compromiso: 1940000.00, ruta: 'Capital S1 #64' },
  { name: 'Estuardo Córdova', compromiso: 1605500.00, ruta: 'Coban #13' },
  { name: 'Karina Pineda', compromiso: 1560500.00, ruta: 'Quetzaltenango #11' },
  { name: 'Elías Quiej', compromiso: 1403205.00, ruta: 'Chiquimula I #61' },
  { name: 'Erick Curley', compromiso: 1397736.50, ruta: 'Huehuetenango Centro #A4' },
  { name: 'Elio Cáceres', compromiso: 1262500.00, ruta: 'San Marcos I #92' },
  { name: 'Klissman Hernández', compromiso: 595000.00, ruta: 'Jalapa #62' }
];

// Datos muestra de ventas y cobros en caso de no haber datos cargados en el rango seleccionado
const DEFAULT_VENTAS_COBROS = [
  { name: 'Elías Quiej', ventas: 228000, cobros: 248000 },
  { name: 'Klissman Hernández', ventas: 132000, cobros: 182000 },
  { name: 'Jessica Noriega', ventas: 114000, cobros: 185000 },
  { name: 'Ana Lucía Marroquín', ventas: 112000, cobros: 89000 },
  { name: 'Wally Natareno', ventas: 89000, cobros: 105000 },
  { name: 'Estuardo Córdova', ventas: 86000, cobros: 53000 },
  { name: 'Josué Aguilar', ventas: 74000, cobros: 88000 },
  { name: 'Elio Cáceres', ventas: 73000, cobros: 136000 },
  { name: 'Danny Pérez', ventas: 62000, cobros: 56000 },
  { name: 'Karina Pineda', ventas: 41000, cobros: 74000 },
  { name: 'Erick Curley', ventas: 36000, cobros: 99000 }
];

export function CentralSupervisionView({ onClose, isEmbedded = false }) {
  const [activeTab, setActiveTab] = useState('kpis'); // 'kpis' o 'registros'
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Datos provenientes de base de datos o almacenamiento local
  const [supervisionHistory, setSupervisionHistory] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Cargar historial de supervisión diaria
      const { data: histData } = await supabase
        .from('daily_supervision_history')
        .select('*')
        .order('date', { ascending: false });

      if (histData && histData.length > 0) {
        setSupervisionHistory(histData);
      } else {
        // Cargar desde localStorage si no hay en Supabase
        const local = localStorage.getItem('dailySupervisionHistory');
        if (local) {
          try { setSupervisionHistory(JSON.parse(local)); } catch (_) {}
        }
      }

      // 2. Cargar lista de vendedores
      const { data: vData } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (vData && vData.length > 0) {
        setVendorsList(vData);
      }
    } catch (err) {
      console.error('Error cargando datos de supervisión:', err);
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  };

  // Vendedores únicos para el desplegable
  const allVendors = useMemo(() => {
    const names = new Set(DEFAULT_COMPROMISOS.map(c => c.name));
    vendorsList.forEach(v => names.add(v.name));
    return Array.from(names).sort();
  }, [vendorsList]);

  // Rutas únicas para el desplegable
  const allRoutes = useMemo(() => {
    const routes = new Set(DEFAULT_COMPROMISOS.map(c => c.ruta));
    vendorsList.forEach(v => { if (v.route) routes.add(v.route); });
    return Array.from(routes).sort();
  }, [vendorsList]);

  // Filtrado de compromisos de venta diaria
  const filteredCompromisos = useMemo(() => {
    return DEFAULT_COMPROMISOS.filter(item => {
      if (selectedVendor !== 'ALL' && item.name !== selectedVendor) return false;
      if (selectedRoute !== 'ALL' && item.ruta !== selectedRoute) return false;
      return true;
    });
  }, [selectedVendor, selectedRoute]);

  // Total acumulado calculado dinámicamente
  const totalAcumulado = useMemo(() => {
    return filteredCompromisos.reduce((sum, item) => sum + item.compromiso, 0);
  }, [filteredCompromisos]);

  // Datos para las gráficas de Ventas y Cobros
  const { ventasData, cobrosData } = useMemo(() => {
    // Si hay datos reales filtrados por fecha
    let aggregated = {};

    if (supervisionHistory.length > 0) {
      supervisionHistory.forEach(h => {
        if (startDate && h.date < startDate) return;
        if (endDate && h.date > endDate) return;

        const records = h.datos?.records || {};
        Object.entries(records).forEach(([vName, vData]) => {
          if (selectedVendor !== 'ALL' && vName !== selectedVendor) return;
          if (!aggregated[vName]) {
            aggregated[vName] = { name: vName, ventas: 0, cobros: 0 };
          }
          aggregated[vName].ventas += parseFloat(vData.ventas) || 0;
          aggregated[vName].cobros += parseFloat(vData.cobros) || 0;
        });
      });
    }

    const hasRealData = Object.keys(aggregated).length > 0;
    const baseData = hasRealData ? Object.values(aggregated) : DEFAULT_VENTAS_COBROS;

    const filtered = baseData.filter(d => {
      if (selectedVendor !== 'ALL' && d.name !== selectedVendor) return false;
      return true;
    });

    const vSorted = [...filtered].sort((a, b) => b.ventas - a.ventas);
    const cSorted = [...filtered].sort((a, b) => b.cobros - a.cobros);

    return { ventasData: vSorted, cobrosData: cSorted };
  }, [supervisionHistory, startDate, endDate, selectedVendor]);

  // Exportar vista a archivo HTML idéntico y auto-contenido
  const handleExportHTML = () => {
    const formattedTotal = totalAcumulado.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const compromisosCardsHTML = filteredCompromisos.map(item => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600; color: #1e293b; font-size: 15px;">${item.name}</span>
        <span style="font-weight: 700; color: #2563eb; font-size: 16px;">Q${item.compromiso.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    `).join('');

    const ventasRowsHTML = ventasData.map(v => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">${v.name}</td>
        <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #4338ca;">Q${v.ventas.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #059669;">Q${v.cobros.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Panel Central de Supervisión - Droguería El Olam</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7e22ce, #4338ca); color: white; padding: 20px 28px; display: flex; align-items: center; justify-content: space-between; }
    .title { font-size: 22px; font-weight: 800; display: flex; align-items: center; gap: 10px; margin: 0; }
    .content { padding: 28px; }
    .section-title { font-size: 17px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px; }
    .total-badge { background: #2563eb; color: white; font-weight: 800; font-size: 17px; padding: 12px 24px; border-radius: 12px; text-align: right; float: right; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th { background: #f8fafc; padding: 10px 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">🛡️ Panel Central de Supervisión</h1>
      <span style="font-size: 13px; opacity: 0.9;">Droguería El Olam • Generado: ${new Date().toLocaleDateString('es-GT')}</span>
    </div>
    <div class="content">
      <h2 class="section-title">🌐 Compromisos de Venta Diaria</h2>
      <div class="grid">
        ${compromisosCardsHTML}
      </div>
      <div style="overflow: hidden;">
        <div class="total-badge">Total Acumulado: Q${formattedTotal}</div>
      </div>
      <div style="clear: both; margin-top: 28px;"></div>
      <h2 class="section-title">📊 Resumen General de Ventas y Cobros</h2>
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Vendedor</th>
            <th style="text-align: right;">Ventas (Q)</th>
            <th style="text-align: right;">Cobros (Q)</th>
          </tr>
        </thead>
        <tbody>
          ${ventasRowsHTML}
        </tbody>
      </table>
    </div>
    <div class="footer">
      Reporte Oficial de Supervisión Operativa • Droguería El Olam
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Panel_Central_Supervision_${getLocalDateString()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const content = (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full ${isEmbedded ? 'max-w-full' : 'max-w-4xl max-h-[95vh]'} flex flex-col overflow-hidden`}>
        
        {/* CABECERA MORADA OFICIAL */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-5 sm:px-7 py-4 shrink-0 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm">
                Panel Central de Supervisión
              </h2>
              <p className="text-xs text-purple-200">
                Droguería El Olam • Control de Compromisos, Ventas y Cobros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
              title="Refrescar datos"
            >
              <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-600 active:scale-95 text-white transition-all cursor-pointer"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS Y CONTROLES */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 shrink-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Pestañas: Dashboard KPIs / Registros */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('kpis')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'kpis'
                    ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Dashboard KPIs</span>
              </button>

              <button
                onClick={() => setActiveTab('registros')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'registros'
                    ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Registros</span>
              </button>
            </div>

            <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 hidden md:block"></div>

            {/* Select Vendedores */}
            <div className="relative min-w-[170px]">
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">Todos los vendedores</option>
                {allVendors.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Select Rutas */}
            <div className="relative min-w-[150px]">
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">Todas las rutas</option>
                {allRoutes.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Botón Exportar HTML */}
            <button
              onClick={handleExportHTML}
              className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar HTML</span>
            </button>
          </div>

          {/* Rango de Fechas (Desde / Hasta) */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              />
            </div>
            {(startDate || endDate || selectedVendor !== 'ALL' || selectedRoute !== 'ALL') && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedVendor('ALL');
                  setSelectedRoute('ALL');
                }}
                className="text-xs text-red-500 hover:text-red-700 underline cursor-pointer ml-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* CUERPO CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
          
          {activeTab === 'kpis' && (
            <>
              {/* SECCIÓN 1: COMPROMISOS DE VENTA DIARIA */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    Compromisos de Venta Diaria
                  </h3>
                </div>

                {/* Grid de tarjetas de compromisos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {filteredCompromisos.map((item) => (
                    <div
                      key={item.name}
                      className="bg-blue-50/40 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700/60 border border-blue-100/70 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between transition-all"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                        {item.name}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                        Q{item.compromiso.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Acumulado Badge a la derecha */}
                <div className="flex justify-end pt-2">
                  <div className="bg-blue-600 dark:bg-blue-500 text-white font-extrabold text-sm sm:text-base px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2">
                    <span className="opacity-90 font-medium">Total Acumulado:</span>
                    <span>Q{totalAcumulado.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: GRÁFICA GENERAL DE VENTAS (Q) */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    Gráfica General de Ventas (Q)
                  </h3>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ventasData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-25} 
                        textAnchor="end" 
                        interval={0} 
                        height={45} 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickFormatter={(v) => `Q${(v).toLocaleString()}`} 
                        domain={[0, 240000]}
                      />
                      <RechartsTooltip 
                        formatter={(val) => [`Q${val.toLocaleString('es-GT')}`, 'Ventas']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="ventas" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SECCIÓN 3: GRÁFICA GENERAL DE COBROS (Q) */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    Gráfica General de Cobros (Q)
                  </h3>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cobrosData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-25} 
                        textAnchor="end" 
                        interval={0} 
                        height={45} 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickFormatter={(v) => `Q${(v).toLocaleString()}`} 
                        domain={[0, 260000]}
                      />
                      <RechartsTooltip 
                        formatter={(val) => [`Q${val.toLocaleString('es-GT')}`, 'Cobros']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="cobros" fill="#10b981" radius={[6, 6, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {activeTab === 'registros' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                Historial de Registros de Supervisión
              </h3>

              {supervisionHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay registros diarios guardados aún.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2.5 rounded-l-lg">Fecha</th>
                        <th className="px-3 py-2.5">Vendedor</th>
                        <th className="px-3 py-2.5 text-right">Ventas (Q)</th>
                        <th className="px-3 py-2.5 text-right">Cobros (Q)</th>
                        <th className="px-3 py-2.5 text-right">Devoluciones</th>
                        <th className="px-3 py-2.5 rounded-r-lg">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {supervisionHistory.flatMap((h) => {
                        const records = h.datos?.records || {};
                        return Object.entries(records).map(([vName, vData]) => {
                          if (selectedVendor !== 'ALL' && vName !== selectedVendor) return null;
                          return (
                            <tr key={`${h.id}-${vName}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                              <td className="px-3 py-2 font-medium">{h.date}</td>
                              <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{vName}</td>
                              <td className="px-3 py-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                Q{Number(vData.ventas || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                Q{Number(vData.cobros || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-500">
                                {vData.devoluciones || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-500 max-w-xs truncate">
                                {vData.observaciones || '-'}
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[9995] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {content}
    </div>
  );
}

export default function CentralSupervisionModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <CentralSupervisionView onClose={onClose} isEmbedded={false} />;
}

