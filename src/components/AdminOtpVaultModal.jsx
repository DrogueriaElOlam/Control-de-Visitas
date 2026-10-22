import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Download, 
  FileSpreadsheet, 
  Copy, 
  Search, 
  ShieldCheck, 
  X,
  CheckCircle2,
  Flame,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  getOtpKeysVault, 
  getOtpKeysVaultAsync, 
  getOtpKeysStats,
  burnOtpKeyManually
} from '../lib/security';
import { getLocalDateString } from '../lib/dateUtils';
import { getVendorsList } from '../lib/db';

export default function AdminOtpVaultModal({ isOpen, onClose }) {
  const [keysList, setKeysList] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'used'
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [vendors, setVendors] = useState([]);
  
  // Estado para quemado directo
  const [burnTargetKey, setBurnTargetKey] = useState(null);
  const [selectedBurnVendor, setSelectedBurnVendor] = useState('');
  const [quickKeyInput, setQuickKeyInput] = useState('');
  const [quickVendorInput, setQuickVendorInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Cargar inicial local inmediato
    setKeysList(getOtpKeysVault());

    // Cargar vendedores para asignación
    getVendorsList().then(list => {
      const active = list.filter(v => v.active !== false);
      setVendors(active);
      if (active.length > 0) {
        setSelectedBurnVendor(active[0].name);
        setQuickVendorInput(active[0].name);
      }
    }).catch(() => {});

    // Cargar versión más fresca desde Supabase
    getOtpKeysVaultAsync().then((fresh) => {
      if (fresh && Array.isArray(fresh)) {
        setKeysList(fresh);
      }
    }).catch(() => {});

    const handleVaultChange = () => {
      setKeysList(getOtpKeysVault());
    };
    window.addEventListener('olam_otp_vault_changed', handleVaultChange);
    return () => {
      window.removeEventListener('olam_otp_vault_changed', handleVaultChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyKey = (keyString) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKey(keyString);
    setToastMessage(`¡Clave ${keyString} copiada al portapapeles!`);
    setTimeout(() => {
      setCopiedKey('');
      setToastMessage('');
    }, 2500);
  };

  const handleExecuteBurn = async (keyToBurn, vendorToAssign) => {
    if (!keyToBurn) return;
    const assigned = vendorToAssign || selectedBurnVendor || 'Vendedor en Campo';
    const res = await burnOtpKeyManually(keyToBurn, assigned, 'vendor');
    if (res.success) {
      setToastMessage(`🔥 ¡Clave ${keyToBurn} quemada exitosamente para ${assigned}!`);
      setKeysList(getOtpKeysVault());
      setBurnTargetKey(null);
      setQuickKeyInput('');
    } else {
      setToastMessage(`⚠️ ${res.message}`);
    }
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleDownloadExcel = () => {
    const freshKeys = getOtpKeysVault();
    const rows = freshKeys.map((item) => ({
      'No.': item.id,
      'Clave de Un Solo Toque': item.key,
      'Estado': item.used ? 'Quemada / Ya Usada' : 'Disponible',
      'Consumida Por': item.usedBy || '—',
      'Fecha y Hora de Uso': item.usedAt || '—',
      'Propósito': 'Acceso Único Vendedores Droguería El Olam'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Claves OTP 2.0');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 20 },
      { wch: 28 },
      { wch: 22 },
      { wch: 45 }
    ];

    const todayStr = getLocalDateString();
    XLSX.writeFile(workbook, `claves 2.0_${todayStr}.xlsx`);
  };

  const stats = getOtpKeysStats();

  const filteredKeys = keysList
    .filter((k) => {
      if (filter === 'available') return !k.used;
      if (filter === 'used') return k.used;
      return true;
    })
    .filter((k) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return k.key.toLowerCase().includes(q) || (k.usedBy && k.usedBy.toLowerCase().includes(q));
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header Compacto y Elegante */}
        <div className="shrink-0 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-3 sm:p-5 flex items-center justify-between border-b border-amber-600/60 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-white/15 border border-white/20 rounded-xl text-white shadow-sm shrink-0">
              <Key size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-lg font-black tracking-tight text-white">
                  Bóveda de Claves 2.0 (OTP)
                </h3>
                <span className="bg-white text-amber-900 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm shrink-0">
                  1 Solo Uso
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100 mt-0.5 hidden sm:block">
                50 contraseñas desechables. Al iniciar sesión quedan <strong>quemadas</strong> de inmediato.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              title="Descargar archivo Excel oficial"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Excel</span>
              <Download size={13} className="hidden sm:inline" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-amber-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Toast Notificación */}
        {toastMessage && (
          <div className="shrink-0 bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 animate-fadeIn shadow-inner">
            <CheckCircle2 size={14} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* KPI Cards Compactas */}
        <div className="shrink-0 p-2 sm:p-3 sm:px-6 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 sm:p-2 rounded-xl shadow-sm text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
            <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 p-1.5 sm:p-2 rounded-xl shadow-sm text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Disponibles</span>
            <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.available}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/40 p-1.5 sm:p-2 rounded-xl shadow-sm text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">Quemadas</span>
            <div className="text-base sm:text-xl font-black text-red-600 dark:text-red-400 mt-0.5">{stats.used}</div>
          </div>
        </div>

        {/* Panel de Quema Manual Directa para el Administrador */}
        <div className="shrink-0 p-2 sm:p-3 sm:px-6 bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-300 dark:border-amber-700/50 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
            <span className="text-xs font-black text-amber-950 dark:text-amber-200">
              Quemar Clave de Acceso Manualmente:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl justify-end">
            <input
              type="text"
              placeholder="Ej: OLAM-XXXX-XXXX"
              value={quickKeyInput}
              onChange={(e) => setQuickKeyInput(e.target.value.toUpperCase())}
              className="px-2.5 py-1 text-xs font-mono uppercase bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white w-40"
            />
            
            <select
              value={quickVendorInput}
              onChange={(e) => setQuickVendorInput(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold dark:text-white"
            >
              {vendors.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>

            <button
              type="button"
              disabled={!quickKeyInput.trim()}
              onClick={() => handleExecuteBurn(quickKeyInput, quickVendorInput)}
              className="px-3 py-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1 shadow-md cursor-pointer active:scale-95"
            >
              <Flame size={13} />
              <span>🔥 Quemar Ahora</span>
            </button>
          </div>
        </div>

        {/* Filtros y Búsqueda Limpios */}
        <div className="shrink-0 p-2 sm:p-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between">
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search size={13} className="absolute left-3 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar clave o usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Todas (50)
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'available' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Disponibles ({stats.available})
            </button>
            <button
              type="button"
              onClick={() => setFilter('used')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'used' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Quemadas ({stats.used})
            </button>
          </div>
        </div>

        {/* Tabla con Scroll Vertical y Horizontal 100% Táctil con el Dedo */}
        <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 shadow-sm bg-slate-100 dark:bg-slate-800">
              <tr className="text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 w-12 text-center">No.</th>
                <th className="py-2.5 px-3">Clave de Acceso (OTP)</th>
                <th className="py-2.5 px-3 text-center w-24">Copiar</th>
                <th className="py-2.5 px-3 text-center w-24">Estado</th>
                <th className="py-2.5 px-3 text-center w-28">Acción</th>
                <th className="py-2.5 px-3">Usada Por</th>
                <th className="py-2.5 px-3">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredKeys.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors ${
                    item.used ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                    #{item.id}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(item.key)}
                      disabled={item.used}
                      className={`font-mono font-black text-xs sm:text-sm tracking-widest px-2.5 py-1 rounded-xl border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        item.used 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 line-through cursor-not-allowed' 
                          : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-sm active:scale-95'
                      }`}
                      title={item.used ? 'Clave ya utilizada' : 'Clic para copiar clave'}
                    >
                      <span>{item.key}</span>
                      <Copy size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(item.key)}
                      disabled={item.used}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
                        copiedKey === item.key
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                          : item.used
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                          : 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 active:scale-95'
                      }`}
                      title={item.used ? 'Clave ya utilizada' : 'Copiar clave'}
                    >
                      <Copy size={12} />
                      <span>{copiedKey === item.key ? '¡Copiada!' : 'Copiar'}</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {item.used ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                        ⛔ QUEMADA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        ✓ DISPONIBLE
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {item.used ? (
                      <span className="text-[10px] text-slate-400 italic">Inutilizada</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBurnTargetKey(item)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-xl text-xs font-black transition-all inline-flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                        title="Marcar como quemada e invalidar para siempre"
                      >
                        <Flame size={12} className="text-red-600" />
                        <span>Quemar</span>
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {item.usedBy ? (
                      <span className="text-blue-700 dark:text-blue-400 font-extrabold">
                        {item.usedBy}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal italic">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                    {item.usedAt || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Emergente de Asignación y Quema Individual */}
        {burnTargetKey && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center shrink-0">
                  <Flame size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Quemar Clave de Acceso
                  </h4>
                  <p className="text-xs font-mono font-bold text-amber-600">
                    {burnTargetKey.key}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                Al quemar esta clave quedará <strong>invalidada permanentemente</strong>. Selecciona a qué vendedor se la asignaste:
              </p>

              <div className="mb-4">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Vendedor Asignado:
                </label>
                <select
                  value={selectedBurnVendor}
                  onChange={(e) => setSelectedBurnVendor(e.target.value)}
                  className="w-full p-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl dark:text-white"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBurnTargetKey(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteBurn(burnTargetKey.key, selectedBurnVendor)}
                  className="px-4 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
                >
                  <Flame size={13} />
                  <span>Confirmar y Quemar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Compacto */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2.5 sm:px-6 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shadow-lg">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              1 solo uso por clave.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <FileSpreadsheet size={13} />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
