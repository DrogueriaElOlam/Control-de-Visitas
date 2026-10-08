import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  Key, 
  Trash2, 
  UserX, 
  CheckCircle, 
  RotateCcw, 
  Search, 
  Edit3, 
  Lock, 
  Calendar, 
  MapPin, 
  Target, 
  Phone,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Download,
  Copy,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  getVendorsList, 
  createVendor, 
  terminateVendor, 
  reactivateVendor, 
  deleteVendorPermanently, 
  updateVendorCredentials,
  getAdminPassword,
  setAdminPassword,
  getOtpKeysVault,
  getOtpKeysStats,
  verifyPassword,
  ALL_ROUTES 
} from '../lib/db';
import { getLocalDateString } from '../lib/dateUtils';

export default function AdminVendorManagement({ 
  onVendorUpdated,
  onlineVendors = {}
}) {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpKeysList, setOtpKeysList] = useState([]);
  const [otpSearch, setOtpSearch] = useState('');
  const [otpFilter, setOtpFilter] = useState('all'); // all, available, used
  const [copiedKey, setCopiedKey] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);

  // New vendor form
  const [newVendorData, setNewVendorData] = useState({
    name: '',
    username: '',
    password: '',
    route: '',
    daily_goal: '',
    phone: '',
    hire_date: getLocalDateString()
  });

  // Edit vendor form
  const [editFormData, setEditFormData] = useState({
    name: '',
    password: '',
    route: '',
    daily_goal: ''
  });

  // Admin password change form
  const [adminPassData, setAdminPassData] = useState({
    currentPass: '',
    newPass: '',
    confirmPass: ''
  });

  // Revealed passwords state map
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    setLoading(true);
    try {
      const list = await getVendorsList();
      setVendors(list);
      setOtpKeysList(getOtpKeysVault());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
    showNotification(`Clave "${key}" copiada al portapapeles.`);
  };

  const handleDownloadExcelClaves = () => {
    try {
      // 1. Intentar enlace directo si el archivo existe en public
      const link = document.createElement('a');
      link.href = '/claves 2.0.xlsx';
      link.download = 'claves 2.0.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Descargando archivo "claves 2.0.xlsx"...');
    } catch (e) {
      // Fallback con XLSX
      const vault = getOtpKeysVault();
      const rows = vault.map(k => ({
        'No.': k.id,
        'Clave de Un Solo Toque (OTP)': k.key,
        'Tipo': 'Acceso Desechable (1 Solo Uso)',
        'Estado': k.used ? 'QUEMADA / USADA' : 'DISPONIBLE',
        'Usada Por': k.usedBy || '-',
        'Fecha de Uso': k.usedAt || '-',
        'Instrucciones': 'Válida para 1 solo inicio de sesión. Queda invalidada permanentemente al ingresar.'
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Claves 2.0');
      XLSX.writeFile(wb, 'claves 2.0.xlsx');
      showNotification('Archivo "claves 2.0.xlsx" generado y descargado.');
    }
  };

  function showNotification(msg, isError = false) {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  }

  const togglePasswordVisibility = (id) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // CREATE VENDOR
  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!newVendorData.name.trim()) {
      showNotification('Ingrese el nombre del vendedor', true);
      return;
    }

    try {
      await createVendor({
        ...newVendorData,
        route: newVendorData.route || '',
        daily_goal: newVendorData.daily_goal ? Number(newVendorData.daily_goal) : 0
      });
      showNotification(`Vendedor "${newVendorData.name}" creado con éxito.`);
      setShowCreateModal(false);
      setNewVendorData({
        name: '',
        username: '',
        password: '',
        route: '',
        daily_goal: '',
        phone: '',
        hire_date: getLocalDateString()
      });
      loadVendors();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err) {
      showNotification('Error al crear vendedor', true);
    }
  };

  // TERMINATE VENDOR (BAJA LABORAL)
  const handleTerminateVendor = async (vendor) => {
    const confirm = window.confirm(
      `¿Confirmas dar de baja laboral a "${vendor.name}"?\n\n` +
      `Se registrará la fecha de terminación laboral y ya no podrá ingresar con su clave, pero su base de datos histórica y visitas se conservarán intactas para análisis de frecuencia y desempeño.`
    );
    if (!confirm) return;

    try {
      const termDate = getLocalDateString();
      await terminateVendor(vendor.id, termDate);
      showNotification(`"${vendor.name}" ha sido dado de baja con fecha ${termDate}.`);
      loadVendors();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err) {
      showNotification('Error al dar de baja al vendedor', true);
    }
  };

  // REACTIVATE VENDOR
  const handleReactivateVendor = async (vendor) => {
    try {
      await reactivateVendor(vendor.id);
      showNotification(`"${vendor.name}" ha sido reactivado en el equipo.`);
      loadVendors();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err) {
      showNotification('Error al reactivar vendedor', true);
    }
  };

  // HARD DELETE VENDOR
  const handleDeletePermanently = async (vendor) => {
    const confirm = window.confirm(
      `⚠️ ATENCIÓN: ¿Estás seguro de eliminar PERMANENTEMENTE al vendedor "${vendor.name}"?\n\n` +
      `Esta acción borrará sus credenciales de la base de datos de vendedores.`
    );
    if (!confirm) return;

    try {
      await deleteVendorPermanently(vendor.id);
      showNotification(`Vendedor "${vendor.name}" eliminado de la base de datos.`);
      loadVendors();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err) {
      showNotification('Error al eliminar vendedor', true);
    }
  };

  // OPEN EDIT MODAL
  const openEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setEditFormData({
      name: vendor.name,
      password: vendor.password?.length === 64 ? '' : (vendor.password || ''),
      route: vendor.route || '',
      daily_goal: vendor.daily_goal !== undefined && vendor.daily_goal !== null ? vendor.daily_goal : ''
    });
    setShowEditModal(true);
  };

  // SAVE EDITED VENDOR
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedVendor) return;

    try {
      await updateVendorCredentials(selectedVendor.id, {
        ...editFormData,
        route: editFormData.route || '',
        daily_goal: editFormData.daily_goal !== '' ? Number(editFormData.daily_goal) : 0
      });
      showNotification(`Datos y contraseña de "${editFormData.name}" actualizados.`);
      setShowEditModal(false);
      loadVendors();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err) {
      showNotification('Error al actualizar datos del vendedor', true);
    }
  };

  // CHANGE ADMIN PASSWORD
  const handleChangeAdminPassword = (e) => {
    e.preventDefault();
    const current = getAdminPassword();
    if (!verifyPassword(adminPassData.currentPass, current, 'admin')) {
      showNotification('La clave actual de administrador es incorrecta', true);
      return;
    }
    if (adminPassData.newPass.length < 5) {
      showNotification('La nueva clave debe tener al menos 5 caracteres', true);
      return;
    }
    if (adminPassData.newPass !== adminPassData.confirmPass) {
      showNotification('La confirmación de clave no coincide', true);
      return;
    }

    setAdminPassword(adminPassData.newPass);
    showNotification('Clave de administrador actualizada con éxito.');
    setShowAdminPassModal(false);
    setAdminPassData({ currentPass: '', newPass: '', confirmPass: '' });
  };

  // Helper para verificar presencia en tiempo real
  const isVendorOnline = (vendor) => {
    if (!onlineVendors) return false;
    return !!(
      onlineVendors[vendor.name] || 
      onlineVendors[vendor.id] || 
      onlineVendors[String(vendor.id)] || 
      onlineVendors[`User_${vendor.id}`]
    );
  };

  // Filtered list
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          (v.route && v.route.toLowerCase().includes(search.toLowerCase())) ||
                          (v.username && v.username.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus === 'online') return matchesSearch && isVendorOnline(v);
    if (filterStatus === 'active') return matchesSearch && v.active !== false;
    if (filterStatus === 'inactive') return matchesSearch && v.active === false;
    return matchesSearch;
  });

  const activeCount = vendors.filter(v => v.active !== false).length;
  const inactiveCount = vendors.filter(v => v.active === false).length;
  const onlineCount = vendors.filter(v => v.active !== false && isVendorOnline(v)).length;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="text-blue-600 dark:text-blue-400" />
            Gestión de Vendedores & Base de Datos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administra altas, claves individuales, rutas y bajas laborales con conservación histórica de visitas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón Bóveda Claves 2.0 (OTP) */}
          <button
            onClick={() => {
              setOtpKeysList(getOtpKeysVault());
              setShowOtpModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs sm:text-sm transition-all shadow-sm"
          >
            <Key size={16} className="text-amber-500" />
            <span>Claves 2.0 (OTP)</span>
            <span className="bg-amber-500 text-white text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              50
            </span>
          </button>

          <button
            onClick={() => setShowAdminPassModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all"
          >
            <ShieldCheck size={16} />
            <span>Clave Admin</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <UserPlus size={18} />
            <span>Nuevo Vendedor</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <Check size={18} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <AlertTriangle size={18} className="text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Vendedores Registrados</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{vendors.length}</div>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-500">Vendedores Activos en Ruta</span>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-xl">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-500">Dados de Baja (Histórico)</span>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{inactiveCount}</div>
          </div>
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 rounded-xl">
            <UserX size={24} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o ruta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'all' 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Todos ({vendors.length})
          </button>
          <button
            onClick={() => setFilterStatus('online')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterStatus === 'online' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>En línea ({onlineCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'active' 
                ? 'bg-blue-600 text-white shadow' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Activos ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'inactive' 
                ? 'bg-amber-600 text-white shadow' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            De Baja ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-6">Vendedor & Usuario</th>
                <th className="py-4 px-4">Estado</th>
                <th className="py-4 px-4">Ruta Asignada</th>
                <th className="py-4 px-4">Fecha de Ingreso</th>
                <th className="py-4 px-4">Clave Asignada</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No se encontraron vendedores con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const isTerminated = vendor.active === false;
                  const isPasswordVisible = !!revealedPasswords[vendor.id];

                  return (
                    <tr 
                      key={vendor.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors ${
                        isTerminated ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Name & username */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isTerminated 
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' 
                              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          }`}>
                            {vendor.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                              <span>{vendor.name}</span>
                              {isVendorOnline(vendor) ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 shadow-sm animate-pulse" title="Vendedor activo y conectado en este momento">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span>EN LÍNEA</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400" title="Desconectado">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                  <span>Desconectado</span>
                                </span>
                              )}
                              {isTerminated && (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold">
                                  Baja Laboral
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              Usuario: @{vendor.username || 'sin_usuario'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isTerminated ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            <UserX size={13} />
                            <span>Baja ({vendor.termination_date || 'Inactivo'})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle size={13} />
                            <span>Activo</span>
                          </div>
                        )}
                      </td>

                      {/* Route */}
                      <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={15} className="text-blue-500" />
                          <span>{vendor.route || 'Sin Ruta'}</span>
                        </div>
                      </td>

                      {/* Hire Date */}
                      <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          <span>{vendor.hire_date || '2025-12-05'}</span>
                        </div>
                      </td>

                      {/* Password */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                            {isPasswordVisible 
                              ? (vendor.password?.length === 64 ? '🔒 Cifrado SHA-256' : (vendor.password || 'Protegida')) 
                              : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(vendor.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title={isPasswordVisible ? 'Ocultar' : 'Ver clave'}
                          >
                            {isPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit / Change Pass */}
                          <button
                            onClick={() => openEditModal(vendor)}
                            className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 transition-colors"
                            title="Editar datos y cambiar contraseña"
                          >
                            <Edit3 size={16} />
                          </button>

                          {/* Terminate or Reactivate */}
                          {isTerminated ? (
                            <button
                              onClick={() => handleReactivateVendor(vendor)}
                              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-300 transition-colors"
                              title="Reactivar vendedor en equipo"
                            >
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTerminateVendor(vendor)}
                              className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-300 transition-colors"
                              title="Dar de baja laboral (conserva su historial)"
                            >
                              <UserX size={16} />
                            </button>
                          )}

                          {/* Hard Delete */}
                          <button
                            onClick={() => handleDeletePermanently(vendor)}
                            className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 transition-colors"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 size={16} />
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

      {/* CREATE VENDOR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <UserPlus className="text-blue-600" />
              Alta de Nuevo Vendedor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Crea su cuenta y asígnale su clave personal para el registro de visitas en campo.
            </p>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Completo del Vendedor *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Alberto Morales"
                  value={newVendorData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoUser = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
                    setNewVendorData(prev => ({
                      ...prev,
                      name: val,
                      username: prev.username ? prev.username : autoUser
                    }));
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    placeholder="carlosm"
                    value={newVendorData.username}
                    onChange={(e) => setNewVendorData({ ...newVendorData, username: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Contraseña Asignada *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: olam2026"
                    value={newVendorData.password}
                    onChange={(e) => setNewVendorData({ ...newVendorData, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Ruta Asignada (Opcional)
                  </label>
                  <select
                    value={newVendorData.route}
                    onChange={(e) => setNewVendorData({ ...newVendorData, route: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  >
                    <option value="">(Sin ruta asignada / Opcional)</option>
                    {ALL_ROUTES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    value={newVendorData.hire_date}
                    onChange={(e) => setNewVendorData({ ...newVendorData, hire_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Meta Diaria de Visitas (Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Opcional"
                    value={newVendorData.daily_goal}
                    onChange={(e) => setNewVendorData({ ...newVendorData, daily_goal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 5555-1234"
                    value={newVendorData.phone}
                    onChange={(e) => setNewVendorData({ ...newVendorData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
                >
                  Guardar Vendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VENDOR / CHANGE PASSWORD MODAL */}
      {showEditModal && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Key className="text-indigo-600" />
              Editar Vendedor & Contraseña
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Actualizar credenciales de acceso para {selectedVendor.name}.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Vendedor
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nueva Contraseña de Acceso
                </label>
                <input
                  type="text"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Ruta Asignada (Opcional)
                </label>
                <select
                  value={editFormData.route || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, route: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                >
                  <option value="">(Sin ruta asignada / Opcional)</option>
                  {ALL_ROUTES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Meta Diaria de Visitas (Opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Opcional"
                  value={editFormData.daily_goal !== undefined && editFormData.daily_goal !== null ? editFormData.daily_goal : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, daily_goal: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ADMIN PASSWORD MODAL */}
      {showAdminPassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <ShieldAlert className="text-amber-500" />
              Cambiar Clave de Administrador
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Esta clave protege el acceso a la gestión de personal, reportes y configuración.
            </p>

            <form onSubmit={handleChangeAdminPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Clave Actual de Administrador
                </label>
                <input
                  type="password"
                  placeholder="Ingrese clave actual"
                  value={adminPassData.currentPass}
                  onChange={(e) => setAdminPassData({ ...adminPassData, currentPass: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nueva Clave
                </label>
                <input
                  type="password"
                  placeholder="Mínimo 5 caracteres"
                  value={adminPassData.newPass}
                  onChange={(e) => setAdminPassData({ ...adminPassData, newPass: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Confirmar Nueva Clave
                </label>
                <input
                  type="password"
                  placeholder="Repita la nueva clave"
                  value={adminPassData.confirmPass}
                  onChange={(e) => setAdminPassData({ ...adminPassData, confirmPass: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAdminPassModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition-all"
                >
                  Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BÓVEDA DE CLAVES 2.0 (OTP - UN SOLO TOQUE) MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
                  <Key size={26} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Bóveda de Claves 2.0 (OTP)</span>
                    <span className="text-[11px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      1 Solo Uso
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    50 claves desechables criptográficas. Una vez logueados quedan <strong>quemadas/invalidadas</strong> de inmediato.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleDownloadExcelClaves}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all"
                  title="Descargar archivo Excel oficial"
                >
                  <FileSpreadsheet size={16} />
                  <span>Descargar "claves 2.0.xlsx"</span>
                  <Download size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* KPI Cards for OTP Vault */}
            {(() => {
              const stats = getOtpKeysStats();
              return (
                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Generadas</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
                  </div>
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 sm:p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Disponibles</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.available}</div>
                  </div>
                  <div className="bg-red-50/60 dark:bg-red-950/30 p-3 sm:p-4 rounded-2xl border border-red-200/60 dark:border-red-800/60">
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Quemadas / Usadas</span>
                    <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">{stats.used}</div>
                  </div>
                </div>
              );
            })()}

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar clave o usuario..."
                  value={otpSearch}
                  onChange={(e) => setOtpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOtpFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    otpFilter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Todas (50)
                </button>
                <button
                  type="button"
                  onClick={() => setOtpFilter('available')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    otpFilter === 'available' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Disponibles
                </button>
                <button
                  type="button"
                  onClick={() => setOtpFilter('used')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    otpFilter === 'used' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Quemadas
                </button>
              </div>
            </div>

            {/* Keys Table Container */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">No.</th>
                    <th className="py-2.5 px-3">Clave de 1 Solo Toque</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3">Usada Por</th>
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {otpKeysList
                    .filter((k) => {
                      if (otpFilter === 'available') return !k.used;
                      if (otpFilter === 'used') return k.used;
                      return true;
                    })
                    .filter((k) => {
                      if (!otpSearch) return true;
                      const q = otpSearch.toLowerCase();
                      return k.key.toLowerCase().includes(q) || (k.usedBy && k.usedBy.toLowerCase().includes(q));
                    })
                    .map((item) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          item.used ? 'opacity-65 bg-slate-50/40 dark:bg-slate-900/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                          #{item.id}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-mono font-extrabold tracking-wider px-2 py-0.5 rounded-lg border text-xs sm:text-sm ${
                            item.used 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through' 
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          }`}>
                            {item.key}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.used ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                              ⛔ QUEMADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ✓ DISPONIBLE
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {item.usedBy ? (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {item.usedBy}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-500">
                          {item.usedAt || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyKey(item.key)}
                            disabled={item.used}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto ${
                              copiedKey === item.key
                                ? 'bg-emerald-600 text-white'
                                : item.used
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <Copy size={12} />
                            <span>{copiedKey === item.key ? 'Copiada' : 'Copiar'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer / Instructions */}
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Protección de sesión activa: ninguna clave de un solo toque puede usarse dos veces.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                Cerrar Bóveda
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
