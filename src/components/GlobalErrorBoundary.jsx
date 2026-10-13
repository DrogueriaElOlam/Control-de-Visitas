import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { clearSession } from '../lib/db';

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error no capturado en la aplicación Droguería El Olam:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      clearSession();
      localStorage.removeItem('olam_current_auth_v4_forced_logout');
      localStorage.removeItem('olam_current_auth_v2');
    } catch (_) {}
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={36} />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              Droguería El Olam
            </h2>
            <p className="text-sm text-slate-300 font-medium mb-6">
              Se ha prevenido una pantalla en blanco. La aplicación detectó un problema visual y se protegió la información.
            </p>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left mb-6 overflow-hidden">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                Detalle del Error:
              </p>
              <p className="text-xs text-rose-300 font-mono break-words">
                {this.state.error?.message || 'Error inesperado al renderizar el componente'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Recargar Aplicación</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                <LogOut size={16} />
                <span>Reiniciar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
