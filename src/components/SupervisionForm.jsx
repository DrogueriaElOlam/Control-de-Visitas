import { useState, useEffect, useCallback } from 'react';
import { Plus, Download, Trash2, Save, RefreshCw, History, UserPlus, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import Logo from './Logo';
import { getLocalDateString } from '../lib/dateUtils';
import { verifyPassword } from '../lib/security';
import { 
  saveViaticosToHistory, 
  saveComisionesToHistory, 
  saveRecibosToHistory, 
  saveEvaluacionesToHistory, 
  saveVisitasToHistory,
  updateHistoryRecord 
} from '../lib/supervisionHistory';
import { 
  exportRecibosToPDF,
  exportRecibosToExcel,
  exportEvaluacionesToPDF,
  exportEvaluacionesToExcel,
  exportVisitasToPDF,
  exportVisitasToExcel
} from '../lib/supervisionExport';
import SupervisionHistory from './SupervisionHistory';

import VendorEvaluationForm from './VendorEvaluationForm';

export default function SupervisionForm() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [viaticos, setViaticos] = useState([]);
  const [recibos, setRecibos] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Estado para controlar la vista del formulario de evaluación
  const [showNewEvaluationForm, setShowNewEvaluationForm] = useState(false);

  // Estado para la evaluación en edición
  const [editingRecord, setEditingRecord] = useState(null);

  // Estados para listas de vendedores y giras
  const [vendedores, setVendedores] = useState([
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

  const [giras, setGiras] = useState([
    'Amatitlan #B5',
    'Capital S1 #64',
    'Capital S2 #65',
    'Capital S3 #94',
    'Chimaltenango I #43',
    'Chimaltenango II #44',
    'Chiquimula I #61',
    'Chiquimula II #63',
    'Coatepeque #24',
    'Coban #13',
    'Escuintla I #A1',
    'Escuintla II #A2',
    'Huehuetango Centro #A4',
    'Huehuetenango Montaña Alta I #83',
    'Huehuetenango Montaña Alta II #84',
    'Huehuetenango Montaña Baja I #71',
    'Huehuetenango Montaña Baja II #72',
    'Ixcan #95',
    'Izabal I #34',
    'Izabal II #35',
    'Jalapa #62',
    'Jutiapa I #41',
    'Jutiapa II #42',
    'Municipios Norte #A5',
    'Municipios Oriente #15',
    'Nebaj #54',
    'Petapa #91',
    'Peten I #73',
    'Peten II #74',
    'Peten III #B1',
    'Peten IV #B2',
    'Polochic #81',
    'Quetzaltenango #11',
    'Quiche Centro #32',
    'Quiche Montaña Alta #55',
    'Quiche Montaña Baja #33',
    'Retalhuleu #22',
    'Sacatepequez #31',
    'Salama #14',
    'San Marcos I #92',
    'San Marcos II #93',
    'San Marcos Montaña Alta #51',
    'Santa Rosa #45',
    'Solola I #52',
    'Solola II #53',
    'Suchi I #21',
    'Suchi II #23',
    'Suchi III #25',
    'Totonicapan #12',
    'Transversal I #B3',
    'Transversal II #B4',
    'Villa Nueva #A3',
    'Zacapa #82'
  ]);

  // Estados para gestión de vendedores y giras
  const [showGestionVendedores, setShowGestionVendedores] = useState(false);
  const [showGestionGiras, setShowGestionGiras] = useState(false);
  const [showGestionRutas, setShowGestionRutas] = useState(false);
  const [nuevoVendedor, setNuevoVendedor] = useState('');
  const [nuevaGira, setNuevaGira] = useState('');
  const [nuevaRuta, setNuevaRuta] = useState('');

  // Estados para historial
  const [showHistorialViaticos, setShowHistorialViaticos] = useState(false);
  const [showHistorialRecibos, setShowHistorialRecibos] = useState(false);
  const [showHistorialEvaluaciones, setShowHistorialEvaluaciones] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Estados para Evaluación de Vendedor
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [rutas, setRutas] = useState([
    'Amatitlan #B5',
    'Capital S1 #64',
    'Capital S2 #65',
    'Capital S3 #94',
    'Chimaltenango I #43',
    'Chimaltenango II #44',
    'Chiquimula I #61',
    'Chiquimula II #63',
    'Coatepeque #24',
    'Coban #13',
    'Escuintla I #A1',
    'Escuintla II #A2',
    'Huehuetango Centro #A4',
    'Huehuetenango Montaña Alta I #83',
    'Huehuetenango Montaña Alta II #84',
    'Huehuetenango Montaña Baja I #71',
    'Huehuetenango Montaña Baja II #72',
    'Ixcan #95',
    'Izabal I #34',
    'Izabal II #35',
    'Jalapa #62',
    'Jutiapa I #41',
    'Jutiapa II #42',
    'Municipios Norte #A5',
    'Municipios Oriente #15',
    'Nebaj #54',
    'Petapa #91',
    'Peten I #73',
    'Peten II #74',
    'Peten III #B1',
    'Peten IV #B2',
    'Polochic #81',
    'Quetzaltenango #11',
    'Quiche Centro #32',
    'Quiche Montaña Alta #55',
    'Quiche Montaña Baja #33',
    'Retalhuleu #22',
    'Sacatepequez #31',
    'Salama #14',
    'San Marcos I #92',
    'San Marcos II #93',
    'San Marcos Montaña Alta #51',
    'Santa Rosa #45',
    'Solola I #52',
    'Solola II #53',
    'Suchi I #21',
    'Suchi II #23',
    'Suchi III #25',
    'Totonicapan #12',
    'Transversal I #B3',
    'Transversal II #B4',
    'Villa Nueva #A3',
    'Zacapa #82'
  ]);

  // Estados para Visitas Proveedores
  const [visitas, setVisitas] = useState([]);
  const [showHistorialVisitas, setShowHistorialVisitas] = useState(false);
  const [filtroProveedor, setFiltroProveedor] = useState('');

  // Estado para nueva visita
  const [nuevaVisita, setNuevaVisita] = useState({
    fechaVisita: '',
    proveedor: '',
    representante: '',
    telefono: '',
    temasTratados: '',
    observaciones: ''
  });

  // Estados para Historial de Comisiones
  const [comisiones, setComisiones] = useState([]);
  const [showHistorialComisiones, setShowHistorialComisiones] = useState(false);

  // Estado para historial general
  const [showHistorialGeneral, setShowHistorialGeneral] = useState(false);

  // Cargar datos guardados al iniciar
  useEffect(() => {
    const datosGuardados = localStorage.getItem('supervision_viaticos');
    if (datosGuardados) {
      try {
        const datos = JSON.parse(datosGuardados);
        setViaticos(datos);
        console.log('Datos de viáticos cargados:', datos.length, 'registros');
      } catch (error) {
        console.error('Error al cargar datos de viáticos:', error);
      }
    }

    const recibosGuardados = localStorage.getItem('supervision_recibos');
    if (recibosGuardados) {
      try {
        const datos = JSON.parse(recibosGuardados);
        setRecibos(datos);
        console.log('Datos de recibos cargados:', datos.length, 'registros');
      } catch (error) {
        console.error('Error al cargar datos de recibos:', error);
      }
    }

    // Cargar listas personalizadas de vendedores y giras
    const vendedoresGuardados = localStorage.getItem('supervision_vendedores');
    if (vendedoresGuardados) {
      try {
        setVendedores(JSON.parse(vendedoresGuardados));
      } catch (error) {
        console.error('Error al cargar vendedores:', error);
      }
    }

    const girasGuardadas = localStorage.getItem('supervision_giras');
    if (girasGuardadas) {
      try {
        setGiras(JSON.parse(girasGuardadas));
      } catch (error) {
        console.error('Error al cargar giras:', error);
      }
    }

    const rutasGuardadas = localStorage.getItem('supervision_rutas');
    if (rutasGuardadas) {
      try {
        setRutas(JSON.parse(rutasGuardadas));
      } catch (error) {
        console.error('Error al cargar rutas:', error);
      }
    }

    const evaluacionesGuardadas = localStorage.getItem('supervision_evaluaciones');
    if (evaluacionesGuardadas) {
      try {
        const datos = JSON.parse(evaluacionesGuardadas);
        setEvaluaciones(datos);
        console.log('Datos de evaluaciones cargados:', datos.length, 'registros');
      } catch (error) {
        console.error('Error al cargar evaluaciones:', error);
      }
    }

    const visitasGuardadas = localStorage.getItem('supervision_visitas');
    if (visitasGuardadas) {
      try {
        const datos = JSON.parse(visitasGuardadas);
        setVisitas(datos);
        console.log('Datos de visitas proveedores cargados:', datos.length, 'registros');
      } catch (error) {
        console.error('Error al cargar visitas proveedores:', error);
      }
    }

    const comisionesGuardadas = localStorage.getItem('supervision_comisiones');
    if (comisionesGuardadas) {
      try {
        const datos = JSON.parse(comisionesGuardadas);
        setComisiones(datos);
        console.log('Datos de comisiones cargados:', datos.length, 'registros');
      } catch (error) {
        console.error('Error al cargar comisiones:', error);
      }
    }
  }, []);

  // Autoguardado cada 2 minutos
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (viaticos.length > 0 || recibos.length > 0 || evaluaciones.length > 0 || visitas.length > 0 || comisiones.length > 0) {
        guardarDatosAutomatico();
      }
    }, 120000);

    return () => clearInterval(autoSaveInterval);
  }, [viaticos, recibos, evaluaciones, visitas, comisiones]);

  // Función de autoguardado
  const guardarDatosAutomatico = useCallback(() => {
    try {
      localStorage.setItem('supervision_viaticos', JSON.stringify(viaticos));
      localStorage.setItem('supervision_recibos', JSON.stringify(recibos));
      localStorage.setItem('supervision_evaluaciones', JSON.stringify(evaluaciones));
      localStorage.setItem('supervision_visitas', JSON.stringify(visitas));
      localStorage.setItem('supervision_comisiones', JSON.stringify(comisiones));
      setLastSaved(new Date());
      console.log('Autoguardado completado');
    } catch (error) {
      console.error('Error en autoguardado:', error);
    }
  }, [viaticos, recibos, evaluaciones, visitas, comisiones]);

  // Verificar contraseña
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (verifyPassword(password, null, 'admin')) {
      setIsAuthenticated(true);
      console.log('Acceso autorizado a Supervisión');
    } else {
      alert('Contraseña incorrecta. Por favor, intenta de nuevo.');
      setPassword('');
    }
  };

  // Agregar nueva fila
  const agregarFila = useCallback(() => {
    const nuevaFila = {
      id: Date.now(),
      no: viaticos.length + 1,
      fecha: '',
      vendedor: '',
      gira: '',
      monto: ''
    };
    setViaticos(prev => [...prev, nuevaFila]);
    console.log('Nueva fila agregada');
  }, [viaticos.length]);

  // Actualizar campo
  const actualizarCampo = useCallback((id, campo, valor) => {
    setViaticos(prev =>
      prev.map(item => {
        if (item.id === id) {
          // Si el campo es monto, formatear como número
          if (campo === 'monto') {
            // Remover cualquier carácter que no sea dígito o punto decimal
            const numericValue = valor.replace(/[^0-9.]/g, '');
            return { ...item, [campo]: numericValue };
          }
          return { ...item, [campo]: valor };
        }
        return item;
      })
    );
  }, []);

  // Eliminar fila
  const eliminarFila = useCallback((id) => {
    if (window.confirm('¿Deseas eliminar esta fila?')) {
      setViaticos(prev => {
        const nuevosViaticos = prev.filter(item => item.id !== id);
        // Renumerar después de eliminar
        return nuevosViaticos.map((item, index) => ({
          ...item,
          no: index + 1
        }));
      });
      console.log('Fila eliminada');
    }
  }, []);

  // Formatear moneda Quetzales
  const formatearMoneda = (valor) => {
    if (!valor) return 'Q0.00';
    const numero = parseFloat(valor);
    if (isNaN(numero)) return 'Q0.00';
    return `Q${numero.toLocaleString('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Calcular total
  const calcularTotal = useCallback(() => {
    return viaticos.reduce((sum, item) => {
      const monto = parseFloat(item.monto) || 0;
      return sum + monto;
    }, 0);
  }, [viaticos]);

  // Guardar datos manualmente
  const guardarDatos = useCallback(() => {
    try {
      localStorage.setItem('supervision_viaticos', JSON.stringify(viaticos));
      localStorage.setItem('supervision_recibos', JSON.stringify(recibos));
      localStorage.setItem('supervision_evaluaciones', JSON.stringify(evaluaciones));
      localStorage.setItem('supervision_comisiones', JSON.stringify(comisiones));
      setLastSaved(new Date());
      console.log('Datos guardados manualmente');
      alert('Datos guardados correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los datos: ' + error.message);
    }
  }, [viaticos, recibos, evaluaciones, comisiones]);

  // Limpiar formulario de viáticos
  const limpiarFormulario = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas limpiar el formulario de viáticos? Esta acción no se puede deshacer.')) {
      setViaticos([]);
      localStorage.removeItem('supervision_viaticos');
      console.log('Formulario de viáticos limpiado');
      alert('Formulario de viáticos limpiado correctamente');
    }
  }, []);

  // Limpiar formulario de recibos
  const limpiarFormularioRecibos = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas limpiar el formulario de recibos de caja? Esta acción no se puede deshacer.')) {
      setRecibos([]);
      localStorage.removeItem('supervision_recibos');
      console.log('Formulario de recibos limpiado');
      alert('Formulario de recibos limpiado correctamente');
    }
  }, []);

  // ====== GESTIÓN DE VENDEDORES ======
  const agregarVendedor = useCallback(() => {
    if (nuevoVendedor.trim()) {
      if (vendedores.includes(nuevoVendedor.trim())) {
        alert('Este vendedor ya existe en la lista');
        return;
      }
      const nuevosVendedores = [...vendedores, nuevoVendedor.trim()].sort();
      setVendedores(nuevosVendedores);
      localStorage.setItem('supervision_vendedores', JSON.stringify(nuevosVendedores));
      setNuevoVendedor('');
      console.log('Vendedor agregado:', nuevoVendedor);
    }
  }, [nuevoVendedor, vendedores]);

  const eliminarVendedor = useCallback((vendedor) => {
    if (window.confirm(`¿Deseas eliminar a "${vendedor}" de la lista de vendedores?`)) {
      const nuevosVendedores = vendedores.filter(v => v !== vendedor);
      setVendedores(nuevosVendedores);
      localStorage.setItem('supervision_vendedores', JSON.stringify(nuevosVendedores));
      console.log('Vendedor eliminado:', vendedor);
    }
  }, [vendedores]);

  // ====== GESTIÓN DE GIRAS ======
  const agregarGira = useCallback(() => {
    if (nuevaGira.trim()) {
      if (giras.includes(nuevaGira.trim())) {
        alert('Esta gira ya existe en la lista');
        return;
      }
      const nuevasGiras = [...giras, nuevaGira.trim()].sort();
      setGiras(nuevasGiras);
      localStorage.setItem('supervision_giras', JSON.stringify(nuevasGiras));
      setNuevaGira('');
      console.log('Gira agregada:', nuevaGira);
    }
  }, [nuevaGira, giras]);

  const eliminarGira = useCallback((gira) => {
    if (window.confirm(`¿Deseas eliminar "${gira}" de la lista de giras?`)) {
      const nuevasGiras = giras.filter(g => g !== gira);
      setGiras(nuevasGiras);
      localStorage.setItem('supervision_giras', JSON.stringify(nuevasGiras));
      console.log('Gira eliminada:', gira);
    }
  }, [giras]);

  // ====== GESTIÓN DE RUTAS ======
  const agregarRuta = useCallback(() => {
    if (nuevaRuta.trim()) {
      if (rutas.includes(nuevaRuta.trim())) {
        alert('Esta ruta ya existe en la lista');
        return;
      }
      const nuevasRutas = [...rutas, nuevaRuta.trim()].sort();
      setRutas(nuevasRutas);
      localStorage.setItem('supervision_rutas', JSON.stringify(nuevasRutas));
      setNuevaRuta('');
      console.log('Ruta agregada:', nuevaRuta);
    }
  }, [nuevaRuta, rutas]);

  const eliminarRuta = useCallback((ruta) => {
    if (window.confirm(`¿Deseas eliminar "${ruta}" de la lista de rutas?`)) {
      const nuevasRutas = rutas.filter(r => r !== ruta);
      setRutas(nuevasRutas);
      localStorage.setItem('supervision_rutas', JSON.stringify(nuevasRutas));
      console.log('Ruta eliminada:', ruta);
    }
  }, [rutas]);

  // ====== FUNCIONES DE HISTORIAL ======
  const filtrarPorFecha = useCallback((datos) => {
    if (!fechaInicio && !fechaFin) return datos;

    return datos.filter(item => {
      if (!item.fecha) return false;
      const fecha = new Date(item.fecha + 'T00:00:00');
      const inicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : null;
      const fin = fechaFin ? new Date(fechaFin + 'T00:00:00') : null;

      if (inicio && fin) {
        return fecha >= inicio && fecha <= fin;
      } else if (inicio) {
        return fecha >= inicio;
      } else if (fin) {
        return fecha <= fin;
      }
      return true;
    });
  }, [fechaInicio, fechaFin]);

  const exportarHistorialViaticos = useCallback(() => {
    const datosFiltrados = filtrarPorFecha(viaticos);

    if (datosFiltrados.length === 0) {
      alert('No hay datos en el rango de fechas seleccionado');
      return;
    }

    try {
      const datosExportacion = datosFiltrados.map((item) => ({
        'No.': item.no,
        'Fecha': item.fecha,
        'Vendedor': item.vendedor,
        'Gira': item.gira,
        'Monto Viaticos': item.monto ? parseFloat(item.monto).toFixed(2) : '0.00'
      }));

      // Calcular total
      const total = datosFiltrados.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0);

      datosExportacion.push({
        'No.': '',
        'Fecha': '',
        'Vendedor': '',
        'Gira': 'TOTAL',
        'Monto Viaticos': total.toFixed(2)
      });

      const ws = XLSX.utils.json_to_sheet(datosExportacion);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial Viaticos');

      ws['!cols'] = [
        { wch: 8 },   // No.
        { wch: 12 },  // Fecha
        { wch: 25 },  // Vendedor
        { wch: 40 },  // Gira
        { wch: 18 }   // Monto Viaticos
      ];

      const fecha = getLocalDateString();
      const nombreArchivo = `Historial_Viaticos_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      alert('¡Historial exportado exitosamente!');
      console.log('Historial de viáticos exportado');
    } catch (error) {
      console.error('Error al exportar historial:', error);
      alert('Error al exportar el historial: ' + error.message);
    }
  }, [viaticos, filtrarPorFecha]);

  const exportarHistorialRecibos = useCallback(() => {
    const datosFiltrados = filtrarPorFecha(recibos);

    if (datosFiltrados.length === 0) {
      alert('No hay datos en el rango de fechas seleccionado');
      return;
    }

    try {
      const datosExportacion = datosFiltrados.map((item) => ({
        'No.': item.no,
        'Fecha': item.fecha,
        'Vendedor': item.vendedor,
        'Gira Visitada': item.giraVisitada,
        'Correlativo Inicial': item.correlativoInicial,
        'Correlativo Final': item.correlativoFinal,
        'Observaciones': item.observaciones || ''
      }));

      const ws = XLSX.utils.json_to_sheet(datosExportacion);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial Recibos');

      ws['!cols'] = [
        { wch: 8 },   // No.
        { wch: 12 },  // Fecha
        { wch: 25 },  // Vendedor
        { wch: 40 },  // Gira Visitada
        { wch: 18 },  // Correlativo Inicial
        { wch: 18 },  // Correlativo Final
        { wch: 30 }   // Observaciones
      ];

      const fecha = getLocalDateString();
      const nombreArchivo = `Historial_Recibos_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      alert('¡Historial exportado exitosamente!');
      console.log('Historial de recibos exportado');
    } catch (error) {
      console.error('Error al exportar historial:', error);
      alert('Error al exportar el historial: ' + error.message);
    }
  }, [recibos, filtrarPorFecha]);

  // Exportar a Excel - Viáticos (CORREGIDO)
  const exportarExcel = useCallback(() => {
    console.log('=== INICIO EXPORTACIÓN EXCEL VIÁTICOS ===');

    if (viaticos.length === 0) {
      alert('No hay datos para exportar. Por favor, agrega registros primero.');
      return;
    }

    try {
      const datosExportacion = viaticos.map((item) => ({
        'No.': item.no,
        'Fecha': item.fecha,
        'Vendedor': item.vendedor,
        'Gira': item.gira,
        'Monto Viaticos': item.monto ? parseFloat(item.monto).toFixed(2) : '0.00'
      }));

      // Agregar fila de total
      const total = calcularTotal();
      datosExportacion.push({
        'No.': '',
        'Fecha': '',
        'Vendedor': '',
        'Gira': 'TOTAL',
        'Monto Viaticos': total.toFixed(2)
      });

      console.log('Datos preparados para exportación:', datosExportacion.length, 'filas');

      const ws = XLSX.utils.json_to_sheet(datosExportacion);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Control de Viaticos');

      // Configurar anchos de columnas
      ws['!cols'] = [
        { wch: 8 },   // No.
        { wch: 12 },  // Fecha
        { wch: 25 },  // Vendedor
        { wch: 40 },  // Gira
        { wch: 18 }   // Monto Viaticos
      ];

      const fecha = getLocalDateString();
      const nombreArchivo = `Control_Viaticos_${fecha}.xlsx`;

      console.log('Intentando escribir archivo:', nombreArchivo);
      XLSX.writeFile(wb, nombreArchivo);

      console.log('✅ Archivo exportado exitosamente');
      alert('¡Archivo exportado exitosamente! Revisa tu carpeta de descargas.');
    } catch (error) {
      console.error('❌ ERROR EN EXPORTACIÓN:', error);
      alert('Error al exportar el archivo: ' + error.message);
    }
  }, [viaticos, calcularTotal]);

  // ====== FUNCIONES PARA RECIBOS DE CAJA ======

  // Agregar nueva fila de recibos
  const agregarFilaRecibos = useCallback(() => {
    const nuevaFila = {
      id: Date.now(),
      no: recibos.length + 1,
      fecha: '',
      vendedor: '',
      giraVisitada: '',
      correlativoInicial: '',
      correlativoFinal: '',
      observaciones: ''
    };
    setRecibos(prev => [...prev, nuevaFila]);
    console.log('Nueva fila de recibos agregada');
  }, [recibos.length]);

  // Actualizar campo de recibos
  const actualizarCampoRecibos = useCallback((id, campo, valor) => {
    setRecibos(prev =>
      prev.map(item => {
        if (item.id === id) {
          // Si el campo es correlativo, solo permitir números
          if (campo === 'correlativoInicial' || campo === 'correlativoFinal') {
            const numericValue = valor.replace(/[^0-9]/g, '');
            return { ...item, [campo]: numericValue };
          }
          return { ...item, [campo]: valor };
        }
        return item;
      })
    );
  }, []);

  // Eliminar fila de recibos
  const eliminarFilaRecibos = useCallback((id) => {
    if (window.confirm('¿Deseas eliminar esta fila?')) {
      setRecibos(prev => {
        const nuevosRecibos = prev.filter(item => item.id !== id);
        // Renumerar después de eliminar
        return nuevosRecibos.map((item, index) => ({
          ...item,
          no: index + 1
        }));
      });
      console.log('Fila de recibos eliminada');
    }
  }, []);

  // Exportar a Excel - Recibos de Caja
  const exportarExcelRecibos = useCallback(() => {
    console.log('=== INICIO EXPORTACIÓN EXCEL RECIBOS ===');

    if (recibos.length === 0) {
      alert('No hay datos para exportar. Por favor, agrega registros primero.');
      return;
    }

    try {
      const datosExportacion = recibos.map((item) => ({
        'No.': item.no,
        'Fecha': item.fecha,
        'Vendedor': item.vendedor,
        'Gira Visitada': item.giraVisitada,
        'Correlativo Inicial': item.correlativoInicial,
        'Correlativo Final': item.correlativoFinal
      }));

      console.log('Datos preparados para exportación:', datosExportacion.length, 'filas');

      const ws = XLSX.utils.json_to_sheet(datosExportacion);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Control de Recibos');

      // Configurar anchos de columnas
      ws['!cols'] = [
        { wch: 8 },   // No.
        { wch: 12 },  // Fecha
        { wch: 25 },  // Vendedor
        { wch: 40 },  // Gira Visitada
        { wch: 18 },  // Correlativo Inicial
        { wch: 18 }   // Correlativo Final
      ];

      const fecha = getLocalDateString();
      const nombreArchivo = `Control_Recibos_Caja_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);

      console.log('✅ Archivo de recibos exportado exitosamente');
      alert('¡Archivo exportado exitosamente! Revisa tu carpeta de descargas.');
    } catch (error) {
      console.error('❌ ERROR EN EXPORTACIÓN:', error);
      alert('Error al exportar el archivo: ' + error.message);
    }
  }, [recibos]);

  // ====== FUNCIONES PARA EVALUACIÓN DE VENDEDOR ======

  // Guardar nueva evaluación desde el formulario detallado
  const guardarNuevaEvaluacion = useCallback(async (datosEvaluacion) => {
    try {
      const nuevaEvaluacion = {
        id: Date.now(),
        ...datosEvaluacion
      };

      if (editingRecord) {
        // Actualizar registro existente
        const updatedDatos = {
          ...editingRecord.datos,
          evaluaciones: [nuevaEvaluacion], // Reemplazamos con la nueva versión
          timestamp: new Date().toISOString()
        };

        await updateHistoryRecord('evaluaciones', editingRecord.id, updatedDatos);
        alert('Evaluación actualizada exitosamente en el historial');
        setEditingRecord(null);
      } else {
        // Crear nuevo registro
        // Guardamos directamente en el historial como un array de 1 elemento
        await saveEvaluacionesToHistory([nuevaEvaluacion]);
        alert('Evaluación guardada exitosamente en el historial');
      }

      // Actualizar estado local (opcional, para visualización inmediata si se usa la lista)
      setEvaluaciones(prev => {
        if (editingRecord) {
           return prev.map(ev => ev.id === editingRecord.datos.evaluaciones[0]?.id ? nuevaEvaluacion : ev);
        }
        return [...prev, nuevaEvaluacion];
      });

      setShowNewEvaluationForm(false);
      console.log('Evaluación procesada:', nuevaEvaluacion);
    } catch (error) {
      console.error('Error al guardar evaluación:', error);
      alert('Error al guardar la evaluación: ' + error.message);
    }
  }, [editingRecord]);

  // Manejar edición desde el historial
  const handleEditEvaluation = useCallback((record) => {
    console.log('Editando registro:', record);
    if (record.datos && record.datos.evaluaciones && record.datos.evaluaciones.length > 0) {
      setEditingRecord(record);
      setShowNewEvaluationForm(true);
    } else {
      alert('No se encontraron datos de evaluación en este registro.');
    }
  }, []);

  // Agregar nueva evaluación (Activa el formulario)
  const agregarEvaluacion = useCallback(() => {
    setEditingRecord(null);
    setShowNewEvaluationForm(true);
  }, []);

  // Eliminar evaluación
  const eliminarEvaluacion = useCallback((id) => {
    if (window.confirm('¿Deseas eliminar esta evaluación?')) {
      setEvaluaciones(prev => prev.filter(ev => ev.id !== id));
      console.log('Evaluación eliminada');
    }
  }, []);

  // Calcular puntaje total de evaluación
  const calcularPuntajeEvaluacion = useCallback((evaluacion) => {
    if (evaluacion.total) return evaluacion.total; // Si ya viene calculado
    if (evaluacion.aspectos) {
      return evaluacion.aspectos.reduce((sum, asp) => {
        return sum + parseFloat(asp.porcentajeRecibido || 0);
      }, 0);
    }
    return 0;
  }, []);

  // Limpiar formulario de evaluaciones
  const limpiarFormularioEvaluaciones = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas limpiar el formulario de evaluaciones? Esta acción no se puede deshacer.')) {
      setEvaluaciones([]);
      localStorage.removeItem('supervision_evaluaciones');
      console.log('Formulario de evaluaciones limpiado');
      alert('Formulario de evaluaciones limpiado correctamente');
    }
  }, []);

  // Exportar evaluaciones a PDF
  const exportarPDFEvaluaciones = useCallback(() => {
    console.log('=== INICIO EXPORTACIÓN PDF EVALUACIONES ===');
    
    if (evaluaciones.length === 0) {
      alert('No hay datos para exportar. Por favor, agrega registros primero.');
      return;
    }

    try {
      // Create a structure that looks like a history record for the export function
      const tempRecord = {
        fecha_creacion: new Date().toISOString(),
        datos: {
          evaluaciones: evaluaciones
        }
      };
      
      exportEvaluacionesToPDF(tempRecord);
      alert('¡PDF exportado exitosamente!');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al generar el PDF: ' + error.message);
    }
  }, [evaluaciones]);

  // Exportar historial de evaluaciones
  const exportarHistorialEvaluaciones = useCallback(() => {
    const datosFiltrados = filtrarPorFecha(evaluaciones);

    if (datosFiltrados.length === 0) {
      alert('No hay datos en el rango de fechas seleccionado');
      return;
    }

    try {
      const datosExportacion = [];

      datosFiltrados.forEach((ev) => {
        const total = calcularPuntajeEvaluacion(ev).toFixed(0);

        ev.aspectos.forEach((asp) => {
          datosExportacion.push({
            'Fecha Evaluacion': ev.fecha,
            'Vendedor': ev.vendedor,
            'Ruta': ev.ruta,
            'Aspecto a Evaluar': asp.aspecto,
            'Descripcion del Indicador': asp.descripcion,
            'Checklist': asp.checklist ? 'Sí' : 'No',
            'Porcentaje Recibido': asp.porcentajeRecibido,
            'Grand Total': total
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(datosExportacion);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial Evaluaciones');

      ws['!cols'] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 30 },
        { wch: 25 },
        { wch: 50 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 }
      ];

      const fecha = getLocalDateString();
      const nombreArchivo = `Historial_Evaluaciones_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      alert('¡Historial exportado exitosamente!');
      console.log('Historial de evaluaciones exportado');
    } catch (error) {
      console.error('Error al exportar historial:', error);
      alert('Error al exportar el historial: ' + error.message);
    }
  }, [evaluaciones, filtrarPorFecha, calcularPuntajeEvaluacion]);

  // ===== FUNCIONES PARA VISITAS PROVEEDORES =====

  // Agregar nueva visita
  const agregarVisita = useCallback(() => {
    if (!nuevaVisita.fechaVisita || !nuevaVisita.proveedor || !nuevaVisita.representante) {
      alert('Por favor completa al menos los campos: Fecha de Visita, Proveedor y Representante');
      return;
    }

    const visita = {
      id: Date.now(),
      ...nuevaVisita
    };

    setVisitas(prev => [...prev, visita]);

    // Limpiar formulario
    setNuevaVisita({
      fechaVisita: '',
      proveedor: '',
      representante: '',
      telefono: '',
      temasTratados: '',
      observaciones: ''
    });

    localStorage.setItem('supervision_visitas', JSON.stringify([...visitas, visita]));
    console.log('Nueva visita agregada:', visita);
    alert('Visita agregada exitosamente');
  }, [nuevaVisita, visitas]);

  // Eliminar visita
  const eliminarVisita = useCallback((id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta visita?')) {
      const nuevasVisitas = visitas.filter(v => v.id !== id);
      setVisitas(nuevasVisitas);
      localStorage.setItem('supervision_visitas', JSON.stringify(nuevasVisitas));
      console.log('Visita eliminada');
    }
  }, [visitas]);

  // Filtrar visitas por fecha y proveedor
  const filtrarVisitas = useCallback(() => {
    let visitasFiltradas = visitas;

    // Filtrar por rango de fechas
    if (fechaInicio && fechaFin) {
      visitasFiltradas = visitasFiltradas.filter(visita => {
        const fechaVisita = new Date(visita.fechaVisita);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return fechaVisita >= inicio && fechaVisita <= fin;
      });
    }

    // Filtrar por proveedor
    if (filtroProveedor) {
      visitasFiltradas = visitasFiltradas.filter(visita =>
        visita.proveedor.toLowerCase().includes(filtroProveedor.toLowerCase())
      );
    }

    return visitasFiltradas;
  }, [visitas, fechaInicio, fechaFin, filtroProveedor]);

  // Exportar historial de visitas a Excel
  const exportarHistorialVisitas = useCallback(() => {
    const visitasFiltradas = filtrarVisitas();

    if (visitasFiltradas.length === 0) {
      alert('No hay visitas en el rango de fechas seleccionado o con el filtro aplicado');
      return;
    }

    try {
      console.log('=== INICIO EXPORTACIÓN VISITAS ===');
      console.log('Visitas filtradas:', visitasFiltradas.length);

      const datosExportar = visitasFiltradas.map(visita => ({
        'Fecha de Visita': visita.fechaVisita,
        'Proveedor': visita.proveedor,
        'Representante': visita.representante,
        'Teléfono': visita.telefono,
        'Temas Tratados': visita.temasTratados,
        'Observaciones': visita.observaciones || ''
      }));

      console.log('Datos preparados para exportación:', datosExportar.length, 'filas');

      const ws = XLSX.utils.json_to_sheet(datosExportar);
      console.log('Hoja creada exitosamente');

      const wb = XLSX.utils.book_new();
      console.log('Libro creado exitosamente');

      XLSX.utils.book_append_sheet(wb, ws, 'Visitas Proveedores');
      console.log('Hoja agregada exitosamente');

      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 60 }
      ];

      const fecha = getLocalDateString();
      const nombreArchivo = `Historial_Visitas_Proveedores_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      alert('¡Historial de visitas exportado exitosamente!');
      console.log('Historial de visitas exportado');
    } catch (error) {
      console.error('Error al exportar historial de visitas:', error);
      alert('Error al exportar el historial: ' + error.message);
    }
  }, [filtrarVisitas]);

  // Limpiar formulario de visitas
  const limpiarFormularioVisitas = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todas las visitas? Esta acción no se puede deshacer.')) {
      setVisitas([]);
      localStorage.removeItem('supervision_visitas');
      console.log('Formulario de visitas limpiado');
      alert('Formulario de visitas limpiado correctamente');
    }
  }, []);

  // ====== FUNCIONES PARA HISTORIAL DE COMISIONES ======
  // Calcular total de una fila de comisión
  const calcularTotalComision = useCallback((comision) => {
    const anticipo = parseFloat(comision.anticipo) || 0;
    const comisionesVal = parseFloat(comision.comisiones) || 0;
    const descuentoIVA = parseFloat(comision.descuentoIVA) || 0;
    const descuentoSeguroVehiculos = parseFloat(comision.descuentoSeguroVehiculos) || 0;
    const descuentoISR = parseFloat(comision.descuentoISR) || 0;
    const bonoIngreso = parseFloat(comision.bonoIngreso) || 0;
    const descuentoCelularServicio = parseFloat(comision.descuentoCelularServicio) || 0;
    const descuentoCuentasIncobrables = parseFloat(comision.descuentoCuentasIncobrables) || 0;
    const descuentoComprasPersonales = parseFloat(comision.descuentoComprasPersonales) || 0;
    const descuentoPrestVehiculo = parseFloat(comision.descuentoPrestVehiculo) || 0;
    const anticiposPrestamo = parseFloat(comision.anticiposPrestamo) || 0;
    const descuentosVarios = parseFloat(comision.descuentosVarios) || 0;

    return anticipo + comisionesVal + descuentoIVA + descuentoSeguroVehiculos + descuentoISR +
           bonoIngreso + descuentoCelularServicio + descuentoCuentasIncobrables +
           descuentoComprasPersonales + descuentoPrestVehiculo + anticiposPrestamo + descuentosVarios;
  }, []);

  const agregarComision = useCallback(() => {
    const nuevaComision = {
      id: Date.now(),
      no: comisiones.length + 1,
      fecha: '',
      vendedor: '',
      anticipo: '',
      comisiones: '',
      descuentoIVA: '',
      descuentoSeguroVehiculos: '',
      descuentoISR: '',
      bonoIngreso: '',
      descuentoCelularServicio: '',
      descuentoCuentasIncobrables: '',
      descuentoComprasPersonales: '',
      descuentoPrestVehiculo: '',
      anticiposPrestamo: '',
      descuentosVarios: '',
      observaciones: ''
    };
    setComisiones(prev => [...prev, nuevaComision]);
    console.log('Nueva comisión agregada');
  }, [comisiones.length]);

  const actualizarComision = useCallback((id, campo, valor) => {
    setComisiones(prev =>
      prev.map(item => {
        if (item.id === id) {
          if (campo === 'apoyoEconomico' || campo === 'comisiones') {
            const numericValue = valor.replace(/[^0-9.]/g, '');
            return { ...item, [campo]: numericValue };
          }
          return { ...item, [campo]: valor };
        }
        return item;
      })
    );
  }, []);

  const eliminarComision = useCallback((id) => {
    if (window.confirm('¿Deseas eliminar esta comisión?')) {
      setComisiones(prev => {
        const nuevasComisiones = prev.filter(item => item.id !== id);
        return nuevasComisiones.map((item, index) => ({
          ...item,
          no: index + 1
        }));
      });
      console.log('Comisión eliminada');
    }
  }, []);

  const limpiarFormularioComisiones = useCallback(() => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todas las comisiones? Esta acción no se puede deshacer.')) {
      setComisiones([]);
      localStorage.removeItem('supervision_comisiones');
      console.log('Formulario de comisiones limpiado');
      alert('Formulario de comisiones limpiado correctamente');
    }
  }, []);

  const exportarExcelComisiones = useCallback(() => {
    if (comisiones.length === 0) {
      alert('No hay comisiones para exportar');
      return;
    }

    try {
      const datosExportacion = comisiones.map((item) => ({
        'No.': item.no,
        'Fecha': item.fecha,
        'Vendedor': item.vendedor,
        'Anticipo': item.anticipo ? parseFloat(item.anticipo).toFixed(2) : '0.00',
        'Comisiones': item.comisiones ? parseFloat(item.comisiones).toFixed(2) : '0.00',
        'Descuento IVA': item.descuentoIVA ? parseFloat(item.descuentoIVA).toFixed(2) : '0.00',
        'Descuento por Seguro de Vehiculos': item.descuentoSeguroVehiculos ? parseFloat(item.descuentoSeguroVehiculos).toFixed(2) : '0.00',
        'Descuento ISR': item.descuentoISR ? parseFloat(item.descuentoISR).toFixed(2) : '0.00',
        'Bono Ingreso': item.bonoIngreso ? parseFloat(item.bonoIngreso).toFixed(2) : '0.00',
        'Descuento Celular Servicio': item.descuentoCelularServicio ? parseFloat(item.descuentoCelularServicio).toFixed(2) : '0.00',
        'Descuento Cuentas Incobrables': item.descuentoCuentasIncobrables ? parseFloat(item.descuentoCuentasIncobrables).toFixed(2) : '0.00',
        'Descuento x Compras Personales': item.descuentoComprasPersonales ? parseFloat(item.descuentoComprasPersonales).toFixed(2) : '0.00',
        'Descuento Prest Vehiculo': item.descuentoPrestVehiculo ? parseFloat(item.descuentoPrestVehiculo).toFixed(2) : '0.00',
        'Anticipos (Prestamo)': item.anticiposPrestamo ? parseFloat(item.anticiposPrestamo).toFixed(2) : '0.00',
        'Descuentos Varios': item.descuentosVarios ? parseFloat(item.descuentosVarios).toFixed(2) : '0.00',
        'Observaciones': item.observaciones || '',
        'Total': calcularTotalComision(item).toFixed(2)
      }));

      const totalAnticipo = comisiones.reduce((sum, item) => sum + (parseFloat(item.anticipo) || 0), 0);
      const totalComisiones = comisiones.reduce((sum, item) => sum + (parseFloat(item.comisiones) || 0), 0);
      const totalDescuentoIVA = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentoIVA) || 0), 0);
      const totalDescuentoSeguroVehiculos = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentoSeguroVehiculos) || 0), 0);
      const totalDescuentoISR = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentoISR) || 0), 0);
      const totalBonoIngreso = comisiones.reduce((sum, item) => sum + (parseFloat(item.bonoIngreso) || 0), 0);
      const totalDescuentoCelularServicio = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentoCelularServicio) || 0), 0);
      const totalDescuentoCuentasIncobrables = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentoCuentasIncobrables) || 0), 0);
      const totalDescuentoComprasPersonales = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentoComprasPersonales) || 0), 0);
      const totalDescuentoPrestVehiculo = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentoPrestVehiculo) || 0), 0);
      const totalAnticiposPrestamo = comisiones.reduce((sum, item) => sum + (parseFloat(item.anticiposPrestamo) || 0), 0);
      const totalDescuentosVarios = comisiones.reduce((sum, item) => sum + (parseFloat(item.descuentosVarios) || 0), 0);

      datosExportacion.push({
        'No.': '',
        'Fecha': '',
        'Vendedor': 'TOTAL',
        'Anticipo': totalAnticipo.toFixed(2),
        'Comisiones': totalComisiones.toFixed(2),
        'Descuento IVA': totalDescuentoIVA.toFixed(2),
        'Descuento por Seguro de Vehiculos': totalDescuentoSeguroVehiculos.toFixed(2),
        'Descuento ISR': totalDescuentoISR.toFixed(2),
        'Bono Ingreso': totalBonoIngreso.toFixed(2),
        'Descuento Celular Servicio': totalDescuentoCelularServicio.toFixed(2),
        'Descuento Cuentas Incobrables': totalDescuentoCuentasIncobrables.toFixed(2),
        'Descuento x Compras Personales': totalDescuentoComprasPersonales.toFixed(2),
        'Descuento Prest Vehiculo': totalDescuentoPrestVehiculo.toFixed(2),
        'Anticipos (Prestamo)': totalAnticiposPrestamo.toFixed(2),
        'Descuentos Varios': totalDescuentosVarios.toFixed(2)
      });

      const ws = XLSX.utils.json_to_sheet(datosExportacion);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial Comisiones');

      ws['!cols'] = [
        { wch: 8 },   // No.
        { wch: 12 },  // Fecha
        { wch: 25 },  // Vendedor
        { wch: 18 },  // Apoyo Economico
        { wch: 18 }   // Comisiones
      ];

      const fecha = getLocalDateString();
      const nombreArchivo = `Historial_Comisiones_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
      alert('¡Historial de comisiones exportado exitosamente!');
      console.log('Historial de comisiones exportado');
    } catch (error) {
      console.error('Error al exportar historial:', error);
      alert('Error al exportar el historial: ' + error.message);
    }
  }, [comisiones, calcularTotalComision]);

  // Guardar Viaticos en Historial
  const guardarViaticosEnHistorial = async () => {
    console.log('Intentando guardar viáticos en historial...');
    console.log('Viáticos:', viaticos.length);

    if (viaticos.length === 0) {
      alert('No hay viáticos para guardar en el historial. Agregue viáticos primero.');
      return;
    }

    try {
      await saveViaticosToHistory(viaticos);
      console.log('Viáticos guardados exitosamente en historial');
      alert('Viáticos guardados exitosamente en el historial');
    } catch (error) {
      console.error('Error al guardar viáticos en historial:', error);
      alert('Error al guardar en el historial. Por favor, intente de nuevo.');
    }
  };

  // Guardar Recibos en Historial
  const guardarRecibosEnHistorial = async () => {
    console.log('Intentando guardar recibos en historial...');
    console.log('Viáticos:', viaticos.length, 'Recibos:', recibos.length);

    if (viaticos.length === 0 && recibos.length === 0) {
      alert('No hay datos para guardar en el historial. Agregue viáticos o recibos primero.');
      return;
    }

    try {
      await saveRecibosToHistory(viaticos, recibos);
      console.log('Recibos guardados exitosamente en historial');
      alert('Control de Recibos guardado exitosamente en el historial');
    } catch (error) {
      console.error('Error al guardar recibos en historial:', error);
      alert('Error al guardar en el historial. Por favor, intente de nuevo.');
    }
  };

  // Guardar Comisiones en Historial
  const guardarComisionesEnHistorial = async () => {
    console.log('Intentando guardar comisiones en historial...');
    console.log('Comisiones:', comisiones.length);

    if (comisiones.length === 0) {
      alert('No hay comisiones para guardar en el historial. Agregue comisiones primero.');
      return;
    }

    try {
      await saveComisionesToHistory(comisiones);
      console.log('Comisiones guardadas exitosamente en historial');
      alert('Historial de Comisiones guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar comisiones en historial:', error);
      alert('Error al guardar en el historial. Por favor, intente de nuevo.');
    }
  };

  // Guardar Evaluaciones en Historial
  const guardarEvaluacionesEnHistorial = async () => {
    console.log('Intentando guardar evaluaciones en historial...');
    console.log('Evaluaciones:', evaluaciones.length);

    if (evaluaciones.length === 0) {
      alert('No hay evaluaciones para guardar en el historial. Agregue evaluaciones primero.');
      return;
    }

    try {
      await saveEvaluacionesToHistory(evaluaciones);
      console.log('Evaluaciones guardadas exitosamente en historial');
      alert('Evaluaciones de Vendedor guardadas exitosamente en el historial');
    } catch (error) {
      console.error('Error al guardar evaluaciones en historial:', error);
      alert('Error al guardar en el historial. Por favor, intente de nuevo.');
    }
  };

  // Guardar Visitas en Historial
  const guardarVisitasEnHistorial = async () => {
    console.log('Intentando guardar visitas en historial...');
    console.log('Visitas:', visitas.length);

    if (visitas.length === 0) {
      alert('No hay visitas para guardar en el historial. Agregue visitas primero.');
      return;
    }

    try {
      await saveVisitasToHistory(visitas);
      console.log('Visitas guardadas exitosamente en historial');
      alert('Visitas Proveedores guardadas exitosamente en el historial');
    } catch (error) {
      console.error('Error al guardar visitas en historial:', error);
      alert('Error al guardar en el historial. Por favor, intente de nuevo.');
    }
  };

  // Formato de última vez guardado
  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now - lastSaved) / 1000);
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    return lastSaved.toLocaleTimeString();
  };

  // Pantalla de autenticación
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Logo size="large" />
            <h2 className="text-3xl font-bold text-blue-900 mt-6 mb-2">
              Supervisión
            </h2>
            <p className="text-gray-600">Uso Exclusivo para Supervision</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña de Acceso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md"
            >
              Ingresar
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Esta sección requiere autorización
          </p>
        </div>
      </div>
    );
  }

  // Pantalla principal
  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 sm:px-4 lg:px-8">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header con logo y título */}
        <div className="bg-white p-4 sm:p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <Logo size="medium" />
            <div className="flex-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-600">
                Control de Viaticos
              </h2>
              <p className="text-sm text-gray-600 mt-1">Droguería El Olam</p>
            </div>
            <div className="w-24"></div>
          </div>

          {lastSaved && (
            <p className="text-xs text-gray-500 text-center">
              Último guardado: {formatLastSaved()}
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 sm:gap-3">
            <button
              onClick={agregarFila}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Agregar</span>
              <span className="sm:hidden">Agregar</span>
            </button>

            <button
              onClick={exportarExcel}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              onClick={() => setShowHistorialViaticos(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Historial</span>
            </button>

            <button
              onClick={guardarViaticosEnHistorial}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Guardar</span>
              <span className="sm:hidden">Guardar</span>
            </button>

            <button
              onClick={() => setShowGestionVendedores(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Vendedores</span>
              <span className="sm:hidden">Vend.</span>
            </button>

            <button
              onClick={() => setShowGestionGiras(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Giras</span>
              <span className="sm:hidden">Giras</span>
            </button>

            <button
              onClick={() => setShowHistorialGeneral(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Ver Historial</span>
              <span className="sm:hidden">Ver Hist.</span>
            </button>

            <button
              onClick={limpiarFormulario}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Limpiar</span>
              <span className="sm:hidden">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Tabla de viáticos */}
        {viaticos.length > 0 ? (
          <div className="p-2 sm:p-6">
            {/* Vista móvil (cards) */}
            <div className="block lg:hidden space-y-3">
              {viaticos.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 bg-white border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-blue-600">No. {item.no}</span>
                    <button
                      onClick={() => eliminarFila(item.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha</label>
                      <input
                        type="date"
                        value={item.fecha}
                        onChange={(e) => actualizarCampo(item.id, 'fecha', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Vendedor</label>
                      <select
                        value={item.vendedor}
                        onChange={(e) => actualizarCampo(item.id, 'vendedor', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Seleccionar vendedor</option>
                        {vendedores.map((vendedor, idx) => (
                          <option key={idx} value={vendedor}>{vendedor}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Gira</label>
                      <select
                        value={item.gira}
                        onChange={(e) => actualizarCampo(item.id, 'gira', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Seleccionar gira</option>
                        {giras.map((gira, idx) => (
                          <option key={idx} value={gira}>{gira}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Monto Viáticos</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">Q</span>
                        <input
                          type="text"
                          value={item.monto}
                          onChange={(e) => actualizarCampo(item.id, 'monto', e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatearMoneda(item.monto)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop (tabla) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 text-sm">
                      No.
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Fecha
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Vendedor
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Gira
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-700 text-sm">
                      Monto Viáticos
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 text-sm">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viaticos.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
                        {item.no}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="date"
                          value={item.fecha}
                          onChange={(e) => actualizarCampo(item.id, 'fecha', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <select
                          value={item.vendedor}
                          onChange={(e) => actualizarCampo(item.id, 'vendedor', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Seleccionar vendedor</option>
                          {vendedores.map((vendedor, idx) => (
                            <option key={idx} value={vendedor}>{vendedor}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <select
                          value={item.gira}
                          onChange={(e) => actualizarCampo(item.id, 'gira', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Seleccionar gira</option>
                          {giras.map((gira, idx) => (
                            <option key={idx} value={gira}>{gira}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-gray-700">Q</span>
                          <input
                            type="text"
                            value={item.monto}
                            onChange={(e) => actualizarCampo(item.id, 'monto', e.target.value)}
                            placeholder="0.00"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:border-blue-500 focus:outline-none"
                          />
                        </div>
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
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan="4" className="border border-gray-300 px-3 py-3 text-right text-lg">
                      TOTAL:
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-right text-lg text-blue-700">
                      {formatearMoneda(calcularTotal())}
                    </td>
                    <td className="border border-gray-300"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 p-4">
            <Plus className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-base sm:text-lg mb-2">
              No hay datos en el control de viáticos
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Haz clic en "Agregar Fila" para comenzar
            </p>
          </div>
        )}

        {/* Resumen y total */}
        {viaticos.length > 0 && (
          <div className="p-4 sm:p-6 bg-blue-50 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Total de registros:</span> {viaticos.length}
                </p>
              </div>
              <div>
                <p className="text-gray-700 text-base sm:text-lg font-bold text-right">
                  <span className="text-blue-600">GRAN TOTAL:</span>{' '}
                  <span className="text-blue-700">{formatearMoneda(calcularTotal())}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-3">
              💾 Los datos se guardan automáticamente cada 2 minutos y persisten al cambiar de formulario.
            </p>
          </div>
        )}
      </div>

      {/* ====== SEGUNDA PLANTILLA: CONTROL DE RECIBOS DE CAJA ====== */}
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden mt-8">
        {/* Header del segundo formulario */}
        <div className="bg-white p-4 sm:p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <div className="w-24"></div>
            <div className="flex-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-600">
                Control de Recibos de Caja
              </h2>
              <p className="text-sm text-gray-600 mt-1">Droguería El Olam</p>
            </div>
            <div className="w-24"></div>
          </div>
        </div>

        {/* Botones de acción para recibos */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <button
              onClick={agregarFilaRecibos}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Agregar</span>
              <span className="sm:hidden">Agregar</span>
            </button>

            <button
              onClick={exportarExcelRecibos}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              onClick={() => setShowHistorialRecibos(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Historial</span>
            </button>

            <button
              onClick={guardarRecibosEnHistorial}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Guardar</span>
              <span className="sm:hidden">Guardar</span>
            </button>

            <button
              onClick={limpiarFormularioRecibos}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Limpiar</span>
              <span className="sm:hidden">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Tabla de recibos */}
        {recibos.length > 0 ? (
          <div className="p-2 sm:p-6">
            {/* Vista móvil (cards) */}
            <div className="block lg:hidden space-y-3">
              {recibos.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 bg-white border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-blue-600">No. {item.no}</span>
                    <button
                      onClick={() => eliminarFilaRecibos(item.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha</label>
                      <input
                        type="date"
                        value={item.fecha}
                        onChange={(e) => actualizarCampoRecibos(item.id, 'fecha', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Vendedor</label>
                      <select
                        value={item.vendedor}
                        onChange={(e) => actualizarCampoRecibos(item.id, 'vendedor', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Seleccionar vendedor</option>
                        {vendedores.map((vendedor, idx) => (
                          <option key={idx} value={vendedor}>{vendedor}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Gira Visitada</label>
                      <select
                        value={item.giraVisitada}
                        onChange={(e) => actualizarCampoRecibos(item.id, 'giraVisitada', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Seleccionar gira</option>
                        {giras.map((gira, idx) => (
                          <option key={idx} value={gira}>{gira}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Correlativo Inicial</label>
                      <input
                        type="text"
                        value={item.correlativoInicial}
                        onChange={(e) => actualizarCampoRecibos(item.id, 'correlativoInicial', e.target.value)}
                        placeholder="Número inicial"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Correlativo Final</label>
                      <input
                        type="text"
                        value={item.correlativoFinal}
                        onChange={(e) => actualizarCampoRecibos(item.id, 'correlativoFinal', e.target.value)}
                        placeholder="Número final"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Observaciones</label>
                      <textarea
                        value={item.observaciones || ''}
                        onChange={(e) => actualizarCampoRecibos(item.id, 'observaciones', e.target.value)}
                        placeholder="Notas adicionales"
                        rows="2"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop (tabla) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 text-sm">
                      No.
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Fecha
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Vendedor
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Gira Visitada
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 text-sm">
                      Correlativo Inicial
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 text-sm">
                      Correlativo Final
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Observaciones
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 text-sm">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recibos.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
                        {item.no}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="date"
                          value={item.fecha}
                          onChange={(e) => actualizarCampoRecibos(item.id, 'fecha', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <select
                          value={item.vendedor}
                          onChange={(e) => actualizarCampoRecibos(item.id, 'vendedor', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Seleccionar vendedor</option>
                          {vendedores.map((vendedor, idx) => (
                            <option key={idx} value={vendedor}>{vendedor}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <select
                          value={item.giraVisitada}
                          onChange={(e) => actualizarCampoRecibos(item.id, 'giraVisitada', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Seleccionar gira</option>
                          {giras.map((gira, idx) => (
                            <option key={idx} value={gira}>{gira}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.correlativoInicial}
                          onChange={(e) => actualizarCampoRecibos(item.id, 'correlativoInicial', e.target.value)}
                          placeholder="Número inicial"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.correlativoFinal}
                          onChange={(e) => actualizarCampoRecibos(item.id, 'correlativoFinal', e.target.value)}
                          placeholder="Número final"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <textarea
                          value={item.observaciones || ''}
                          onChange={(e) => actualizarCampoRecibos(item.id, 'observaciones', e.target.value)}
                          placeholder="Notas adicionales"
                          rows="2"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <button
                          onClick={() => eliminarFilaRecibos(item.id)}
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
            <Plus className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-base sm:text-lg mb-2">
              No hay datos en el control de recibos de caja
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Haz clic en "Agregar Fila" para comenzar
            </p>
          </div>
        )}

        {/* Resumen de recibos */}
        {recibos.length > 0 && (
          <div className="p-4 sm:p-6 bg-blue-50 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Total de registros:</span> {recibos.length}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-3">
              💾 Los datos se guardan automáticamente cada 2 minutos y persisten al cambiar de formulario.
            </p>
          </div>
        )}

      </div>

      {/* ====== TERCERA PLANTILLA: EVALUACIÓN DE VENDEDOR ====== */}
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden mt-8">
        {/* Header del tercer formulario */}
        <div className="bg-white p-4 sm:p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <div className="w-24"></div>
            <div className="flex-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-600">
                Evaluación de Vendedor
              </h2>
              <p className="text-sm text-gray-600 mt-1">Droguería El Olam</p>
            </div>
            <div className="w-24"></div>
          </div>
        </div>

        {/* Botones de acción para evaluaciones */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <button
              onClick={agregarEvaluacion}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Agregar</span>
              <span className="sm:hidden">Agregar</span>
            </button>

            <button
              onClick={exportarPDFEvaluaciones}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={() => setShowHistorialEvaluaciones(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Historial</span>
            </button>

            <button
              onClick={guardarEvaluacionesEnHistorial}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Guardar</span>
              <span className="sm:hidden">Guardar</span>
            </button>

              <button
                onClick={() => setShowGestionRutas(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Rutas</span>
                <span className="sm:hidden">Rutas</span>
              </button>

              <button
                onClick={limpiarFormularioEvaluaciones}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Limpiar</span>
                <span className="sm:hidden">Limpiar</span>
              </button>
            </div>
          </div>

          {/* Formulario de Nueva Evaluación o Lista */}
          {showNewEvaluationForm ? (
            <VendorEvaluationForm 
              onSave={guardarNuevaEvaluacion}
              onCancel={() => setShowNewEvaluationForm(false)}
              vendedoresList={vendedores}
              rutasList={rutas}
            />
          ) : (
            <>
              {/* Lista de evaluaciones */}
              {evaluaciones.length > 0 ? (
                <div className="p-2 sm:p-6 space-y-8">
                  {evaluaciones.map((evaluacion) => (
                    <div key={evaluacion.id} className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded shadow">
                        <div>
                          <h3 className="text-lg font-bold text-blue-900">{evaluacion.vendedor}</h3>
                          <p className="text-sm text-gray-600">{evaluacion.ruta} - {evaluacion.fecha}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-xs text-gray-500 uppercase">Puntaje Total</span>
                            <span className="text-2xl font-bold text-blue-700">{calcularPuntajeEvaluacion(evaluacion)}%</span>
                          </div>
                          <button
                            onClick={() => eliminarEvaluacion(evaluacion.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-all"
                            title="Eliminar evaluación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Vista previa compacta de aspectos */}
                      <div className="bg-white rounded p-4 shadow overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1">Aspecto</th>
                              <th className="text-right py-1">Puntaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evaluacion.aspectos.map((asp, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-1">{asp.aspecto}</td>
                                <td className="py-1 text-right">{asp.porcentajeRecibido}/{asp.porcentaje}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {evaluacion.observaciones && (
                          <div className="mt-2 text-sm text-gray-600 italic">
                            Nota: {evaluacion.observaciones}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 p-4">
                  <Plus className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 text-base sm:text-lg mb-2">
                    No hay evaluaciones registradas
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Haz clic en "Agregar" para comenzar una nueva evaluación detallada
                  </p>
                </div>
              )}
            </>
          )}

          {/* Resumen de evaluaciones */}
          {!showNewEvaluationForm && evaluaciones.length > 0 && (
            <div className="p-4 sm:p-6 bg-blue-50 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
                <div>
                  <p className="text-gray-700 text-sm sm:text-base">
                    <span className="font-semibold">Total de evaluaciones:</span> {evaluaciones.length}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-3">
                💾 Los datos se guardan automáticamente cada 2 minutos y persisten al cambiar de formulario.
              </p>
            </div>
          )}

        </div>

      {/* ====== CUARTA PLANTILLA: VISITAS PROVEEDORES ====== */}
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden mt-8">
        {/* Header del cuarto formulario */}
        <div className="bg-white p-4 sm:p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <div className="w-24"></div>
            <div className="flex-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-600">
                Visitas Proveedores
              </h2>
              <p className="text-sm text-gray-600 mt-1">Droguería El Olam</p>
            </div>
            <div className="w-24"></div>
          </div>
        </div>

        {/* Formulario de nueva visita */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Agregar Nueva Visita</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Visita *
              </label>
              <input
                type="date"
                value={nuevaVisita.fechaVisita}
                onChange={(e) => setNuevaVisita({ ...nuevaVisita, fechaVisita: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Proveedor *
              </label>
              <input
                type="text"
                value={nuevaVisita.proveedor}
                onChange={(e) => setNuevaVisita({ ...nuevaVisita, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Representante *
              </label>
              <input
                type="text"
                value={nuevaVisita.representante}
                onChange={(e) => setNuevaVisita({ ...nuevaVisita, representante: e.target.value })}
                placeholder="Nombre del representante"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="text"
                value={nuevaVisita.telefono}
                onChange={(e) => setNuevaVisita({ ...nuevaVisita, telefono: e.target.value })}
                placeholder="Número de teléfono"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={agregarVisita}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md font-semibold"
              >
                <Plus className="w-5 h-5" />
                Agregar Visita
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Temas Tratados
            </label>
            <textarea
              value={nuevaVisita.temasTratados}
              onChange={(e) => setNuevaVisita({ ...nuevaVisita, temasTratados: e.target.value })}
              placeholder="Describe los temas tratados en la reunión..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={nuevaVisita.observaciones}
              onChange={(e) => setNuevaVisita({ ...nuevaVisita, observaciones: e.target.value })}
              placeholder="Notas adicionales u observaciones..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <button
              onClick={() => setShowHistorialVisitas(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Historial</span>
            </button>

            <button
              onClick={exportarHistorialVisitas}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              onClick={guardarVisitasEnHistorial}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Guardar</span>
              <span className="sm:hidden">Guardar</span>
            </button>

            <button
              onClick={limpiarFormularioVisitas}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Limpiar</span>
              <span className="sm:hidden">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Tabla de visitas */}
        {visitas.length > 0 ? (
          <div className="p-2 sm:p-6">
            {/* Vista móvil (cards) */}
            <div className="block lg:hidden space-y-3">
              {visitas.map((visita) => (
                <div key={visita.id} className="border rounded-lg p-3 bg-white border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-blue-600">
                      {new Date(visita.fechaVisita).toLocaleDateString('es-GT')}
                    </span>
                    <button
                      onClick={() => eliminarVisita(visita.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Proveedor</label>
                      <p className="text-sm text-gray-800">{visita.proveedor}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Representante</label>
                      <p className="text-sm text-gray-800">{visita.representante}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Teléfono</label>
                      <p className="text-sm text-gray-800">{visita.telefono || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Temas Tratados</label>
                      <p className="text-sm text-gray-800">{visita.temasTratados || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Observaciones</label>
                      <p className="text-sm text-gray-800">{visita.observaciones || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop (tabla) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Fecha de Visita
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Proveedor
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Representante
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Teléfono
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Temas Tratados
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-700 text-sm">
                      Observaciones
                    </th>
                    <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-gray-700 text-sm">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visitas.map((visita) => (
                    <tr key={visita.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {visita.fechaVisita}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {visita.proveedor}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {visita.representante}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {visita.telefono || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {visita.temasTratados || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {visita.observaciones || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <button
                          onClick={() => eliminarVisita(visita.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-all"
                          title="Eliminar visita"
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
            <Plus className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-base sm:text-lg mb-2">
              No hay visitas de proveedores registradas
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Completa el formulario arriba para agregar una nueva visita
            </p>
          </div>
        )}

        {/* Resumen de visitas */}
        {visitas.length > 0 && (
          <div className="p-4 sm:p-6 bg-blue-50 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-4">
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Total de visitas registradas:</span> {visitas.length}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-3">
              💾 Los datos se guardan automáticamente cada 2 minutos y persisten al cambiar de formulario.
            </p>
          </div>
        )}

      </div>

      {/* ====== CUARTA PLANTILLA: HISTORIAL DE COMISIONES ====== */}
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden mt-8">
        {/* Header del cuarto formulario */}
        <div className="bg-white p-4 sm:p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <Logo size="medium" />
            <div className="flex-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-600">
                Historial de Comisiones
              </h2>
              <p className="text-sm text-gray-600 mt-1">Droguería El Olam</p>
            </div>
            <div className="w-24"></div>
          </div>
        </div>

        {/* Botones de acción para comisiones */}
        <div className="p-4 sm:p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <button
              onClick={agregarComision}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Agregar</span>
              <span className="sm:hidden">Agregar</span>
            </button>

            <button
              onClick={exportarExcelComisiones}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              onClick={() => setShowHistorialComisiones(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Historial</span>
            </button>

            <button
              onClick={guardarComisionesEnHistorial}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Guardar</span>
              <span className="sm:hidden">Guardar</span>
            </button>

            <button
              onClick={limpiarFormularioComisiones}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Limpiar</span>
              <span className="sm:hidden">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Tabla de comisiones */}
        {comisiones.length > 0 ? (
          <div className="p-2 sm:p-6">
            {/* Vista móvil (cards) */}
            <div className="block lg:hidden space-y-3">
              {comisiones.map((comision) => (
                <div key={comision.id} className="border rounded-lg p-3 bg-white border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-blue-600">No. {comision.no}</span>
                    <button
                      onClick={() => eliminarComision(comision.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha</label>
                      <input
                        type="date"
                        value={comision.fecha}
                        onChange={(e) => actualizarComision(comision.id, 'fecha', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Vendedor</label>
                      <select
                        value={comision.vendedor}
                        onChange={(e) => actualizarComision(comision.id, 'vendedor', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Seleccionar vendedor</option>
                        {vendedores.map((vendedor) => (
                          <option key={vendedor} value={vendedor}>
                            {vendedor}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Anticipo</label>
                      <input
                        type="text"
                        value={comision.anticipo || ''}
                        onChange={(e) => actualizarComision(comision.id, 'anticipo', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Comisiones</label>
                      <input
                        type="text"
                        value={comision.comisiones}
                        onChange={(e) => actualizarComision(comision.id, 'comisiones', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuento IVA</label>
                      <input
                        type="text"
                        value={comision.descuentoIVA || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentoIVA', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuento por Seguro de Vehículos</label>
                      <input
                        type="text"
                        value={comision.descuentoSeguroVehiculos || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentoSeguroVehiculos', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuento ISR</label>
                      <input
                        type="text"
                        value={comision.descuentoISR || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentoISR', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Bono Ingreso</label>
                      <input
                        type="text"
                        value={comision.bonoIngreso || ''}
                        onChange={(e) => actualizarComision(comision.id, 'bonoIngreso', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuento Celular Servicio</label>
                      <input
                        type="text"
                        value={comision.descuentoCelularServicio || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentoCelularServicio', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuento Cuentas Incobrables</label>
                      <input
                        type="text"
                        value={comision.descuentoCuentasIncobrables || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentoCuentasIncobrables', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuento x Compras Personales</label>
                      <input
                        type="text"
                        value={comision.descuentoComprasPersonales || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentoComprasPersonales', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuento Prest Vehículo</label>
                      <input
                        type="text"
                        value={comision.descuentoPrestVehiculo || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentoPrestVehiculo', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Anticipos (Préstamo)</label>
                      <input
                        type="text"
                        value={comision.anticiposPrestamo || ''}
                        onChange={(e) => actualizarComision(comision.id, 'anticiposPrestamo', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Descuentos Varios</label>
                      <input
                        type="text"
                        value={comision.descuentosVarios || ''}
                        onChange={(e) => actualizarComision(comision.id, 'descuentosVarios', e.target.value)}
                        placeholder="Q 0.00"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Observaciones</label>
                      <textarea
                        value={comision.observaciones || ''}
                        onChange={(e) => actualizarComision(comision.id, 'observaciones', e.target.value)}
                        placeholder="Notas adicionales"
                        rows="2"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none resize-y"
                      />
                    </div>

                    {/* Total del registro */}
                    <div className="mt-3 pt-3 border-t border-gray-300 bg-yellow-50 -mx-3 px-3 py-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700">Total:</span>
                        <span className="text-lg font-bold text-blue-700">
                          Q {calcularTotalComision(comision).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop (tabla) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      No.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Fecha
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Vendedor
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Anticipo
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Comisiones
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. IVA
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. Seg. Veh.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. ISR
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Bono Ingreso
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. Celular
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. Ctas. Inc.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. Compras
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. Prest. Veh.
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Ant. (Préstamo)
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Desc. Varios
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                      Observaciones
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs bg-yellow-100">
                      Total
                    </th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 text-xs">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comisiones.map((comision) => (
                    <tr key={comision.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-1 text-xs">
                        {comision.no}
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="date"
                          value={comision.fecha}
                          onChange={(e) => actualizarComision(comision.id, 'fecha', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <select
                          value={comision.vendedor}
                          onChange={(e) => actualizarComision(comision.id, 'vendedor', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Seleccionar</option>
                          {vendedores.map((vendedor) => (
                            <option key={vendedor} value={vendedor}>
                              {vendedor}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.anticipo || ''}
                          onChange={(e) => actualizarComision(comision.id, 'anticipo', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.comisiones}
                          onChange={(e) => actualizarComision(comision.id, 'comisiones', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentoIVA || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentoIVA', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentoSeguroVehiculos || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentoSeguroVehiculos', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentoISR || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentoISR', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.bonoIngreso || ''}
                          onChange={(e) => actualizarComision(comision.id, 'bonoIngreso', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentoCelularServicio || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentoCelularServicio', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentoCuentasIncobrables || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentoCuentasIncobrables', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentoComprasPersonales || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentoComprasPersonales', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentoPrestVehiculo || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentoPrestVehiculo', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.anticiposPrestamo || ''}
                          onChange={(e) => actualizarComision(comision.id, 'anticiposPrestamo', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <input
                          type="text"
                          value={comision.descuentosVarios || ''}
                          onChange={(e) => actualizarComision(comision.id, 'descuentosVarios', e.target.value)}
                          placeholder="Q 0.00"
                          className="w-24 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1">
                        <textarea
                          value={comision.observaciones || ''}
                          onChange={(e) => actualizarComision(comision.id, 'observaciones', e.target.value)}
                          placeholder="Notas"
                          rows="2"
                          className="w-32 px-1 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none resize-y"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right bg-yellow-50">
                        <span className="font-bold text-gray-800 text-xs">
                          Q {calcularTotalComision(comision).toFixed(2)}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        <button
                          onClick={() => eliminarComision(comision.id)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-all text-xs"
                        >
                          <Trash2 className="w-3 h-3 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Fila de totales generales */}
                  <tr className="bg-blue-200 font-bold">
                    <td colSpan="3" className="border border-gray-300 px-2 py-2 text-right text-sm">
                      TOTALES GENERALES:
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right text-sm">
                      Q {comisiones.reduce((sum, c) => sum + (parseFloat(c.anticipo) || 0), 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right text-sm">
                      Q {comisiones.reduce((sum, c) => sum + (parseFloat(c.comisiones) || 0), 0).toFixed(2)}
                    </td>
                    <td colSpan="13" className="border border-gray-300 px-2 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No hay comisiones registradas</p>
            <p className="text-sm mt-2">Presiona el botón "Agregar" para comenzar</p>
          </div>
        )}

        {/* Resumen de comisiones */}
        {comisiones.length > 0 && (
          <div className="p-4 sm:p-6 bg-blue-50 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Total registros:</span> {comisiones.length}
                </p>
              </div>
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Total Anticipo:</span>{' '}
                  <span className="text-blue-700">
                    {formatearMoneda(comisiones.reduce((sum, c) => sum + (parseFloat(c.anticipo) || 0), 0))}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-700 text-sm sm:text-base">
                  <span className="font-semibold">Total Comisiones:</span>{' '}
                  <span className="text-blue-700">
                    {formatearMoneda(comisiones.reduce((sum, c) => sum + (parseFloat(c.comisiones) || 0), 0))}
                  </span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-3">
              💾 Los datos se guardan automáticamente cada 2 minutos y persisten al cambiar de formulario.
            </p>
          </div>
        )}

      </div>

      {/* ====== MODALES ====== */}

      {/* Modal de Historial de Viáticos */}
      {showHistorialViaticos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-cyan-50">
              <h3 className="text-2xl font-bold text-cyan-700 flex items-center gap-2">
                <History className="w-6 h-6" />
                Historial de Viáticos
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Registros totales:</span> {viaticos.length}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Registros filtrados:</span> {filtrarPorFecha(viaticos).length}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={exportarHistorialViaticos}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Exportar Historial
                </button>
                <button
                  onClick={() => {
                    setShowHistorialViaticos(false);
                    setFechaInicio('');
                    setFechaFin('');
                  }}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Recibos */}
      {showHistorialRecibos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-cyan-50">
              <h3 className="text-2xl font-bold text-cyan-700 flex items-center gap-2">
                <History className="w-6 h-6" />
                Historial de Recibos de Caja
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Registros totales:</span> {recibos.length}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Registros filtrados:</span> {filtrarPorFecha(recibos).length}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={exportarHistorialRecibos}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Exportar Historial
                </button>
                <button
                  onClick={() => {
                    setShowHistorialRecibos(false);
                    setFechaInicio('');
                    setFechaFin('');
                  }}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Vendedores */}
      {showGestionVendedores && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-orange-50">
              <h3 className="text-2xl font-bold text-orange-700 flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                Gestión de Vendedores
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Agregar vendedor */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoVendedor}
                  onChange={(e) => setNuevoVendedor(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarVendedor()}
                  placeholder="Nombre del nuevo vendedor"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={agregarVendedor}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  Agregar
                </button>
              </div>

              {/* Lista de vendedores */}
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <div className="bg-gray-50 px-4 py-2 border-b font-semibold text-gray-700">
                  Vendedores Registrados ({vendedores.length})
                </div>
                <div className="divide-y">
                  {vendedores.map((vendedor, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <span className="text-gray-700">{vendedor}</span>
                      <button
                        onClick={() => eliminarVendedor(vendedor)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-all"
                        title="Eliminar vendedor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowGestionVendedores(false);
                  setNuevoVendedor('');
                }}
                className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all shadow-md font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Giras */}
      {showGestionGiras && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-teal-50">
              <h3 className="text-2xl font-bold text-teal-700 flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Gestión de Giras
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Agregar gira */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevaGira}
                  onChange={(e) => setNuevaGira(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarGira()}
                  placeholder="Nombre de la nueva gira (ej: Escuintla III #A6)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                />
                <button
                  onClick={agregarGira}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  Agregar
                </button>
              </div>

              {/* Lista de giras */}
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <div className="bg-gray-50 px-4 py-2 border-b font-semibold text-gray-700">
                  Giras Registradas ({giras.length})
                </div>
                <div className="divide-y">
                  {giras.map((gira, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <span className="text-gray-700">{gira}</span>
                      <button
                        onClick={() => eliminarGira(gira)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-all"
                        title="Eliminar gira"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowGestionGiras(false);
                  setNuevaGira('');
                }}
                className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all shadow-md font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Evaluaciones */}
      {showHistorialEvaluaciones && (
        <SupervisionHistory 
          onClose={() => setShowHistorialEvaluaciones(false)} 
          onEdit={handleEditEvaluation}
        />
      )}

      {/* Modal de Historial de Visitas Proveedores */}
      {showHistorialVisitas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-cyan-50">
              <h3 className="text-2xl font-bold text-cyan-700 flex items-center gap-2">
                <History className="w-6 h-6" />
                Historial de Visitas Proveedores
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filtrar por Proveedor
                  </label>
                  <input
                    type="text"
                    value={filtroProveedor}
                    onChange={(e) => setFiltroProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Registros totales:</span> {visitas.length}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Registros filtrados:</span> {filtrarVisitas().length}
                </p>
              </div>

              {/* Lista de visitas filtradas */}
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {filtrarVisitas().length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-blue-100">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                          Fecha
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                          Proveedor
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                          Representante
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-sm">
                          Teléfono
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrarVisitas().map((visita) => (
                        <tr key={visita.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {visita.fechaVisita}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {visita.proveedor}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {visita.representante}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {visita.telefono || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay visitas que coincidan con los filtros aplicados
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={exportarHistorialVisitas}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Exportar Historial
                </button>
                <button
                  onClick={() => {
                    setShowHistorialVisitas(false);
                    setFechaInicio('');
                    setFechaFin('');
                    setFiltroProveedor('');
                  }}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Comisiones */}
      {showHistorialComisiones && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-cyan-50">
              <h3 className="text-2xl font-bold text-cyan-700 flex items-center gap-2">
                <History className="w-6 h-6" />
                Historial de Comisiones
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Registros totales:</span> {comisiones.length}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Registros filtrados:</span> {filtrarPorFecha(comisiones).length}
                </p>
              </div>

              {/* Lista de comisiones filtradas */}
              <div className="max-h-96 overflow-y-auto overflow-x-auto border rounded-lg">
                {filtrarPorFecha(comisiones).length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-blue-100">
                      <tr>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          No.
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Fecha
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Vendedor
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Anticipo
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Comisiones
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. IVA
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. Seg. Veh.
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. ISR
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Bono Ingreso
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. Celular
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. Ctas. Inc.
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. Compras
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. Prest. Veh.
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Ant. (Préstamo)
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 text-xs">
                          Desc. Varios
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrarPorFecha(comisiones).map((comision) => (
                        <tr key={comision.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {comision.no}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {comision.fecha}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {comision.vendedor}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.anticipo)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.comisiones)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentoIVA)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentoSeguroVehiculos)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentoISR)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.bonoIngreso)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentoCelularServicio)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentoCuentasIncobrables)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentoComprasPersonales)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentoPrestVehiculo)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.anticiposPrestamo)}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-xs">
                            {formatearMoneda(comision.descuentosVarios)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No hay comisiones en el rango de fechas seleccionado
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={exportarExcelComisiones}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Exportar Historial
                </button>
                <button
                  onClick={() => {
                    setShowHistorialComisiones(false);
                    setFechaInicio('');
                    setFechaFin('');
                  }}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all shadow-md font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
