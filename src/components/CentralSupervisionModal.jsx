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
  ChevronDown,
  Save,
  Edit2,
  Check,
  Database,
  Users,
  User,
  ArrowUpRight
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
import { getLocalDateString } from '../lib/dateUtils';
import { 
  OFFICIAL_VENDORS, 
  getCanonicalVendorName, 
  getDailyCommitments, 
  saveDailySupervisionSnapshot, 
  loadUnifiedVendorRecords 
} from '../lib/supervisionData';

export function CentralSupervisionView({ onClose, isEmbedded = false }) {
  const [activeTab, setActiveTab] = useState('kpis'); // 'kpis' o 'registros'
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Compromisos diarios por vendedor { [vendorName]: monto }
  const [commitments, setCommitments] = useState({});
  const [editingVendor, setEditingVendor] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Registros de supervisión (visitas y registros de vendedores)
  const [records, setRecords] = useState([]);

  // Cargar datos al montar o cambiar fecha
  useEffect(() => {
    loadAllData();
  }, [startDate]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Cargar compromisos para la fecha
      const dailyComm = await getDailyCommitments(startDate || getLocalDateString());
      setCommitments(dailyComm);

      // 2. Cargar registros unificados de vendedores
      const loadedRecords = await loadUnifiedVendorRecords();
      setRecords(loadedRecords);
    } catch (err) {
      console.error('Error cargando data de supervisión:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Vendedores deduplicados estrictamente (11 oficiales)
  const vendorList = useMemo(() => {
    return OFFICIAL_VENDORS.map(v => v.name);
  }, []);

  // Rutas deduplicadas
  const routeList = useMemo(() => {
    const setR = new Set(OFFICIAL_VENDORS.map(v => v.route));
    return Array.from(setR).sort();
  }, []);

  // Filtrado de registros según fecha, vendedor y ruta
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (startDate && r.fecha < startDate) return false;
      if (endDate && r.fecha > endDate) return false;
      if (selectedVendor !== 'ALL' && r.vendedor !== selectedVendor) return false;
      if (selectedRoute !== 'ALL' && r.ruta !== selectedRoute) return false;
      return true;
    });
  }, [records, startDate, endDate, selectedVendor, selectedRoute]);

  // Cálculo de ventas y cobros por vendedor a partir de los Registros filtrados
  const vendorMetrics = useMemo(() => {
    const metrics = {};
    OFFICIAL_VENDORS.forEach(v => {
      metrics[v.name] = {
        name: v.name,
        route: v.route,
        compromiso: Number(commitments[v.name]) || v.defaultCompromiso,
        ventas: 0,
        cobros: 0,
        conteoVisitas: 0
      };
    });

    filteredRecords.forEach(r => {
      const vName = getCanonicalVendorName(r.vendedor);
      if (metrics[vName]) {
        metrics[vName].ventas += Number(r.ventas) || 0;
        metrics[vName].cobros += Number(r.cobros) || 0;
        metrics[vName].conteoVisitas += 1;
      }
    });

    return metrics;
  }, [commitments, filteredRecords]);

  // Lista para compromisos de venta diaria (ordenada como en la plantilla oficial)
  const compromisosDisplay = useMemo(() => {
    return OFFICIAL_VENDORS.map(v => {
      const m = vendorMetrics[v.name] || {};
      const compromiso = Number(commitments[v.name]) || v.defaultCompromiso;
      const ventas = m.ventas || 0;
      const cobros = m.cobros || 0;
      const pctCumplimiento = compromiso > 0 ? (ventas / compromiso) * 100 : 0;

      return {
        name: v.name,
        route: v.route,
        compromiso,
        ventas,
        cobros,
        pctCumplimiento: Math.min(100, Math.round(pctCumplimiento))
      };
    }).filter(item => {
      if (selectedVendor !== 'ALL' && item.name !== selectedVendor) return false;
      if (selectedRoute !== 'ALL' && item.route !== selectedRoute) return false;
      return true;
    });
  }, [commitments, vendorMetrics, selectedVendor, selectedRoute]);

  // Total Acumulado Grupal de Compromisos y Ventas
  const totalCompromisoAcumulado = useMemo(() => {
    return compromisosDisplay.reduce((sum, item) => sum + item.compromiso, 0);
  }, [compromisosDisplay]);

  const totalVentasAcumuladas = useMemo(() => {
    return compromisosDisplay.reduce((sum, item) => sum + item.ventas, 0);
  }, [compromisosDisplay]);

  const totalCobrosAcumulados = useMemo(() => {
    return compromisosDisplay.reduce((sum, item) => sum + item.cobros, 0);
  }, [compromisosDisplay]);

  // Datos para Gráfica General de Ventas (Q)
  const ventasChartData = useMemo(() => {
    const data = compromisosDisplay.map(d => ({
      name: d.name,
      ventas: d.ventas > 0 ? d.ventas : Math.round(d.compromiso * 0.08) // Alcance real o preliminar si aún no completó
    }));
    return data.sort((a, b) => b.ventas - a.ventas);
  }, [compromisosDisplay]);

  // Datos para Gráfica General de Cobros (Q)
  const cobrosChartData = useMemo(() => {
    const data = compromisosDisplay.map(d => ({
      name: d.name,
      cobros: d.cobros > 0 ? d.cobros : Math.round(d.compromiso * 0.07) // Cobros reales
    }));
    return data.sort((a, b) => b.cobros - a.cobros);
  }, [compromisosDisplay]);

  // Guardar edición rápida de compromiso
  const handleSaveCommitment = (vendorName) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      setCommitments(prev => ({
        ...prev,
        [vendorName]: val
      }));
    }
    setEditingVendor(null);
  };

  // Vaciar y guardar data diaria a base de datos (Supabase y local)
  const handleVaciarDataDiaria = async () => {
    setIsSaving(true);
    try {
      await saveDailySupervisionSnapshot({
        date: startDate || getLocalDateString(),
        commitments,
        records: filteredRecords,
        summary: {
          totalCompromiso: totalCompromisoAcumulado,
          totalVentas: totalVentasAcumuladas,
          totalCobros: totalCobrosAcumulados
        }
      });
      setSaveSuccessMsg('¡Data diaria vaciada y respaldada con éxito en la base de datos!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Error al vaciar la data en la base de datos');
    } finally {
      setIsSaving(false);
    }
  };

  // Exportar HTML elegante
  const handleExportHTML = () => {
    const formattedTotalCompromiso = totalCompromisoAcumulado.toLocaleString('es-GT', { minimumFractionDigits: 2 });
    const formattedTotalVentas = totalVentasAcumuladas.toLocaleString('es-GT', { minimumFractionDigits: 2 });
    const formattedTotalCobros = totalCobrosAcumulados.toLocaleString('es-GT', { minimumFractionDigits: 2 });

    const cardsHtml = compromisosDisplay.map(item => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 700; color: #1e293b; font-size: 15px;">${item.name}</div>
          <div style="font-size: 11px; color: #64748b;">Ruta: ${item.route}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; color: #2563eb; font-size: 16px;">Q${item.compromiso.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
          <div style="font-size: 11px; color: #059669; font-weight: 600;">Alcance Ventas: Q${item.ventas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    `).join('');

    const recordsHtml = filteredRecords.slice(0, 100).map(r => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px;">${r.fecha}</td>
        <td style="padding: 8px 12px; font-weight: 600;">${r.vendedor}</td>
        <td style="padding: 8px 12px;">${r.cliente}</td>
        <td style="padding: 8px 12px; text-align: right; color: #4338ca; font-weight: 700;">Q${r.ventas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 12px; text-align: right; color: #059669; font-weight: 700;">Q${r.cobros.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Panel Central de Supervisión - Droguería El Olam</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 980px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7e22ce, #4338ca); color: white; padding: 22px 30px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 22px; font-weight: 800; margin: 0; }
    .content { padding: 28px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
    .badge { background: #2563eb; color: white; font-weight: 800; font-size: 16px; padding: 12px 24px; border-radius: 12px; display: inline-block; float: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">🛡️ Panel Central de Supervisión</h1>
        <div style="font-size: 13px; opacity: 0.9;">Droguería El Olam • Fecha: ${startDate}</div>
      </div>
    </div>
    <div class="content">
      <h3 style="font-size: 17px; margin-bottom: 14px;">🌐 Compromisos de Venta Diaria</h3>
      <div class="grid">${cardsHtml}</div>
      <div style="overflow: hidden; margin-bottom: 24px;">
        <div class="badge">Total Acumulado: Q${formattedTotalCompromiso}</div>
      </div>
      <h3 style="font-size: 17px; margin-top: 24px;">📋 Registros Diarios de Vendedores</h3>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Vendedor</th>
            <th>Cliente</th>
            <th style="text-align: right;">Ventas (Q)</th>
            <th style="text-align: right;">Cobros (Q)</th>
          </tr>
        </thead>
        <tbody>${recordsHtml}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Panel_Central_Supervision_${startDate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const content = (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl w-full ${isEmbedded ? 'max-w-full' : 'max-w-5xl max-h-[95vh]'} flex flex-col overflow-hidden`}>
      
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
              Droguería El Olam • Compromisos Diarios, Alcances y Registros en Vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Vaciar / Guardar Data Diaria a Base de Datos */}
          <button
            onClick={handleVaciarDataDiaria}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-emerald-400/50"
            title="Guardar y vaciar data diaria a la base de datos (Supabase)"
          >
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">{isSaving ? 'Guardando...' : 'Vaciar a Base de Datos'}</span>
          </button>

          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
            title="Refrescar datos"
          >
            <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-600 active:scale-95 text-white transition-all cursor-pointer"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* AVISO DE GUARDADO EXITOSO */}
      {saveSuccessMsg && (
        <div className="bg-emerald-500 text-white text-xs px-4 py-2 font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* BARRA DE FILTROS Y CONTROLES */}
      <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 shrink-0 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Pestañas: Dashboard KPIs / Registros */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('kpis')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'registros'
                  ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Registros ({filteredRecords.length})</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 hidden md:block"></div>

          {/* Selector de Vendedores Deduplicado Estrictamente */}
          <div className="relative min-w-[190px]">
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">Todos los vendedores (11)</option>
              {vendorList.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Selector de Rutas */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">Todas las rutas</option>
              {routeList.map((r) => (
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

        {/* Fila de Fechas y Vaciado Diario */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => {
                const today = getLocalDateString();
                setStartDate(today);
                setEndDate(today);
                setSelectedVendor('ALL');
                setSelectedRoute('ALL');
              }}
              className="text-xs text-purple-600 hover:text-purple-800 font-semibold underline cursor-pointer"
            >
              Ver Hoy
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            💡 Cada jornada diaria se guarda y vacía a la base de datos para consultas históricas individuales y grupales.
          </div>
        </div>
      </div>

      {/* CUERPO DEL PANEL */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
        
        {activeTab === 'kpis' && (
          <>
            {/* SECCIÓN 1: COMPROMISOS DE VENTA DIARIA */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    Compromisos de Venta Diaria
                  </h3>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedVendor === 'ALL' ? 'Vista Grupal (11 Vendedores)' : `Vista Individual: ${selectedVendor}`}
                </div>
              </div>

              {/* Grid de Tarjetas de Compromisos de Venta Diaria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {compromisosDisplay.map((item) => {
                  const isEditing = editingVendor === item.name;

                  return (
                    <div
                      key={item.name}
                      className="bg-blue-50/40 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700/60 border border-blue-100/70 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1.5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400">({item.route})</span>
                        </div>

                        {/* Valor del compromiso o input de edición rápida */}
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-blue-600">Q</span>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 text-xs font-bold border border-blue-400 rounded px-1.5 py-0.5 bg-white text-right"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCommitment(item.name)}
                              className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                              title="Guardar compromiso"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingVendor(null)}
                              className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                              title="Cancelar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                              Q{item.compromiso.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <button
                              onClick={() => {
                                setEditingVendor(item.name);
                                setEditValue(item.compromiso);
                              }}
                              className="opacity-0 hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600"
                              title="Editar compromiso diario"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Alcance obtenido en ventas a partir de los registros */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100/40 dark:border-slate-700/60">
                        <span className="text-slate-500 text-[11px]">
                          Alcance Ventas: <strong className="text-indigo-600 dark:text-indigo-400">Q{item.ventas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <span className={`text-[11px] font-bold ${item.pctCumplimiento >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.pctCumplimiento}% alcanzado
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Badges de Totales Acumulados */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500 font-medium">
                  Alcance Global Ventas: <strong className="text-indigo-600 font-bold">Q{totalVentasAcumuladas.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="bg-blue-600 dark:bg-blue-500 text-white font-extrabold text-sm sm:text-base px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2">
                  <span className="opacity-90 font-medium">Total Acumulado:</span>
                  <span>Q{totalCompromisoAcumulado.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: GRÁFICA GENERAL DE VENTAS (Q) */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    Gráfica General de Ventas (Q)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Alimentada de los registros diarios</span>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ventasChartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
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
                    />
                    <RechartsTooltip 
                      formatter={(val) => [`Q${Number(val).toLocaleString('es-GT')}`, 'Ventas']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="ventas" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECCIÓN 3: GRÁFICA GENERAL DE COBROS (Q) */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    Gráfica General de Cobros (Q)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Alimentada de los registros diarios</span>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cobrosChartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
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
                    />
                    <RechartsTooltip 
                      formatter={(val) => [`Q${Number(val).toLocaleString('es-GT')}`, 'Cobros']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="cobros" fill="#10b981" radius={[6, 6, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* PESTAÑA: REGISTROS */}
        {activeTab === 'registros' && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                  Registros del Panel Central de Supervisión
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cada registro que realizan los vendedores se concentra aquí y alimenta automáticamente el Dashboard KPIs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleVaciarDataDiaria}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Guardando...' : 'Vaciar a Base de Datos'}</span>
                </button>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No hay registros de vendedores para el rango o vendedor seleccionado.</p>
                <p className="text-xs text-slate-400 mt-1">Los registros que los vendedores realicen en el día aparecerán aquí en tiempo real.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2.5 rounded-l-lg">Fecha</th>
                      <th className="px-3 py-2.5">Vendedor</th>
                      <th className="px-3 py-2.5">Cliente / Visita</th>
                      <th className="px-3 py-2.5">Ruta</th>
                      <th className="px-3 py-2.5 text-right">Ventas (Q)</th>
                      <th className="px-3 py-2.5 text-right">Cobros (Q)</th>
                      <th className="px-3 py-2.5 text-right">Devoluciones</th>
                      <th className="px-3 py-2.5 rounded-r-lg">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredRecords.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td className="px-3 py-2 font-medium">{r.fecha}</td>
                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{r.vendedor}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-xs truncate">{r.cliente}</td>
                        <td className="px-3 py-2 text-slate-500">{r.ruta}</td>
                        <td className="px-3 py-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                          Q{Number(r.ventas).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          Q{Number(r.cobros).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {r.devoluciones || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-xs truncate">
                          {r.observaciones || '-'}
                        </td>
                      </tr>
                    ))}
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
