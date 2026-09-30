export default function PersonaJuridicaSection({ formData, handleChange }) {
  return (
    <div className="mb-6 border-2 border-gray-400 p-4">
      <h3 className="bg-gray-300 px-3 py-2 font-bold mb-4 -mx-4 -mt-4">PERSONA JURÍDICA (SOCIEDAD ANÓNIMA)</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Nombre Comercial:</label>
          <input
            type="text"
            name="nombreComercialJur"
            value={formData.nombreComercialJur}
            onChange={handleChange}
            className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Teléfonos:</label>
            <input
              type="text"
              name="telefonosJur"
              value={formData.telefonosJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">NIT:</label>
            <input
              type="text"
              name="nitJur"
              value={formData.nitJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Razón Social:</label>
          <input
            type="text"
            name="razonSocial"
            value={formData.razonSocial}
            onChange={handleChange}
            className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">No. Patente de Comercio:</label>
            <input
              type="text"
              name="patenteComercioJur"
              value={formData.patenteComercioJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">No. Patente de Sociedad:</label>
            <input
              type="text"
              name="patenteSociedad"
              value={formData.patenteSociedad}
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
              name="direccionNegocioJur"
              value={formData.direccionNegocioJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Zona:</label>
            <input
              type="text"
              name="zonaJur"
              value={formData.zonaJur}
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
              name="municipioJur"
              value={formData.municipioJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Departamento:</label>
            <input
              type="text"
              name="departamentoJur"
              value={formData.departamentoJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Nombre del Representante Legal:</label>
          <input
            type="text"
            name="representanteLegal"
            value={formData.representanteLegal}
            onChange={handleChange}
            className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">DPI Representante Legal:</label>
            <input
              type="text"
              name="dpiRepresentante"
              value={formData.dpiRepresentante}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Teléfono Representante Legal:</label>
            <input
              type="text"
              name="telefonoRepresentante"
              value={formData.telefonoRepresentante}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Dirección Exacta del Representante Legal:</label>
          <input
            type="text"
            name="direccionRepresentante"
            value={formData.direccionRepresentante}
            onChange={handleChange}
            className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Encargado Responsable del Negocio:</label>
            <input
              type="text"
              name="encargadoNegocioJur"
              value={formData.encargadoNegocioJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Teléfono:</label>
            <input
              type="text"
              name="telefonoEncargadoJur"
              value={formData.telefonoEncargadoJur}
              onChange={handleChange}
              className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
