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
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  getOtpKeysVault, 
  getOtpKeysVaultAsync, 
  getOtpKeysStats 
} from '../lib/security';
import { getLocalDateString } from '../lib/dateUtils';

export default function AdminOtpVaultModal({ isOpen, onClose }) {
  const [keysList, setKeysList] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'used'
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Cargar inicial local inmediato
    setKeysList(getOtpKeysVault());

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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
    showToast(`Clave "${key}" copiada al portapapeles.`);
  };

  const handleDownloadExcel = async () => {
    try {
      showToast('Sincronizando claves con la nube y generando Excel...');
      const vault = await getOtpKeysVaultAsync();
      const rows = vault.map(k => ({
        'No.': k.id,
        'Clave de Un Solo Toque (OTP)': k.key,
        'Tipo': 'Acceso Vendedor / Administrador (1 Solo Uso)',
        'Estado': k.used ? 'QUEMADA / USADA' : 'DISPONIBLE',
        'Consumida Por': k.usedBy || '-',
        'Fecha de Uso': k.usedAt || '-',
        'Instrucciones': 'Válida para 1 solo inicio de sesión. Queda invalidada permanentemente al ingresar.'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 42 },
        { wch: 22 },
        { wch: 26 },
        { wch: 24 },
        { wch: 85 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Claves 2.0');
      const todayStr = getLocalDateString();
      const fileName = `claves_otp_2.0_${todayStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      const stats = vault.reduce(
        (acc, k) => {
          if (k.used) acc.used++;
          else acc.available++;
          return acc;
        },
        { used: 0, available: 0 }
      );
      showToast(`✅ Excel "${fileName}" generado: ${stats.available} disponibles, ${stats.used} quemadas.`);
    } catch (e) {
      console.error(e);
      showToast('Error al generar Excel de claves OTP');
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[88vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="shrink-0 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-4 sm:p-5 flex items-center justify-between border-b border-amber-600/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 border border-white/20 rounded-xl text-white shadow-sm">
              <Key size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Bóveda de Claves 2.0 (OTP - Un Solo Toque)
                </h3>
                <span className="bg-white text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                  1 Solo Uso
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                50 contraseñas desechables criptográficas. Al iniciar sesión quedan <strong>quemadas/invalidadas</strong> de inmediato.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              title="Descargar archivo Excel oficial"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Descargar "claves 2.0.xlsx"</span>
              <span className="sm:hidden">Excel</span>
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-amber-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Toast Notificación */}
        {toastMessage && (
          <div className="shrink-0 bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 animate-fadeIn shadow-inner">
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
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/40 p-2.5 rounded-xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Quemadas / Usadas</span>
            <div className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">{stats.used}</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="shrink-0 p-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar clave o usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
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
                filter === 'used' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'
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
                  <th className="py-2.5 px-4">Clave de 1 Solo Toque</th>
                  <th className="py-2.5 px-3 text-center w-32">Estado</th>
                  <th className="py-2.5 px-4">Usada Por</th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3 text-right w-28">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                    <td className="py-2.5 px-4">
                      <span className={`font-mono font-black text-sm tracking-widest px-2.5 py-1 rounded-lg border ${
                        item.used 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 line-through' 
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-sm'
                      }`}>
                        {item.key}
                      </span>
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
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
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
                            : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-sm active:scale-95'
                        }`}
                        title={item.used ? 'Clave ya utilizada' : 'Copiar clave'}
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
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">
              Protección de sesión activa: ninguna clave de un solo toque puede reutilizarse.
            </span>
            <span className="sm:hidden">
              1 solo uso por clave.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1"
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
