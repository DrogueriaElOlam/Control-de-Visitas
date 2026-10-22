import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  CloudRain, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Sliders, 
  ShieldCheck, 
  Zap,
  RotateCcw,
  Save,
  Check,
  KeyRound,
  HeartPulse
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  resetSupabaseConfig, 
  checkSupabaseHealth,
  getSupabaseManagementToken,
  saveSupabaseManagementToken,
  restoreSupabaseProjectViaApi
} from '../lib/supabase';

export default function AdminSupabaseStatusModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [checking, setChecking] = useState(false);
  const [restoringApi, setRestoringApi] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const [health, setHealth] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editPat, setEditPat] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Ejecutar verificación de estado al abrir el modal
  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await checkSupabaseHealth();
      setHealth(res);
    } catch (e) {
      setHealth({
        ok: false,
        status: 'error',
        message: 'No se pudo contactar al servidor de Supabase.',
        latencyMs: 0,
        projectId: config.projectId,
        url: config.url
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setConfig(cfg);
      setEditUrl(cfg.url);
      setEditKey(cfg.anonKey);
      setEditPat(getSupabaseManagementToken());
      setRestoreResult(null);
      runHealthCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const dashboardUrl = `https://supabase.com/dashboard/project/${config.projectId}`;

  const handleOpenDashboard = () => {
    window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRestoreViaApi = async () => {
    setRestoringApi(true);
    setRestoreResult(null);
    try {
      const res = await restoreSupabaseProjectViaApi();
      if (res.ok) {
        setRestoreResult({ ok: true, message: res.message });
        setTimeout(() => runHealthCheck(), 4000);
      } else {
        setRestoreResult({ ok: false, message: res.error || 'No se pudo reanudar vía API.' });
      }
    } catch (e) {
      setRestoreResult({ ok: false, message: e.message || 'Error de conexión con la API de Supabase.' });
    } finally {
      setRestoringApi(false);
    }
  };

  const handleSaveCustom = (e) => {
    e.preventDefault();
    if (!editUrl.trim() || !editKey.trim()) return;
    saveSupabaseConfig(editUrl.trim(), editKey.trim());
    saveSupabaseManagementToken(editPat.trim());
    const updated = getSupabaseConfig();
    setConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      window.location.reload();
    }, 1200);
  };

  const handleResetDefault = () => {
    if (window.confirm('¿Deseas restaurar la conexión oficial por defecto a Droguería El Olam?')) {
      resetSupabaseConfig();
      const updated = getSupabaseConfig();
      setConfig(updated);
      setEditUrl(updated.url);
      setEditKey(updated.anonKey);
      setEditPat('');
      saveSupabaseManagementToken('');
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        window.location.reload();
      }, 1000);
    }
  };

  const isOnline = health?.ok === true;
  const hasPatToken = !!getSupabaseManagementToken();

  return (
    <div className="fixed inset-0 z-[9995] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-emerald-800/60 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <Cloud className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Estado de la Nube / Supabase
                </h2>
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Control Admin
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Monitoreo en Vivo • Reanudación Inmediata • Auto-KeepAlive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-600 active:scale-95 text-white transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Tarjeta de Estado en Vivo */}
          <div className={`p-5 rounded-2xl border-2 transition-all shadow-md ${
            checking
              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600'
              : isOnline
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-600'
              : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  checking
                    ? 'bg-blue-600 text-white animate-spin'
                    : isOnline
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white animate-pulse'
                }`}>
                  {checking ? (
                    <RefreshCw className="w-6 h-6" />
                  ) : isOnline ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <CloudRain className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Estado del Servidor:
                    </span>
                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
                      checking
                        ? 'bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200'
                        : isOnline
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-rose-600 text-white shadow-sm'
                    }`}>
                      {checking ? 'Comprobando...' : isOnline ? '🟢 En Línea y Conectado' : '🔴 Proyecto en Pausa / Inactivo'}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {checking
                      ? 'Contactando la base de datos de Supabase en tiempo real...'
                      : health?.message || 'Estado consultado correctamente.'}
                  </p>

                  {health?.latencyMs !== undefined && !checking && (
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>⚡ Latencia: <strong className="text-slate-800 dark:text-slate-200 font-mono">{health.latencyMs} ms</strong></span>
                      <span>•</span>
                      <span>Proyecto: <strong className="text-slate-800 dark:text-slate-200 font-mono">{config.projectId}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de Comprobar Conexión */}
              <button
                type="button"
                onClick={runHealthCheck}
                disabled={checking}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Probando...' : 'Comprobar Ahora'}</span>
              </button>
            </div>
          </div>

          {/* Tarjeta Informativa: Sistema Auto-KeepAlive */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-400/40 rounded-2xl flex items-start gap-3">
            <HeartPulse className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="text-emerald-800 dark:text-emerald-300">Protección Anti-Pausa Activa:</strong> Supabase solo se pausa si pasan 7 días continuos sin que nadie use el sistema. Cada vez que tú o tus vendedores entran a la app, se envía un latido silencioso que reinicia el contador de Supabase a cero. ¡Mientras trabajen normalmente, nunca se pausará!
            </div>
          </div>

          {/* Opciones de Reanudación */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 dark:from-amber-950/40 dark:via-amber-950/30 dark:to-orange-950/40 border-2 border-amber-400/80 dark:border-amber-600/80 p-5 rounded-2xl space-y-3.5 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Zap className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950 dark:text-amber-200">
                  Reanudación en 1 Clic (Si alguna vez se pausa)
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Si tras vacaciones o días festivos el servidor entra en pausa, reactívalo al instante:
                </p>
              </div>
            </div>

            {/* Si tiene Token configurado, ofrece reanudación 100% autónoma en segundo plano */}
            {hasPatToken && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRestoreViaApi}
                  disabled={restoringApi}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${restoringApi ? 'animate-spin' : ''}`} />
                  <span>{restoringApi ? 'Reanudando servidor vía API...' : '⚡ Reanudar Inmediatamente Vía API (Sin salir de aquí)'}</span>
                </button>

                {restoreResult && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    restoreResult.ok 
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-400' 
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-400'
                  }`}>
                    {restoreResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{restoreResult.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* Botón para abrir la consola oficial en Supabase */}
            <button
              type="button"
              onClick={handleOpenDashboard}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>⚡ Abrir Consola de Supabase & Reanudar Proyecto</span>
            </button>
          </div>

          {/* Desplegable de Configuración Avanzada */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/40">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                <span>⚙️ Configuración de Credenciales & Token de Reanudación Autónoma</span>
              </div>
              <span className="text-[11px] text-blue-600 dark:text-blue-400">
                {showConfig ? 'Ocultar ▲' : 'Configurar Token / URL ▼'}
              </span>
            </button>

            {showConfig && (
              <form onSubmit={handleSaveCustom} className="p-4 sm:p-5 space-y-4 border-t border-slate-200 dark:border-slate-700/60">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>Personal Access Token de Supabase (Para reanudación 100% autónoma)</span>
                    </label>
                    <a
                      href="https://supabase.com/dashboard/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      <span>Generar en Supabase</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={editPat}
                    onChange={(e) => setEditPat(e.target.value)}
                    placeholder="sbp_xxxxxxxxxxxxxxxxxxxx (Opcional)"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Con este token, el sistema podrá despertar tu base de datos automáticamente en segundo plano sin pedirte abrir la web de Supabase.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://xxxxxxxx.supabase.co"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supabase Anon Public Key
                  </label>
                  <textarea
                    rows={2}
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Oficial El Olam</span>
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                    <span>{savedSuccess ? '¡Guardado! Recargando...' : 'Guardar y Reconectar'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Pie */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Droguería El Olam • Base de Datos Segura</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
