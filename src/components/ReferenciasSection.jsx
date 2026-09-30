export default function ReferenciasSection({ formData, handleChange }) {
  return (
    <>
      <div className="mb-6">
        <h3 className="bg-gray-300 px-3 py-2 font-bold mb-3">REFERENCIAS COMERCIALES</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="grid grid-cols-3 gap-2 items-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{num}.</span>
                <input
                  type="text"
                  name={`refComercial${num}`}
                  value={formData[`refComercial${num}`]}
                  onChange={handleChange}
                  className="flex-1 border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Nombre"
                />
              </div>
              <div>
                <input
                  type="text"
                  name={`telRefComercial${num}`}
                  value={formData[`telRefComercial${num}`]}
                  onChange={handleChange}
                  className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Teléfonos"
                />
              </div>
              <div>
                <input
                  type="text"
                  name={`creditoAuto${num}`}
                  value={formData[`creditoAuto${num}`]}
                  onChange={handleChange}
                  className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Crédito Auto."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="bg-gray-300 px-3 py-2 font-bold mb-3">REFERENCIAS BANCARIAS</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((num) => (
            <div key={num} className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  name={`banco${num}`}
                  value={formData[`banco${num}`]}
                  onChange={handleChange}
                  className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Banco"
                />
              </div>
              <div>
                <input
                  type="text"
                  name={`tipoCuenta${num}`}
                  value={formData[`tipoCuenta${num}`]}
                  onChange={handleChange}
                  className="w-full border-b border-gray-400 px-2 py-1 text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Tipo de Cuenta"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
