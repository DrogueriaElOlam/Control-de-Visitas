import { Eraser, Printer, FileDown } from 'lucide-react';

export default function FormButtons({ onClear, onExport, onPrint }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 print:hidden">
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base font-semibold shadow-sm"
        >
          <Eraser className="w-4 h-4" />
          Limpiar
        </button>
      )}

      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm sm:text-base font-bold shadow-md cursor-pointer"
          title="Abrir vista de impresión y guardar en PDF directamente"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Vista Previa
        </button>
      )}

      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-bold shadow-md cursor-pointer"
          title="Descargar archivo HTML con botón de impresión incluido"
        >
          <FileDown className="w-4 h-4" />
          {onPrint ? 'Exportar HTML' : 'Exportar / Imprimir'}
        </button>
      )}
    </div>
  );
}

