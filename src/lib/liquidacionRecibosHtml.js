import { LOGO_DATA_URI } from './logo.js';

/**
 * Formatea un valor numérico a moneda Quetzales (Q #,###.##)
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return 'Q 0.00';
  }
  const num = Number(value);
  return `Q ${num.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Formatea una fecha YYYY-MM-DD a D/M/YYYY (ej. 4/10/2026 tal como en el formato oficial)
 */
export const formatDateClean = (dateString) => {
  if (!dateString) return '';
  try {
    const cleanStr = String(dateString).trim();
    if (cleanStr.includes('/')) {
      return cleanStr;
    }
    const parts = cleanStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10);
      const year = parts[0];
      return `${day}/${month}/${year}`;
    }
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // fallback
  }
  return dateString;
};

/**
 * Calcula los totales numéricos de la lista de recibos
 */
export const calculateReceiptTotals = (receipts = []) => {
  return receipts.reduce(
    (acc, receipt) => {
      const boletas = parseFloat(receipt.boletas) || 0;
      const efectivo = parseFloat(receipt.efectivo) || 0;
      const cheque = parseFloat(receipt.cheque) || 0;
      const rowTotal = boletas + efectivo + cheque;

      return {
        boletas: acc.boletas + boletas,
        efectivo: acc.efectivo + efectivo,
        cheque: acc.cheque + cheque,
        total: acc.total + rowTotal
      };
    },
    { boletas: 0, efectivo: 0, cheque: 0, total: 0 }
  );
};

const OFFICIAL_MIN_ROWS = 16;

/**
 * Genera el documento HTML idéntico al formato oficial impreso de Droguería El Olam:
 * - Membrete superior con logo a la izquierda y franja gris con títulos centrados
 * - Recuadro de datos generales (Ejecutivo, Ruta Cubierta, Semana del, al) con líneas continuas
 * - 7 columnas exactas: Recibo, Código, Cliente, Boletas, Efectivo, Cheque, Observaciones
 * - Encabezado negro con texto blanco
 * - Fila de TOTALES negra al pie con montos por columna y Gran Total en columna Observaciones
 * - Sin bloque de firmas abajo
 * - Espacios autoajustables y proporcionados para una hoja tamaño Carta
 */
