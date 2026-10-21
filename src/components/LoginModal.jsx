import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, Eye, EyeOff, Building2, ChevronRight, CheckCircle2, Key, Sparkles } from 'lucide-react';
import { 
  getVendorsList, 
  authenticate, 
  isOtpKeyFormat, 
  fetchOtpVaultFromCloud,
  fetchCloudActiveSessions,
  getActiveSessionForUser,
  subscribeToCloudSessions,
  saveSession
} from '../lib/db';

export default function LoginModal({ onLoginSuccess }) {
  const [role, setRole] = useState('vendor'); // 'vendor' or 'admin'
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [cloudSessions, setCloudSessions] = useState({});

  const isCurrentPasswordOtp = isOtpKeyFormat(password);

  useEffect(() => {
    loadVendors();
    // Descargar las claves OTP quemadas más recientes de Supabase para evitar desincronización
    fetchOtpVaultFromCloud().catch(() => {});

    // Cargar sesiones activas en la nube para continuidad entre celulares, tablets y computadoras
    fetchCloudActiveSessions().then((sessions) => {
      if (sessions && typeof sessions === 'object') {
        setCloudSessions(sessions);
      }
    }).catch(() => {});

    const unsubscribe = subscribeToCloudSessions((updated) => {
      if (updated) setCloudSessions(updated);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  async function loadVendors() {
    try {
      const list = await getVendorsList();
      const activeOnly = list.filter(v => v.active !== false);
      setVendors(activeOnly);
      if (activeOnly.length > 0) {
        setSelectedVendorId(activeOnly[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleVendorSelect = (e) => {
    setSelectedVendorId(e.target.value);
    setError('');
  };

  const currentSelectedVendor = vendors.find(v => String(v.id) === String(selectedVendorId));

  // Verificar si el usuario actualmente seleccionado tiene sesión activa en la nube
  const activeSessionForCurrent = role === 'admin' 
    ? getActiveSessionForUser('admin', cloudSessions)
    : (currentSelectedVendor ? getActiveSessionForUser(currentSelectedVendor.name, cloudSessions) : null);

  // Reanudar trabajo con un solo toque desde sesión activa en la nube
  const handleContinueCloudSession = (sess) => {
    if (!sess) return;
    setError('');
    setSuccessInfo(`¡Bienvenido de vuelta, ${sess.name}! Reanudando trabajo...`);
    setLoading(true);

    const fullSession = {
      role: sess.role || (role === 'admin' ? 'admin' : 'vendor'),
      vendorId: sess.vendorId || (currentSelectedVendor ? currentSelectedVendor.id : 1),
      name: sess.name,
      username: sess.username || sess.name,
      route: sess.route || (currentSelectedVendor ? currentSelectedVendor.route : 'Coban #13'),
      daily_goal: sess.daily_goal || 15,
      hire_date: sess.hire_date,
      loginMethod: 'cloud_device_continuity',
      loginTime: sess.time || new Date().toISOString()
    };

    saveSession(fullSession);

    setTimeout(() => {
      onLoginSuccess(fullSession);
    }, 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');
    setLoading(true);

    try {
      let targetUser = '';
      if (role === 'admin') {
        targetUser = 'admin';
      } else {
        targetUser = currentSelectedVendor ? currentSelectedVendor.name : usernameInput;
      }

      const res = await authenticate(role, targetUser, password);
      if (res.success) {
        if (res.isOtp) {
          setSuccessInfo(res.message || 'Clave de un solo toque verificada e invalidada.');
          setTimeout(() => {
            onLoginSuccess(res.session);
          }, 800);
        } else {
          onLoginSuccess(res.session);
        }
      } else {
        setError(res.message || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error al procesar el inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-md transition-all">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Droguería El Olam" 
              className="h-16 sm:h-20 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden h-16 w-16 items-center justify-center text-blue-900">
              <Building2 size={40} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">
            Droguería El Olam
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center mt-1">
            Plataforma de Control de Visitas & Rendimiento
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('vendor');
              setError('');
              setPassword('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all ${
              role === 'vendor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <User size={16} />
            <span>Vendedor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setError('');
              setPassword('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all ${
              role === 'admin'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Administrador</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {role === 'vendor' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Selecciona tu Nombre de Vendedor
              </label>
              <div className="relative">
                <select
                  value={selectedVendorId}
                  onChange={handleVendorSelect}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm appearance-none cursor-pointer"
                >
                  {vendors.map((v) => {
                    const hasActive = getActiveSessionForUser(v.name, cloudSessions);
                    return (
                      <option key={v.id} value={v.id}>
                        {hasActive ? `🟢 ${v.name} • Sesión Activa` : v.name}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <ChevronRight size={18} className="rotate-90" />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Usuario de Administrador
              </label>
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-600 shrink-0" />
                  <span>Administrador General (Droguería El Olam)</span>
                </div>
                {activeSessionForCurrent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sesión Activa
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tarjeta de Continuidad de Sesión Multi-Dispositivo (Si hay sesión activa en la nube) */}
          {activeSessionForCurrent && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-emerald-900/40 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl shadow-emerald-500/10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
                  <Sparkles size={20} className="animate-spin-slow" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Sesión Activa en la Nube
                    </h4>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                    {activeSessionForCurrent.name}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                    Sesión iniciada en: <span className="font-semibold text-slate-900 dark:text-white">{activeSessionForCurrent.device || 'Dispositivo en campo'}</span> a las {activeSessionForCurrent.time || 'hoy'}.
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-emerald-200 dark:border-emerald-800/60 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleContinueCloudSession(activeSessionForCurrent)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={18} />
                  <span>⚡ CONTINUAR TRABAJO AQUÍ (SIN CLAVE)</span>
                </button>
                <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-medium">
                  Reanuda exactamente donde te quedaste en tu celular, tablet o computadora.
                </p>
              </div>
            </div>
          )}

          {/* Password field */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {activeSessionForCurrent 
                  ? 'O Ingresar con Nueva Contraseña / Clave'
                  : (role === 'admin' ? 'Clave de Administrador o Clave 1 Solo Toque' : 'Contraseña o Clave 1 Solo Toque')}
              </label>
              {isCurrentPasswordOtp && (
                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                  <Key size={11} />
                  1 Solo Uso
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {isCurrentPasswordOtp ? <Key size={18} className="text-amber-500" /> : <Lock size={18} />}
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={role === 'admin' ? 'Contraseña o clave OLAM-XXXX-XXXX' : 'Contraseña o clave OLAM-XXXX-XXXX'}
                className={`w-full bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white rounded-xl pl-10 pr-12 py-3 focus:ring-2 focus:outline-none text-sm font-medium transition-all ${
                  isCurrentPasswordOtp 
                    ? 'border-amber-400 dark:border-amber-500/50 focus:ring-amber-500 bg-amber-50/20' 
                    : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                }`}
                required={!activeSessionForCurrent}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {isCurrentPasswordOtp ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                <span>⚡</span>
                <span>Clave de un solo toque detectada. Al iniciar sesión quedará <strong>quemada/invalidada</strong> de inmediato.</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1.5">
                {role === 'admin' 
                  ? 'Puedes ingresar con la clave de administrador o con cualquiera de las 50 claves de un solo toque.' 
                  : 'Puedes ingresar con tu contraseña personal o con una clave de un solo toque.'}
              </p>
            )}
          </div>

          {/* Success info notice */}
          {successInfo && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
              role === 'admin'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-600/30'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-600/30'
            }`}
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            🔒 Acceso restringido y cifrado • Droguería El Olam 2026
          </p>
        </div>
      </div>
    </div>
  );
}
