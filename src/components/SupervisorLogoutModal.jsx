import React, { useState } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, AlertCircle, X, CheckCircle2, KeyRound } from 'lucide-react';
import { verifyAndConsumeLogoutOtpKey, isLogoutOtpKeyFormat } from '../lib/security';

const SUPERVISOR_LOGOUT_PASSWORD = '0l@m_2025$';

export default function SupervisorLogoutModal({ isOpen, onClose, onConfirmLogout, vendorName }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = password.trim();

    // 1. Clave de un solo toque para cierre de sesión (OLAM-OUT-XXXX-XXXX)
    if (isLogoutOtpKeyFormat(clean)) {
      const otpRes = verifyAndConsumeLogoutOtpKey(clean, { name: vendorName, role: 'supervisor_logout' });
      if (otpRes.valid) {
        setErrorMsg('');
        setPassword('');
        onConfirmLogout();
        return;
      } else {
        setErrorMsg(otpRes.message);
        return;
      }
    }

    // 2. Contraseña fija de supervisor
    if (clean === SUPERVISOR_LOGOUT_PASSWORD) {
      setErrorMsg('');
      setPassword('');
      onConfirmLogout();
    } else {
      setErrorMsg('Contraseña o clave de un solo toque incorrecta. Se requiere autorización de un supervisor para cerrar la sesión.');
    }
  };

  const handleCancel = () => {
    setPassword('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Glow de acento superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600" />

        {/* Botón cerrar */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header con icono de candado de seguridad */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-md">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              Bloqueo de Seguridad
            </h3>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Autorización de Supervisor Requerida
            </p>
          </div>
        </div>

        {/* Mensaje descriptivo */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/70 mb-4 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
          <p className="font-semibold">
            {vendorName && <span className="font-black text-slate-900 dark:text-white">{vendorName}: </span>}
            Para proteger el monitoreo laboral, solo un supervisor puede autorizar la salida.
          </p>
        </div>

        {/* Formulario con campo de contraseña */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Contraseña de Supervisor o Clave de Cierre (OTP):
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Contraseña o clave OLAM-OUT-XXXX-XXXX..."
                className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Mensaje de error si la contraseña no coincide */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold animate-in shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancelar y Seguir Activo
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Autorizar Salida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