export const generateLiquidacionRecibosHtml = (formData = {}, receipts = []) => {
  // Filtrar recibos reales que tengan al menos algún dato
  const validReceipts = (receipts || []).filter((r) => {
    if (!r) return false;
    const hasText = (r.recibo && String(r.recibo).trim() !== '') ||
      (r.codigo && String(r.codigo).trim() !== '') ||
      (r.cliente && String(r.cliente).trim() !== '') ||
      (r.observaciones && String(r.observaciones).trim() !== '');
    const hasNumbers = (parseFloat(r.boletas) || 0) > 0 ||
      (parseFloat(r.efectivo) || 0) > 0 ||
      (parseFloat(r.cheque) || 0) > 0;
    return hasText || hasNumbers;
  });

  // Si hay menos del mínimo oficial (16), usamos los registros que haya y completamos con filas vacías
  const rowsToDisplay = validReceipts.length > 0 ? validReceipts : receipts;
  const rowsCount = Math.max(rowsToDisplay.length, OFFICIAL_MIN_ROWS);

  const totals = calculateReceiptTotals(validReceipts.length > 0 ? validReceipts : receipts);

  const tableRowsHtml = Array(rowsCount)
    .fill(null)
    .map((_, index) => {
      const r = rowsToDisplay[index] || {};
      const boletasNum = parseFloat(r.boletas) || 0;
      const efectivoNum = parseFloat(r.efectivo) || 0;
      const chequeNum = parseFloat(r.cheque) || 0;

      const recibo = r.recibo ? String(r.recibo).trim() : '&nbsp;';
      const codigo = r.codigo ? String(r.codigo).trim() : '&nbsp;';
      const cliente = r.cliente ? String(r.cliente).trim().toUpperCase() : '&nbsp;';

      // Si no hay monto, la celda queda totalmente vacía como en la foto física
      const boletasStr = boletasNum > 0 ? formatCurrency(boletasNum) : '&nbsp;';
      const efectivoStr = efectivoNum > 0 ? formatCurrency(efectivoNum) : '&nbsp;';
      const chequeStr = chequeNum > 0 ? formatCurrency(chequeNum) : '&nbsp;';
      const observaciones = r.observaciones ? String(r.observaciones).trim() : '&nbsp;';

      return `
        <tr>
          <td class="col-recibo">${recibo}</td>
          <td class="col-codigo">${codigo}</td>
          <td class="col-cliente">${cliente}</td>
          <td class="col-monto">${boletasStr}</td>
          <td class="col-monto">${efectivoStr}</td>
          <td class="col-monto">${chequeStr}</td>
          <td class="col-obs">${observaciones}</td>
        </tr>
      `;
    })
    .join('');

  const fechaDesdeStr = formatDateClean(formData.semanaDesde);
  const fechaHastaStr = formatDateClean(formData.semanaHasta);
  const liquidadoNombre = formData.liquidadoPor || formData.ejecutivo || '';
  const liquidadoCargo = formData.cargoLiquidado || 'Ejecutivo de Ventas';
  const revisadoNombre = formData.revisadoPor || 'Creditos';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquidación de Recibos - ${formData.ejecutivo || 'Droguería El Olam'}</title>
  <style id="orientation-style">
    @page {
      size: letter portrait;
      margin: 7mm 8mm 7mm 8mm;
    }
  </style>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 9pt;
      line-height: 1.2;
    }

    /* Barra flotante de acciones en pantalla */
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
    }

    .orient-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.1);
      padding: 3px 4px;
      border-radius: 8px;
    }

    .btn-orient {
      background: transparent !important;
      color: #94a3b8 !important;
      border: 1px solid transparent !important;
      padding: 6px 12px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      border-radius: 6px !important;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
    }

    .btn-orient.active {
      background: #2563eb !important;
      color: #ffffff !important;
      border-color: #60a5fa !important;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
    }

    .action-bar button.btn-print-main {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .action-bar button.btn-print-main:hover {
      background: #059669;
    }

    .document-page {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 8px 4px;
      background: #ffffff;
    }

    /* Encabezado oficial: Logo limpio y títulos sobre fondo blanco */
    .header-container {
      width: 100%;
      display: table;
      table-layout: fixed;
      background: #ffffff;
      padding: 4px 0 10px 0;
      margin-bottom: 6px;
      box-sizing: border-box;
    }

    .header-logo-cell {
      display: table-cell;
      width: 130px;
      vertical-align: middle;
      text-align: left;
    }

    .header-logo-cell img {
      max-height: 52px;
      max-width: 125px;
      object-fit: contain;
      display: block;
    }

    .header-title-cell {
      display: table-cell;
      vertical-align: middle;
      text-align: center;
      padding-right: 30px;
    }

    .header-title-cell h1 {
      margin: 0;
      font-size: 13pt;
      font-weight: 700;
      color: #000000;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-title-cell h2 {
      margin: 3px 0 0 0;
      font-size: 10.5pt;
      font-weight: 700;
      color: #000000;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    /* Cuadro de Información General con bordes negros */
    .info-box {
      width: 100%;
      border: 1.5px solid #000000;
      border-collapse: collapse;
      margin-bottom: 8px;
      background: #ffffff;
    }

    .info-box td {
      padding: 5px 8px;
      font-size: 9.5pt;
      vertical-align: middle;
    }

    .info-field-group {
      display: flex;
      align-items: flex-end;
      width: 100%;
      white-space: nowrap;
    }

    .info-label {
      font-weight: 700;
      color: #000000;
      margin-right: 6px;
      font-size: 9.5pt;
    }

    .info-line {
      flex: 1;
      border-bottom: 1.2px solid #000000;
      font-weight: 700;
      color: #000000;
      font-size: 9.5pt;
      padding: 0 4px 1px 4px;
      min-height: 14pt;
    }

    /* Tabla Principal */
    .receipts-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 0;
      border: 1.5px solid #000000;
    }

    .receipts-table thead {
      display: table-header-group;
    }

    .receipts-table th {
      background-color: #000000 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 9pt;
      text-align: center;
      padding: 5px 3px;
      border: 1px solid #000000;
      letter-spacing: 0.2px;
    }

    .receipts-table tbody tr {
      page-break-inside: avoid;
    }

    .receipts-table td {
      border: 1px solid #000000;
      padding: 4px 4px;
      font-size: 8.5pt;
      vertical-align: middle;
      height: 23px;
    }

    /* Columnas específicas autoajustables */
    .col-recibo {
      width: 7%;
      text-align: center;
      font-weight: 600;
      font-size: 9pt;
    }

    .col-codigo {
      width: 7%;
      text-align: center;
      font-weight: 600;
      font-size: 9pt;
    }

    .col-cliente {
      width: 27%;
      text-align: left;
      font-size: 8.5pt;
      font-weight: 600;
      padding-left: 6px !important;
      line-height: 1.15;
      overflow: hidden;
    }

    .col-monto {
      width: 11%;
      text-align: left;
      font-size: 8.5pt;
      font-weight: 500;
      padding-left: 6px !important;
      white-space: nowrap;
    }

    .col-obs {
      width: 26%;
      text-align: left;
      font-size: 8.5pt;
      padding-left: 6px !important;
      overflow: hidden;
      line-height: 1.15;
    }

    /* Fila de Totales */
    .receipts-table tfoot {
      display: table-footer-group;
      page-break-inside: avoid;
    }

    .totals-row td {
      background-color: #000000 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 9pt;
      padding: 5px 4px;
      border: 1px solid #000000;
      vertical-align: middle;
    }

    .totals-label {
      text-align: right !important;
      padding-right: 15px !important;
      letter-spacing: 0.5px;
      font-weight: 800 !important;
      font-size: 9.5pt !important;
    }

    .totals-amount {
      text-align: left !important;
      padding-left: 8px !important;
      white-space: nowrap;
    }

    .totals-grand {
      text-align: right !important;
      padding-right: 8px !important;
      white-space: nowrap;
      font-weight: 800 !important;
      font-size: 9.5pt !important;
    }

    /* Sección de Firmas (Liquidado Por y Revisado Por) */
    .signatures-section {
      width: 100%;
      margin-top: 32px;
      page-break-inside: avoid;
    }

    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
    }

    .signatures-table td {
      width: 50%;
      vertical-align: top;
      border: none;
      padding: 0 8px;
    }

    .sig-block {
      display: inline-block;
      text-align: left;
    }

    .sig-line-row {
      display: flex;
      align-items: flex-end;
      white-space: nowrap;
    }

    .sig-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #000000;
      margin-right: 6px;
    }

    .sig-underline {
      display: inline-block;
      width: 175px;
      border-bottom: 1.5px solid #000000;
      vertical-align: bottom;
    }

    .sig-meta {
      width: 175px;
      text-align: center;
      margin-top: 5px;
      font-size: 9pt;
      color: #000000;
    }

    .sig-meta-name {
      font-weight: 600;
      font-size: 9.5pt;
      line-height: 1.25;
    }

    .sig-meta-role {
      font-size: 8.5pt;
      font-weight: 500;
      color: #111111;
      line-height: 1.2;
    }

    /* Reglas generales de impresión */
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      .no-print, .action-bar {
        display: none !important;
      }
      .document-page {
        max-width: 100%;
        padding: 0;
      }
    }

    /* MODO HORIZONTAL (LANDSCAPE) AUTOAJUSTABLE PERFECTO */
    @media print and (orientation: landscape) {
      @page {
        size: letter landscape;
        margin: 5mm 8mm 5mm 8mm;
      }
      .document-page {
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
      }
      .header-container {
        padding: 2px 0 4px 0 !important;
        margin-bottom: 4px !important;
      }
      .header-logo-cell img {
        max-height: 40px !important;
      }
      .header-title-cell h1 {
        font-size: 12pt !important;
      }
      .header-title-cell h2 {
        font-size: 9.5pt !important;
      }
      .info-box {
        margin-bottom: 4px !important;
      }
      .info-box td {
        padding: 2.5px 6px !important;
        font-size: 8.5pt !important;
      }
      .receipts-table th {
        padding: 3px 2px !important;
        font-size: 8pt !important;
      }
      .receipts-table td {
        padding: 2px 4px !important;
        height: 18px !important;
        font-size: 8pt !important;
      }
      .totals-row td {
        padding: 3px 4px !important;
        font-size: 8.5pt !important;
      }
      .signatures-section {
        margin-top: 14px !important;
      }
      .sig-underline {
        width: 220px !important;
      }
      .sig-meta {
        width: 220px !important;
        font-size: 8.5pt !important;
      }
    }

    /* Vista en pantalla cuando el usuario activa modo horizontal */
    body.is-landscape .document-page {
      max-width: 1050px;
    }
    body.is-landscape .header-container {
      padding: 2px 0 6px 0;
      margin-bottom: 5px;
    }
    body.is-landscape .header-logo-cell img {
      max-height: 42px;
    }
    body.is-landscape .header-title-cell h1 {
      font-size: 12.5pt;
    }
    body.is-landscape .header-title-cell h2 {
      font-size: 10pt;
    }
    body.is-landscape .info-box {
      margin-bottom: 5px;
    }
    body.is-landscape .info-box td {
      padding: 3px 8px;
      font-size: 9pt;
    }
    body.is-landscape .receipts-table th {
      padding: 4px 3px;
      font-size: 8.5pt;
    }
    body.is-landscape .receipts-table td {
      padding: 2.5px 5px;
      height: 20px;
      font-size: 8.5pt;
    }
    body.is-landscape .totals-row td {
      padding: 4px 4px;
      font-size: 9pt;
    }
    body.is-landscape .signatures-section {
      margin-top: 18px;
    }
    body.is-landscape .sig-underline {
      width: 220px;
    }
    body.is-landscape .sig-meta {
      width: 220px;
    }
  </style>
