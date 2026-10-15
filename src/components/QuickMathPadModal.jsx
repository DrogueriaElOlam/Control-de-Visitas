import React, { useState, useEffect } from 'react';
import { Calculator, X, Delete, Check, CornerDownLeft, RotateCcw } from 'lucide-react';
import { evaluateMathExpression } from '../lib/dateUtils';

/**
 * Modal de Teclado de Calculadora Táctil optimizado para Celulares y Tablets.
 * Permite ingresar números y operadores +, -, *, / sin depender de si el teclado
 * nativo del teléfono los muestra o no.
 */
export default function QuickMathPadModal({
  isOpen,
  onClose,
  title = 'Calculadora de Monto',
  initialValue = '',
  onApply,
  accentColor = 'blue' // 'emerald' | 'amber' | 'blue'
}) {
  const [expression, setExpression] = useState('');

  useEffect(() => {
    if (isOpen) {
      setExpression(initialValue ? String(initialValue) : '');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  // Feedback táctil suave para teléfonos
  const triggerHaptic = () => {
    try {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(12);
      }
    } catch (_) {}
  };

  // Agregar carácter a la expresión
  const handlePressChar = (char) => {
    triggerHaptic();
    setExpression(prev => {
      // Evitar operadores dobles seguidos
      const isOperator = ['+', '-', '*', '/'].includes(char);
      if (isOperator && prev.length > 0) {
        const lastChar = prev.trim().slice(-1);
        if (['+', '-', '*', '/'].includes(lastChar)) {
          return prev.trim().slice(0, -1) + char;
        }
      }
      return prev + char;
    });
  };

  // Borrar último carácter
  const handleBackspace = () => {
    triggerHaptic();
    setExpression(prev => {
      if (!prev) return '';
      return prev.slice(0, -1);
    });
  };

  // Limpiar todo
  const handleClear = () => {
    triggerHaptic();
    setExpression('');
  };

  // Calcular resultado en vivo
  const calculateResult = () => {
    if (!expression || !expression.trim()) return '0';
    let clean = expression.replace(/,/g, '').replace(/[xX]/g, '*').trim();
    // Si termina en operador, evaluar la parte previa
    clean = clean.replace(/[+\-*\/]+$/, '');
    if (!clean) return '0';
    const evaluated = evaluateMathExpression(clean);
    return evaluated || clean;
  };

  const previewResult = calculateResult();

  // Aplicar al campo
  const handleApply = (useCalculated = true) => {
    triggerHaptic();
    const finalVal = useCalculated ? previewResult : expression;
    onApply(finalVal);
    onClose();
  };

  // Evaluar dentro de la pantalla
  const handleEqual = () => {
    triggerHaptic();
    if (previewResult && previewResult !== '0') {
      setExpression(String(previewResult));
    }
  };

  // Color de acento
  const colorMap = {
    emerald: {
      header: 'from-emerald-600 to-teal-700',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      opKey: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
      applyBtn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
    },
    amber: {
      header: 'from-amber-600 to-orange-700',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      opKey: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
      applyBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
    },
    blue: {
      header: 'from-blue-600 to-indigo-700',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      opKey: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
      applyBtn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
    }
  };

  const currentTheme = colorMap[accentColor] || colorMap.blue;

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className={`px-4 py-3 bg-gradient-to-r ${currentTheme.header} text-white flex items-center justify-between shadow-md`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight leading-none">{title}</h3>
              <span className="text-[10px] text-white/80 font-medium">Teclado numérico con operadores táctiles</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer"
            title="Cerrar teclado"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pantalla Visor de la Calculadora */}
        <div className="p-4 bg-slate-900 text-white flex flex-col justify-end min-h-[90px] border-b border-slate-800">
          <div className="text-right text-xs font-mono text-slate-400 break-all min-h-[18px]">
            {expression || '0'}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
              Q {Number(previewResult || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Teclado Táctil */}
        <div className="p-3 bg-slate-100 dark:bg-slate-950/70 select-none">
          <div className="grid grid-cols-4 gap-2">
            {/* Fila 1 */}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 bg-rose-100 hover:bg-rose-200 active:bg-rose-300 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-black text-sm rounded-xl transition-transform active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
              title="Borrar todo"
            >
              C
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-transform active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
              title="Borrar carácter"
            >
              <Delete size={18} />
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('(')}
              className="py-3 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-base rounded-xl transition-transform active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
            >
              (
            </button>
            <button
              type="button"
              onClick={() => handlePressChar(')')}
              className="py-3 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-base rounded-xl transition-transform active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
            >
              )
            </button>

            {/* Fila 2 */}
            <button
              type="button"
              onClick={() => handlePressChar('7')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('8')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('9')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('/')}
              className={`py-3.5 ${currentTheme.opKey} font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm cursor-pointer`}
              title="Dividir"
            >
              ÷
            </button>

            {/* Fila 3 */}
            <button
              type="button"
              onClick={() => handlePressChar('4')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('5')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('6')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('*')}
              className={`py-3.5 ${currentTheme.opKey} font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm cursor-pointer`}
              title="Multiplicar"
            >
              ×
            </button>

            {/* Fila 4 */}
            <button
              type="button"
              onClick={() => handlePressChar('1')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('2')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('3')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('-')}
              className={`py-3.5 ${currentTheme.opKey} font-black text-xl rounded-xl transition-transform active:scale-95 shadow-sm cursor-pointer`}
              title="Restar"
            >
              −
            </button>

            {/* Fila 5 */}
            <button
              type="button"
              onClick={() => handlePressChar('0')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('.')}
              className="py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              .
            </button>
            <button
              type="button"
              onClick={handleEqual}
              className="py-3.5 bg-slate-700 hover:bg-slate-800 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-sm cursor-pointer"
              title="Calcular total en pantalla"
            >
              =
            </button>
            <button
              type="button"
              onClick={() => handlePressChar('+')}
              className={`py-3.5 ${currentTheme.opKey} font-black text-xl rounded-xl transition-transform active:scale-95 shadow-sm cursor-pointer`}
              title="Sumar"
            >
              +
            </button>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleApply(true)}
            className={`w-full py-3.5 px-4 ${currentTheme.applyBtn} text-white font-black text-sm rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer`}
          >
            <Check size={18} />
            <span>Aplicar Total: Q {Number(previewResult || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApply(false)}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
              title="Guarda la fórmula completa (ej: 1200+2500+1000) en el campo"
            >
              Insertar como Fórmula ({expression || '0'})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
