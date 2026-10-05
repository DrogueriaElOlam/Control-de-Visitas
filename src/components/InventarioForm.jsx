import { useState, useRef, useEffect, useCallback, useTransition } from 'react';
import { Upload, Download, RefreshCw, Trash2, Calendar, CheckCircle, Circle, Plus } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getLocalDateString } from '../lib/dateUtils';

export default function InventarioForm() {
  const [inventario, setInventario] = useState([]);
  const [displayedInventario, setDisplayedInventario] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [completionShown, setCompletionShown] = useState(false);
  const fileInputRef = useRef(null);
  const autoSaveInterval = useRef(null);
  const [isFilteringPending, startTransition] = useTransition();

  // Función para formatear fecha predictiva (5/26 → 05/2026, 5-2026 → 05/2026)
  const formatearFechaPredictiva = (valor) => {
    if (!valor) return '';
    
    // Remover espacios
    valor = valor.trim();
    
    // Formato: 5/26 o 5-26 → 05/2026
    const match1 = valor.match(/^(\d{1,2})[\/\-](\d{2})$/);
    if (match1) {
      const mes = match1[1].padStart(2, '0');
      const anio = '20' + match1[2];
      return `${mes}/${anio}`;
    }
    
    // Formato: 5/2026 o 5-2026 → 05/2026
    const match2 = valor.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (match2) {
      const mes = match2[1].padStart(2, '0');
      const anio = match2[2];
      return `${mes}/${anio}`;
    }
    
    // Formato: 05/2026 (ya correcto)
    const match3 = valor.match(/^(\d{2})\/(\d{4})$/);
    if (match3) {
      return valor;
    }
    
    // Si no coincide con ningún formato, retornar el valor original
    return valor;
  };

  // Función para preprocesar items con campos en minúsculas para búsqueda eficiente
  const preprocessItem = useCallback((item) => ({
    ...item,
    _codigoLC: (item.codigo || '').toLowerCase(),
    _productoLC: (item.producto || '').toLowerCase(),
    _laboratorioLC: (item.laboratorio || '').toLowerCase(),
  }), []);

  // Cargar datos guardados al iniciar
  const cargarDatosGuardados = useCallback(() => {
    try {
      const datosGuardados = localStorage.getItem('inventario_drogueria');
      if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        const preprocessedData = datos.map(preprocessItem);
        setInventario(preprocessedData);
        console.log('Datos cargados desde localStorage:', preprocessedData.length, 'productos');
      }
    } catch (error) {
      console.error('Error al cargar los datos:', error);
    }
  }, [preprocessItem]);

  useEffect(() => {
    cargarDatosGuardados();
  }, [cargarDatosGuardados]);

  // Filtrado centralizado con useTransition para mejor rendimiento en móvil
  useEffect(() => {
    startTransition(() => {
      if (searchTerm) {
        const termLC = searchTerm.toLowerCase();
        const filtered = inventario.filter(item =>
          item._codigoLC.includes(termLC) ||
          item._productoLC.includes(termLC) ||
          item._laboratorioLC.includes(termLC)
        );
        setDisplayedInventario(filtered);
      } else {
        setDisplayedInventario(inventario);
      }
    });
  }, [inventario, searchTerm, startTransition]);

  // Verificar si todos están completados
  useEffect(() => {
    if (inventario.length > 0) {
      const todosRealizados = inventario.every(item => item.realizado === true);
      
      if (todosRealizados && !completionShown) {
        alert('INVENTARIO REALIZADO EXITOSAMENTE, ASEGURESE DE HABER REVISADO LOS DATOS, DESPUES DE LA REVISION EXPORTE EL ARCHIVO EN EXCEL POR WHATSSAP');
        setCompletionShown(true);
      }
      
      // Resetear el flag si hay items no completados
      if (!todosRealizados && completionShown) {
        setCompletionShown(false);
      }
    }
  }, [inventario, completionShown]);

  // Autoguardado cada 2 minutos
  const guardarDatosAutomatico = useCallback(() => {
    try {
      localStorage.setItem('inventario_drogueria', JSON.stringify(inventario));
      setLastSaved(new Date());
      console.log('Autoguardado completado');
    } catch (error) {
      console.error('Error en autoguardado:', error);
    }
  }, [inventario]);

  useEffect(() => {
    autoSaveInterval.current = setInterval(() => {
      if (inventario.length > 0) {
        guardarDatosAutomatico();
      }
    }, 120000);

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [inventario, guardarDatosAutomatico]);

  // Cargar datos desde CSV
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Cargando archivo CSV:', file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Resultados del CSV:', results.data);
        const data = results.data.map((row, index) => preprocessItem({
          id: Date.now() + index,
          codigo: row.Codigo || row.codigo || '',
          pendiente: row.Pendiente || row.pendiente || '',
          producto: row.Producto || row.producto || '',
          laboratorio: row.Laboratorio || row.laboratorio || '',
          sistema: row.Sistema || row.sistema || '',
          fisico: row.Fisico || row.fisico || '',
          fecha: row.Fecha || row.fecha || '',
          observaciones: '',
          realizado: false,
          fromCSV: true // Marca que fue cargado desde CSV
        }));
        setInventario(data);
        setCompletionShown(false); // Resetear flag de completado
        guardarDatosAutomatico();
        console.log('Datos cargados:', data.length, 'productos');
      },
      error: (error) => {
        console.error('Error al parsear CSV:', error);
        alert('Error al cargar el archivo CSV: ' + error.message);
      }
    });

    event.target.value = '';
  }, [preprocessItem, guardarDatosAutomatico]);

  // Toggle realizado - Optimizado para móvil
  const toggleRealizado = useCallback((id) => {
    try {
      setInventario(prevInventario =>
        prevInventario.map(item =>
          item.id === id ? { ...item, realizado: !item.realizado } : item
        )
      );
      console.log(`Producto ${id} marcado...`);
    } catch (error) {
      console.error('Error en toggleRealizado:', error);
      alert('Error al cambiar el estado. Por favor, intenta de nuevo.');
    }
  }, []);

  // Actualizar campo - Optimizado con formateo de fecha predictivo
  const actualizarCampo = useCallback((id, campo, valor) => {
    setInventario(prevInventario =>
      prevInventario.map(item => {
        if (item.id === id) {
          // Si es el campo fecha, aplicar formato predictivo
          const valorFinal = campo === 'fecha' ? formatearFechaPredictiva(valor) : valor;
          
          const updatedItem = { ...item, [campo]: valorFinal };
          // Re-preprocessar campos de búsqueda si se modifican
          if (['codigo', 'producto', 'laboratorio'].includes(campo)) {
            updatedItem[`_${campo}LC`] = valorFinal.toLowerCase();
          }
          return updatedItem;
        }
        return item;
      })
    );
  }, []);

  // Agregar nueva fila
  const agregarNuevaFila = useCallback(() => {
    const nuevaFila = preprocessItem({
      id: Date.now(),
      codigo: '',
      pendiente: '',
      producto: '',
      laboratorio: '',
      sistema: '',
      fisico: '',
      fecha: '',
      observaciones: '',
      realizado: false,
      fromCSV: false // No viene del CSV, es editable
    });
    setInventario(prevInventario => [...prevInventario, nuevaFila]);
    console.log('Nueva fila agregada');
  }, [preprocessItem]);

  // Eliminar fila
  const eliminarFila = useCallback((id) => {
    if (window.confirm('¿Deseas eliminar esta fila?')) {
      setInventario(prevInventario => prevInventario.filter(item => item.id !== id));
      guardarDatosAutomatico();
    }
  }, [guardarDatosAutomatico]);

  // Limpiar formulario
  const limpiarFormulario = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todo el formulario? Esta acción no se puede deshacer.')) {
      setInventario([]);
      setSearchTerm('');
      setCompletionShown(false);
      localStorage.removeItem('inventario_drogueria');
      console.log('Formulario limpiado');
      alert('Formulario limpiado correctamente');
    }
  }, []);

  // Buscar en inventario
  const buscarInventario = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  // Exportar a XLSX
  const exportarXLSX = useCallback(() => {
    console.log('=== INICIO EXPORTACIÓN XLSX ===');
    console.log('Cantidad de datos en inventario:', inventario.length);
    
    if (inventario.length === 0) {
      alert('No hay datos para exportar. Por favor, carga primero un archivo CSV o agrega filas manualmente.');
      console.log('No hay datos para exportar');
      return;
    }

    try {
      console.log('Iniciando proceso de exportación XLSX...');
      
      const datosExportacion = inventario.map((item, index) => {
        console.log(`Procesando item ${index + 1}:`, item);
        return {
          'Codigo': item.codigo || '',
          'Pendiente': item.pendiente || '',
          'Producto': item.producto || '',
          'Laboratorio': item.laboratorio || '',
          'Sistema': item.sistema || '',
          'Fisico': item.fisico || '',
          'Fecha': item.fecha || '',
          'Observaciones': item.observaciones || '',
          'Realizado': item.realizado ? 'Sí' : 'No'
        };
      });

      console.log('Datos preparados para exportación:', datosExportacion.length, 'filas');
      console.log('Primera fila de muestra:', datosExportacion[0]);

      console.log('Creando hoja de cálculo...');
      const ws = XLSX.utils.json_to_sheet(datosExportacion);
      console.log('Hoja creada exitosamente');

      console.log('Creando libro de trabajo...');
      const wb = XLSX.utils.book_new();
      console.log('Libro creado exitosamente');

      console.log('Agregando hoja al libro...');
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      console.log('Hoja agregada exitosamente');

      const colWidths = [
        { wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 20 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 10 }
      ];
      ws['!cols'] = colWidths;
      console.log('Anchos de columnas configurados');

      const fecha = getLocalDateString();
      const nombreArchivo = `Inventario_Drogueria_El_Olam_${fecha}.xlsx`;
      
      console.log('Intentando escribir y descargar archivo:', nombreArchivo);
      console.log('Tipo de XLSX.writeFile:', typeof XLSX.writeFile);
      
      XLSX.writeFile(wb, nombreArchivo);
      
      console.log('✅ Archivo escrito exitosamente');
      console.log('=== FIN EXPORTACIÓN XLSX ===');
      alert('¡Archivo exportado exitosamente! Revisa tu carpeta de descargas.');
    } catch (error) {
      console.error('❌ ERROR EN EXPORTACIÓN:', error);
      alert('Error al exportar el archivo: ' + error.message);
    }
  }, [inventario]);

  // Guardar datos manualmente
  const guardarDatos = useCallback(() => {
    try {
      localStorage.setItem('inventario_drogueria', JSON.stringify(inventario));
      setLastSaved(new Date());
      console.log('Datos guardados manualmente');
      alert('Datos guardados correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los datos: ' + error.message);
    }
  }, [inventario]);

  // Formato de última vez guardado
  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now - lastSaved) / 1000);
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 sm:px-4 lg:px-8">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            Control de Inventario - Droguería El Olam
          </h2>
          <p className="text-sm sm:text-base text-blue-100">
            Carga datos desde CSV, edita la información y exporta a Excel
          </p>
          {lastSaved && (
            <p className="text-xs text-blue-200 mt-2">
              Último guardado: {formatLastSaved()}
            </p>
          )}
        </div>

        {/* Acciones principales */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
            {/* Cargar CSV */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Cargar CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Agregar producto */}
            <button
              onClick={agregarNuevaFila}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Agrega Producto</span>
              <span className="sm:hidden">+</span>
            </button>

            {/* Limpiar formulario */}
            <button
              onClick={limpiarFormulario}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Limpiar</span>
              <span className="sm:hidden">Limpiar</span>
            </button>

            {/* Exportar XLSX */}
            <button
              onClick={exportarXLSX}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Exportar XLSX</span>
              <span className="sm:hidden">XLSX</span>
            </button>

            {/* Guardar */}
            <button
              onClick={guardarDatos}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Guardar</span>
              <span className="sm:hidden">Guardar</span>
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="p-4 sm:p-6 border-b">
          <input
            type="text"
            placeholder="Buscar por código, producto o laboratorio..."
            value={searchTerm}
            onChange={(e) => buscarInventario(e.target.value)}
            className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm sm:text-base"
          />
          {isFilteringPending && (
            <p className="text-xs text-blue-600 mt-2">Filtrando resultados...</p>
          )}
        </div>

        {/* Tabla de inventario */}
        {displayedInventario.length > 0 ? (
          <div className="p-2 sm:p-6">
            {/* Vista móvil (cards) */}
            <div className="block lg:hidden space-y-3">
              {displayedInventario.map((item) => (
                <div 
                  key={item.id} 
                  className={`border rounded-lg p-3 ${item.realizado ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}
                >
                  {/* Checkbox realizado */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => toggleRealizado(item.id)}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-full text-xs"
                    >
                      {item.realizado ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                      {item.realizado ? 'Realizado' : 'Pendiente'}
                    </button>
                    <button
                      onClick={() => eliminarFila(item.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Campos */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Código</label>
                        <input
                          type="text"
                          value={item.codigo}
                          onChange={(e) => actualizarCampo(item.id, 'codigo', e.target.value)}
                          readOnly={item.fromCSV}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Pendiente</label>
                        <input
                          type="text"
                          value={item.pendiente}
                          onChange={(e) => actualizarCampo(item.id, 'pendiente', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Producto</label>
                      <input
                        type="text"
                        value={item.producto}
                        onChange={(e) => actualizarCampo(item.id, 'producto', e.target.value)}
                        readOnly={item.fromCSV}
                        className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Laboratorio</label>
                      <input
                        type="text"
                        value={item.laboratorio}
                        onChange={(e) => actualizarCampo(item.id, 'laboratorio', e.target.value)}
                        readOnly={item.fromCSV}
                        className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Sistema</label>
                        <input
                          type="text"
                          value={item.sistema}
                          onChange={(e) => actualizarCampo(item.id, 'sistema', e.target.value)}
                          readOnly={item.fromCSV}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Físico</label>
                        <input
                          type="number"
                          value={item.fisico}
                          onChange={(e) => actualizarCampo(item.id, 'fisico', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha</label>
                        <input
                          type="text"
                          value={item.fecha}
                          onChange={(e) => actualizarCampo(item.id, 'fecha', e.target.value)}
                          placeholder="5/26"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Observaciones</label>
                      <textarea
                        value={item.observaciones || ''}
                        onChange={(e) => actualizarCampo(item.id, 'observaciones', e.target.value)}
                        placeholder="Agregar notas u observaciones..."
                        rows="2"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop (tabla) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse min-w-max">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      ✓
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Código
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Pendiente
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Producto
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Laboratorio
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Sistema
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Físico
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Fecha
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                      Observaciones
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 text-sm">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedInventario.map((item) => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.realizado ? 'bg-green-50' : ''}`}>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <button
                          onClick={() => toggleRealizado(item.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title={item.realizado ? 'Marcar como pendiente' : 'Marcar como realizado'}
                        >
                          {item.realizado ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.codigo}
                          onChange={(e) => actualizarCampo(item.id, 'codigo', e.target.value)}
                          readOnly={item.fromCSV}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.pendiente}
                          onChange={(e) => actualizarCampo(item.id, 'pendiente', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.producto}
                          onChange={(e) => actualizarCampo(item.id, 'producto', e.target.value)}
                          readOnly={item.fromCSV}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.laboratorio}
                          onChange={(e) => actualizarCampo(item.id, 'laboratorio', e.target.value)}
                          readOnly={item.fromCSV}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.sistema}
                          onChange={(e) => actualizarCampo(item.id, 'sistema', e.target.value)}
                          readOnly={item.fromCSV}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none ${item.fromCSV ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="number"
                          value={item.fisico}
                          onChange={(e) => actualizarCampo(item.id, 'fisico', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.fecha}
                          onChange={(e) => actualizarCampo(item.id, 'fecha', e.target.value)}
                          placeholder="5/26"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <textarea
                          value={item.observaciones || ''}
                          onChange={(e) => actualizarCampo(item.id, 'observaciones', e.target.value)}
                          placeholder="Observaciones..."
                          rows="1"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <button
                          onClick={() => eliminarFila(item.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-all"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 p-4">
            <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-base sm:text-lg mb-2">
              No hay datos en el inventario
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Carga un archivo CSV o agrega filas manualmente para comenzar
            </p>
          </div>
        )}

        {/* Resumen */}
        {inventario.length > 0 && (
          <div className="p-4 sm:p-6 bg-blue-50 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Total de productos:</span> {inventario.length}
                </p>
              </div>
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Realizados:</span>{' '}
                  {inventario.filter(item => item.realizado).length}
                </p>
              </div>
              {searchTerm && (
                <div>
                  <p className="text-gray-700 text-sm sm:text-base">
                    <span className="font-semibold">Filtrados:</span> {displayedInventario.length}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              💾 El formulario se guarda automáticamente cada 2 minutos. Los datos persisten incluso al cambiar de formulario.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              📝 Campos cargados desde CSV (Código, Producto, Laboratorio, Sistema) no son editables.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              📅 Fecha: Escribe rápido como "5/26" o "5-2026" y se formateará automáticamente a "05/2026".
            </p>
          </div>
        )}
      </div>
    </div>
  );
}