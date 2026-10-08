import React from 'react';
import { X, Settings } from 'lucide-react';
import SupervisionControlPanel from './SupervisionControlPanel';

export default function AjustesSistemaModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 sm:px-7 py-4 shrink-0 flex items-center justify-between border-b border-blue-800/60 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/20">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm">
                Ajustes del Sistema
              </h2>
              <p className="text-xs text-blue-200">
                Configuración Administrativa • Vendedores, Equipos, Metas y Puntos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-600 active:scale-95 text-white transition-all cursor-pointer"
            title="Cerrar ajustes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
          <SupervisionControlPanel />
        </div>

      </div>
    </div>
  );
}
