import { useState, useEffect, useMemo } from 'react';
import { Save, Download, Trash2, Plus, X, Edit2, History, Printer } from 'lucide-react';
import Logo from './Logo';
import FormHeader from './FormHeader';
import { supabase } from '../lib/supabase';
import LiquidacionViaticosHistory from './LiquidacionViaticosHistory';
import { isSuperUser, getPermittedRoutesForUser, ALL_ROUTES, getRoutesForVendor } from '../lib/formsPermissions';
import { LOGO_DATA_URI } from '../lib/logo';
import { openAndPrintHtml, downloadHtmlFile } from '../lib/printHtmlHelper';
import { generateLiquidacionViaticosHtml } from '../lib/liquidacionViaticosHtml';

export default function LiquidacionViaticosForm({ currentUser }) {
  const isSuper = isSuperUser(currentUser);
  const [formData, setFormData] = useState({
    ruta: (!isSuper && currentUser?.route) ? currentUser.route : '',
    fechaSalida: '',
    fechaRegreso: '',
    liquidadoPor: (!isSuper && currentUser?.name) ? currentUser.name : '',
    gastos: [
      { 
        fecha: '', 
        numeroDocumento: '', 
        establecimiento: '',
        alimentacion: '',
        hotel: '',
        combustible: '',
        peajeParqueo: '',
        fotocopias: '',
        varios: ''
      }
    ]
  });

  // Rutas autorizadas: cuando se selecciona un vendedor, se muestran solo las rutas que tiene asignadas
  const rutasFiltradas = useMemo(() => {
    return getPermittedRoutesForUser(currentUser, formData.liquidadoPor);
  }, [currentUser, formData.liquidadoPor]);

  // Sincronizar vendedor y ruta asignada si no es superusuario
  useEffect(() => {
    if (!isSuper && currentUser?.name) {
      const defaultRuta = (currentUser.route && rutasFiltradas.includes(currentUser.route))
        ? currentUser.route
        : (rutasFiltradas && rutasFiltradas[0]) || '';

      setFormData(prev => {
        const targetRuta = (prev.ruta && rutasFiltradas.includes(prev.ruta)) ? prev.ruta : defaultRuta;
        if (prev.liquidadoPor === currentUser.name && prev.ruta === targetRuta) {
          return prev;
        }
        return {
          ...prev,
          liquidadoPor: currentUser.name,
          ruta: targetRuta
        };
      });
    }
  }, [currentUser?.name, currentUser?.route, isSuper, rutasFiltradas]);


  const [rutas, setRutas] = useState(ALL_ROUTES);
  const [liquidadores, setLiquidadores] = useState([
    'Ana Lucia Marroquin',
    'Antonio Celada',
    'Danny Perez',
    'Elias Quiej',
    'Elio Caceros',
    'Erick Curley',
    'Estuardo Cordova',
    'Jessica Noriega',
    'Josue Aguilar',
    'Karina Pineda',
    'Klissman Hernandez',
    'Wally Natareno'
  ]);

  const [nuevaRuta, setNuevaRuta] = useState('');
  const [nuevoLiquidador, setNuevoLiquidador] = useState('');
  const [mostrarEditarRutas, setMostrarEditarRutas] = useState(false);
  const [mostrarEditarLiquidadores, setMostrarEditarLiquidadores] = useState(false);
  
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [establecimientosSugeridos, setEstablecimientosSugeridos] = useState([]);

  useEffect(() => {
    const fetchEstablecimientos = async () => {
      try {
        const { data, error } = await supabase
          .from('liquidacion_viaticos_history')
          .select('datos');
        
        if (error) throw error;

        const uniqueEstablecimientos = new Set();
        data?.forEach(record => {
          record.datos?.gastos?.forEach(gasto => {
            if (gasto.establecimiento) {
              uniqueEstablecimientos.add(gasto.establecimiento.trim());
            }
          });
        });

        setEstablecimientosSugeridos(Array.from(uniqueEstablecimientos).sort());
      } catch (err) {
        console.error("Error cargando establecimientos:", err);
      }
    };
    fetchEstablecimientos();
  }, []);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGastoChange = (index, field, value) => {
    const newGastos = [...formData.gastos];
    newGastos[index][field] = value;
    setFormData(prev => ({
      ...prev,
      gastos: newGastos
    }));
  };

  const agregarGasto = () => {
    setFormData(prev => ({
      ...prev,
      gastos: [...prev.gastos, { 
        fecha: '', 
        numeroDocumento: '', 
        establecimiento: '',
        alimentacion: '',
        hotel: '',
        combustible: '',
        peajeParqueo: '',
        fotocopias: '',
        varios: ''
      }]
    }));
  };

  const eliminarGasto = (index) => {
    if (formData.gastos.length > 1) {
      const newGastos = formData.gastos.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        gastos: newGastos
      }));
    }
  };

  const agregarRuta = () => {
    if (nuevaRuta.trim()) {
      setRutas([...rutas, nuevaRuta.trim()]);
      setNuevaRuta('');
    }
  };

  const eliminarRuta = (index) => {
    setRutas(rutas.filter((_, i) => i !== index));
  };

  const agregarLiquidador = () => {
    if (nuevoLiquidador.trim()) {
      setLiquidadores([...liquidadores, nuevoLiquidador.trim()]);
      setNuevoLiquidador('');
    }
  };

  const eliminarLiquidador = (index) => {
    setLiquidadores(liquidadores.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return formData.gastos.reduce((sum, gasto) => {
      const alimentacion = parseFloat(gasto.alimentacion) || 0;
      const hotel = parseFloat(gasto.hotel) || 0;
      const combustible = parseFloat(gasto.combustible) || 0;
      const peajeParqueo = parseFloat(gasto.peajeParqueo) || 0;
      const fotocopias = parseFloat(gasto.fotocopias) || 0;
      const varios = parseFloat(gasto.varios) || 0;
      return sum + alimentacion + hotel + combustible + peajeParqueo + fotocopias + varios;
    }, 0);
  };

  const calcularTotalPorCategoria = (categoria) => {
    return formData.gastos.reduce((sum, gasto) => {
      return sum + (parseFloat(gasto[categoria]) || 0);
    }, 0);
  };

  const handleSave = async () => {
    console.log('Guardando formulario en historial...');
    setIsSaving(true);

    try {
      const dataToSave = { ...formData };

      if (editingRecord) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('liquidacion_viaticos_history')
          .update({
            datos: dataToSave,
            fecha_creacion: new Date().toISOString()
          })
          .eq('id', editingRecord.id);

        if (error) {
          console.error('Error al actualizar:', error);
          alert('Error al actualizar el registro');
          return;
        }

        alert('Registro actualizado exitosamente');
        setEditingRecord(null);
      } else {
        // Crear nuevo registro
        const { error } = await supabase
          .from('liquidacion_viaticos_history')
          .insert({
            datos: dataToSave,
            fecha_creacion: new Date().toISOString()
          });

        if (error) {
          console.error('Error al guardar:', error);
          alert('Error al guardar en el historial');
          return;
        }

        setShowSaveMessage(true);
        setTimeout(() => setShowSaveMessage(false), 3000);
      }

      // También guardar en localStorage como respaldo local
      localStorage.setItem('liquidacionViaticos', JSON.stringify(formData));
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Error inesperado al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFromHistory = (record) => {
    console.log('Cargando registro para editar:', record);
    setFormData(record.datos);
    setEditingRecord(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    if (confirm('¿Está seguro de limpiar el formulario?')) {
      setFormData({
        ruta: '',
        fechaSalida: '',
        fechaRegreso: '',
        liquidadoPor: '',
        gastos: [{ 
          fecha: '', 
          numeroDocumento: '', 
          establecimiento: '',
          alimentacion: '',
          hotel: '',
          combustible: '',
          peajeParqueo: '',
          fotocopias: '',
          varios: ''
        }]
      });
    }
  };

  const getPreparedFileName = () => {
    const liquidadorLimpio = (formData.liquidadoPor || 'General').trim().replace(/\s+/g, '_');
    const fechaSalida = formData.fechaSalida || new Date().toISOString().split('T')[0];
    return `Liquidacion_Viaticos_${liquidadorLimpio}_${fechaSalida}`;
  };

  const handlePrint = () => {
    const htmlContent = generateLiquidacionViaticosHtml(formData);
    const fileName = getPreparedFileName();
    openAndPrintHtml(htmlContent, fileName, 'landscape');
  };

  const handleExportHtml = () => {
    const htmlContent = generateLiquidacionViaticosHtml(formData);
    const fileName = `${getPreparedFileName()}.html`;
    downloadHtmlFile(htmlContent, fileName, 'landscape');
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-blue-900/20 p-4 sm:p-6 md:p-8">
      <FormHeader logoSize="small" />

      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white text-center py-2.5 rounded-xl mb-4 sm:mb-6 shadow-md">
        <h2 className="text-base sm:text-lg font-black tracking-wide">LIQUIDACIÓN DE VIÁTICOS</h2>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-500 font-bold text-sm sm:text-base disabled:opacity-50 shadow-sm transition-all"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Guardando...' : editingRecord ? 'Actualizar' : 'Guardar'}
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-950 font-bold text-sm sm:text-base shadow-sm transition-all"
        >
          <History className="w-4 h-4" />
          Historial
        </button>
        <button
          onClick={handlePrint}
          type="button"
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold text-sm sm:text-base shadow-sm transition-all"
          title="Abrir vista de impresión y seleccionar orientación Horizontal o Vertical"
        >
          <Printer className="w-4 h-4" />
          🖨️ Imprimir / Vista Previa
        </button>
        <button
          onClick={handleExportHtml}
          type="button"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold text-sm sm:text-base shadow-sm transition-all"
          title="Descargar archivo HTML oficial autoajustable"
        >
          <Download className="w-4 h-4" />
          Descargar HTML
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-bold text-sm sm:text-base shadow-sm transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {editingRecord ? 'Cancelar Edición' : 'Limpiar'}
        </button>
      </div>

      {showSaveMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 font-medium">
          ✓ Formulario guardado correctamente en el historial
        </div>
      )}

      {editingRecord && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 font-medium">
          ℹ️ Editando registro del historial. Los cambios se guardarán al presionar "Actualizar".
        </div>
      )}

      {/* Información principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-blue-950 mb-1 sm:mb-2">
            Ruta/Gira *
          </label>
          <div className="flex gap-2 items-center">
            <select
              name="ruta"
              value={formData.ruta}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 border border-blue-900/30 focus:border-blue-700 rounded-lg text-sm text-blue-950 font-medium bg-white"
              required
            >
              <option value="">Seleccione una ruta</option>
              {rutasFiltradas.map((ruta, index) => (
                <option key={index} value={ruta}>{ruta}</option>
              ))}
            </select>
            {isSuper && (
              <button
                type="button"
                onClick={() => setMostrarEditarRutas(!mostrarEditarRutas)}
                className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                title="Editar rutas"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {mostrarEditarRutas && (
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={nuevaRuta}
                  onChange={(e) => setNuevaRuta(e.target.value)}
                  placeholder="Nueva ruta"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={agregarRuta}
                  className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-sm"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto bg-white rounded p-2">
                {rutas.map((ruta, index) => (
                  <div key={index} className="flex items-center justify-between text-xs py-1">
                    <span>{ruta}</span>
                    <button
                      onClick={() => eliminarRuta(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-blue-950 mb-1 sm:mb-2">
            Liquidado por *
          </label>
          {isSuper ? (
            <div className="flex gap-2 items-center">
              <select
                name="liquidadoPor"
                value={formData.liquidadoPor}
                onChange={handleInputChange}
                className="flex-1 px-3 py-2 border border-blue-900/30 focus:border-blue-700 rounded-lg text-sm text-blue-950 font-medium bg-white"
                required
              >
                <option value="">Seleccione un liquidador</option>
                {liquidadores.map((liquidador, index) => (
                  <option key={index} value={liquidador}>{liquidador}</option>
                ))}
              </select>
              <button
                onClick={() => setMostrarEditarLiquidadores(!mostrarEditarLiquidadores)}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                title="Editar liquidadores"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full border-b-2 border-blue-800 py-2 px-3 bg-blue-50 text-blue-950 font-bold text-sm rounded-t flex items-center justify-between">
              <span>{formData.liquidadoPor || currentUser?.name || 'Vendedor'}</span>
              <span className="text-[10px] uppercase tracking-wider bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-black">
                Asignado a ti
              </span>
            </div>
          )}
          
          {mostrarEditarLiquidadores && (
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={nuevoLiquidador}
                  onChange={(e) => setNuevoLiquidador(e.target.value)}
                  placeholder="Nuevo liquidador"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={agregarLiquidador}
                  className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-sm"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto bg-white rounded p-2">
                {liquidadores.map((liquidador, index) => (
                  <div key={index} className="flex items-center justify-between text-xs py-1">
                    <span>{liquidador}</span>
                    <button
                      onClick={() => eliminarLiquidador(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-blue-950 mb-1 sm:mb-2">
            Fecha de Salida *
          </label>
          <input
            type="date"
            name="fechaSalida"
            value={formData.fechaSalida}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-blue-900/30 focus:border-blue-700 rounded-lg text-sm text-black font-bold bg-white"
            style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
            required
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-blue-950 mb-1 sm:mb-2">
            Fecha de Regreso *
          </label>
          <input
            type="date"
            name="fechaRegreso"
            value={formData.fechaRegreso}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-blue-900/30 focus:border-blue-700 rounded-lg text-sm text-black font-bold bg-white"
            style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
            required
          />
        </div>
      </div>

      {/* Tabla de gastos */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="bg-blue-50/80 border-l-4 border-blue-900 px-3 py-2 font-black text-blue-950 text-sm sm:text-base tracking-wide rounded-r">
            DETALLE DE GASTOS
          </h3>
          <button
            onClick={agregarGasto}
            className="flex items-center gap-2 bg-blue-900 text-white px-3 py-1.5 rounded-lg hover:bg-blue-950 font-semibold text-xs sm:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar Gasto
          </button>
        </div>

        <div className="overflow-x-auto">
          <datalist id="establecimientos-list">
            {establecimientosSugeridos.map((est, i) => (
              <option key={i} value={est} />
            ))}
          </datalist>
          <table className="w-full border-collapse border border-blue-900/20 rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-gradient-to-r from-blue-900 to-blue-950 text-white">
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">FECHA</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">No. DOC</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">ESTABLECIMIENTO</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">ALIMENTACIÓN</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">HOTEL</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">COMBUSTIBLE</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">PEAJE/PARQUEO</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">FOTOCOPIAS</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider">VARIOS</th>
                <th className="border border-blue-800 px-2 py-2 text-xs font-bold text-white tracking-wider w-16">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {formData.gastos.map((gasto, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="date"
                      value={gasto.fecha}
                      onChange={(e) => handleGastoChange(index, 'fecha', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      value={gasto.numeroDocumento}
                      onChange={(e) => handleGastoChange(index, 'numeroDocumento', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff', minWidth: gasto.numeroDocumento ? `${gasto.numeroDocumento.length + 2}ch` : '6rem' }}
                      placeholder="No. Doc"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      list="establecimientos-list"
                      value={gasto.establecimiento}
                      onChange={(e) => handleGastoChange(index, 'establecimiento', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="Establecimiento"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.alimentacion}
                      onChange={(e) => handleGastoChange(index, 'alimentacion', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.hotel}
                      onChange={(e) => handleGastoChange(index, 'hotel', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.combustible}
                      onChange={(e) => handleGastoChange(index, 'combustible', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.peajeParqueo}
                      onChange={(e) => handleGastoChange(index, 'peajeParqueo', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.fotocopias}
                      onChange={(e) => handleGastoChange(index, 'fotocopias', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.varios}
                      onChange={(e) => handleGastoChange(index, 'varios', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-black font-bold focus:outline-none"
                      style={{ color: '#000000', WebkitTextFillColor: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1 text-center">
                    <button
                      onClick={() => eliminarGasto(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={formData.gastos.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50/90 font-black text-blue-950 border-t-2 border-blue-900">
                <td colSpan="3" className="border border-blue-200 px-4 py-2.5 text-right text-sm">TOTALES:</td>
                <td className="border border-blue-200 px-2 py-2 text-sm text-blue-900">Q {calcularTotalPorCategoria('alimentacion').toFixed(2)}</td>
                <td className="border border-blue-200 px-2 py-2 text-sm text-blue-900">Q {calcularTotalPorCategoria('hotel').toFixed(2)}</td>
                <td className="border border-blue-200 px-2 py-2 text-sm text-blue-900">Q {calcularTotalPorCategoria('combustible').toFixed(2)}</td>
                <td className="border border-blue-200 px-2 py-2 text-sm text-blue-900">Q {calcularTotalPorCategoria('peajeParqueo').toFixed(2)}</td>
                <td className="border border-blue-200 px-2 py-2 text-sm text-blue-900">Q {calcularTotalPorCategoria('fotocopias').toFixed(2)}</td>
                <td className="border border-blue-200 px-2 py-2 text-sm text-blue-900">Q {calcularTotalPorCategoria('varios').toFixed(2)}</td>
                <td className="border border-blue-200"></td>
              </tr>
              <tr className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white font-black">
                <td colSpan="9" className="border border-blue-900 px-4 py-3 text-right text-base tracking-wide">
                  GRAN TOTAL: <span className="text-amber-300 ml-2 text-lg">Q {calcularTotal().toFixed(2)}</span>
                </td>
                <td className="border border-blue-900"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {showHistory && (
        <LiquidacionViaticosHistory
          onClose={() => setShowHistory(false)}
          onEdit={handleEditFromHistory}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
