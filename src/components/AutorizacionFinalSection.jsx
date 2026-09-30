export default function AutorizacionFinalSection({ formData, handleChange }) {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-1">
            Crédito Autorizado:
          </label>
          <input
            type="text"
            name="creditoAutorizado"
            value={formData.creditoAutorizado}
            onChange={handleChange}
            className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-1">
            Días de Crédito Autorizados:
          </label>
          <input
            type="text"
            name="diasCreditoAutorizados"
            value={formData.diasCreditoAutorizados}
            onChange={handleChange}
            className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs sm:text-sm font-semibold mb-1">
          OBSERVACIONES GENERALES:
        </label>
        <textarea
          name="observacionesGenerales"
          value={formData.observacionesGenerales}
          onChange={handleChange}
          rows="4"
          className="w-full border-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none rounded"
          placeholder="Escriba las observaciones generales aquí..."
        />
      </div>

      <div className="mt-6 pt-6 border-t-2 border-gray-300">
        <p className="text-xs sm:text-sm text-gray-600 mb-4 italic">
          Nota: Las firmas de "Revisado" y "Autorizado" se incluirán automáticamente en el documento exportado.
        </p>
      </div>
    </div>
  );
}
