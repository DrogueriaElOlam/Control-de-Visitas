export default function UsoExclusivoSection({ formData, handleChange }) {
  return (
    <div className="mb-6">
      <div className="bg-blue-900 text-white px-3 py-2 mb-3">
        <h2 className="text-sm sm:text-base font-bold">USO EXCLUSIVO DE DROGUERÍA EL OLAM</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-1">
            Código SAE:
          </label>
          <input
            type="text"
            name="codigoSAE"
            value={formData.codigoSAE}
            onChange={handleChange}
            className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-1">
            Ruta:
          </label>
          <input
            type="text"
            name="ruta"
            value={formData.ruta}
            onChange={handleChange}
            className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs sm:text-sm font-semibold mb-1">
          Fecha Primera Compra:
        </label>
        <input
          type="text"
          name="fechaPrimeraCompra"
          value={formData.fechaPrimeraCompra}
          onChange={handleChange}
          className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-1">
            Compras de Contado:
          </label>
          <input
            type="text"
            name="comprasContado"
            value={formData.comprasContado}
            onChange={handleChange}
            className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-semibold mb-1">
            Promedio de Compra:
          </label>
          <input
            type="text"
            name="promedioCompra"
            value={formData.promedioCompra}
            onChange={handleChange}
            className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs sm:text-sm font-semibold mb-1">
          Vendedor Asignado:
        </label>
        <input
          type="text"
          name="vendedorAsignado"
          value={formData.vendedorAsignado}
          onChange={handleChange}
          className="w-full border-b-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-3">
        <div className="bg-blue-900 text-white px-3 py-2 mb-2">
          <h3 className="text-xs sm:text-sm font-bold">HISTORIAL</h3>
        </div>
        <textarea
          name="historial"
          value={formData.historial}
          onChange={handleChange}
          rows="4"
          className="w-full border-2 border-gray-400 px-2 py-1 text-xs sm:text-sm focus:border-blue-500 focus:outline-none rounded"
          placeholder="Escriba el historial aquí..."
        />
      </div>
    </div>
  );
}
