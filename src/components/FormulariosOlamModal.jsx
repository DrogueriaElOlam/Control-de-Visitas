import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Plane, 
  DollarSign, 
  Receipt, 
  Image, 
  ShieldCheck, 
  UserCheck, 
  ExternalLink,
  ChevronRight,
  Maximize2,
  Shield
} from 'lucide-react';
import { isSuperUser } from '../lib/formsPermissions';

// Formularios
import { CentralSupervisionView } from './CentralSupervisionModal';
import AperturaCodigoForm from './AperturaCodigoForm';
import SolicitudViaticosForm from './SolicitudViaticosForm';
import LiquidacionViaticosForm from './LiquidacionViaticosForm';
import LiquidacionRecibosForm from './LiquidacionRecibosForm';
import PlantillaBoletas from './PlantillaBoletas';

class FormsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error en Formulario:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-3xl text-center max-w-xl mx-auto my-12 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-xl font-black">
            ✕
          </div>
          <h3 className="text-base font-black text-red-800 dark:text-red-200 mb-2">
            No se pudo cargar este formulario
          </h3>
          <p className="text-xs text-red-600 dark:text-red-300 mb-4 font-mono">
            {this.state.error?.message || "Ocurrió un error inesperado al procesar la información."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-md cursor-pointer active:scale-95 transition-all"
          >
            Reintentar Carga
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function FormulariosOlamModal({ isOpen, onClose, currentUser }) {
  const isSuper = isSuperUser(currentUser);
  const isAdmin = currentUser?.role === 'admin' || isSuper;
  const [activeForm, setActiveForm] = useState(isAdmin ? 'supervision-central' : 'apertura');

  // Asegurar que si un vendedor abre el modal, nunca quede en 'supervision-central'
  useEffect(() => {
    if (!isAdmin && activeForm === 'supervision-central') {
      setActiveForm('apertura');
    }
  }, [isAdmin, activeForm]);

  if (!isOpen) return null;

  const formsList = [
    ...(isAdmin ? [{
      id: 'supervision-central',
      name: 'Panel Central de Supervisión',
      shortName: 'Panel Supervisión',
      desc: 'Compromisos de venta diaria, metas, gráficas de ventas y cobros en vivo',
      icon: Shield,
      color: 'from-purple-700 to-indigo-700',
      activeColor: 'bg-purple-700 text-white shadow-purple-500/30'
    }] : []),
    {
      id: 'apertura',
      name: 'Apertura de Código',
      shortName: 'Apertura Código',
      desc: 'Formulario oficial para dar de alta nuevos clientes y farmacias',
      icon: FileText,
      color: 'from-blue-600 to-indigo-600',
      activeColor: 'bg-blue-600 text-white shadow-blue-500/30'
    },
    {
      id: 'viaticos',
      name: 'Solicitud de Viáticos',
      shortName: 'Sol. Viáticos',
      desc: 'Requerimiento de anticipo y presupuesto de gira por ruta',
      icon: Plane,
      color: 'from-purple-600 to-indigo-600',
      activeColor: 'bg-purple-600 text-white shadow-purple-500/30'
    },
    {
      id: 'liquidacion-viaticos',
      name: 'Liquidación de Viáticos',
      shortName: 'Liq. Viáticos',
      desc: 'Detalle de gastos incurridos (combustible, hotel, alimentación)',
      icon: DollarSign,
      color: 'from-amber-600 to-orange-600',
      activeColor: 'bg-amber-600 text-white shadow-amber-500/30'
    },
    {
      id: 'liquidacion-recibos',
      name: 'Liquidación de Recibos',
      shortName: 'Liq. Recibos',
      desc: 'Control semanal de recibos de caja, cheques y cobros en efectivo',
      icon: Receipt,
      color: 'from-rose-600 to-red-600',
      activeColor: 'bg-rose-600 text-white shadow-rose-500/30'
    },
    {
      id: 'plantilla-boletas',
      name: 'Plantilla Boletas',
      shortName: 'Plantilla Boletas',
      desc: 'Gestión y exportación de imágenes de boletas y depósitos bancarios',
      icon: Image,
      color: 'from-emerald-600 to-teal-600',
      activeColor: 'bg-emerald-600 text-white shadow-emerald-500/30'
    }
  ];

  const handleOpenInNewWindow = () => {
    // Abrir ventana emergente enfocada
    const w = window.open(
      window.location.origin + '?modal_forms=' + activeForm,
      '_blank',
      'width=1200,height=850,scrollbars=yes,resizable=yes'
    );
    if (w) w.focus();
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* TOP BAR / HEADER EMPRESARIAL */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white px-4 sm:px-6 py-3.5 shrink-0 flex items-center justify-between border-b border-blue-800/60 shadow-lg">
          
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl shadow-md flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="Droguería El Olam" 
                className="h-8 sm:h-9 w-auto object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo.jpg';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-white drop-shadow-sm">
                  Formularios Droguería El Olam
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-900 shadow">
                  Oficial
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-200 hidden xs:block">
                Aperturas de Código • Solicitudes & Liquidaciones de Viáticos • Recibos de Caja • Boletas
              </p>
            </div>
          </div>

          {/* Estado de Usuario & Botones de Control */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Pill de Permisos / Usuario */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
              isSuper
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
            }`}>
              {isSuper ? <ShieldCheck size={14} className="text-amber-400" /> : <UserCheck size={14} className="text-emerald-400" />}
              <span>{currentUser?.name || 'Usuario'}</span>
              <span className="opacity-70 text-[10px]">
                {isSuper ? '(Acceso Maestro • Todas las rutas)' : '(Acceso Personal)'}
              </span>
            </div>

            {/* Abrir en ventana independiente */}
            <button
              type="button"
              onClick={handleOpenInNewWindow}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Abrir en ventana emergente separada"
            >
              <ExternalLink size={14} />
              <span>Ventana externa</span>
            </button>

            {/* Cerrar Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-red-600 active:scale-95 text-white transition-all cursor-pointer shadow-sm"
              title="Cerrar ventana de Formularios"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS (TABS) */}
        <div className="bg-white dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 px-3 sm:px-6 py-2.5 shrink-0 overflow-x-auto scrollbar-none shadow-xs">
          <div className="flex items-center gap-2 min-w-max">
            {formsList.map((form) => {
              const Icon = form.icon;
              const isActive = activeForm === form.id;
              return (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => setActiveForm(form.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? `${form.activeColor} shadow-md scale-[1.02]`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{form.name}</span>
                  <span className="sm:hidden">{form.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENEDOR DINÁMICO DEL FORMULARIO SELECCIONADO */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-100/60 dark:bg-slate-900/60">
          <div className="max-w-6xl mx-auto">
            
            {/* Banner de Aviso de Usuario Activo para celulares */}
            <div className="md:hidden mb-4 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                {isSuper ? <ShieldCheck size={14} className="text-amber-500" /> : <UserCheck size={14} className="text-emerald-500" />}
                {currentUser?.name}
              </span>
              <span className="text-[10px] opacity-80">
                {isSuper ? 'Acceso Maestro' : 'Acceso Personal'}
              </span>
            </div>

            {/* Contenedor Protegido con Error Boundary */}
            <FormsErrorBoundary key={activeForm}>
              {/* 0. Panel Central de Supervisión (Solo Administrador) */}
              {isAdmin && activeForm === 'supervision-central' && (
                <div className="animate-in fade-in duration-150">
                  <CentralSupervisionView isEmbedded={true} onClose={onClose} />
                </div>
              )}

              {/* 1. Apertura de Código */}
              {activeForm === 'apertura' && (
                <div className="animate-in fade-in duration-150">
                  <AperturaCodigoForm currentUser={currentUser} />
                </div>
              )}

              {/* 2. Solicitud de Viáticos */}
              {activeForm === 'viaticos' && (
                <div className="animate-in fade-in duration-150">
                  <SolicitudViaticosForm currentUser={currentUser} />
                </div>
              )}

              {/* 3. Liquidación de Viáticos */}
              {activeForm === 'liquidacion-viaticos' && (
                <div className="animate-in fade-in duration-150">
                  <LiquidacionViaticosForm currentUser={currentUser} />
                </div>
              )}

              {/* 4. Liquidación de Recibos */}
              {activeForm === 'liquidacion-recibos' && (
                <div className="animate-in fade-in duration-150">
                  <LiquidacionRecibosForm currentUser={currentUser} />
                </div>
              )}

              {/* 5. Plantilla Boletas */}
              {activeForm === 'plantilla-boletas' && (
                <div className="animate-in fade-in duration-150">
                  <PlantillaBoletas currentUser={currentUser} />
                </div>
              )}
            </FormsErrorBoundary>

          </div>
        </div>

      </div>
    </div>
  );
}
