import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, History } from 'lucide-react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import FormHeader from './FormHeader';
import FormButtons from './FormButtons';
import { supabase } from '../lib/supabase';
import LiquidacionRecibosHistory from './LiquidacionRecibosHistory';

const MIN_ROWS = 15;

const EJECUTIVOS = [
  'Ana Lucia Marroquin',
  'Danny Perez',
  'Elio Caceros',
  'Elias Quiej',
  'Erick Curley',
  'Estuardo Cordova',
  'Jessica Noriega',
  'Josue Aguilar',
  'Karina Pineda',
  'Klissman Hernandez',
  'Wally Natareno'
];

const RUTAS = [
  'Amatitlán #B5',
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
  'Huehuetenango Centro #A4',
  'Huehuetenango Montaña Alta I #83',
  'Huehuetenango Montaña Alta II #84',
  'Huehuetenango Montaña Baja I #71',
  'Huehuetenango Montaña Baja II #72',
  'Ixcán #95',
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
  'Sacatepéquez #31',
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

const VENDOR_ROUTES = {
  'Ana Lucia Marroquin': ['Quetzaltenango #11', 'Totonicapan #12', 'Coban #13', 'Salama #14', 'Municipios Oriente #15'],
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

export default function LiquidacionRecibosForm() {
  const [formData, setFormData, saveForm, lastSaved] = useFormPersistence('liquidacion-recibos', {
    ejecutivo: '',
    rutaCubierta: '',
    semanaDesde: '',
    semanaHasta: '',
    liquidadoPor: '',
    cargoLiquidado: 'Ejecutivo de Ventas',
    revisadoPor: 'Creditos'
  });

  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [ejecutivos, setEjecutivos] = useState(EJECUTIVOS);
  const [rutas, setRutas] = useState(RUTAS);
  const [showEjecutivosModal, setShowEjecutivosModal] = useState(false);
  const [showRutasModal, setShowRutasModal] = useState(false);
  const [newEjecutivo, setNewEjecutivo] = useState('');
  const [newRuta, setNewRuta] = useState('');
  const [editingEjecutivoIndex, setEditingEjecutivoIndex] = useState(null);
  const [editingRutaIndex, setEditingRutaIndex] = useState(null);

  // Filter routes based on selected executive
  const availableRutas = (() => {
    const selectedVendor = formData.ejecutivo;
    if (selectedVendor && VENDOR_ROUTES[selectedVendor]) {
      return rutas.filter(r => VENDOR_ROUTES[selectedVendor].includes(r));
    }
    return rutas;
  })();

  const [receipts, setReceipts] = useState(
    Array(MIN_ROWS).fill(null).map(() => ({
      recibo: '',
      codigo: '',
      cliente: '',
      boletas: '',
      efectivo: '',
      cheque: '',
      observaciones: ''
    }))
  );

  const [totals, setTotals] = useState({
    boletas: 0,
    efectivo: 0,
    cheque: 0,
    total: 0
  });

  useEffect(() => {
    calculateTotals();
  }, [receipts]);

  const calculateTotals = () => {
    const sums = receipts.reduce((acc, receipt) => {
      const boletas = parseFloat(receipt.boletas) || 0;
      const efectivo = parseFloat(receipt.efectivo) || 0;
      const cheque = parseFloat(receipt.cheque) || 0;
      
      return {
        boletas: acc.boletas + boletas,
        efectivo: acc.efectivo + efectivo,
        cheque: acc.cheque + cheque
      };
    }, { boletas: 0, efectivo: 0, cheque: 0 });

    setTotals({
      ...sums,
      total: sums.boletas + sums.efectivo + sums.cheque
    });
  };

  const handleFormChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    
    if (field === 'ejecutivo') {
      updatedData.liquidadoPor = value;
    }
    
    setFormData(updatedData);
  };

  const addEjecutivo = () => {
    if (newEjecutivo.trim()) {
      if (editingEjecutivoIndex !== null) {
        const updated = [...ejecutivos];
        updated[editingEjecutivoIndex] = newEjecutivo;
        setEjecutivos(updated);
        setEditingEjecutivoIndex(null);
      } else {
        setEjecutivos([...ejecutivos, newEjecutivo]);
      }
      setNewEjecutivo('');
    }
  };

  const deleteEjecutivo = (index) => {
    setEjecutivos(ejecutivos.filter((_, i) => i !== index));
  };

  const editEjecutivo = (index) => {
    setNewEjecutivo(ejecutivos[index]);
    setEditingEjecutivoIndex(index);
  };

  const addRuta = () => {
    if (newRuta.trim()) {
      if (editingRutaIndex !== null) {
        const updated = [...rutas];
        updated[editingRutaIndex] = newRuta;
        setRutas(updated);
        setEditingRutaIndex(null);
      } else {
        setRutas([...rutas, newRuta]);
      }
      setNewRuta('');
    }
  };

  const deleteRuta = (index) => {
    setRutas(rutas.filter((_, i) => i !== index));
  };

  const editRuta = (index) => {
    setNewRuta(rutas[index]);
    setEditingRutaIndex(index);
  };

  const handleReceiptChange = (index, field, value) => {
    const newReceipts = [...receipts];
    newReceipts[index] = { ...newReceipts[index], [field]: value };
    setReceipts(newReceipts);
  };

  const handleReciboBlur = (index) => {
    // Auto-incremento de correlativo al ingresar el número y pasar a la siguiente casilla
    if (receipts[index].recibo && !isNaN(receipts[index].recibo)) {
      const receiptNumber = parseInt(receipts[index].recibo);
      // Verificar si existe la siguiente fila
      if (index < receipts.length - 1) {
        // Solo actualizar si el recibo de la siguiente fila está vacío
        if (!receipts[index + 1].recibo) {
          const newReceipts = [...receipts];
          newReceipts[index + 1] = { ...newReceipts[index + 1], recibo: String(receiptNumber + 1) };
          setReceipts(newReceipts);
        }
      }
    }
  };

  const addRow = () => {
    setReceipts([...receipts, {
      recibo: '',
      codigo: '',
      cliente: '',
      boletas: '',
      efectivo: '',
      cheque: '',
      observaciones: ''
    }]);
  };

  const removeRow = (index) => {
    if (receipts.length > MIN_ROWS) {
      const newReceipts = receipts.filter((_, i) => i !== index);
      setReceipts(newReceipts);
    }
  };

  const lookupClientCode = async (code, index) => {
    if (!code) return;
    const trimmedCode = code.trim();
    try {
      const { data, error } = await supabase
        .from('client_codes')
        .select('client_name')
        .eq('code', trimmedCode)
        .single();
      
      if (data && data.client_name) {
        const newReceipts = [...receipts];
        // Si el cliente ya tiene valor, confirmamos si queremos sobrescribirlo o solo si está vacío
        // Para "autocompletar", lo mejor es llenar si está vacío, o actualizar. 
        // Asumimos que el código manda.
        newReceipts[index] = { ...newReceipts[index], cliente: data.client_name };
        setReceipts(newReceipts);
        // Visual feedback via console
        console.log(`Autocompletado: ${trimmedCode} -> ${data.client_name}`);
      }
    } catch (error) {
      console.error('Error looking up client code:', error);
    }
  };

  const handleSaveForm = async () => {
    console.log('Guardando formulario en historial...');
    setIsSaving(true);

    try {
      // Filtrar recibos vacíos
      const filledReceipts = receipts.filter(r =>
        r.recibo || r.codigo || r.cliente || r.boletas || r.efectivo || r.cheque || r.observaciones
      );

      // Guardar historial de códigos y clientes
      const codesToSave = filledReceipts
        .filter(r => r.codigo && r.cliente)
        .map(r => ({
          code: r.codigo.trim(),
          client_name: r.cliente.trim()
        }));
      
      if (codesToSave.length > 0) {
        // Eliminar duplicados, quedándose con el último valor ingresado
        const uniqueCodes = Object.values(
          codesToSave.reduce((acc, curr) => {
            acc[curr.code] = curr;
            return acc;
          }, {})
        );

        const { error: codeError } = await supabase
          .from('client_codes')
          .upsert(uniqueCodes, { onConflict: 'code' });
          
        if (codeError) {
          console.error('Error saving client codes:', codeError);
        } else {
          console.log('Códigos de clientes actualizados:', uniqueCodes.length);
        }
      }

      const dataToSave = {
        ...formData,
        receipts: filledReceipts
      };

      console.log('Datos a guardar:', dataToSave);

      if (editingRecord) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('liquidacion_recibos_history')
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

        console.log('Registro actualizado exitosamente');
        alert('Registro actualizado exitosamente');
        setEditingRecord(null);
      } else {
        // Crear nuevo registro
        const { error } = await supabase
          .from('liquidacion_recibos_history')
          .insert({
            datos: dataToSave,
            fecha_creacion: new Date().toISOString()
          });

        if (error) {
          console.error('Error al guardar:', error);
          alert('Error al guardar en el historial');
          return;
        }

        console.log('Guardado exitosamente en historial');
        setShowSaveMessage(true);
        setTimeout(() => setShowSaveMessage(false), 3000);
      }

      // Guardar también en localStorage
      saveForm();
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Error inesperado al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setFormData({
      ejecutivo: '',
      rutaCubierta: '',
      semanaDesde: '',
      semanaHasta: '',
      liquidadoPor: '',
      cargoLiquidado: 'Ejecutivo de Ventas',
      revisadoPor: 'Creditos'
    });
    setReceipts(
      Array(MIN_ROWS).fill(null).map(() => ({
        recibo: '',
        codigo: '',
        cliente: '',
        boletas: '',
        efectivo: '',
        cheque: '',
        observaciones: ''
      }))
    );
    setEditingRecord(null);
  };

  const handleEditFromHistory = (record) => {
    console.log('Cargando registro para editar:', record);

    const datos = record.datos;

    // Cargar datos del formulario
    setFormData({
      ejecutivo: datos.ejecutivo || '',
      rutaCubierta: datos.rutaCubierta || '',
      semanaDesde: datos.semanaDesde || '',
      semanaHasta: datos.semanaHasta || '',
      liquidadoPor: datos.liquidadoPor || '',
      cargoLiquidado: datos.cargoLiquidado || 'Ejecutivo de Ventas',
      revisadoPor: datos.revisadoPor || 'Creditos'
    });

    // Cargar recibos
    const loadedReceipts = datos.receipts || [];
    const paddedReceipts = [
      ...loadedReceipts,
      ...Array(Math.max(0, MIN_ROWS - loadedReceipts.length)).fill(null).map(() => ({
        recibo: '',
        codigo: '',
        cliente: '',
        boletas: '',
        efectivo: '',
        cheque: '',
        observaciones: ''
      }))
    ];

    setReceipts(paddedReceipts);
    setEditingRecord(record);

    // Scroll al inicio del formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (value) => {
    if (!value || value === 0) return '';
    return `Q ${new Intl.NumberFormat('es-GT', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleExport = () => {
    const blueColor = '#1E3A8A';
    const darkBlueColor = '#1E40AF';
    
    const logoUrl = '/logo.png';
    const LOGO_SIZE = '130pt';

    const rowsToExport = Math.max(receipts.length, MIN_ROWS);
    const tableRows = Array(rowsToExport).fill(null).map((_, i) => {
      const receipt = receipts[i] || {};
      return `
        <tr>
          <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.recibo || '&nbsp;'}</td>
          <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.codigo || '&nbsp;'}</td>
          <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.cliente || '&nbsp;'}</td>
          <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.boletas ? formatCurrency(parseFloat(receipt.boletas)) : '&nbsp;'}</td>
          <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.efectivo ? formatCurrency(parseFloat(receipt.efectivo)) : '&nbsp;'}</td>
          <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.cheque ? formatCurrency(parseFloat(receipt.cheque)) : '&nbsp;'}</td>
          <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.observaciones || '&nbsp;'}</td>
        </tr>
      `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquidación de Recibos</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0.75in;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.2;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .header-container {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15pt;
      gap: 15pt;
    }
    
    .logo-section {
      flex-shrink: 0;
    }
    
    .logo {
      width: ${LOGO_SIZE};
      height: auto;
    }
    
    .title-section {
      flex: 1;
      text-align: center;
    }
    
    h1 {
      color: ${blueColor};
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 5pt 0;
      text-transform: uppercase;
    }
    
    h2 {
      color: ${blueColor};
      font-size: 13pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
    }
    
    .info-box {
      border: 2pt solid ${blueColor};
      padding: 10pt;
      margin-bottom: 15pt;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8pt;
    }
    
    .info-field {
      font-size: 10pt;
    }
    
    .info-field strong {
      font-weight: bold;
    }
    
    .info-field span {
      border-bottom: 1pt solid #000;
      display: inline-block;
      min-width: 150pt;
      padding: 0 5pt;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15pt;
    }
    
    .data-table th {
      background-color: ${darkBlueColor};
      color: white;
      font-weight: bold;
      text-align: center;
      border: 1pt solid #000;
      padding: 8pt 5pt;
      font-size: 10pt;
    }
    
    .data-table td {
      border: 1pt solid #000;
      padding: 6pt 5pt;
      vertical-align: middle;
      font-size: 9pt;
    }
    
    .totals-row {
      background-color: black;
      color: white;
      font-weight: bold;
      font-size: 10pt;
    }
    
    .totals-row td {
      padding: 8pt 5pt;
      border: 1pt solid #000;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40pt;
    }
    
    .signature-block {
      text-align: center;
      width: 45%;
    }
    
    .signature-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 20pt;
    }
    
    .signature-name {
      font-size: 9pt;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="logo-section">
      <img src="${logoUrl}" alt="Logo" class="logo">
    </div>
    <div class="title-section">
      <h1>DROGUERIA EL OLAM</h1>
      <h2>LIQUIDACION SEMANAL DE RECIBOS DE CAJA</h2>
    </div>
  </div>

  <div class="info-box">
    <div class="info-field">
      <strong>Ejecutivo:</strong> <span>${formData.ejecutivo}</span>
    </div>
    <div class="info-field">
      <strong>Ruta Cubierta:</strong> <span>${formData.rutaCubierta}</span>
    </div>
    <div class="info-field" style="grid-column: 1 / -1;">
      <strong>Semana del:</strong> <span>${formatDate(formData.semanaDesde)}</span>
      <strong style="margin-left: 20pt;">al</strong> <span>${formatDate(formData.semanaHasta)}</span>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 8%;">Recibo</th>
        <th style="width: 8%;">Código</th>
        <th style="width: 25%;">Cliente</th>
        <th style="width: 12%;">Boletas</th>
        <th style="width: 12%;">Efectivo</th>
        <th style="width: 12%;">Cheque</th>
        <th style="width: 23%;">Observaciones</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="3" style="text-align: center;"><strong>TOTALES:</strong></td>
        <td style="text-align: right;">${formatCurrency(totals.boletas)}</td>
        <td style="text-align: right;">${formatCurrency(totals.efectivo)}</td>
        <td style="text-align: right;">${formatCurrency(totals.cheque)}</td>
        <td style="text-align: right;"><strong>${formatCurrency(totals.total)}</strong></td>
      </tr>
    </tfoot>
  </table>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-label">Liquidado Por: ________________</div>
      <div class="signature-name">${formData.liquidadoPor}</div>
      <div class="signature-name">${formData.cargoLiquidado}</div>
    </div>
    <div class="signature-block">
      <div class="signature-label">Revisado Por: ________________</div>
      <div class="signature-name">${formData.revisadoPor}</div>
    </div>
  </div>
</body>
</html>
    `;

    // Abrir nueva ventana e imprimir directamente
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
      // Esperar a que se cargue el contenido antes de imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      alert('Por favor, permite las ventanas emergentes para exportar el formulario.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <FormHeader 
          title="Liquidación de Recibos"
          subtitle="Liquidación Semanal de Recibos de Caja"
        />

        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={handleSaveForm}
              disabled={isSaving}
              className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-500 font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : editingRecord ? 'Actualizar' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-semibold text-sm sm:text-base"
            >
              <History className="w-4 h-4" />
              Historial
            </button>
            {editingRecord && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 font-semibold text-sm sm:text-base"
              >
                <X className="w-4 h-4" />
                Cancelar Edición
              </button>
            )}
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

          <FormButtons 
            onClear={handleClear}
            onExport={handleExport}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 border-2 border-blue-600 rounded-lg">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Ejecutivo:
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.ejecutivo}
                  onChange={(e) => handleFormChange('ejecutivo', e.target.value)}
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar ejecutivo</option>
                  {ejecutivos.map((exec) => (
                    <option key={exec} value={exec}>{exec}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowEjecutivosModal(true)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Ruta Cubierta:
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.rutaCubierta}
                  onChange={(e) => handleFormChange('rutaCubierta', e.target.value)}
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar ruta</option>
                  {availableRutas.map((ruta) => (
                    <option key={ruta} value={ruta}>{ruta}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowRutasModal(true)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Semana del:
              </label>
              <input
                type="date"
                value={formData.semanaDesde}
                onChange={(e) => handleFormChange('semanaDesde', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Semana al:
              </label>
              <input
                type="date"
                value={formData.semanaHasta}
                onChange={(e) => handleFormChange('semanaHasta', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Agregar Recibo
            </button>
          </div>

          <div className="overflow-x-auto mb-4 sm:mb-6">
            <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="border border-gray-300 px-2 py-2 text-center">Recibo</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">Código</th>
                  <th className="border border-gray-300 px-2 py-2 text-center min-w-[250px]">Cliente</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">Boletas</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">Efectivo</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">Cheque</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">Observaciones</th>
                  <th className="border border-gray-300 px-2 py-2 text-center w-16">Acción</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-1 py-1">
                      <input
                        type="text"
                        value={receipt.recibo}
                        onChange={(e) => handleReceiptChange(index, 'recibo', e.target.value)}
                        onBlur={() => handleReciboBlur(index)}
                        className="w-full px-1 py-1 text-xs sm:text-sm border-0 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-1">
                      <input
                        type="text"
                        value={receipt.codigo}
                        onChange={(e) => handleReceiptChange(index, 'codigo', e.target.value)}
                        onBlur={() => lookupClientCode(receipt.codigo, index)}
                        className="w-full px-1 py-1 text-xs sm:text-sm border-0 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-1">
                      <input
                        type="text"
                        value={receipt.cliente}
                        onChange={(e) => handleReceiptChange(index, 'cliente', e.target.value)}
                        className="w-full px-1 py-1 text-xs sm:text-sm border-0 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={receipt.boletas}
                        onChange={(e) => handleReceiptChange(index, 'boletas', e.target.value)}
                        className="w-full px-1 py-1 text-xs sm:text-sm border-0 focus:ring-1 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={receipt.efectivo}
                        onChange={(e) => handleReceiptChange(index, 'efectivo', e.target.value)}
                        className="w-full px-1 py-1 text-xs sm:text-sm border-0 focus:ring-1 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={receipt.cheque}
                        onChange={(e) => handleReceiptChange(index, 'cheque', e.target.value)}
                        className="w-full px-1 py-1 text-xs sm:text-sm border-0 focus:ring-1 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-1">
                      <input
                        type="text"
                        value={receipt.observaciones}
                        onChange={(e) => handleReceiptChange(index, 'observaciones', e.target.value)}
                        className="w-full px-1 py-1 text-xs sm:text-sm border-0 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-1 text-center">
                      <button
                        onClick={() => removeRow(index)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-black text-white font-bold">
                  <td colSpan="3" className="border border-gray-300 px-2 py-2 text-center text-xs sm:text-sm">
                    TOTALES:
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right text-xs sm:text-sm">
                    {formatCurrency(totals.boletas)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right text-xs sm:text-sm">
                    {formatCurrency(totals.efectivo)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right text-xs sm:text-sm">
                    {formatCurrency(totals.cheque)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right text-xs sm:text-sm">
                    {formatCurrency(totals.total)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Liquidado Por:
              </label>
              <input
                type="text"
                value={formData.liquidadoPor}
                onChange={(e) => handleFormChange('liquidadoPor', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre"
              />
              <input
                type="text"
                value={formData.cargoLiquidado}
                onChange={(e) => handleFormChange('cargoLiquidado', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                placeholder="Cargo"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Revisado Por:
              </label>
              <input
                type="text"
                value={formData.revisadoPor}
                onChange={(e) => handleFormChange('revisadoPor', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Departamento/Nombre"
              />
            </div>
          </div>
        </div>

        {/* Modal Ejecutivos */}
        {showEjecutivosModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-blue-600 text-white p-3 sm:p-4 flex justify-between items-center">
                <h3 className="font-bold text-sm sm:text-base">Gestionar Ejecutivos</h3>
                <button
                  onClick={() => {
                    setShowEjecutivosModal(false);
                    setNewEjecutivo('');
                    setEditingEjecutivoIndex(null);
                  }}
                  className="hover:bg-blue-700 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 sm:p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEjecutivo}
                    onChange={(e) => setNewEjecutivo(e.target.value)}
                    placeholder="Nombre del ejecutivo"
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addEjecutivo()}
                  />
                  <button
                    onClick={addEjecutivo}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ejecutivos.map((exec, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs sm:text-sm text-gray-700">{exec}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => editEjecutivo(index)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEjecutivo(index)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Rutas */}
        {showRutasModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-blue-600 text-white p-3 sm:p-4 flex justify-between items-center">
                <h3 className="font-bold text-sm sm:text-base">Gestionar Rutas</h3>
                <button
                  onClick={() => {
                    setShowRutasModal(false);
                    setNewRuta('');
                    setEditingRutaIndex(null);
                  }}
                  className="hover:bg-blue-700 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 sm:p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuta}
                    onChange={(e) => setNewRuta(e.target.value)}
                    placeholder="Nombre de la ruta"
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addRuta()}
                  />
                  <button
                    onClick={addRuta}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {rutas.map((ruta, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs sm:text-sm text-gray-700">{ruta}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => editRuta(index)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRuta(index)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Historial */}
        {showHistory && (
          <LiquidacionRecibosHistory
            onClose={() => setShowHistory(false)}
            onEdit={handleEditFromHistory}
          />
        )}
      </div>
    </div>
  );
}