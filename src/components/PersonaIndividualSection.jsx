export default function PersonaIndividualSection({ formData, handleChange }) {
  return (
    <div className="mb-6 border-2 border-gray-400 p-4">
      <h3 className="bg-gray-300 px-3 py-2 font-bold mb-4 -mx-4 -mt-4">PERSONA INDIVIDUAL</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Nombre Comercial:</label>
          <input
            type="text"
            name="nombreComercialInd"
            value={formData.nombreComercialInd}
            onChange={handleChange}
            className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Propietario:</label>
            <input
              type="text"
              name="propietario"
              value={formData.propietario}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">NIT:</label>
            <input
              type="text"
              name="nitInd"
              value={formData.nitInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Dirección Negocio:</label>
            <input
              type="text"
              name="direccionNegocioInd"
              value={formData.direccionNegocioInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Zona:</label>
            <input
              type="text"
              name="zonaInd"
              value={formData.zonaInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Municipio:</label>
            <input
              type="text"
              name="municipioInd"
              value={formData.municipioInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Departamento:</label>
            <input
              type="text"
              name="departamentoInd"
              value={formData.departamentoInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">No. Patente de Comercio:</label>
            <input
              type="text"
              name="patenteComercioInd"
              value={formData.patenteComercioInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Teléfonos:</label>
            <input
              type="text"
              name="telefonosInd"
              value={formData.telefonosInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Dirección Exacta del Propietario:</label>
          <input
            type="text"
            name="direccionPropietario"
            value={formData.direccionPropietario}
            onChange={handleChange}
            className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Encargado Responsable del Negocio:</label>
            <input
              type="text"
              name="encargadoNegocioInd"
              value={formData.encargadoNegocioInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Teléfono:</label>
            <input
              type="text"
              name="telefonoEncargadoInd"
              value={formData.telefonoEncargadoInd}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
