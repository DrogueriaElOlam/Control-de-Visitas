import React, { useState, useEffect, useRef } from 'react';
import { 
  Crosshair, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Layers, 
  MessageSquarePlus,
  RotateCcw
} from 'lucide-react';

const isDev = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  Boolean(import.meta.env?.DEV)
);

/**
 * VisualFeedbackSelector
 * Herramienta interactiva para que el usuario pueda marcar visualmente en localhost
 * qué elementos de la pantalla desea MODIFICAR o ELIMINAR.
 * 
 * SEGURIDAD: 
 * - Bloqueado 100% en producción (Vercel / dominio público).
 * - En localhost está oculto por defecto y se activa con el atajo Ctrl + Shift + X.
 */
export default function VisualFeedbackSelector() {
  // Si NO es entorno local, no ejecutar ni renderizar absolutamente nada
  if (!isDev) return null;

  // En localhost: Oculto por defecto. Se activa solo con atajo Ctrl+Shift+X o ?selector=1
  const [isToolVisible, setIsToolVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes('selector=1');
  });

  const [isActive, setIsActive] = useState(false);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [elementDetails, setElementDetails] = useState(null);
  const [changeType, setChangeType] = useState('delete'); // 'delete' | 'modify'
  const [userComment, setUserComment] = useState('');
  const [markedList, setMarkedList] = useState([]);
  const [showMarkedDrawer, setShowMarkedDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedList, setCopiedList] = useState(false);
  const [hiddenElements, setHiddenElements] = useState([]);

  const overlayRef = useRef(null);

  // Escuchar atajo global Ctrl + Shift + X en localhost para mostrar u ocultar la herramienta
  useEffect(() => {
    const handleGlobalShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault();
        setIsToolVisible((prev) => {
          const next = !prev;
          if (!next) {
            setIsActive(false);
            setSelectedElement(null);
            setElementDetails(null);
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  // Si la herramienta no ha sido activada con Ctrl+Shift+X, no mostrar nada en pantalla
  if (!isToolVisible) return null;

  // Inspector de Hover y Clics cuando el modo está activo
  useEffect(() => {
    if (!isActive) {
      setHoveredElement(null);
      return;
    }

    const handleMouseOver = (e) => {
      // Ignorar elementos propios de esta herramienta
      if (e.target.closest('#olam-visual-selector-tool')) return;
      setHoveredElement(e.target);
    };

    const handleClick = (e) => {
      // Ignorar clics dentro del panel de la herramienta
      if (e.target.closest('#olam-visual-selector-tool')) return;

      e.preventDefault();
      e.stopPropagation();

      const el = e.target;
      setSelectedElement(el);

      // Extraer datos legibles del elemento
      const tagName = el.tagName.toLowerCase();
      const textContent = (el.innerText || el.textContent || el.value || el.placeholder || '').trim();
      const cleanText = textContent.replace(/\s+/g, ' ').slice(0, 80);
      
      // Intentar identificar tipo amigable
      let friendlyType = 'Elemento';
      if (tagName === 'button' || el.closest('button')) friendlyType = 'Botón';
      else if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') friendlyType = 'Campo de Entrada';
      else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') friendlyType = 'Título';
      else if (tagName === 'a') friendlyType = 'Enlace / Navegación';
      else if (tagName === 'table' || el.closest('table')) friendlyType = 'Tabla / Celda';
      else if (el.classList.contains('card') || el.closest('.rounded-2xl, .rounded-3xl')) friendlyType = 'Tarjeta / Contenedor';

      // Identificar sección o contexto cercano
      const containerTitle = el.closest('section, div[class*="bg-white"], div[class*="dark:bg-slate-800"]')?.querySelector('h1, h2, h3, h4')?.innerText?.trim() || '';

      setElementDetails({
        domElement: el,
        tagName,
        friendlyType,
        text: cleanText || '(Sin texto visible)',
        context: containerTitle ? containerTitle.slice(0, 60) : 'Vista Actual',
        className: el.className ? String(el.className).slice(0, 80) : '',
        id: el.id || null
      });

      setUserComment('');
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isActive]);

  // Actualizar marco flotante de hover
  useEffect(() => {
    if (!isActive || !hoveredElement || !overlayRef.current) return;
    try {
      const rect = hoveredElement.getBoundingClientRect();
      const overlay = overlayRef.current;
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.display = 'block';
    } catch (e) {
      if (overlayRef.current) overlayRef.current.style.display = 'none';
    }
  }, [isActive, hoveredElement]);

  // Ocultar temporalmente el elemento para ver cómo se ve sin él
  const handleToggleHidePreview = () => {
    if (!selectedElement) return;
    const isHidden = selectedElement.style.display === 'none';
    if (isHidden) {
      selectedElement.style.display = '';
      setHiddenElements(prev => prev.filter(el => el !== selectedElement));
    } else {
      selectedElement.style.display = 'none';
      setHiddenElements(prev => [...prev, selectedElement]);
    }
  };

  // Restaurar todos los elementos ocultados
  const handleRestoreAllHidden = () => {
    hiddenElements.forEach(el => {
      if (el) el.style.display = '';
    });
    setHiddenElements([]);
  };

  // Agregar a la lista de cambios marcados
  const handleAddToList = () => {
    if (!elementDetails) return;
    const newItem = {
      id: Date.now(),
      type: changeType,
      friendlyType: elementDetails.friendlyType,
      text: elementDetails.text,
      context: elementDetails.context,
      comment: userComment.trim()
    };
    setMarkedList(prev => [...prev, newItem]);
    setSelectedElement(null);
    setElementDetails(null);
  };

  // Generar texto para copiar al chat
  const generatePromptText = (item) => {
    const action = item.type === 'delete' ? 'Eliminar' : 'Modificar';
    let text = `• ${action} ${item.friendlyType}: "${item.text}" en [${item.context}]`;
    if (item.comment) {
      text += ` -> Detalle: ${item.comment}`;
    }
    return text;
  };

  // Copiar solo el elemento actual
  const handleCopySingle = () => {
    if (!elementDetails) return;
    const action = changeType === 'delete' ? 'Eliminar' : 'Modificar';
    let prompt = `Por favor, ${action.toLowerCase()} el ${elementDetails.friendlyType.toLowerCase()} "${elementDetails.text}" en la sección "${elementDetails.context}".`;
    if (userComment.trim()) {
      prompt += ` Detalle solicitado: ${userComment.trim()}`;
    }
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copiar toda la lista acumulada
  const handleCopyAllList = () => {
    if (markedList.length === 0) return;
    const header = `Hola, por favor realiza los siguientes cambios marcados en la interfaz de localhost:\n\n`;
    const body = markedList.map((it, idx) => `${idx + 1}. ${generatePromptText(it)}`).join('\n');
    navigator.clipboard.writeText(header + body);
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2500);
  };

  return (
    <div id="olam-visual-selector-tool">
      
      {/* 1. Marco flotante de inspección en Hover */}
      {isActive && hoveredElement && (
        <div
          ref={overlayRef}
          className="fixed pointer-events-none z-[9990] border-2 border-dashed border-cyan-400 bg-cyan-400/15 rounded-md transition-all duration-75"
          style={{ display: 'none' }}
        >
          <span className="absolute -top-6 left-0 px-2 py-0.5 bg-cyan-600 text-white text-[10px] font-bold rounded shadow uppercase tracking-wider font-mono whitespace-nowrap">
            {hoveredElement.tagName?.toLowerCase()} • {hoveredElement.innerText ? hoveredElement.innerText.slice(0, 20) + '...' : 'clic para marcar'}
          </span>
        </div>
      )}

      {/* 2. Barra Superior Informativa cuando el modo está ACTIVO */}
      {isActive && (
        <div className="fixed top-0 left-0 right-0 z-[9998] bg-slate-950/95 border-b border-cyan-500/50 text-white px-4 py-2.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500 text-slate-950 font-black animate-pulse">
              <Crosshair size={18} />
            </span>
            <div>
              <div className="text-xs font-black tracking-wide text-cyan-300 uppercase">
                Modo Selector de Elementos Activo
              </div>
              <div className="text-[11px] text-slate-300">
                Pasa el ratón y <strong>haz clic en cualquier botón, texto o tarjeta</strong> que desees modificar o eliminar.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hiddenElements.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreAllHidden}
                className="px-3 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                title="Restaurar elementos ocultados temporalmente"
              >
                <RotateCcw size={12} />
                <span>Restaurar ({hiddenElements.length})</span>
              </button>
            )}

            {markedList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMarkedDrawer(true)}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
              >
                <Layers size={13} />
                <span>Marcados ({markedList.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsActive(false);
                setSelectedElement(null);
                setElementDetails(null);
              }}
              className="px-3.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow"
            >
              ✕ Desactivar Selector
            </button>
          </div>
        </div>
      )}

      {/* 3. Botón Flotante Permanente para Activar el Selector */}
      <div className="fixed bottom-4 left-4 z-[9995] flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIsActive(!isActive);
            if (isActive) {
              setSelectedElement(null);
              setElementDetails(null);
            }
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-black shadow-xl transition-all active:scale-95 cursor-pointer border ${
            isActive
              ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-4 ring-cyan-500/30'
              : 'bg-slate-900/90 hover:bg-slate-900 text-white border-slate-700 hover:border-cyan-400 backdrop-blur-md'
          }`}
          title="Activar selector para hacer clic en lo que quieras modificar o eliminar"
        >
          <Crosshair size={16} className={isActive ? 'animate-spin' : 'text-cyan-400'} />
          <span>{isActive ? 'Inspector Activo' : '🎯 Selector / Marcar Cambios'}</span>
          {markedList.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-600 text-white font-mono font-bold">
              {markedList.length}
            </span>
          )}
        </button>

        {markedList.length > 0 && !isActive && (
          <button
            type="button"
            onClick={() => setShowMarkedDrawer(true)}
            className="p-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white shadow-xl text-xs font-bold flex items-center gap-1 transition-all"
            title="Ver lista de elementos marcados para enviar al chat"
          >
            <Layers size={16} />
          </button>
        )}

        {/* Botón para Ocultar la Herramienta completamente */}
        <button
          type="button"
          onClick={() => {
            setIsToolVisible(false);
            setIsActive(false);
            setSelectedElement(null);
            setElementDetails(null);
          }}
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 shadow-xl transition-all cursor-pointer"
          title="Ocultar herramienta (Presiona Ctrl + Shift + X para volver a abrir)"
        >
          <X size={15} />
        </button>
      </div>

      {/* 4. Modal / Tarjeta al hacer clic en un elemento seleccionado */}
      {elementDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            
            {/* Header del Modal de Selección */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500 text-slate-950 font-black">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Elemento Marcado</h3>
                  <p className="text-[11px] text-cyan-300 font-mono">
                    {elementDetails.friendlyType} • &lt;{elementDetails.tagName}&gt;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedElement(null);
                  setElementDetails(null);
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido / Detalles del Elemento */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Vista previa de lo seleccionado */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">Texto / Contenido Detectado:</div>
                <div className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 break-words">
                  "{elementDetails.text}"
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <strong>Ubicación:</strong> {elementDetails.context}
                </div>
              </div>

              {/* Selector de Acción: ¿Eliminar o Modificar? */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  ¿Qué deseas hacer con este elemento?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChangeType('delete')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold transition-all ${
                      changeType === 'delete'
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Trash2 size={14} />
                    <span>Eliminar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangeType('modify')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold transition-all ${
                      changeType === 'modify'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Edit3 size={14} />
                    <span>Modificar</span>
                  </button>
                </div>
              </div>

              {/* Campo para detalle / comentario opcional */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  {changeType === 'delete' ? 'Motivo o aclaración (opcional):' : '¿Cómo te gustaría modificarlo?:'}
                </label>
                <textarea
                  rows={2}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder={
                    changeType === 'delete'
                      ? 'Ej: Ya no es necesario mostrar este botón en esta vista...'
                      : 'Ej: Cambiar el texto a "Ver Ventas", moverlo a la derecha o cambiarle el color a verde...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Botón de Previsualización: Ocultar en Vivo */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleToggleHidePreview}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {selectedElement?.style?.display === 'none' ? (
                    <>
                      <Eye size={14} className="text-emerald-500" />
                      <span>Volver a mostrar en pantalla</span>
                    </>
                  ) : (
                    <>
                      <EyeOff size={14} className="text-amber-500" />
                      <span>Previsualizar ocultándolo en vivo</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Footer con Acciones */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopySingle}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                title="Copiar texto listo para pegar en el chat del asistente"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copied ? '¡Copiado!' : 'Copiar para el Chat'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddToList}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md transition-all cursor-pointer"
              >
                <MessageSquarePlus size={14} />
                <span>Guardar en Lista ({markedList.length + 1})</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Panel / Drawer Lateral de Cambios Acumulados */}
      {showMarkedDrawer && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Header del Drawer */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-cyan-400" />
                <div>
                  <h3 className="text-sm font-black">Lista de Cambios Marcados</h3>
                  <p className="text-[11px] text-slate-300 font-mono">
                    {markedList.length} {markedList.length === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMarkedDrawer(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lista de Elementos */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {markedList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Crosshair size={32} className="mx-auto text-slate-300 dark:text-slate-600 animate-pulse" />
                  <p className="text-xs font-semibold">No hay elementos marcados aún.</p>
                  <p className="text-[11px]">Activa el modo selector y haz clic sobre lo que quieras modificar o eliminar.</p>
                </div>
              ) : (
                markedList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.type === 'delete'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {item.type === 'delete' ? '🗑️ Eliminar' : '✏️ Modificar'} {item.friendlyType}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMarkedList(prev => prev.filter(it => it.id !== item.id))}
                        className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                        title="Quitar de la lista"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="font-bold text-slate-900 dark:text-white">
                      "{item.text}"
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      En: <strong>{item.context}</strong>
                    </div>

                    {item.comment && (
                      <div className="text-[11px] bg-white dark:bg-slate-900 p-2 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 italic">
                        Nota: {item.comment}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer del Drawer: Copiar Lista Completa */}
            {markedList.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={handleCopyAllList}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white shadow-lg transition-all cursor-pointer"
                >
                  {copiedList ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedList ? '¡Lista Copiada al Portapapeles!' : '📋 Copiar Toda la Lista para el Chat'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarkedList([])}
                  className="w-full py-1 text-[11px] font-bold text-slate-400 hover:text-red-500 text-center transition-colors cursor-pointer"
                >
                  Vaciar lista
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
