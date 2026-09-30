export default function DocumentosRequeridosSection({ formData, handleChange }) {
  const documentos = [
    'Fotocopia de DPI del Propietario o Representante Legal',
    'Fotocopia de Patente de Comercio',
    'Fotocopia de Patente de Sociedad (si aplica)',
    'Fotocopia de RTU',
    'Referencias Comerciales (mínimo 3)',
    'Referencias Bancarias',
    'Otros documentos'
  ];

  return (
    <div className="mb-6">
      <div className="bg-blue-900 text-white px-3 py-2 mb-3">
        <h2 className="text-sm sm:text-base font-bold">DOCUMENTOS REQUERIDOS</h2>
      </div>
      
      <div className="mb-4">
        <label className="block text-xs sm:text-sm font-semibold mb-1">
          Fecha de Solicitud:
        </label>
        <input
          type="text"
          name="fechaSolicitud"
          value={formData.fechaSolicitud}
          onChange={handleChange}
          className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-3">
        {documentos.map((doc, index) => (
          <div key={index} className="border border-gray-300 p-3 rounded">
            <p className="text-xs sm:text-sm font-semibold mb-2">{index + 1}. {doc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Adjunto:</label>
                <input
                  type="text"
                  name={`doc${index + 1}Adjunto`}
                  value={formData[`doc${index + 1}Adjunto`]}
                  onChange={handleChange}
                  placeholder="Sí/No"
                  className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Observaciones:</label>
                <input
                  type="text"
                  name={`doc${index + 1}Obs`}
                  value={formData[`doc${index + 1}Obs`]}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
