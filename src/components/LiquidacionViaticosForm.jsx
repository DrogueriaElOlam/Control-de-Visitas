import { useState, useEffect, useMemo } from 'react';
import { Save, Download, Trash2, Plus, X, Edit2, History } from 'lucide-react';
import Logo from './Logo';
import FormHeader from './FormHeader';
import { supabase } from '../lib/supabase';
import LiquidacionViaticosHistory from './LiquidacionViaticosHistory';
import { isSuperUser, getPermittedRoutesForUser, ALL_ROUTES, getRoutesForVendor } from '../lib/formsPermissions';
import { LOGO_DATA_URI } from '../lib/logo';

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

  // Rutas autorizadas (todas para Antonio Celada / Admin, o solo las asignadas para cada vendedor)
  const rutasFiltradas = useMemo(() => {
    if (isSuper) {
      return ALL_ROUTES;
    }
    return getPermittedRoutesForUser(currentUser, formData.liquidadoPor);
  }, [isSuper, currentUser, formData.liquidadoPor]);

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


  const [liquidadores, setLiquidadores] = useState([
    'Ana Lucia Marroquin',
    'Antonio Celada',
    'Dany Peres',
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

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    
    // Calcular totales por categoría
    const totales = {
      alimentacion: calcularTotalPorCategoria('alimentacion'),
      hotel: calcularTotalPorCategoria('hotel'),
      peajes: calcularTotalPorCategoria('peajeParqueo'),
      combustibles: calcularTotalPorCategoria('combustible'),
      fotocopias: calcularTotalPorCategoria('fotocopias'),
      varios: calcularTotalPorCategoria('varios')
    };
    
    const granTotal = Object.values(totales).reduce((sum, val) => sum + val, 0);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Liquidación de Gastos Por Viáticos</title>
        <meta charset="UTF-8">
        <style>
            @page {
              size: landscape;
              margin: 0.5cm 0.8cm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 9pt;
              line-height: 1.2;
              color: #000;
              min-width: 1024px; /* Forzar ancho para asegurar horizontalidad en móviles */
            }
          
          .container {
            width: 100%;
            max-width: 100%;
          }
          
          /* Encabezado elegante */
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 4px;
          }
          
          .logo-section {
            width: 110pt;
            flex-shrink: 0;
          }
          
          .logo {
            width: 110pt;
            height: auto;
            object-fit: contain;
          }
          
          .title-section {
            flex: 1;
            text-align: center;
            padding: 0 15px;
          }
          
          .main-title {
            font-size: 16pt;
            font-weight: bold;
            color: #1e3a8a;
            line-height: 1.2;
          }
          
          /* Campos superiores */
          .top-fields {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 9pt;
          }
          
          .field-group {
            display: flex;
            align-items: center;
          }
          
          .field-label {
            font-weight: bold;
            margin-right: 6px;
          }
          
          .field-value {
            border-bottom: 1px solid #000;
            min-width: 150px;
            padding: 1px 4px;
          }
          
          /* Tabla principal - ancho automático según contenido */
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 8pt;
            table-layout: auto;
          }
          
          .main-table th {
            background-color: #dbeafe;
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: center;
            font-weight: bold;
            font-size: 7.5pt;
            line-height: 1.1;
            white-space: nowrap;
          }
          
          .main-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            text-align: center;
            font-size: 8pt;
            line-height: 1.1;
          }
          
          .main-table td.text-left {
            text-align: left;
            padding-left: 6px;
          }
          
          .main-table td.text-right {
            text-align: right;
            padding-right: 6px;
          }
          
          /* Anchos de columnas optimizados */
          .col-fecha { width: 8%; }
          .col-documento { width: 10%; }
          .col-establecimiento { width: 22%; }
          .col-monto { width: 10%; }
          
          /* Fila de totales */
          .totals-row {
            background-color: #f3f4f6;
            font-weight: bold;
            font-size: 8.5pt;
          }
          
          /* Gran total */
          .grand-total {
            text-align: right;
            font-size: 11pt;
            font-weight: bold;
            margin: 10px 0;
            padding: 5px 10px;
            background-color: #1e3a8a;
            color: white;
            border-radius: 4px;
          }
          
          /* Sección de firmas elegante */
          .signatures {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            gap: 40px;
          }
          
          .signature-box {
            flex: 1;
            text-align: center;
          }
          
          .signature-name {
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 4px;
            padding-top: 8px;
            border-top: 1.5px solid #000;
          }
          
          .signature-title {
            font-size: 8pt;
            color: #333;
            font-style: italic;
          }
          
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
                min-width: 1024px;
              }
              
              @page {
                size: landscape;
                margin: 0.5cm 0.8cm;
              }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Encabezado -->
          <div class="header">
            <div class="logo-section">
              <img src="${LOGO_DATA_URI}" class="logo" alt="Logo Droguería El Olam" />
            </div>
            <div class="title-section">
              <div class="main-title">Liquidación de Gastos Por Viáticos</div>
            </div>
          </div>
          
          <!-- Campos superiores -->
          <div class="top-fields">
            <div class="field-group">
              <span class="field-label">RUTA/GIRA:</span>
              <span class="field-value">${formData.ruta}</span>
            </div>
            <div class="field-group">
              <span class="field-label">LIQUIDADO POR:</span>
              <span class="field-value">${formData.liquidadoPor}</span>
            </div>
            <div class="field-group">
              <span class="field-label">FECHAS:</span>
              <span class="field-value">${formData.fechaSalida} al ${formData.fechaRegreso}</span>
            </div>
          </div>
          
          <!-- Tabla principal con TODOS los gastos -->
          <table class="main-table">
            <thead>
              <tr>
                <th class="col-fecha">FECHA</th>
                <th class="col-documento">No. FACTURA</th>
                <th class="col-establecimiento">ESTABLECIMIENTO</th>
                <th class="col-monto">ALIMENTACIÓN</th>
                <th class="col-monto">HOTEL</th>
                <th class="col-monto">PEAJES Y<br>PARQUEOS</th>
                <th class="col-monto">COMBUSTIBLES</th>
                <th class="col-monto">FOTOCOPIAS</th>
                <th class="col-monto">VARIOS</th>
              </tr>
            </thead>
            <tbody>
              ${formData.gastos.map(gasto => {
                return `
                  <tr>
                    <td class="col-fecha">${gasto.fecha || ''}</td>
                    <td class="col-documento">${gasto.numeroDocumento || ''}</td>
                    <td class="col-establecimiento text-left">${gasto.establecimiento || ''}</td>
                    <td class="col-monto text-right">${gasto.alimentacion ? 'Q' + parseFloat(gasto.alimentacion).toFixed(2) : ''}</td>
                    <td class="col-monto text-right">${gasto.hotel ? 'Q' + parseFloat(gasto.hotel).toFixed(2) : ''}</td>
                    <td class="col-monto text-right">${gasto.peajeParqueo ? 'Q' + parseFloat(gasto.peajeParqueo).toFixed(2) : ''}</td>
                    <td class="col-monto text-right">${gasto.combustible ? 'Q' + parseFloat(gasto.combustible).toFixed(2) : ''}</td>
                    <td class="col-monto text-right">${gasto.fotocopias ? 'Q' + parseFloat(gasto.fotocopias).toFixed(2) : ''}</td>
                    <td class="col-monto text-right">${gasto.varios ? 'Q' + parseFloat(gasto.varios).toFixed(2) : ''}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="totals-row">
                <td colspan="3" style="text-align: right; padding-right: 10px;">TOTALES POR CATEGORÍA:</td>
                <td class="text-right">Q${totales.alimentacion.toFixed(2)}</td>
                <td class="text-right">Q${totales.hotel.toFixed(2)}</td>
                <td class="text-right">Q${totales.peajes.toFixed(2)}</td>
                <td class="text-right">Q${totales.combustibles.toFixed(2)}</td>
                <td class="text-right">Q${totales.fotocopias.toFixed(2)}</td>
                <td class="text-right">Q${totales.varios.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Gran total -->
          <div class="grand-total">
            GRAN TOTAL: Q ${granTotal.toFixed(2)}
          </div>
          
          <!-- Firmas sin líneas extras -->
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-name">${formData.liquidadoPor || ''}</div>
              <div class="signature-title">Ejecutivo de Ventas</div>
            </div>
            <div class="signature-box">
              <div class="signature-name">REVISADO POR</div>
              <div class="signature-title">Depto. Contabilidad</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
          className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-500 font-semibold text-sm sm:text-base disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Guardando...' : editingRecord ? 'Actualizar' : 'Guardar'}
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 font-semibold text-sm sm:text-base"
        >
          <History className="w-4 h-4" />
          Historial
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-semibold text-sm sm:text-base"
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-semibold text-sm sm:text-base"
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
            className="w-full px-3 py-2 border border-blue-900/30 focus:border-blue-700 rounded-lg text-sm text-blue-950 font-medium bg-white"
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
            className="w-full px-3 py-2 border border-blue-900/30 focus:border-blue-700 rounded-lg text-sm text-blue-950 font-medium bg-white"
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
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      value={gasto.numeroDocumento}
                      onChange={(e) => handleGastoChange(index, 'numeroDocumento', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                      placeholder="No. Doc"
                      style={{ minWidth: gasto.numeroDocumento ? `${gasto.numeroDocumento.length + 2}ch` : '6rem' }}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      list="establecimientos-list"
                      value={gasto.establecimiento}
                      onChange={(e) => handleGastoChange(index, 'establecimiento', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                      placeholder="Establecimiento"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.alimentacion}
                      onChange={(e) => handleGastoChange(index, 'alimentacion', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.hotel}
                      onChange={(e) => handleGastoChange(index, 'hotel', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.combustible}
                      onChange={(e) => handleGastoChange(index, 'combustible', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.peajeParqueo}
                      onChange={(e) => handleGastoChange(index, 'peajeParqueo', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.fotocopias}
                      onChange={(e) => handleGastoChange(index, 'fotocopias', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={gasto.varios}
                      onChange={(e) => handleGastoChange(index, 'varios', e.target.value)}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500"
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
