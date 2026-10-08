import ExcelJS from 'exceljs';

/**
 * Normaliza nombres para archivos de Excel (ej: "Erick Curley" -> "Erick_Curley")
 */
function sanitizeFileName(name) {
  if (!name) return 'General';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9_\s-]/g, '') // Quitar caracteres raros
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Genera y descarga un archivo Excel (.xlsx) con diseño profesional nativo
 * usando ExcelJS, aplicando estilos exactos solicitados:
 * - Nombre de archivo con el nombre del vendedor (ej: Clientes_Nuevos_Erick_Curley.xlsx)
 * - Título institucional sin las siglas "S.A." ("DROGUERÍA EL OLAM")
 * - Línea aparte con: "Reporte Generado Por [Nombre]" con Letra 13 y Negrita
 * - Cabeceras de tabla con color azul suave
 * - Filas intercaladas con tono azul pálido
 * - Celdas delimitadas con líneas delgadas (bordes)
 * 
 * Columnas:
 * No. | Fecha | Tipo de Cliente | Nombre de la Farmacia/Cliente | Teléfono/Celular | Ruta | Modalidad de la Visita | Vendedor | Observaciones
 */
export async function exportNewClientsToExcel(visits = [], options = {}) {
  // Filtrar si y solo si se registró como Cliente Nuevo
  const newClients = (visits || []).filter(v => {
    const type = (v.clientType || '').toString().toLowerCase().trim();
    return type === 'nuevo' || type === 'cliente nuevo';
  });

  if (newClients.length === 0) {
    const msg = options?.dateRange
      ? `No se encontraron visitas de "Cliente Nuevo" registradas en el período seleccionado (${options.dateRange}).`
      : 'No se encontraron visitas registradas con la categoría "Cliente Nuevo".';
    alert(msg);
    return false;
  }

  // Ordenar cronológicamente (más recientes primero)
  const sortedClients = [...newClients].sort((a, b) => {
    const dateA = a.visitDate || a.recordedDate || '';
    const dateB = b.visitDate || b.recordedDate || '';
    return dateB.localeCompare(dateA);
  });

  // Determinar quién generó el reporte y el nombre del vendedor
  const generatedBy = options?.generatedBy || options?.currentUser?.name || sortedClients[0]?.vendorName || 'Administración';
  const vendorNameForFile = options?.vendorName || (options?.vendorFilter && options.vendorFilter !== 'all' ? options.vendorFilter : null) || options?.currentUser?.name || sortedClients[0]?.vendorName || 'El_Olam';

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeStr = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  // Crear libro de ExcelJS
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Droguería El Olam';
  workbook.lastModifiedBy = generatedBy;
  workbook.created = now;
  workbook.modified = now;

  // Hoja 1: Clientes Nuevos
  const sheet = workbook.addWorksheet('Clientes Nuevos', {
    views: [{ showGridLines: true }]
  });

  // Fila 1: Título institucional SIN "S.A."
  const titleRow = sheet.addRow(['DROGUERÍA EL OLAM']);
  titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
  sheet.mergeCells('A1:I1');
  titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
  titleRow.height = 24;

  // Fila 2: Subtítulo
  const subTitleRow = sheet.addRow(['REPORTE CONSOLIDADO DE CLIENTES NUEVOS']);
  subTitleRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF475569' } };
  sheet.mergeCells('A2:I2');
  subTitleRow.alignment = { vertical: 'middle', horizontal: 'left' };
  subTitleRow.height = 20;

  // Fila 3: Línea aparte con: "Reporte Generado Por [Nombre]" con Letra 13 y Negrita
  const genRow = sheet.addRow([`Reporte Generado Por ${generatedBy}`]);
  genRow.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  sheet.mergeCells('A3:I3');
  genRow.alignment = { vertical: 'middle', horizontal: 'left' };
  genRow.height = 22;

  // Fila 4: Metadatos de fecha y período
  const periodText = options?.dateRange ? ` | Rango de Fechas: ${options.dateRange}` : '';
  const metaRow = sheet.addRow([`Emisión: ${dateStr} a las ${timeStr}${periodText} | Total de Registros: ${sortedClients.length}`]);
  metaRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  sheet.mergeCells('A4:I4');
  metaRow.alignment = { vertical: 'middle', horizontal: 'left' };
  metaRow.height = 18;

  // Fila 5: En blanco
  sheet.addRow([]);

  // Estilos de bordes delgados para la tabla
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } }
  };

  // Fila 6: Encabezados de la tabla con Color Azul Suave
  const headers = [
    'No.',
    'Fecha',
    'Tipo de Cliente',
    'Nombre de la Farmacia/Cliente',
    'Teléfono/Celular',
    'Ruta',
    'Modalidad de la Visita',
    'Vendedor Responsable',
    'Observaciones'
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 26;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // Azul suave para los títulos (ARGB: FFB9D5F2 / #B9D5F2 o FFC6D9F1)
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB9D5F2' }
  };

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = headerFill;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    cell.border = thinBorder;
  });

  // Tono azul pálido intercalado para filas (cebra)
  // Fila impar: Fondo azul pálido (ARGB: FFF0F6FF / #F0F6FF)
  // Fila par: Blanco (ARGB: FFFFFFFF)
  const zebraFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F6FF' }
  };
  const whiteFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' }
  };

  // Agregar filas de datos con bordes y relleno intercalado
  sortedClients.forEach((v, index) => {
    const modalidad = (v.visitType || 'presencial').toLowerCase() === 'telemarketing'
      ? 'Telemarketing'
      : 'Presencial';

    let phoneDisplay = v.phone ? v.phone.trim() : '';
    if (v.secondaryPhone && !phoneDisplay.includes(v.secondaryPhone)) {
      phoneDisplay = phoneDisplay ? `${phoneDisplay} / ${v.secondaryPhone}` : v.secondaryPhone;
    }
    if (!phoneDisplay) phoneDisplay = 'No registrado';

    const ruta = v.route || v.sector || 'Sin ruta asignada';

    const rowData = [
      index + 1,
      v.visitDate || v.recordedDate || dateStr,
      'Cliente Nuevo',
      v.clientName || 'Sin Nombre',
      phoneDisplay,
      ruta,
      modalidad,
      v.vendorName || 'Vendedor',
      v.observations || ''
    ];

    const dataRow = sheet.addRow(rowData);
    dataRow.height = 22;

    const isZebra = index % 2 === 1;
    const currentFill = isZebra ? zebraFill : whiteFill;

    dataRow.eachCell((cell, colNumber) => {
      cell.fill = currentFill;
      cell.border = thinBorder;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      
      // Alineaciones específicas por columna
      if (colNumber === 1) { // No.
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
      } else if (colNumber === 2 || colNumber === 3 || colNumber === 7) { // Fecha, Tipo, Modalidad
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // Autoajuste dinámico de columnas según el contenido de cada columna
  sheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      // Ignorar filas 1 a 4 que son títulos fusionados
      if (cell.row <= 4) return;
      const valStr = cell.value != null ? cell.value.toString() : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    // Asignar ancho con margen (+4 caracteres) y asegurar un mínimo de 10
    column.width = Math.max(maxLen + 4, 10);
  });

  // Activar filtro automático de Excel en la fila de títulos (fila 6)
  sheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: sheet.rowCount, column: 9 }
  };

  // Hoja 2: Resumen Estadístico
  const summarySheet = workbook.addWorksheet('Resumen Estadístico', {
    views: [{ showGridLines: true }]
  });

  const sTitle = summarySheet.addRow(['DROGUERÍA EL OLAM - RESUMEN DE CLIENTES NUEVOS']);
  sTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  summarySheet.mergeCells('A1:B1');
  sTitle.height = 22;

  const sGen = summarySheet.addRow([`Reporte Generado Por ${generatedBy}`]);
  sGen.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.mergeCells('A2:B2');
  sGen.height = 20;

  summarySheet.addRow([]);

  // Métricas
  const statsByRoute = {};
  const statsByModalidad = { Presencial: 0, Telemarketing: 0 };
  const statsByVendor = {};

  sortedClients.forEach(c => {
    const r = c.route || c.sector || 'General';
    statsByRoute[r] = (statsByRoute[r] || 0) + 1;

    const mod = (c.visitType || 'presencial').toLowerCase() === 'telemarketing' ? 'Telemarketing' : 'Presencial';
    statsByModalidad[mod] = (statsByModalidad[mod] || 0) + 1;

    const vend = c.vendorName || 'Sin asignar';
    statsByVendor[vend] = (statsByVendor[vend] || 0) + 1;
  });

  const addSummarySection = (title, dataEntries) => {
    const secRow = summarySheet.addRow([title, '']);
    secRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    summarySheet.mergeCells(`A${secRow.number}:B${secRow.number}`);
    secRow.getCell(1).fill = headerFill;
    secRow.getCell(1).border = thinBorder;

    dataEntries.forEach(([label, val], idx) => {
      const r = summarySheet.addRow([label, val]);
      const isZ = idx % 2 === 1;
      r.getCell(1).fill = isZ ? zebraFill : whiteFill;
      r.getCell(2).fill = isZ ? zebraFill : whiteFill;
      r.getCell(1).border = thinBorder;
      r.getCell(2).border = thinBorder;
      r.getCell(1).font = { name: 'Calibri', size: 10 };
      r.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
      r.getCell(2).alignment = { horizontal: 'right' };
    });

    summarySheet.addRow([]);
  };

  addSummarySection('DESGLOSE POR MODALIDAD DE VISITA', [
    ['Presencial', statsByModalidad.Presencial || 0],
    ['Telemarketing', statsByModalidad.Telemarketing || 0],
    ['Total General', sortedClients.length]
  ]);

  addSummarySection('DESGLOSE POR RUTA / SECTOR', Object.entries(statsByRoute));
  addSummarySection('DESGLOSE POR VENDEDOR', Object.entries(statsByVendor));

  // Autoajuste dinámico de columnas para la hoja de Resumen
  summarySheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.row <= 2) return; // Ignorar títulos fusionados
      const text = cell.value != null ? cell.value.toString() : '';
      if (text.length > maxLen) {
        maxLen = text.length;
      }
    });
    column.width = Math.max(maxLen + 5, 20);
  });

  // Nombre de archivo con el nombre del vendedor y fecha
  // Por ejemplo: Clientes_Nuevos_Erick_Curley_2026-10-08.xlsx
  const sanitizedVendor = sanitizeFileName(vendorNameForFile);
  const dateStrForFile = now.toISOString().split('T')[0];
  const fileName = `Clientes_Nuevos_${sanitizedVendor}_${dateStrForFile}.xlsx`;

  // Generar Buffer y forzar descarga en el navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);

  return true;
}
