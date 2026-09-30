import { useState, useRef } from 'react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { Save, History, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FormHeader from './FormHeader';
import FormButtons from './FormButtons';
import AperturaCodigoHistory from './AperturaCodigoHistory';

export default function AperturaCodigoForm() {
  const formRef = useRef(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData, saveForm, lastSaved] = useFormPersistence('apertura-codigo', {
    nombreRazonSocial: '',
    direccionFacturacion: '',
    nitDpi: '',
    nombreNegocio: '',
    direccionEntrega: '',
    telefonos: '',
    correoElectronico: '',
    encargadoCompras: '',
    telefonoCompras: '',
    encargadoPagos: '',
    telefonoPagos: '',
    fecha: '',
    rutaAsignada: '',
    codigoAsignado: '',
    ejecutivoVentas: ''
  });

  const [showSaveMessage, setShowSaveMessage] = useState(false);

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
  ]);

  const [ejecutivos, setEjecutivos] = useState([
    'Ana Lucia Marroquín',
    'Danny Pérez',
    'Elio Cáceres',
    'Elias Quiej',
    'Erick Curley',
    'Estuardo Cordova',
    'Jessica Noriega',
    'Josué Aguilar',
    'Karina Pineda',
    'Klissman Hernández',
    'Wally Natareno'
  ]);

  const [newRuta, setNewRuta] = useState('');
  const [newEjecutivo, setNewEjecutivo] = useState('');
  const [showRutaInput, setShowRutaInput] = useState(false);
  const [showEjecutivoInput, setShowEjecutivoInput] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addRuta = () => {
    if (newRuta.trim() && !rutas.includes(newRuta.trim())) {
      const updatedRutas = [...rutas, newRuta.trim()].sort();
      setRutas(updatedRutas);
      setNewRuta('');
      setShowRutaInput(false);
    }
  };

  const deleteRuta = (ruta) => {
    setRutas(rutas.filter(r => r !== ruta));
  };

  const addEjecutivo = () => {
    if (newEjecutivo.trim() && !ejecutivos.includes(newEjecutivo.trim())) {
      const updatedEjecutivos = [...ejecutivos, newEjecutivo.trim()].sort();
      setEjecutivos(updatedEjecutivos);
      setNewEjecutivo('');
      setShowEjecutivoInput(false);
    }
  };

  const deleteEjecutivo = (ejecutivo) => {
    setEjecutivos(ejecutivos.filter(e => e !== ejecutivo));
  };

  const handleClear = () => {
    setFormData({
      nombreRazonSocial: '',
      direccionFacturacion: '',
      nitDpi: '',
      nombreNegocio: '',
      direccionEntrega: '',
      telefonos: '',
      correoElectronico: '',
      encargadoCompras: '',
      telefonoCompras: '',
      encargadoPagos: '',
      telefonoPagos: '',
      fecha: '',
      rutaAsignada: '',
      codigoAsignado: '',
      ejecutivoVentas: ''
    });
    setEditingRecord(null);
  };

  const handleSaveForm = async () => {
    setIsSaving(true);
    const success = saveForm();
    if (success) {
      try {
        if (editingRecord) {
          const { error } = await supabase
            .from('apertura_codigo_history')
            .update({
              datos: formData,
              fecha_creacion: new Date().toISOString()
            })
            .eq('id', editingRecord.id);

          if (error) throw error;
          alert('Registro actualizado exitosamente');
          setEditingRecord(null);
        } else {
          const { error } = await supabase
            .from('apertura_codigo_history')
            .insert([
              {
                datos: formData,
                fecha_creacion: new Date().toISOString()
              }
            ]);

          if (error) throw error;
          setShowSaveMessage(true);
          setTimeout(() => setShowSaveMessage(false), 3000);
        }
      } catch (error) {
        console.error('Error al guardar en historial:', error);
        alert('Error al guardar en el historial');
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(false);
    }
  };

  const handleHistoryEdit = (record) => {
    setFormData(record.datos);
    setEditingRecord(record);
    setShowHistory(false);
  };

  const handleExport = () => {
    const pageTitle = formData.nombreRazonSocial || 'Apertura de Código Nuevo';
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; margin: 0; background-color: #f0f0f0; }
    .container { 
      width: 100%;
      max-width: 11in;
      background-color: white;
      margin: 0 auto; 
      border: 2px solid #333; 
      padding: 0.25in; 
      box-sizing: border-box; 
      position: relative;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 8pt; 
    }
    .header-left { flex: 1; padding-right: 10pt; }
    .header-left h2 { font-size: 9pt; margin-bottom: 2pt; font-weight: bold; }
    .header-left p { font-size: 7pt; color: #666; margin: 1pt 0; line-height: 1.2; }
    .header-right { flex-shrink: 0; }
    .header-right img { width: 1.3in; height: auto; display: block; }
    .title { 
      background: #000; 
      color: #fff; 
      padding: 5pt; 
      text-align: center; 
      margin: 6pt 0; 
      font-size: 11pt; 
      font-weight: bold; 
    }
    .section { margin-bottom: 8pt; }
    .section-title { 
      background: #e5e5e5; 
      padding: 3pt 4pt; 
      font-weight: bold; 
      margin-bottom: 4pt; 
      font-size: 17pt;
      text-align: center;
    }
    .field { margin-bottom: 4pt; }
    .field-label { font-weight: bold; font-size: 8pt; display: inline-block; }
    .field-value { 
      border-bottom: 1px solid #000; 
      padding: 1pt 2pt; 
      min-height: 14pt; 
      font-size: 8pt; 
      display: inline-block;
      width: calc(100% - 2pt);
      white-space: pre-wrap;
    }
    .grid-2 { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 8pt; 
      margin-bottom: 4pt;
    }
    .grid-4 { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 6pt; 
      margin-top: 8pt;
    }
    .field-inline { display: flex; flex-direction: column; }
    .field-inline .field-label { margin-bottom: 1pt; }
    .textarea-value { min-height: 24pt; }
    @page { size: landscape; margin: 0.5cm; }
    @media print {
      body { padding: 0; margin: 0; background-color: white; }
      .container { border: 2px solid #333; max-width: none; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h2>DISTRIBUIDORA COMERCIAL EL OLAM S.A.</h2>
        <p>7a. Avenida "A" 17-67 Colonia Aurora I Zona 13, Guatemala</p>
        <p>Teléfonos: 2308-4353, 2332-7814, 2339-4613</p>
      </div>
      <div class="header-right">
        <img src="/logo.png" alt="Logo" />
      </div>
    </div>

    <!-- Title -->
    <div class="title">APERTURA DE CODIGO NUEVO</div>

    <!-- Datos de Facturación -->
    <div class="section">
      <div class="section-title">DATOS DE FACTURACIÓN</div>
      <div class="field">
        <span class="field-label">Nombre o Razón Social:</span>
        <div class="field-value">${formData.nombreRazonSocial || ''}</div>
      </div>
      <div class="field">
        <span class="field-label">Dirección:</span>
        <div class="field-value textarea-value">${(formData.direccionFacturacion || '').replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="field">
        <span class="field-label">Nit / DPI:</span>
        <div class="field-value">${formData.nitDpi || ''}</div>
      </div>
    </div>

    <!-- Datos Generales -->
    <div class="section">
      <div class="section-title">DATOS GENERALES</div>
      <div class="field">
        <span class="field-label">Nombre Del Negocio:</span>
        <div class="field-value">${formData.nombreNegocio || ''}</div>
      </div>
      <div class="field">
        <span class="field-label">Dirección de Entrega:</span>
        <div class="field-value textarea-value">${(formData.direccionEntrega || '').replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="grid-2">
        <div class="field-inline">
          <span class="field-label">Teléfonos:</span>
          <div class="field-value">${formData.telefonos || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Correo Electrónico:</span>
          <div class="field-value">${formData.correoElectronico || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-inline">
          <span class="field-label">Encargado de Compras:</span>
          <div class="field-value">${formData.encargadoCompras || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoCompras || ''}</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top: 8pt;">
        <div class="field-inline">
          <span class="field-label">Encargado de Pagos:</span>
          <div class="field-value">${formData.encargadoPagos || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoPagos || ''}</div>
        </div>
      </div>
    </div>

    <!-- Campos finales -->
    <div class="grid-4">
      <div class="field-inline">
        <span class="field-label">Fecha de Creación:</span>
        <div class="field-value">${formData.fecha || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Ruta Asignada:</span>
        <div class="field-value">${formData.rutaAsignada || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Código Asignado:</span>
        <div class="field-value">${formData.codigoAsignado || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Ejecutivo de Ventas:</span>
        <div class="field-value">${formData.ejecutivoVentas || ''}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Abrir nueva ventana e imprimir directamente
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = function() {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } else {
      alert('Por favor, permite las ventanas emergentes para exportar el formulario.');
    }
  };

  const handleShareWhatsApp = () => {
    // Primero exportar el formulario
    handleExport();
    
    // Luego abrir WhatsApp con mensaje
    const message = `Hola, te comparto el formulario de Apertura de Código Nuevo de ${formData.nombreNegocio || 'mi negocio'}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareWhatsAppOld = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apertura de Código Nuevo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 0; margin: 0; }
    .container { 
      width: 8.5in; 
      height: 5.5in; 
      margin: 0 auto; 
      border: 2px solid #333; 
      padding: 0.25in; 
      box-sizing: border-box; 
      position: relative;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 8pt; 
    }
    .header-left { flex: 1; padding-right: 10pt; }
    .header-left h2 { font-size: 9pt; margin-bottom: 2pt; font-weight: bold; }
    .header-left p { font-size: 7pt; color: #666; margin: 1pt 0; line-height: 1.2; }
    .header-right { flex-shrink: 0; }
    .header-right img { width: 1.3in; height: auto; display: block; }
    .title { 
      background: #000; 
      color: #fff; 
      padding: 5pt; 
      text-align: center; 
      margin: 6pt 0; 
      font-size: 11pt; 
      font-weight: bold; 
    }
    .section { margin-bottom: 8pt; }
    .section-title { 
      background: #e5e5e5; 
      padding: 3pt 4pt; 
      font-weight: bold; 
      margin-bottom: 4pt; 
      font-size: 17pt;
      text-align: center;
    }
    .field { margin-bottom: 4pt; }
    .field-label { font-weight: bold; font-size: 8pt; display: inline-block; }
    .field-value { 
      border-bottom: 1px solid #000; 
      padding: 1pt 2pt; 
      min-height: 14pt; 
      font-size: 8pt; 
      display: inline-block;
      width: calc(100% - 2pt);
      white-space: pre-wrap;
    }
    .grid-2 { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 8pt; 
      margin-bottom: 4pt;
    }
    .grid-4 { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 6pt; 
      margin-top: 8pt;
    }
    .field-inline { display: flex; flex-direction: column; }
    .field-inline .field-label { margin-bottom: 1pt; }
    .textarea-value { min-height: 24pt; }
    @page { size: 8.5in 5.5in landscape; margin: 0; }
    @media print {
      body { padding: 0; margin: 0; }
      .container { border: 2px solid #333; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h2>DISTRIBUIDORA COMERCIAL EL OLAM S.A.</h2>
        <p>7a. Avenida "A" 17-67 Colonia Aurora I Zona 13, Guatemala</p>
        <p>Teléfonos: 2308-4353, 2332-7814, 2339-4613</p>
      </div>
      <div class="header-right">
        <img src="/logo.png" alt="Logo" />
      </div>
    </div>

    <!-- Title -->
    <div class="title">APERTURA DE CODIGO NUEVO</div>

    <!-- Datos de Facturación -->
    <div class="section">
      <div class="section-title">DATOS DE FACTURACIÓN</div>
      <div class="field">
        <span class="field-label">Nombre o Razón Social:</span>
        <div class="field-value">${formData.nombreRazonSocial || ''}</div>
      </div>
      <div class="field">
        <span class="field-label">Dirección:</span>
        <div class="field-value textarea-value">${(formData.direccionFacturacion || '').replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="field">
        <span class="field-label">Nit / DPI:</span>
        <div class="field-value">${formData.nitDpi || ''}</div>
      </div>
    </div>

    <!-- Datos Generales -->
    <div class="section">
      <div class="section-title">DATOS GENERALES</div>
      <div class="field">
        <span class="field-label">Nombre Del Negocio:</span>
        <div class="field-value">${formData.nombreNegocio || ''}</div>
      </div>
      <div class="field">
        <span class="field-label">Dirección de Entrega:</span>
        <div class="field-value textarea-value">${(formData.direccionEntrega || '').replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="grid-2">
        <div class="field-inline">
          <span class="field-label">Teléfonos:</span>
          <div class="field-value">${formData.telefonos || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Correo Electrónico:</span>
          <div class="field-value">${formData.correoElectronico || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-inline">
          <span class="field-label">Encargado de Compras:</span>
          <div class="field-value">${formData.encargadoCompras || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoCompras || ''}</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top: 8pt;">
        <div class="field-inline">
          <span class="field-label">Encargado de Pagos:</span>
          <div class="field-value">${formData.encargadoPagos || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoPagos || ''}</div>
        </div>
      </div>
    </div>

    <!-- Campos finales -->
    <div class="grid-4">
      <div class="field-inline">
        <span class="field-label">Fecha de Creación:</span>
        <div class="field-value">${formData.fecha || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Ruta Asignada:</span>
        <div class="field-value">${formData.rutaAsignada || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Código Asignado:</span>
        <div class="field-value">${formData.codigoAsignado || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Ejecutivo de Ventas:</span>
        <div class="field-value">${formData.ejecutivoVentas || ''}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Abrir nueva ventana e imprimir directamente
    const url = URL.createObjectURL(blob);
    const whatsappMessage = `Hola, te comparto el formulario de Apertura de Código: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6">
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={handleSaveForm}
          disabled={isSaving}
          className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-500 font-semibold text-sm sm:text-base disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Guardando...' : editingRecord ? 'Actualizar' : 'Guardar'}
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 font-semibold text-sm sm:text-base"
        >
          <History className="w-4 h-4" />
          Historial
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-semibold text-sm sm:text-base"
        >
          <Printer className="w-4 h-4" />
          Exportar / Imprimir
        </button>
        {editingRecord && (
          <button
            onClick={() => {
              handleClear();
              setEditingRecord(null);
            }}
            className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 font-semibold text-sm sm:text-base"
          >
            Cancelar Edición
          </button>
        )}
        <button
          onClick={handleClear}
          className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm sm:text-base"
        >
          Limpiar
        </button>
      </div>

      {showSaveMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✓ Formulario guardado correctamente
        </div>
      )}

      {editingRecord && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          ℹ️ Editando registro del historial. Los cambios se guardarán al presionar "Actualizar".
        </div>
      )}
      
      <div ref={formRef} className="bg-white p-4 sm:p-6 md:p-8 border-2 border-gray-300">
        <FormHeader logoSize="small" />
        
        <div className="bg-black text-white text-center py-2 mb-4 sm:mb-6">
          <h1 className="text-base sm:text-lg font-bold">APERTURA DE CODIGO NUEVO</h1>
        </div>

        <div className="mb-4 sm:mb-6">
          <h3 className="bg-gray-200 px-2 sm:px-3 py-2 font-semibold mb-3 text-sm sm:text-base">DATOS DE FACTURACIÓN</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Nombre o Razón Social:</label>
              <input
                type="text"
                name="nombreRazonSocial"
                value={formData.nombreRazonSocial}
                onChange={handleChange}
                className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Dirección:</label>
              <textarea
                name="direccionFacturacion"
                value={formData.direccionFacturacion}
                onChange={handleChange}
                rows="2"
                className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Nit / DPI:</label>
              <input
                type="text"
                name="nitDpi"
                value={formData.nitDpi}
                onChange={handleChange}
                className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <h3 className="bg-gray-200 px-2 sm:px-3 py-2 font-semibold mb-3 text-sm sm:text-base">DATOS GENERALES</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Nombre Del Negocio:</label>
              <input
                type="text"
                name="nombreNegocio"
                value={formData.nombreNegocio}
                onChange={handleChange}
                className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Dirección de Entrega:</label>
              <textarea
                name="direccionEntrega"
                value={formData.direccionEntrega}
                onChange={handleChange}
                rows="2"
                className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Teléfonos:</label>
                <input
                  type="text"
                  name="telefonos"
                  value={formData.telefonos}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  name="correoElectronico"
                  value={formData.correoElectronico}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Encargado de Compras:</label>
                <input
                  type="text"
                  name="encargadoCompras"
                  value={formData.encargadoCompras}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Teléfono:</label>
                <input
                  type="text"
                  name="telefonoCompras"
                  value={formData.telefonoCompras}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Encargado de Pagos:</label>
                <input
                  type="text"
                  name="encargadoPagos"
                  value={formData.encargadoPagos}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Teléfono:</label>
                <input
                  type="text"
                  name="telefonoPagos"
                  value={formData.telefonoPagos}
                  onChange={handleChange}
                  className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Fecha de Creación:</label>
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Ruta Asignada:</label>
            <div className="relative">
              <select
                name="rutaAsignada"
                value={formData.rutaAsignada}
                onChange={handleChange}
                className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base bg-white"
              >
                <option value="">Seleccionar ruta...</option>
                {rutas.map((ruta, index) => (
                  <option key={index} value={ruta}>{ruta}</option>
                ))}
              </select>
              <div className="flex gap-2 mt-2">
                {!showRutaInput ? (
                  <button
                    type="button"
                    onClick={() => setShowRutaInput(true)}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  >
                    + Agregar
                  </button>
                ) : (
                  <div className="flex gap-1 w-full">
                    <input
                      type="text"
                      value={newRuta}
                      onChange={(e) => setNewRuta(e.target.value)}
                      placeholder="Nueva ruta..."
                      className="flex-1 border border-gray-300 px-2 py-1 text-xs rounded"
                    />
                    <button
                      type="button"
                      onClick={addRuta}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRutaInput(false);
                        setNewRuta('');
                      }}
                      className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {formData.rutaAsignada && (
                  <button
                    type="button"
                    onClick={() => deleteRuta(formData.rutaAsignada)}
                    className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Código Asignado:</label>
            <input
              type="text"
              name="codigoAsignado"
              value={formData.codigoAsignado}
              onChange={handleChange}
              className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Ejecutivo de Ventas:</label>
            <div className="relative">
              <select
                name="ejecutivoVentas"
                value={formData.ejecutivoVentas}
                onChange={handleChange}
                className="w-full border-b-2 border-gray-400 px-2 py-1 focus:outline-none focus:border-blue-600 text-sm sm:text-base bg-white"
              >
                <option value="">Seleccionar ejecutivo...</option>
                {ejecutivos.map((ejecutivo, index) => (
                  <option key={index} value={ejecutivo}>{ejecutivo}</option>
                ))}
              </select>
              <div className="flex gap-2 mt-2">
                {!showEjecutivoInput ? (
                  <button
                    type="button"
                    onClick={() => setShowEjecutivoInput(true)}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  >
                    + Agregar
                  </button>
                ) : (
                  <div className="flex gap-1 w-full">
                    <input
                      type="text"
                      value={newEjecutivo}
                      onChange={(e) => setNewEjecutivo(e.target.value)}
                      placeholder="Nuevo ejecutivo..."
                      className="flex-1 border border-gray-300 px-2 py-1 text-xs rounded"
                    />
                    <button
                      type="button"
                      onClick={addEjecutivo}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEjecutivoInput(false);
                        setNewEjecutivo('');
                      }}
                      className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {formData.ejecutivoVentas && (
                  <button
                    type="button"
                    onClick={() => deleteEjecutivo(formData.ejecutivoVentas)}
                    className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showHistory && (
        <AperturaCodigoHistory
          onClose={() => setShowHistory(false)}
          onEdit={handleHistoryEdit}
        />
      )}
    </div>
  );
}
