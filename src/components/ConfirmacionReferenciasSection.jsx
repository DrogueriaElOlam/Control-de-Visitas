export default function ConfirmacionReferenciasSection({ formData, handleChange }) {
  return (
    <div className="mb-6">
      <div className="bg-blue-900 text-white px-3 py-2 mb-3">
        <h2 className="text-sm sm:text-base font-bold">CONFIRMACIÓN DE REFERENCIAS COMERCIALES</h2>
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((num) => (
          <div key={num} className="border border-gray-300 p-3 rounded">
            <p className="text-xs sm:text-sm font-bold mb-2">Referencia {num})</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Crédito Auto.:</label>
                <input
                  type="text"
                  name={`confRef${num}Credito`}
                  value={formData[`confRef${num}Credito`]}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Días Autorizados:</label>
                <input
                  type="text"
                  name={`confRef${num}Dias`}
                  value={formData[`confRef${num}Dias`]}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Clasificación:</label>
                <input
                  type="text"
                  name={`confRef${num}Clasificacion`}
                  value={formData[`confRef${num}Clasificacion`]}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Observaciones:</label>
              <textarea
                name={`confRef${num}Obs`}
                value={formData[`confRef${num}Obs`]}
                onChange={handleChange}
                rows="2"
                className="w-full border-2 border-gray-400 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none rounded"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
