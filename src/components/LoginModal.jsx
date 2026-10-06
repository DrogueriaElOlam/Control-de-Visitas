import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, Eye, EyeOff, Building2, ChevronRight, CheckCircle2, Key, Sparkles } from 'lucide-react';
import { getVendorsList, authenticate, isOtpKeyFormat } from '../lib/db';

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

  const isCurrentPasswordOtp = isOtpKeyFormat(password);

  useEffect(() => {
    loadVendors();
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
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
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
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-sm">
                <ShieldCheck size={18} className="text-indigo-600 mr-2" />
                <span>Administrador General (Droguería El Olam)</span>
              </div>
            </div>
          )}

          {/* Password field */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {role === 'admin' ? 'Clave de Administrador o Clave 1 Solo Toque' : 'Contraseña o Clave 1 Solo Toque'}
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
                required
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
