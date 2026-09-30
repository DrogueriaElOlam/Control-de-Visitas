import { useState, useRef } from 'react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { Save, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FormButtons from './FormButtons';
import FormHeader from './FormHeader';
import SolicitudViaticosHistory from './SolicitudViaticosHistory';

export default function SolicitudViaticosForm() {
  const formRef = useRef(null);
  const [formData, setFormData, saveForm, lastSaved] = useFormPersistence('solicitud-viaticos', {
    vendedor: '',
    rutaA: '',
    fechaInicial: '',
    fechaFinal: '',
    lugaresVisitar: '',
    combustible: '',
    alimentacion: '',
    hospedaje: '',
    fotocopias: '',
    otros: '',
    observaciones: '',
  });

  const [vendedores, setVendedores] = useState(() => {
    const saved = localStorage.getItem('vendedores_list');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
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
    ];
  });
  const [nuevoVendedor, setNuevoVendedor] = useState('');
  const [mostrarListaVendedores, setMostrarListaVendedores] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [showTemplateMessage, setShowTemplateMessage] = useState(false);
  const [showVendedoresModal, setShowVendedoresModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [routeTemplates, setRouteTemplates] = useState({});

  // Cargar plantillas de rutas al iniciar
  useState(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('route_templates')
          .select('*');
        
        if (data) {
          const templatesMap = {};
          data.forEach(template => {
            templatesMap[template.route_name] = template;
          });
          setRouteTemplates(templatesMap);
        }
      } catch (error) {
        console.error('Error al cargar plantillas de rutas:', error);
      }
    };
    fetchTemplates();
  });

  const rutas = [
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
    'Huehuetanango Centro #A4',
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
  ];

  const [routesByVendor, setRoutesByVendor] = useState(() => {
    const saved = localStorage.getItem('routes_by_vendor');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      'Ana Lucia Marroquin': [
        'Salama #14',
        'Quetzaltenango #11',
        'Municipios Oriente #15',
        'Coban #13',
        'Totonicapan #12'
      ],
      'Jessica Noriega': ['Suchi I #21', 'Retalhuleu #22', 'Suchi II #23', 'Coatepeque #24', 'Suchi III #25'],
      'Wally Natareno': ['Sacatepéquez #31', 'Quiche Centro #32', 'Quiche Montaña Baja #33', 'Izabal I #34', 'Izabal II #35'],
      'Erick Curley': ['Jutiapa I #41', 'Jutiapa II #42', 'Chimaltenango I #43', 'Chimaltenango II #44', 'Santa Rosa #45'],
      'Estuardo Cordova': ['San Marcos Montaña Alta #51', 'Solola I #52', 'Solola II #53', 'Nebaj #54', 'Quiche Montaña Alta #55'],
      'Karina Pineda': ['Chiquimula I #61', 'Jalapa #62', 'Chiquimula II #63', 'Capital S1 #64', 'Capital S2 #65'],
      'Danny Perez': ['Huehuetenango Montaña Baja I #71', 'Huehuetenango Montaña Baja II #72', 'Peten I #73', 'Peten II #74'],
      'Klissman Hernandez': ['Polochic #81', 'Zacapa #82', 'Huehuetenango Montaña Alta I #83', 'Huehuetenango Montaña Alta II #84'],
      'Elio Caceros': ['Petapa #91', 'San Marcos I #92', 'San Marcos II #93', 'Capital S3 #94', 'Ixcán #95'],
      'Josue Aguilar': ['Escuintla I #A1', 'Escuintla II #A2', 'Villa Nueva #A3', 'Huehuetenango Centro #A4', 'Municipios Norte #A5'],
      'Elias Quiej': ['Peten III #B1', 'Peten IV #B2', 'Transversal I #B3', 'Transversal II #B4', 'Amatitlán #B5']
    };
  });
  const [nuevaRuta, setNuevaRuta] = useState('');
  const [showRutasModal, setShowRutasModal] = useState(false);

  const rutasVisibles = formData.vendedor && routesByVendor[formData.vendedor] 
    ? routesByVendor[formData.vendedor]
    : rutas;

  const agregarRuta = () => {
    if (nuevaRuta.trim() !== '' && formData.vendedor) {
      const currentRoutes = routesByVendor[formData.vendedor] || [];
      const updatedRoutes = [...currentRoutes, nuevaRuta.trim()];
      
      const newRoutesByVendor = {
        ...routesByVendor,
        [formData.vendedor]: updatedRoutes
      };
      
      setRoutesByVendor(newRoutesByVendor);
      localStorage.setItem('routes_by_vendor', JSON.stringify(newRoutesByVendor));
      setNuevaRuta('');
    }
  };

  const eliminarRuta = (rutaToDelete) => {
    if (formData.vendedor && routesByVendor[formData.vendedor]) {
      const updatedRoutes = routesByVendor[formData.vendedor].filter(r => r !== rutaToDelete);
      
      const newRoutesByVendor = {
        ...routesByVendor,
        [formData.vendedor]: updatedRoutes
      };
      
      setRoutesByVendor(newRoutesByVendor);
      localStorage.setItem('routes_by_vendor', JSON.stringify(newRoutesByVendor));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si cambia la ruta, intentar autocompletar desde la plantilla
    if (name === 'rutaA' && routeTemplates[value]) {
      const template = routeTemplates[value];
      setFormData({
        ...formData,
        [name]: value,
        lugaresVisitar: template.lugares_visitar || '',
        combustible: template.combustible?.toString() || '',
        alimentacion: template.alimentacion?.toString() || '',
        hospedaje: template.hospedaje?.toString() || '',
        fotocopias: template.fotocopias?.toString() || '',
        otros: template.otros?.toString() || ''
      });
      
      setShowTemplateMessage(true);
      setTimeout(() => setShowTemplateMessage(false), 3000);
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleVendedorChange = (e) => {
    const newVendedor = e.target.value;
    let newRutaA = formData.rutaA;

    // Si el nuevo vendedor tiene rutas restringidas y la ruta actual no está permitida, limpiarla
    if (newVendedor && routesByVendor[newVendedor]) {
      if (!routesByVendor[newVendedor].includes(newRutaA)) {
        newRutaA = '';
      }
    }

    setFormData({
      ...formData,
      vendedor: newVendedor,
      rutaA: newRutaA
    });
    setMostrarListaVendedores(false);
  };

  const agregarVendedor = () => {
    if (nuevoVendedor.trim() !== '') {
      const nuevosVendedores = [...vendedores, nuevoVendedor.trim()];
      setVendedores(nuevosVendedores);
      localStorage.setItem('vendedores_list', JSON.stringify(nuevosVendedores));
      setNuevoVendedor('');
    }
  };

  const eliminarVendedor = (index) => {
    const nuevosVendedores = vendedores.filter((_, i) => i !== index);
    setVendedores(nuevosVendedores);
    localStorage.setItem('vendedores_list', JSON.stringify(nuevosVendedores));
  };

  const handleSaveForm = async () => {
    // Also save to local storage using the hook
    const success = saveForm();
    
    // Save Route Template if a route is selected
    if (formData.rutaA) {
      try {
        const { error: templateError } = await supabase
          .from('route_templates')
          .upsert({
            route_name: formData.rutaA,
            lugares_visitar: formData.lugaresVisitar,
            combustible: parseFloat(formData.combustible) || 0,
            alimentacion: parseFloat(formData.alimentacion) || 0,
            hospedaje: parseFloat(formData.hospedaje) || 0,
            fotocopias: parseFloat(formData.fotocopias) || 0,
            otros: parseFloat(formData.otros) || 0
          }, { onConflict: 'route_name' });

        if (templateError) {
          console.error('Error al guardar plantilla de ruta:', templateError);
        } else {
          // Actualizar estado local de plantillas
          setRouteTemplates(prev => ({
            ...prev,
            [formData.rutaA]: {
              route_name: formData.rutaA,
              lugares_visitar: formData.lugaresVisitar,
              combustible: parseFloat(formData.combustible) || 0,
              alimentacion: parseFloat(formData.alimentacion) || 0,
              hospedaje: parseFloat(formData.hospedaje) || 0,
              fotocopias: parseFloat(formData.fotocopias) || 0,
              otros: parseFloat(formData.otros) || 0
            }
          }));
        }
      } catch (err) {
        console.error('Error actualizando plantilla:', err);
      }
    }

    // Save to Supabase history
    try {
      const dataToSave = {
        datos: formData,
        fecha_creacion: new Date().toISOString()
      };

      let result;
      if (currentRecordId) {
        // Update existing record
        result = await supabase
          .from('solicitud_viaticos_history')
          .update(dataToSave)
          .eq('id', currentRecordId);
      } else {
        // Insert new record
        result = await supabase
          .from('solicitud_viaticos_history')
          .insert([dataToSave])
          .select();
          
        if (result.data && result.data.length > 0) {
          setCurrentRecordId(result.data[0].id);
        }
      }

      if (result.error) {
        console.error('Error al guardar en historial:', result.error);
        alert('Error al guardar en el historial');
      } else {
        setShowSaveMessage(true);
        setTimeout(() => setShowSaveMessage(false), 3000);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el formulario');
    }
  };

  const handleHistoryEdit = (record) => {
    setFormData(record.datos);
    setCurrentRecordId(record.id);
    setShowHistory(false);
  };

  const calcularTotal = () => {
    const valores = [
      parseFloat(formData.combustible) || 0,
      parseFloat(formData.alimentacion) || 0,
      parseFloat(formData.hospedaje) || 0,
      parseFloat(formData.fotocopias) || 0,
      parseFloat(formData.otros) || 0
    ];
    return valores.reduce((sum, val) => sum + val, 0).toFixed(2);
  };

  const handleClear = () => {
    setFormData({
      vendedor: '',
      rutaA: '',
      fechaInicial: '',
      fechaFinal: '',
      lugaresVisitar: '',
      combustible: '',
      alimentacion: '',
      hospedaje: '',
      fotocopias: '',
      otros: '',
      observaciones: '',
    });
    setCurrentRecordId(null);
  };

  const handleExport = () => {
    const total = calcularTotal();
    const today = new Date();
    const fechaSolicitud = today.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Viáticos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 0; }
    .container { width: 6in; height: 8in; margin: 0 auto; border: 4px solid #000; padding: 0.3in; box-sizing: border-box; position: relative; }
    .fecha-solicitud { position: absolute; top: 0.3in; right: 0.3in; font-size: 11px; font-weight: bold; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; margin-top: 20px; }
    .header-left { width: 70%; vertical-align: top; padding-right: 10px; }
    .header-right { width: 30%; text-align: right; vertical-align: top; }
    .header-left h2 { font-size: 9px; margin-bottom: 2px; font-weight: bold; }
    .header-left p { font-size: 7px; color: #666; margin: 1px 0; line-height: 1.3; }
    .header-right img { width: 100px; height: auto; display: block; }
    .title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 8px; }
    .header-section { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .header-field { display: flex; align-items: center; gap: 5px; }
    .header-field-label { font-weight: bold; font-size: 11px; white-space: nowrap; }
    .header-field-line { flex: 1; border-bottom: 2px solid #000; min-height: 18px; padding: 0 5px; font-size: 9px; }
    .dates-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .date-field { display: flex; align-items: center; gap: 5px; }
    .date-label { font-weight: bold; font-size: 11px; white-space: nowrap; }
    .date-line { flex: 1; border-bottom: 2px solid #000; min-height: 18px; padding: 0 5px; font-size: 9px; }
    .lugares-section { margin-bottom: 8px; }
    .lugares-label { font-weight: bold; font-size: 11px; margin-bottom: 3px; }
    .lugares-box { border: 2px solid #000; min-height: 40px; padding: 3px; font-size: 9px; text-transform: uppercase; }
    .valores-title { font-size: 22px; font-weight: bold; text-align: center; margin: 10px 0; }
    .values-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .values-left { }
    .values-right { display: flex; flex-direction: column; justify-content: flex-end; }
    .values-table { width: 100%; font-size: 9px; border-collapse: collapse; }
    .values-table td { padding: 3px 0; }
    .total-box { border: 2px solid #000; padding: 8px; text-align: right; font-size: 12px; font-weight: bold; }
    .authorization-space { margin-top: 15px; border-top: 2px solid #000; padding-top: 5px; min-height: 50px; }
    .signatures-table { width: 100%; margin-top: 15px; border-collapse: collapse; font-size: 7px; }
    .signatures-table td { text-align: center; border-top: 2px solid #000; padding-top: 5px; width: 25%; height: 40px; }
    @page { size: 6in 8in; margin: 0; }
    @media print {
      body { padding: 0; }
      .container { border: 4px solid #000; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="fecha-solicitud"><strong>Fecha de Solicitud:</strong> ${fechaSolicitud}</div>
    
    <table class="header-table">
      <tr>
        <td class="header-left">
          <h2>DISTRIBUIDORA COMERCIAL EL OLAM S.A.</h2>
          <p>7a. Avenida "A" 17-67 Zona 13, Guatemala<br>Teléfonos: 2308-4353, 2332-7814, 2339-4613</p>
        </td>
        <td class="header-right">
          <img src="/logo.png" style="width: 100px; height: auto; display: block;">
        </td>
      </tr>
    </table>

    <div class="title">SOLICITUD DE VIATICOS</div>

    <div class="header-section">
      <div class="header-field">
        <span class="header-field-label">EJECUTIVO DE VENTAS:</span>
        <div class="header-field-line">${formData.vendedor}</div>
      </div>
      <div class="header-field">
        <span class="header-field-label">RUTA A:</span>
        <div class="header-field-line">${formData.rutaA}</div>
      </div>
    </div>

    <div class="dates-row">
      <div class="date-field">
        <span class="date-label">FECHA INICIAL:</span>
        <div class="date-line">${formData.fechaInicial}</div>
      </div>
      <div class="date-field">
        <span class="date-label">FECHA FINAL:</span>
        <div class="date-line">${formData.fechaFinal}</div>
      </div>
    </div>

    <div class="lugares-section">
      <div class="lugares-label">LUGARES A VISITAR:</div>
      <div class="lugares-box">${formData.lugaresVisitar.toUpperCase()}</div>
    </div>

    <div class="valores-title">VALORES APROXIMADOS</div>

    <div class="values-container">
      <div class="values-left">
        <table class="values-table">
          <tr>
            <td style="width: 100%;"><strong>COMBUSTIBLE:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${formData.combustible || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>ALIMENTACION:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${formData.alimentacion || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>HOSPEDAJE:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${formData.hospedaje || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>FOTOCOPIAS:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${formData.fotocopias || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>OTROS:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${formData.otros || '0.00'}</td>
          </tr>
        </table>
      </div>
      <div class="values-right">
        <div class="total-box">TOTAL:<br>Q. ${total}</div>
      </div>
    </div>

      <div style="margin-top: 25px; margin-bottom: 10px;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 5px;">OBSERVACIONES:</div>
        <div style="border-bottom: 2px solid #000; min-height: 20px; font-size: 9px; padding-bottom: 2px;">${formData.observaciones || ''}</div>
      </div>

      <div class="authorization-space"></div>

    <table class="signatures-table">
      <tr>
        <td><strong>SOLICITADO POR:</strong></td>
        <td><strong>REVISADO GERENCIA DE VENTAS:</strong></td>
        <td><strong>REVISADO CONTABILIDAD:</strong></td>
        <td><strong>AUTORIZADO GERENCIA GENERAL:</strong></td>
      </tr>
    </table>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solicitud-viaticos.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={handleSaveForm}
            className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-500 font-semibold text-sm sm:text-base"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 font-semibold text-sm sm:text-base"
          >
            <History className="w-4 h-4" />
            Historial
          </button>
          <FormButtons onClear={handleClear} onExport={handleExport} />
        </div>

        {showSaveMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            ✓ Formulario guardado correctamente
          </div>
        )}

        {showTemplateMessage && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            ✓ Datos de ruta cargados automáticamente
          </div>
        )}
        
        <div ref={formRef} className="bg-white p-3 sm:p-4 md:p-6 border-4 border-black mt-4">
          <FormHeader logoSize="small" />
          
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold mt-2">SOLICITUD DE VIATICOS</h2>
          </div>

          <div className="space-y-2 sm:space-y-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-semibold text-xs sm:text-sm">EJECUTIVO DE VENTAS:</label>
                  <button
                    type="button"
                    onClick={() => setShowVendedoresModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Editar Lista
                  </button>
                </div>
                <select
                  name="vendedor"
                  value={formData.vendedor}
                  onChange={handleVendedorChange}
                  className="w-full border-b-2 border-black px-2 py-1 focus:outline-none text-xs sm:text-sm bg-white"
                >
                  <option value="">Seleccione un ejecutivo</option>
                  {vendedores.map((vendedor, index) => (
                    <option key={index} value={vendedor}>{vendedor}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-semibold text-xs sm:text-sm">RUTA A:</label>
                  {formData.vendedor && (
                    <button
                      type="button"
                      onClick={() => setShowRutasModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Editar Rutas
                    </button>
                  )}
                </div>
                  <select
                    name="rutaA"
                    value={formData.rutaA}
                    onChange={handleChange}
                    className="w-full border-b-2 border-black px-2 py-1 focus:outline-none text-xs sm:text-sm bg-white"
                  >
                    <option value="">Seleccione una ruta</option>
                    {rutasVisibles.map((ruta, index) => (
                      <option key={index} value={ruta}>{ruta}</option>
                    ))}
                  </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block font-semibold mb-1 text-xs sm:text-sm">FECHA INICIAL:</label>
                <input
                  type="date"
                  name="fechaInicial"
                  value={formData.fechaInicial}
                  onChange={handleChange}
                  className="w-full border-b-2 border-black px-2 py-1 focus:outline-none text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-xs sm:text-sm">FECHA FINAL:</label>
                <input
                  type="date"
                  name="fechaFinal"
                  value={formData.fechaFinal}
                  onChange={handleChange}
                  className="w-full border-b-2 border-black px-2 py-1 focus:outline-none text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-xs sm:text-sm">LUGARES A VISITAR:</label>
              <textarea
                name="lugaresVisitar"
                value={formData.lugaresVisitar}
                onChange={handleChange}
                rows="2"
                className="w-full border-2 border-black px-2 py-1 focus:outline-none text-xs sm:text-sm uppercase"
                placeholder="Ingrese los lugares en mayúsculas"
              />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-center mb-2 text-base sm:text-lg">VALORES APROXIMADOS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-semibold text-xs sm:text-sm">COMBUSTIBLE:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Q.</span>
                    <input
                      type="number"
                      name="combustible"
                      value={formData.combustible}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-black px-1 py-1 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-semibold text-xs sm:text-sm">ALIMENTACION:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Q.</span>
                    <input
                      type="number"
                      name="alimentacion"
                      value={formData.alimentacion}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-black px-1 py-1 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-semibold text-xs sm:text-sm">HOSPEDAJE:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Q.</span>
                    <input
                      type="number"
                      name="hospedaje"
                      value={formData.hospedaje}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-black px-1 py-1 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-semibold text-xs sm:text-sm">FOTOCOPIAS:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Q.</span>
                    <input
                      type="number"
                      name="fotocopias"
                      value={formData.fotocopias}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-black px-1 py-1 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-semibold text-xs sm:text-sm">OTROS:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Q.</span>
                    <input
                      type="number"
                      name="otros"
                      value={formData.otros}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-black px-1 py-1 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <div className="w-full border-2 border-black p-3 text-center">
                  <p className="font-bold text-xs sm:text-sm mb-1">TOTAL:</p>
                  <p className="font-bold text-lg sm:text-xl">Q. {calcularTotal()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 mb-6">
            <label className="block font-semibold mb-2 text-xs sm:text-sm">OBSERVACIONES:</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="3"
              className="w-full border-2 border-black px-2 py-1 focus:outline-none text-xs sm:text-sm"
            />
          </div>

          <div className="border-t-2 border-black pt-4 mb-4 min-h-20"></div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6">
            <div className="text-center">
              <div className="border-t-2 border-black pt-2 min-h-24">
                <p className="text-xs font-semibold">SOLICITADO POR:</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black pt-2 min-h-24">
                <p className="text-xs font-semibold">REVISADO GERENCIA DE VENTAS:</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black pt-2 min-h-24">
                <p className="text-xs font-semibold">REVISADO CONTABILIDAD:</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black pt-2 min-h-24">
                <p className="text-xs font-semibold">AUTORIZADO GERENCIA GENERAL:</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Gestión de Vendedores */}
        {showVendedoresModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Gestionar Ejecutivos de Ventas</h3>
              
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevoVendedor}
                    onChange={(e) => setNuevoVendedor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && agregarVendedor()}
                    placeholder="Nombre del ejecutivo"
                    className="flex-1 border border-gray-300 px-3 py-2 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={agregarVendedor}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm whitespace-nowrap"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-gray-700">Lista de Ejecutivos:</p>
                {vendedores.map((vendedor, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100">
                    <span className="text-sm">{vendedor}</span>
                    <button
                      type="button"
                      onClick={() => eliminarVendedor(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowVendedoresModal(false)}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Gestión de Rutas */}
        {showRutasModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-2">Gestionar Rutas</h3>
              <p className="text-sm text-gray-600 mb-4">Ejecutivo: <span className="font-semibold">{formData.vendedor}</span></p>
              
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevaRuta}
                    onChange={(e) => setNuevaRuta(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && agregarRuta()}
                    placeholder="Nombre de la ruta"
                    className="flex-1 border border-gray-300 px-3 py-2 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={agregarRuta}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm whitespace-nowrap"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-gray-700">Rutas Asignadas:</p>
                {rutasVisibles.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay rutas asignadas</p>
                ) : (
                  rutasVisibles.map((ruta, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100">
                      <span className="text-sm">{ruta}</span>
                      <button
                        type="button"
                        onClick={() => eliminarRuta(ruta)}
                        className="text-red-500 hover:text-red-700 text-sm font-semibold"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowRutasModal(false)}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Historial */}
        {showHistory && (
          <SolicitudViaticosHistory
            onClose={() => setShowHistory(false)}
            onEdit={handleHistoryEdit}
          />
        )}
      </div>
    </div>
  );
}
