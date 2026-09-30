import { Eraser, Printer } from 'lucide-react';

export default function FormButtons({ onClear, onExport }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 print:hidden">
      <button
        onClick={onClear}
        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base"
      >
        <Eraser className="w-4 h-4" />
        Limpiar
      </button>
      <button
        onClick={onExport}
        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
      >
        <Printer className="w-4 h-4" />
        Exportar Formulario
      </button>
    </div>
  );
}