</head>
<body>
  <!-- Barra flotante de acciones para pantalla -->
  <div class="action-bar no-print">
    <div style="display: flex; align-items: center; gap: 8px;">
      <strong>Droguería El Olam</strong>
      <span style="opacity: 0.6;">•</span>
      <span>Liquidación Semanal de Recibos</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
      <div class="orient-group">
        <button id="btn-portrait" type="button" class="btn-orient active" onclick="setOrientation('portrait')">
          📄 Vertical
        </button>
        <button id="btn-landscape" type="button" class="btn-orient" onclick="setOrientation('landscape')">
          📑 Horizontal
        </button>
      </div>
      <button class="btn-print-main" onclick="window.print()">
        🖨️ Imprimir Liquidación
      </button>
    </div>
  </div>

  <div class="document-page">
    <!-- Encabezado oficial -->
    <div class="header-container">
      <div class="header-logo-cell">
        <img src="${LOGO_DATA_URI}" alt="Droguería El Olam" />
      </div>
      <div class="header-title-cell">
        <h1>DROGUERIA EL OLAM</h1>
        <h2>LIQUIDACION SEMANAL DE RECIBOS DE CAJA</h2>
      </div>
    </div>

    <!-- Información General -->
    <table class="info-box">
      <tr>
        <td style="width: 50%;">
          <div class="info-field-group">
            <span class="info-label">Ejecutivo:</span>
            <span class="info-line">${formData.ejecutivo || '&nbsp;'}</span>
          </div>
        </td>
        <td style="width: 50%;">
          <div class="info-field-group">
            <span class="info-label">Ruta Cubierta:</span>
            <span class="info-line">${formData.rutaCubierta || '&nbsp;'}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="width: 50%;">
          <div class="info-field-group">
            <span class="info-label">Semana del:</span>
            <span class="info-line">${fechaDesdeStr || '&nbsp;'}</span>
          </div>
        </td>
        <td style="width: 50%;">
          <div class="info-field-group">
            <span class="info-label">al</span>
            <span class="info-line">${fechaHastaStr || '&nbsp;'}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Tabla Principal de Recibos (7 Columnas Oficiales) -->
    <table class="receipts-table">
      <thead>
        <tr>
          <th style="width: 7%;">Recibo</th>
          <th style="width: 7%;">Código</th>
          <th style="width: 27%;">Cliente</th>
          <th style="width: 11%;">Boletas</th>
          <th style="width: 11%;">Efectivo</th>
          <th style="width: 11%;">Cheque</th>
          <th style="width: 26%;">Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="3" class="totals-label">TOTALES:</td>
          <td class="totals-amount">${totals.boletas > 0 ? formatCurrency(totals.boletas) : 'Q 0.00'}</td>
          <td class="totals-amount">${totals.efectivo > 0 ? formatCurrency(totals.efectivo) : 'Q 0.00'}</td>
          <td class="totals-amount">${totals.cheque > 0 ? formatCurrency(totals.cheque) : 'Q 0.00'}</td>
          <!-- Gran Total exactamente debajo de la columna de Observaciones en blanco sobre fondo negro -->
          <td class="totals-grand">${formatCurrency(totals.total)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Sección de Firmas (Liquidado Por y Revisado Por) -->
    <div class="signatures-section">
      <table class="signatures-table">
        <tr>
          <td>
            <div class="sig-block">
              <div class="sig-line-row">
                <span class="sig-title">Liquidado Por:</span>
                <span class="sig-underline"></span>
              </div>
              <div class="sig-meta" style="margin-left: 104px;">
                <div class="sig-meta-name">${liquidadoNombre}</div>
                <div class="sig-meta-role">${liquidadoCargo}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="sig-block">
              <div class="sig-line-row">
                <span class="sig-title">Revisado Por:</span>
                <span class="sig-underline"></span>
              </div>
              <div class="sig-meta" style="margin-left: 98px;">
                <div class="sig-meta-name">${revisadoNombre}</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>

  <script>
    function setOrientation(mode) {
      var styleTag = document.getElementById('orientation-style');
      var btnPort = document.getElementById('btn-portrait');
      var btnLand = document.getElementById('btn-landscape');
      if (mode === 'landscape') {
        document.body.classList.add('is-landscape');
        if (styleTag) {
          styleTag.innerHTML = '@page { size: letter landscape; margin: 5mm 8mm 5mm 8mm; }';
        }
        if (btnLand) btnLand.classList.add('active');
        if (btnPort) btnPort.classList.remove('active');
      } else {
        document.body.classList.remove('is-landscape');
        if (styleTag) {
          styleTag.innerHTML = '@page { size: letter portrait; margin: 7mm 8mm 7mm 8mm; }';
        }
        if (btnPort) btnPort.classList.add('active');
        if (btnLand) btnLand.classList.remove('active');
      }
    }
  </script>
</body>
</html>`;
};
