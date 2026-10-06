import { useState, useRef, useEffect, useMemo } from 'react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { Save, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FormButtons from './FormButtons';
import FormHeader from './FormHeader';
import SolicitudViaticosHistory from './SolicitudViaticosHistory';
import { isSuperUser, getPermittedRoutesForUser, ALL_ROUTES } from '../lib/formsPermissions';
import { LOGO_DATA_URI } from '../lib/logo';

export default function SolicitudViaticosForm({ currentUser }) {
  const isSuper = isSuperUser(currentUser);
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

  // Pre-llenar y sincronizar vendedor y rutas autorizadas si no es Antonio Celada ni Admin
  useEffect(() => {
    if (!isSuper && currentUser?.name) {
      const permitted = getPermittedRoutesForUser(currentUser);
      const defaultRuta = (currentUser.route && permitted.includes(currentUser.route))
        ? currentUser.route
        : (permitted && permitted[0]) || '';

      setFormData(prev => {
        const targetRutaA = (prev.rutaA && permitted.includes(prev.rutaA)) ? prev.rutaA : defaultRuta;
        const targetRutaB = (prev.rutaB && permitted.includes(prev.rutaB)) ? prev.rutaB : '';

        if (prev.vendedor === currentUser.name && prev.rutaA === targetRutaA && prev.rutaB === targetRutaB) {
          return prev;
        }

        return {
          ...prev,
          vendedor: currentUser.name,
          rutaA: targetRutaA,
          rutaB: targetRutaB
        };
      });
    }
  }, [currentUser?.name, currentUser?.route, isSuper]);

  const [vendedores, setVendedores] = useState(() => {
    const saved = localStorage.getItem('vendedores_list');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      'Ana Lucia Marroquin',
      'Antonio Celada',
      'Dany Perez',
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
          const tMap = {};
          data.forEach(t => {
            tMap[t.route_name] = t;
          });
          setRouteTemplates(tMap);
        }
      } catch (err) {}
    };
    fetchTemplates();
  });

  // Pre-llenar automáticamente los datos del vendedor si no es Antonio Celada ni Admin
  useEffect(() => {
    if (!isSuper && currentUser?.name && !formData.vendedor) {
      setFormData(prev => ({
        ...prev,
        vendedor: currentUser.name,
        rutaA: prev.rutaA || currentUser.route || ''
      }));
    }
  }, [currentUser, isSuper]);

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
      'Ana Lucia Marroquin': ['Salama #14', 'Quetzaltenango #11', 'Municipios Oriente #15', 'Coban #13', 'Totonicapan #12', 'Oficina'],
      'Jessica Noriega': ['Suchi I #21', 'Retalhuleu #22', 'Suchi II #23', 'Coatepeque #24', 'Suchi III #25', 'Oficina'],
      'Wally Natareno': ['Sacatepéquez #31', 'Quiche Centro #32', 'Quiche Montaña Baja #33', 'Izabal I #34', 'Izabal II #35', 'Oficina'],
      'Erick Curley': ['Jutiapa I #41', 'Jutiapa II #42', 'Chimaltenango I #43', 'Chimaltenango II #44', 'Santa Rosa #45', 'Oficina'],
      'Estuardo Cordova': ['San Marcos Montaña Alta #51', 'Solola I #52', 'Solola II #53', 'Nebaj #54', 'Quiche Montaña Alta #55', 'Oficina'],
      'Karina Pineda': ['Chiquimula I #61', 'Jalapa #62', 'Chiquimula II #63', 'Capital S1 #64', 'Capital S2 #65', 'Oficina'],
      'Dany Perez': ['Huehuetenango Montaña Baja I #71', 'Huehuetenango Montaña Baja II #72', 'Peten I #73', 'Peten II #74', 'Oficina'],
      'Danny Perez': ['Huehuetenango Montaña Baja I #71', 'Huehuetenango Montaña Baja II #72', 'Peten I #73', 'Peten II #74', 'Oficina'],
      'Klissman Hernandez': ['Polochic #81', 'Zacapa #82', 'Huehuetenango Montaña Alta I #83', 'Huehuetenango Montaña Alta II #84', 'Oficina'],
      'Elio Caceros': ['Petapa #91', 'San Marcos I #92', 'San Marcos II #93', 'Capital S3 #94', 'Ixcán #95', 'Oficina'],
      'Josue Aguilar': ['Escuintla I #A1', 'Escuintla II #A2', 'Villa Nueva #A3', 'Huehuetenango Centro #A4', 'Municipios Norte #A5', 'Oficina'],
      'Elias Quiej': ['Peten III #B1', 'Peten IV #B2', 'Transversal I #B3', 'Transversal II #B4', 'Amatitlán #B5', 'Oficina']
    };
  });
  const [nuevaRuta, setNuevaRuta] = useState('');
  const [showRutasModal, setShowRutasModal] = useState(false);

  // Antonio Celada / Admin ven todas las rutas; vendedores regulares solo sus rutas asignadas
  const rutasVisibles = useMemo(() => {
    if (isSuper) {
      return ALL_ROUTES;
    }
    return getPermittedRoutesForUser(currentUser, formData.vendedor);
  }, [isSuper, currentUser, formData.vendedor]);


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
      vendedor: (!isSuper && currentUser?.name) ? currentUser.name : '',
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
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; margin-top: 2px; }
    .header-left { width: 60%; vertical-align: top; padding-right: 10px; }
    .header-right { width: 40%; text-align: right; vertical-align: top; }
    .header-left img { width: 95px; height: auto; display: block; margin-bottom: 4px; }
    .header-left h2 { font-size: 9px; margin-bottom: 2px; font-weight: bold; }
    .header-left p { font-size: 7px; color: #555; margin: 1px 0; line-height: 1.3; }
    .fecha-solicitud { font-size: 10px; font-weight: bold; text-align: right; margin-bottom: 4px; }
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
    <table class="header-table">
      <tr>
        <td class="header-left">
          <img src="${LOGO_DATA_URI}" style="width: 95px; height: auto; display: block; margin-bottom: 4px;">
          <h2>DISTRIBUIDORA COMERCIAL EL OLAM S.A.</h2>
          <p>7a. Avenida "A" 17-67 Zona 13, Guatemala<br>Teléfonos: 2308-4353, 2332-7814, 2339-4613</p>
        </td>
        <td class="header-right">
          <div class="fecha-solicitud"><strong>Fecha de Solicitud:</strong> ${fechaSolicitud}</div>
          <table style="width: 100%; max-width: 180px; margin-left: auto; border: 1.5px solid #000; border-collapse: collapse; font-size: 8px; text-align: left; margin-top: 4px;">
            <tr>
              <th colspan="2" style="border-bottom: 1.5px solid #000; background-color: #f2f2f2; text-align: center; font-size: 8px; font-weight: bold; padding: 2px 4px; letter-spacing: 0.5px;">
                PARA USO INTERNO
              </th>
            </tr>
            <tr>
              <td style="padding: 3px 4px 2px 4px; font-weight: bold; width: 48%; white-space: nowrap; font-size: 8px;">No. De Cheque:</td>
              <td style="padding: 3px 4px 2px 4px; border-bottom: 1px solid #000; width: 52%; font-size: 8px;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding: 3px 4px 3px 4px; font-weight: bold; width: 48%; white-space: nowrap; font-size: 8px;">Banco:</td>
              <td style="padding: 3px 4px 3px 4px; border-bottom: 1px solid #000; width: 52%; font-size: 8px;">&nbsp;</td>
            </tr>
          </table>
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
        
        <div ref={formRef} className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl border border-blue-900/20 shadow-sm mt-4">
          <FormHeader logoSize="small" />
          
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white text-center py-2.5 rounded-xl mb-4 sm:mb-6 shadow-md">
            <h2 className="text-base sm:text-lg font-black tracking-wide">SOLICITUD DE VIATICOS</h2>
          </div>

          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-xs sm:text-sm text-blue-950">EJECUTIVO DE VENTAS:</label>
                  {isSuper && (
                    <button
                      type="button"
                      onClick={() => setShowVendedoresModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                    >
                      Editar Lista
                    </button>
                  )}
                </div>
                {isSuper ? (
                  <select
                    name="vendedor"
                    value={formData.vendedor}
                    onChange={handleVendedorChange}
                    className="w-full border-b-2 border-blue-900/30 focus:border-blue-700 px-2 py-1.5 focus:outline-none text-xs sm:text-sm text-blue-950 font-medium bg-white"
                  >
                    <option value="">Seleccione un ejecutivo</option>
                    {vendedores.map((vendedor, index) => (
                      <option key={index} value={vendedor}>{vendedor}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full border-b-2 border-blue-800 py-1.5 px-2 bg-blue-50 text-blue-950 font-bold text-xs sm:text-sm rounded-t flex items-center justify-between">
                    <span>{formData.vendedor || currentUser?.name || 'Vendedor'}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-black">
                      Asignado a ti
                    </span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-xs sm:text-sm text-blue-950">RUTA A:</label>
                  {isSuper && formData.vendedor && (
                    <button
                      type="button"
                      onClick={() => setShowRutasModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                    >
                      Editar Rutas
                    </button>
                  )}
                </div>
                <select
                  name="rutaA"
                  value={formData.rutaA}
                  onChange={handleChange}
                  className="w-full border-b-2 border-blue-900/30 focus:border-blue-700 px-2 py-1.5 focus:outline-none text-xs sm:text-sm text-blue-950 font-medium bg-white"
                >
                  <option value="">Seleccione una ruta</option>
                  {rutasVisibles.map((ruta, index) => (
                    <option key={index} value={ruta}>{ruta}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block font-bold mb-1 text-xs sm:text-sm text-blue-950">FECHA INICIAL:</label>
                <input
                  type="date"
                  name="fechaInicial"
                  value={formData.fechaInicial}
                  onChange={handleChange}
                  className="w-full border-b-2 border-blue-900/30 focus:border-blue-700 px-2 py-1.5 focus:outline-none text-xs sm:text-sm text-blue-950 font-medium bg-white"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-xs sm:text-sm text-blue-950">FECHA FINAL:</label>
                <input
                  type="date"
                  name="fechaFinal"
                  value={formData.fechaFinal}
                  onChange={handleChange}
                  className="w-full border-b-2 border-blue-900/30 focus:border-blue-700 px-2 py-1.5 focus:outline-none text-xs sm:text-sm text-blue-950 font-medium bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-xs sm:text-sm text-blue-950">LUGARES A VISITAR:</label>
              <textarea
                name="lugaresVisitar"
                value={formData.lugaresVisitar}
                onChange={handleChange}
                rows="2"
                className="w-full border border-blue-900/30 focus:border-blue-700 rounded-lg p-2 focus:outline-none text-xs sm:text-sm text-blue-950 uppercase font-medium bg-white"
                placeholder="Ingrese los lugares en mayúsculas"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="bg-blue-50/80 border-l-4 border-blue-900 px-3 py-2 font-black text-blue-950 mb-3 text-sm sm:text-base tracking-wide rounded-r">
              VALORES APROXIMADOS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="font-bold text-xs sm:text-sm text-blue-950">COMBUSTIBLE:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-blue-900">Q.</span>
                    <input
                      type="number"
                      name="combustible"
                      value={formData.combustible}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-blue-900/30 focus:border-blue-700 px-1 py-1 focus:outline-none text-xs sm:text-sm text-blue-950 font-semibold bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="font-bold text-xs sm:text-sm text-blue-950">ALIMENTACION:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-blue-900">Q.</span>
                    <input
                      type="number"
                      name="alimentacion"
                      value={formData.alimentacion}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-blue-900/30 focus:border-blue-700 px-1 py-1 focus:outline-none text-xs sm:text-sm text-blue-950 font-semibold bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="font-bold text-xs sm:text-sm text-blue-950">HOSPEDAJE:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-blue-900">Q.</span>
                    <input
                      type="number"
                      name="hospedaje"
                      value={formData.hospedaje}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-blue-900/30 focus:border-blue-700 px-1 py-1 focus:outline-none text-xs sm:text-sm text-blue-950 font-semibold bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="font-bold text-xs sm:text-sm text-blue-950">FOTOCOPIAS:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-blue-900">Q.</span>
                    <input
                      type="number"
                      name="fotocopias"
                      value={formData.fotocopias}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-blue-900/30 focus:border-blue-700 px-1 py-1 focus:outline-none text-xs sm:text-sm text-blue-950 font-semibold bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="font-bold text-xs sm:text-sm text-blue-950">OTROS:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-blue-900">Q.</span>
                    <input
                      type="number"
                      name="otros"
                      value={formData.otros}
                      onChange={handleChange}
                      className="flex-1 border-b-2 border-blue-900/30 focus:border-blue-700 px-1 py-1 focus:outline-none text-xs sm:text-sm text-blue-950 font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <div className="w-full bg-gradient-to-br from-blue-900 to-blue-950 text-white p-4 rounded-xl shadow text-center border border-blue-800">
                  <p className="font-black text-xs sm:text-sm uppercase tracking-wider text-blue-200 mb-1">TOTAL SOLICITADO</p>
                  <p className="font-black text-xl sm:text-2xl text-amber-300 drop-shadow">Q. {calcularTotal()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 mb-6">
            <label className="block font-bold mb-2 text-xs sm:text-sm text-blue-950">OBSERVACIONES:</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="3"
              className="w-full border border-blue-900/30 focus:border-blue-700 rounded-lg p-2 focus:outline-none text-xs sm:text-sm text-blue-950 font-medium bg-white"
            />
          </div>

          <div className="border-t border-slate-200 pt-4 mb-4"></div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6">
            <div className="text-center">
              <div className="border-t-2 border-blue-900/40 pt-2 min-h-20">
                <p className="text-xs font-bold text-blue-950">SOLICITADO POR:</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-blue-900/40 pt-2 min-h-20">
                <p className="text-xs font-bold text-blue-950">REVISADO GERENCIA DE VENTAS:</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-blue-900/40 pt-2 min-h-20">
                <p className="text-xs font-bold text-blue-950">REVISADO CONTABILIDAD:</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-blue-900/40 pt-2 min-h-20">
                <p className="text-xs font-bold text-blue-950">AUTORIZADO GERENCIA GENERAL:</p>
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
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}
