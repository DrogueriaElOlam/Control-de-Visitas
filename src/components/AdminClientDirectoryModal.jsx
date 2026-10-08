import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Building2, 
  Upload, 
  Download, 
  Search, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X, 
  FileSpreadsheet, 
  Phone, 
  MapPin, 
  RefreshCw,
  UserCheck,
  Pencil,
  Save,
  Check,
  Filter,
  Sparkles,
  Layers,
  CheckCheck
} from 'lucide-react';
import { 
  getStoredPharmacyDirectory, 
  fetchPharmacyDirectory, 
  saveBulkClientsToDirectory, 
  saveClientRecord, 
  updateClientInDirectory,
  deleteClientFromDirectory, 
  deleteExactClientRecord,
  cleanAndDeduplicateDirectory,
  calculateClientCompleteness,
  downloadClientsTemplateExcel 
} from '../lib/catalog';
import { ALL_ROUTES } from '../lib/db';

export default function AdminClientDirectoryModal({ isOpen, onClose, visits = [] }) {
  if (!isOpen) return null;

  const [activeSubTab, setActiveSubTab] = useState('import'); // 'import' | 'list' | 'manual'
  const [listFilter, setListFilter] = useState('all'); // 'all' | 'duplicates' | 'incomplete'
  const [autoDeduplicateUpload, setAutoDeduplicateUpload] = useState(true);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Excel upload state
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  // Manual new client state
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualRoute, setManualRoute] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Edit existing client state
  const [editingClient, setEditingClient] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoute, setEditRoute] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Load directory
  const loadDirectory = async () => {
    setLoading(true);
    try {
      const stored = getStoredPharmacyDirectory();
      if (stored && stored.length > 0) {
        setClients(stored);
      } else {
        const dir = await fetchPharmacyDirectory(visits);
        setClients(dir);
      }
    } catch (e) {
      console.error('Error loading directory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();

    const handleUpdated = () => loadDirectory();
    window.addEventListener('olam_clients_directory_updated', handleUpdated);
    return () => window.removeEventListener('olam_clients_directory_updated', handleUpdated);
  }, [visits]);

  // Handle Excel file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const processExcelFile = (file) => {
    setFileName(file.name);
    setStatusMsg({ type: '', text: '' });
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          setStatusMsg({ type: 'error', text: 'El archivo Excel no contiene filas o está vacío.' });
          setParsedRows([]);
          return;
        }

        // Flexible column mapping
        const mapped = data.map((row, index) => {
          let code = '';
          let name = '';
          let phone = '';
          let sector = '';

          for (const key of Object.keys(row)) {
            const k = key.trim().toLowerCase();
            const val = String(row[key] || '').trim();

            if (k.includes('cód') || k.includes('cod') || k === 'codigo' || k === 'id') {
              code = val;
            } else if (k.includes('farmacia') || k.includes('nombre') || k.includes('cliente') || k === 'name') {
              name = val;
            } else if (k.includes('tel') || k.includes('cel') || k.includes('phone') || k.includes('contacto')) {
              phone = val;
            } else if (k.includes('ruta') || k.includes('sector') || k.includes('gira') || k.includes('zona')) {
              sector = val;
            }
          }

          return {
            _index: index + 1,
            code,
            name,
            phone,
            sector,
            route: sector
          };
        }).filter(r => r.code || r.name);

        if (mapped.length === 0) {
          setStatusMsg({ 
            type: 'error', 
            text: 'No se encontraron columnas reconocibles. Asegúrate de incluir columnas como "Código", "Nombre de la Farmacia", "Teléfono", "Ruta o Sector".' 
          });
          setParsedRows([]);
          return;
        }

        setParsedRows(mapped);
        setStatusMsg({ 
          type: 'info', 
          text: `Se detectaron ${mapped.length} farmacias listas para importar. Revisa la vista previa y presiona "Confirmar e Importar".` 
        });
      } catch (err) {
        console.error(err);
        setStatusMsg({ type: 'error', text: 'Error al leer el archivo Excel. Verifica el formato del archivo.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await saveBulkClientsToDirectory(parsedRows);
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: `¡Éxito! Se importaron y sincronizaron ${res.count} clientes en el directorio de Droguería El Olam. Ahora los vendedores verán la información precargada al ingresar el código.`
        });
        setParsedRows([]);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await loadDirectory();
      } else {
        setStatusMsg({ type: 'error', text: 'No se pudieron guardar los registros.' });
      }
    } catch (e) {
      console.error(e);
      setStatusMsg({ type: 'error', text: 'Error durante la importación.' });
    } finally {
      setImporting(false);
    }
  };

  // Save manual client
  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!manualName.trim() && !manualCode.trim()) {
      alert('Por favor ingrese al menos el código o nombre de la farmacia.');
      return;
    }
    setSavingManual(true);
    try {
      await saveClientRecord({
        code: manualCode.trim(),
        name: manualName.trim(),
        phone: manualPhone.trim(),
        sector: manualRoute.trim(),
        route: manualRoute.trim()
      });
      setManualCode('');
      setManualName('');
      setManualPhone('');
      setManualRoute('');
      setStatusMsg({ type: 'success', text: '¡Cliente agregado al directorio exitosamente!' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3500);
      setActiveSubTab('list');
      await loadDirectory();
    } catch (e) {
      alert('Error al guardar el cliente');
    } finally {
      setSavingManual(false);
    }
  };

  // Start editing a client
  const handleStartEdit = (client) => {
    setEditingClient(client);
    setEditCode(client.code || '');
    setEditName(client.name || '');
    setEditPhone(client.phone || '');
    setEditRoute(client.sector || client.route || '');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingClient(null);
    setEditCode('');
    setEditName('');
    setEditPhone('');
    setEditRoute('');
  };

  // Save edited client
  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editName.trim() && !editCode.trim()) {
      alert('Por favor ingrese al menos el código o nombre de la farmacia.');
      return;
    }
    setSavingEdit(true);
    try {
      await updateClientInDirectory({
        originalCode: editingClient?.code,
        originalName: editingClient?.name,
        code: editCode.trim(),
        name: editName.trim(),
        phone: editPhone.trim(),
        sector: editRoute.trim(),
        route: editRoute.trim()
      });
      setStatusMsg({
        type: 'success',
        text: `¡Cliente "${editName.trim() || editCode.trim()}" actualizado exitosamente en el directorio!`
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
      handleCancelEdit();
      await loadDirectory();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el cliente en el directorio.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Duplicate statistics for the current directory
  const duplicateStats = useMemo(() => {
    const codeCounts = {};
    clients.forEach(c => {
      const code = c.code ? String(c.code).trim().toLowerCase() : '';
      if (code && code !== '0000') {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      }
    });

    const duplicateCodes = Object.keys(codeCounts).filter(code => codeCounts[code] > 1);
    const duplicateRowsCount = clients.filter(c => {
      const code = c.code ? String(c.code).trim().toLowerCase() : '';
      return code && codeCounts[code] > 1;
    }).length;

    let incompleteCount = 0;
    clients.forEach(c => {
      if (!calculateClientCompleteness(c).isComplete) incompleteCount++;
    });

    return {
      codeCounts,
      duplicateCodes,
      duplicateRowsCount,
      uniqueDuplicateCodesCount: duplicateCodes.length,
      incompleteCount
    };
  }, [clients]);

  // Duplicates detection for the uploaded Excel preview
  const uploadDuplicateStats = useMemo(() => {
    const codeCounts = {};
    parsedRows.forEach(r => {
      const code = r.code ? String(r.code).trim().toLowerCase() : '';
      if (code && code !== '0000') {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      }
    });
    const dupCount = parsedRows.filter(r => {
      const code = r.code ? String(r.code).trim().toLowerCase() : '';
      return code && codeCounts[code] > 1;
    }).length;
    return { codeCounts, dupCount };
  }, [parsedRows]);

  // Delete single exact client record
  const handleDeleteClient = async (client) => {
    const isDup = client.code && (duplicateStats.codeCounts[String(client.code).trim().toLowerCase()] > 1);
    const confirmMsg = isDup
      ? `¿Deseas eliminar este registro duplicado específico de "${client.name || client.code}"?\n\nLos demás registros con este código se mantendrán intactos para que conserves el más completo.`
      : `¿Deseas eliminar a "${client.name || client.code}" del directorio de farmacias?`;

    if (window.confirm(confirmMsg)) {
      await deleteExactClientRecord(client);
      await loadDirectory();
      setStatusMsg({
        type: 'info',
        text: `Registro de "${client.name || client.code}" eliminado del directorio.`
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3500);
    }
  };

  // Auto clean all duplicate codes keeping only the most complete records
  const handleAutoCleanDuplicates = async () => {
    const confirm = window.confirm(
      `¿Deseas depurar los códigos duplicados automáticamente?\n\n` +
      `Se analizarán todos los registros repetidos y el sistema conservará únicamente el registro que contenga todos los campos necesarios (Código, Nombre, Teléfono y Ruta), fusionando la información más completa.`
    );
    if (!confirm) return;

    try {
      const res = await cleanAndDeduplicateDirectory();
      setStatusMsg({
        type: 'success',
        text: `✓ Depuración completada: Se eliminaron ${res.removedCount} registros duplicados incompletos. Ahora el directorio cuenta con ${res.afterCount} farmacias con códigos únicos y completos.`
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5500);
      setListFilter('all');
      await loadDirectory();
    } catch (e) {
      console.error(e);
      alert('Error al depurar duplicados.');
    }
  };

  // Filtered clients for list view
  const filteredClients = useMemo(() => {
    let list = clients;

    if (listFilter === 'duplicates') {
      list = list.filter(c => {
        const code = c.code ? String(c.code).trim().toLowerCase() : '';
        return code && (duplicateStats.codeCounts[code] > 1);
      });
      // Sort grouped by code so duplicates appear together, most complete first
      list = [...list].sort((a, b) => {
        const codeA = String(a.code || '').toLowerCase();
        const codeB = String(b.code || '').toLowerCase();
        if (codeA !== codeB) return codeA.localeCompare(codeB);
        return calculateClientCompleteness(b).score - calculateClientCompleteness(a).score;
      });
    } else if (listFilter === 'incomplete') {
      list = list.filter(c => !calculateClientCompleteness(c).isComplete);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(c => 
      (c.code && String(c.code).toLowerCase().includes(q)) ||
      (c.name && String(c.name).toLowerCase().includes(q)) ||
      (c.sector && String(c.sector).toLowerCase().includes(q)) ||
      (c.route && String(c.route).toLowerCase().includes(q)) ||
      (c.phone && String(c.phone).toLowerCase().includes(q))
    );
  }, [clients, searchQuery, listFilter, duplicateStats]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm border border-white/20">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full font-bold">
                  Panel Administrador
                </span>
                <span className="text-xs text-blue-200 font-semibold hidden sm:inline">
                  Directorio Maestro de Farmacias & Clientes
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Carga Masiva de Clientes desde Excel
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('import')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'import'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Upload size={14} />
              <span>Subir Archivo Excel</span>
            </button>

            <button
              onClick={() => setActiveSubTab('list')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'list'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Building2 size={14} />
              <span>Ver Directorio ({clients.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('manual')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'manual'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Plus size={14} />
              <span>Agregar Individual</span>
            </button>
          </div>

          {/* Quick template download button */}
          <button
            type="button"
            onClick={downloadClientsTemplateExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer mb-2"
            title="Descargar plantilla de Excel modelo con las columnas requeridas"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Descargar Plantilla Excel</span>
          </button>
        </div>

        {/* Notifications */}
        {statusMsg.text && (
          <div className={`p-3.5 text-xs font-bold flex items-center justify-between ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-600 text-white' 
              : statusMsg.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            <span className="flex items-center gap-2">
              {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {statusMsg.text}
            </span>
            <button onClick={() => setStatusMsg({ type: '', text: '' })} className="text-white/80 hover:text-white">✕</button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: SUBIR EXCEL */}
          {activeSubTab === 'import' && (
            <div className="space-y-6">
              
              {/* Instructions banner */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 p-4 rounded-2xl flex items-start gap-3">
                <FileSpreadsheet className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-blue-900 dark:text-blue-200">
                    ¿Cómo funciona la precarga de clientes para los vendedores?
                  </p>
                  <p>
                    Sube tu archivo de Excel con las columnas: <strong>Código de Cliente</strong>, <strong>Nombre de la Farmacia</strong>, <strong>Teléfono</strong> y <strong>Ruta o Sector</strong>.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Al momento en que los vendedores ingresen el código en la pantalla de registro, el sistema <strong>autocompletará inmediatamente</strong> el nombre de la farmacia, el teléfono y la ruta asignada.
                  </p>
                </div>
              </div>

              {/* Drag & Drop Upload Area */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-blue-300 dark:border-blue-700/60 hover:border-blue-500 rounded-3xl p-8 sm:p-10 text-center bg-slate-50/60 dark:bg-slate-800/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                
                <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-600 dark:text-blue-300 shadow-sm">
                  <Upload size={32} />
                </div>

                <div>
                  <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                    {fileName ? fileName : 'Haz clic aquí o arrastra tu archivo de Excel (.xlsx)'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos soportados: Excel (.xlsx, .xls) o CSV
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                    Seleccionar Archivo
                  </span>
                </div>
              </div>

              {/* Preview Table of Rows Found */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  {uploadDuplicateStats.dupCount > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={20} />
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-amber-800 dark:text-amber-200">
                          ⚠️ Se detectaron {uploadDuplicateStats.dupCount} filas con códigos duplicados en el archivo Excel
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Al presionar <strong>"Confirmar e Importar"</strong>, el sistema aplicará automáticamente la depuración inteligente: unificará la información y <strong>conservará únicamente el registro con todos los campos necesarios</strong> (Código, Nombre, Teléfono y Ruta), descartando las copias incompletas.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <UserCheck size={16} className="text-emerald-500" />
                      Vista Previa de Clientes ({parsedRows.length} filas detectadas)
                    </h4>

                    <button
                      type="button"
                      disabled={importing}
                      onClick={handleConfirmImport}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {importing ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                      <span>Confirmar e Importar ({parsedRows.length - uploadDuplicateStats.dupCount + (uploadDuplicateStats.dupCount > 0 ? uploadDuplicateStats.dupCount : 0)} Clientes)</span>
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl shadow-inner">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                        <tr>
                          <th className="p-2.5 w-12 text-center">#</th>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Nombre de la Farmacia</th>
                          <th className="p-2.5">Teléfono</th>
                          <th className="p-2.5">Ruta o Sector</th>
                          <th className="p-2.5 text-center">Campos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedRows.slice(0, 100).map((r, i) => {
                          const codeKey = (r.code ? String(r.code).trim().toLowerCase() : '');
                          const isDup = codeKey && (uploadDuplicateStats.codeCounts[codeKey] > 1);
                          const comp = calculateClientCompleteness(r);

                          return (
                            <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isDup ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}>
                              <td className="p-2.5 text-center text-slate-400 font-mono">{i + 1}</td>
                              <td className="p-2.5 font-bold font-mono text-blue-600 dark:text-blue-400">
                                <div>{r.code || '—'}</div>
                                {isDup && (
                                  <span className="inline-block text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.2 rounded mt-0.5">
                                    ⚠️ Duplicado ({uploadDuplicateStats.codeCounts[codeKey]}x)
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">{r.name}</td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono">{r.phone || '—'}</td>
                              <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">{r.sector || r.route || '—'}</td>
                              <td className="p-2.5 text-center">
                                {comp.isComplete ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded font-bold text-[10px]">
                                    ✓ Completo
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded font-bold text-[10px]" title={`Falta: ${comp.missingFields.join(', ')}`}>
                                    ⚠️ Incompleto ({comp.score}/4)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {parsedRows.length > 100 && (
                    <p className="text-[11px] text-slate-400 italic text-right">
                      * Mostrando los primeros 100 de {parsedRows.length} clientes. Todos se importarán al presionar el botón verde.
                    </p>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: VER DIRECTORIO ACTUAL */}
          {activeSubTab === 'list' && (
            <div className="space-y-4">
              
              {/* Alerta si se detectan duplicados */}
              {duplicateStats.duplicateRowsCount > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                  <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="font-bold text-sm">
                        ⚠️ Se detectaron {duplicateStats.uniqueDuplicateCodesCount} códigos repetidos ({duplicateStats.duplicateRowsCount} registros en total)
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                        Puedes revisarlos a continuación y eliminar manualmente los registros con la papelera, o presionar el botón de depuración para dejar solo los que contienen todos los campos necesarios.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoCleanDuplicates}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                    title="Elimina duplicados conservando automáticamente el registro con todos los campos completos"
                  >
                    <Sparkles size={14} />
                    <span>Depurar Duplicados Automáticamente</span>
                  </button>
                </div>
              )}

              {/* Controles de Búsqueda y Filtros Rápidos */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search bar */}
                <div className="relative w-full lg:w-72">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por código, farmacia o ruta..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">✕</button>
                  )}
                </div>

                {/* Filtros por píldora */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setListFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      listFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({clients.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setListFilter('duplicates')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      listFilter === 'duplicates'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : duplicateStats.duplicateRowsCount > 0
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <AlertTriangle size={13} />
                    <span>⚠️ Duplicados ({duplicateStats.duplicateRowsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setListFilter('incomplete')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      listFilter === 'incomplete'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Incompletos ({duplicateStats.incompleteCount})
                  </button>

                  {duplicateStats.duplicateRowsCount > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoCleanDuplicates}
                      className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all cursor-pointer flex items-center gap-1"
                      title="Quedarse solo con los registros completos y unificados"
                    >
                      <Sparkles size={13} />
                      <span>Limpiar Duplicados</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table of current directory */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Nombre de la Farmacia</th>
                        <th className="p-3">Teléfono</th>
                        <th className="p-3">Ruta / Sector</th>
                        <th className="p-3 text-center">Estado de Campos</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">Cargando directorio de farmacias...</td>
                        </tr>
                      ) : filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            {listFilter === 'duplicates'
                              ? '✓ No se detectaron códigos duplicados en el directorio. Todos los códigos son únicos.'
                              : searchQuery 
                                ? 'No se encontraron coincidencias para la búsqueda.' 
                                : 'No hay farmacias cargadas en el directorio.'}
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((c, i) => {
                          const codeKey = c.code ? String(c.code).trim().toLowerCase() : '';
                          const isDup = codeKey && (duplicateStats.codeCounts[codeKey] > 1);
                          const comp = calculateClientCompleteness(c);

                          return (
                            <tr 
                              key={i} 
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                isDup ? 'bg-amber-50/80 dark:bg-amber-950/30 border-l-4 border-l-amber-500' : ''
                              }`}
                            >
                              <td className="p-3 text-center text-slate-400 font-mono">{i + 1}</td>
                              <td className="p-3 font-bold font-mono text-blue-600 dark:text-blue-400">
                                <div>{c.code || '—'}</div>
                                {isDup && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                                    ⚠️ Duplicado ({duplicateStats.codeCounts[codeKey]}x)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                                {c.name}
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{c.phone || '—'}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                                {c.sector || c.route ? (
                                  <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    <MapPin size={11} className="text-blue-500" />
                                    {c.sector || c.route}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="p-3 text-center">
                                {comp.isComplete ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    <CheckCircle2 size={11} /> Completo (4/4)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800" title={`Falta: ${comp.missingFields.join(', ')}`}>
                                    <AlertCircle size={11} /> Falta: {comp.missingFields.join(', ')}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(c)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                                    title="Editar datos del cliente (corregir error de ingreso)"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClient(c)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                                    title={isDup ? "Eliminar este registro duplicado específico" : "Eliminar del directorio"}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Flotante de Edición de Cliente */}
              {editingClient && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 sm:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <Pencil size={18} className="text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold">Editar Datos del Cliente</h4>
                          <p className="text-[11px] text-blue-200">
                            Corrige errores en código, nombre, teléfono o ruta asignada
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                        title="Cancelar edición"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Código de Cliente *
                        </label>
                        <input
                          type="text"
                          required
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          placeholder="Ej: 0014"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nombre de la Farmacia / Cliente *
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Ej: Farmacia Santa María"
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Teléfono
                          </label>
                          <div className="relative">
                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="Ej: 79512345"
                              className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Ruta o Sector
                          </label>
                          <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              list="edit-routes-options"
                              value={editRoute}
                              onChange={(e) => setEditRoute(e.target.value)}
                              placeholder="Ej: Salama #14"
                              className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <datalist id="edit-routes-options">
                              {ALL_ROUTES.map(r => (
                                <option key={r} value={r} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingEdit}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {savingEdit ? (
                            <>
                              <RefreshCw className="animate-spin" size={14} />
                              <span>Guardando cambios...</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Guardar Cambios</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: AGREGAR MANUAL */}
          {activeSubTab === 'manual' && (
            <form onSubmit={handleSaveManual} className="max-w-xl mx-auto space-y-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Agregar Cliente / Farmacia Individual
              </h4>
              <p className="text-xs text-slate-400">
                Se agregará al directorio permanente y estará disponible inmediatamente para todos los vendedores.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Código de Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ej: 0014"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Farmacia / Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ej: Farmacia Santa María"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="Ej: 79512345"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ruta o Sector
                  </label>
                  <input
                    type="text"
                    list="manual-routes-options"
                    value={manualRoute}
                    onChange={(e) => setManualRoute(e.target.value)}
                    placeholder="Ej: Salama #14"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <datalist id="manual-routes-options">
                    {ALL_ROUTES.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('list')}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingManual ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            * Los datos cargados se sincronizan en la nube y activan el autocompletado para todos los vendedores.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
