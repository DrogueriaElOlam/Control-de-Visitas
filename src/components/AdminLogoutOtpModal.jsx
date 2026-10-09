import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Download, 
  FileSpreadsheet, 
  Copy, 
  Search, 
  ShieldCheck, 
  X,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  getLogoutOtpKeysVault, 
  getLogoutOtpKeysVaultAsync, 
  getLogoutOtpKeysStats 
} from '../lib/security';
import { getLocalDateString } from '../lib/dateUtils';

export default function AdminLogoutOtpModal({ isOpen, onClose }) {
  const [keysList, setKeysList] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'used'
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Cargar inicial local inmediato
    setKeysList(getLogoutOtpKeysVault());

    // Cargar versión más fresca desde Supabase
    getLogoutOtpKeysVaultAsync().then((fresh) => {
      if (fresh && Array.isArray(fresh)) {
        setKeysList(fresh);
      }
    }).catch(() => {});

    const handleVaultChange = () => {
      setKeysList(getLogoutOtpKeysVault());
    };
    window.addEventListener('olam_logout_otp_vault_changed', handleVaultChange);
    return () => {
      window.removeEventListener('olam_logout_otp_vault_changed', handleVaultChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
    showToast(`Clave de cierre "${key}" copiada al portapapeles.`);
  };

  const handleDownloadExcel = async () => {
    try {
      showToast('Sincronizando claves de cierre con la nube...');
      const vault = await getLogoutOtpKeysVaultAsync();
      const rows = vault.map(k => ({
        'No.': k.id,
        'Clave de Cierre de Sesión (OTP)': k.key,
        'Tipo': 'Autorización de Salida en Dispositivo (1 Solo Uso)',
        'Estado': k.used ? 'QUEMADA / USADA' : 'DISPONIBLE',
        'Consumida Por': k.usedBy || '-',
        'Fecha de Uso': k.usedAt || '-',
        'Instrucciones': 'Válida exactamente para 1 autorización de salida en teléfono o dispositivo. Al autorizar la salida queda invalidada automáticamente de forma permanente.'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 38 },
        { wch: 22 },
        { wch: 26 },
        { wch: 24 },
        { wch: 90 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Claves Cierre Sesión');
      const todayStr = getLocalDateString();
      const fileName = `claves_cierre_sesion_2.0_${todayStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      const stats = vault.reduce(
        (acc, k) => {
          if (k.used) acc.used++;
          else acc.available++;
          return acc;
        },
        { used: 0, available: 0 }
      );
      showToast(`✅ Excel "${fileName}" generado: ${stats.available} disponibles, ${stats.used} consumidas.`);
    } catch (e) {
      console.error(e);
      showToast('Error al generar Excel de claves de cierre');
    }
  };

  const stats = getLogoutOtpKeysStats();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[88vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="shrink-0 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white p-4 sm:p-5 flex items-center justify-between border-b border-rose-600/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 border border-white/20 rounded-xl text-white shadow-sm">
              <LogOut size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Bóveda de Claves de Cierre de Sesión (Logout OTP)
                </h3>
                <span className="bg-white text-rose-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                  Salida / 1 Uso
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                50 contraseñas de un toque para autorizar la salida de vendedores en teléfonos. Al autorizarse quedan <strong>quemadas</strong> permanentemente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-900/60 hover:bg-rose-900 border border-white/30 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              title="Descargar archivo Excel oficial de claves de cierre"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Descargar "claves cierre sesion 2.0.xlsx"</span>
              <span className="sm:hidden">Excel</span>
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-rose-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Toast Notificación */}
        {toastMessage && (
          <div className="shrink-0 bg-rose-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 animate-fadeIn shadow-inner">
            <CheckCircle2 size={15} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* KPI Cards Rápidas */}
        <div className="shrink-0 p-3 sm:px-6 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Generadas</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 p-2.5 rounded-xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Disponibles</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.available}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/40 p-2.5 rounded-xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Quemadas / Usadas</span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.used}</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="shrink-0 p-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar clave de cierre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Todas (50)
            </button>
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'available' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Disponibles ({stats.available})
            </button>
            <button
              type="button"
              onClick={() => setFilter('used')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'used' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Quemadas ({stats.used})
            </button>
          </div>
        </div>

        {/* Keys Table Container con Scroll Suave */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-3 sm:p-5">
          <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-12 text-center">No.</th>
                  <th className="py-2.5 px-4">Clave de Cierre (OTP)</th>
                  <th className="py-2.5 px-3 text-center w-32">Estado</th>
                  <th className="py-2.5 px-4">Consumida Por</th>
                  <th className="py-2.5 px-3">Fecha de Uso</th>
                  <th className="py-2.5 px-3 text-right w-28">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredKeys.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-rose-50/40 dark:hover:bg-slate-800/50 transition-colors ${
                      item.used ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                      #{item.id}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`font-mono font-black text-sm tracking-widest px-2.5 py-1 rounded-lg border ${
                        item.used 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 line-through' 
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 shadow-sm'
                      }`}>
                        {item.key}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {item.used ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          QUEMADA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          DISPONIBLE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {item.usedBy ? (
                        <span className="text-rose-700 dark:text-rose-400 font-extrabold">
                          {item.usedBy}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {item.usedAt || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleCopyKey(item.key)}
                        disabled={item.used}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                          copiedKey === item.key
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : item.used
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                            : 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700 shadow-sm active:scale-95'
                        }`}
                        title={item.used ? 'Clave ya consumida' : 'Copiar clave de cierre'}
                      >
                        <Copy size={13} />
                        <span>{copiedKey === item.key ? 'Copiada' : 'Copiar'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer (Inamovible y Siempre Visible) */}
        <div className="shrink-0 sticky bottom-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 sm:px-6 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shadow-lg z-30">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-rose-600 shrink-0" />
            <span className="hidden sm:inline">
              Protección de salida en campo: cada clave permite exactamente una salida y queda invalidada.
            </span>
            <span className="sm:hidden">
              1 solo cierre por clave.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <FileSpreadsheet size={14} />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cerrar Bóveda
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
