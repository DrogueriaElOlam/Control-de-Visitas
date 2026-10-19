import { LOGO_DATA_URI } from './logo.js';

/**
 * Formatea un valor numérico a Quetzales (Q #,###.##)
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
 * Formatea fecha YYYY-MM-DD a D/M/YYYY
 */
export const formatDateClean = (dateString) => {
  if (!dateString) return '';
  try {
    const cleanStr = String(dateString).trim();
    if (cleanStr.includes('/')) return cleanStr;
    const parts = cleanStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10);
      const year = parts[0];
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // fallback
  }
  return dateString;
};

/**
 * Genera el documento HTML oficial autoajustable para Liquidación de Viáticos
 * Soporta orientación Horizontal (Landscape) perfecta y modo Vertical
 */
export const generateLiquidacionViaticosHtml = (formData = {}) => {
  const gastos = formData.gastos || [];

  // Calcular totales por categoría
  const totales = {
    alimentacion: 0,
    hotel: 0,
    peajeParqueo: 0,
    combustible: 0,
    fotocopias: 0,
    varios: 0
  };

  gastos.forEach((g) => {
    totales.alimentacion += parseFloat(g.alimentacion) || 0;
    totales.hotel += parseFloat(g.hotel) || 0;
    totales.peajeParqueo += parseFloat(g.peajeParqueo) || 0;
    totales.combustible += parseFloat(g.combustible) || 0;
    totales.fotocopias += parseFloat(g.fotocopias) || 0;
    totales.varios += parseFloat(g.varios) || 0;
  });

  const granTotal = Object.values(totales).reduce((sum, val) => sum + val, 0);

  // Relleno mínimo de filas para presencia física consistente si hay pocos registros
  const MIN_ROWS = 12;
  const rowsCount = Math.max(gastos.length, MIN_ROWS);

  const tableRowsHtml = Array(rowsCount)
    .fill(null)
    .map((_, index) => {
      const g = gastos[index] || {};
      const fecha = g.fecha ? formatDateClean(g.fecha) : '&nbsp;';
      const noDoc = g.numeroDocumento ? String(g.numeroDocumento).trim() : '&nbsp;';
      const estab = g.establecimiento ? String(g.establecimiento).trim().toUpperCase() : '&nbsp;';

      const aliNum = parseFloat(g.alimentacion) || 0;
      const hotNum = parseFloat(g.hotel) || 0;
      const peaNum = parseFloat(g.peajeParqueo) || 0;
      const comNum = parseFloat(g.combustible) || 0;
      const fotNum = parseFloat(g.fotocopias) || 0;
      const varNum = parseFloat(g.varios) || 0;

      const aliStr = aliNum > 0 ? formatCurrency(aliNum) : '&nbsp;';
      const hotStr = hotNum > 0 ? formatCurrency(hotNum) : '&nbsp;';
      const peaStr = peaNum > 0 ? formatCurrency(peaNum) : '&nbsp;';
      const comStr = comNum > 0 ? formatCurrency(comNum) : '&nbsp;';
      const fotStr = fotNum > 0 ? formatCurrency(fotNum) : '&nbsp;';
      const varStr = varNum > 0 ? formatCurrency(varNum) : '&nbsp;';

      return `
        <tr>
          <td class="col-fecha">${fecha}</td>
          <td class="col-doc">${noDoc}</td>
          <td class="col-estab">${estab}</td>
          <td class="col-monto">${aliStr}</td>
          <td class="col-monto">${hotStr}</td>
          <td class="col-monto">${peaStr}</td>
          <td class="col-monto">${comStr}</td>
          <td class="col-monto">${fotStr}</td>
          <td class="col-monto">${varStr}</td>
        </tr>
      `;
    })
    .join('');

  const fechaSalidaStr = formatDateClean(formData.fechaSalida);
  const fechaRegresoStr = formatDateClean(formData.fechaRegreso);
  const fechasRango = fechaSalidaStr && fechaRegresoStr 
    ? `${fechaSalidaStr} al ${fechaRegresoStr}`
    : (fechaSalidaStr || fechaRegresoStr || '&nbsp;');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquidación de Viáticos - ${formData.liquidadoPor || 'Droguería El Olam'}</title>
  <style id="orientation-style">
    @page {
      size: letter landscape;
      margin: 6mm 8mm 6mm 8mm;
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
      background: #f1f5f9;
      font-size: 8.5pt;
      line-height: 1.2;
    }

    /* Barra flotante de acciones en pantalla */
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.25);
      border-bottom: 3px solid #3b82f6;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .orient-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.12);
      padding: 3px 5px;
      border-radius: 8px;
    }

    .btn-orient {
      background: transparent !important;
      color: #cbd5e1 !important;
      border: 1px solid transparent !important;
      padding: 6px 14px !important;
      font-size: 12.5px !important;
      font-weight: 700 !important;
      border-radius: 6px !important;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-orient.active {
      background: #2563eb !important;
      color: #ffffff !important;
      border-color: #60a5fa !important;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    }

    .action-bar button.btn-print-main {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      font-size: 13.5px;
      font-weight: 800;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
      transition: background 0.2s, transform 0.1s;
    }

    .action-bar button.btn-print-main:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .document-page {
      width: 100%;
      max-width: 1060px;
      margin: 16px auto;
      padding: 16px 20px;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 4px;
      transition: max-width 0.25s ease, padding 0.25s ease;
      box-sizing: border-box;
    }

    /* Encabezado limpio */
    .header-container {
      width: 100%;
      display: table;
      table-layout: fixed;
      background: #ffffff;
      padding: 2px 0 6px 0;
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
      max-height: 48px;
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
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-title-cell h2 {
      margin: 3px 0 0 0;
      font-size: 11pt;
      font-weight: 800;
      color: #000000;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    /* Cuadro de Información General con bordes negros */
    .info-box {
      width: 100%;
      border: 1.5px solid #000000;
      border-collapse: collapse;
      margin-bottom: 6px;
      background: #ffffff;
    }

    .info-box td {
      padding: 4px 8px;
      font-size: 9pt;
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
      font-size: 9pt;
    }

    .info-line {
      flex: 1;
      border-bottom: 1.2px solid #000000;
      font-weight: 700;
      color: #000000;
      font-size: 9pt;
      padding: 0 4px 1px 4px;
      min-height: 13pt;
    }

    /* Tabla Principal de Gastos (9 Columnas Oficiales) */
    .viaticos-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 0;
      border: 1.5px solid #000000;
    }

    .viaticos-table thead {
      display: table-header-group;
    }

    .viaticos-table th {
      background-color: #000000 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 8pt;
      text-align: center;
      padding: 4px 2px;
      border: 1px solid #000000;
      letter-spacing: 0.2px;
      line-height: 1.15;
    }

    .viaticos-table tbody tr {
      page-break-inside: avoid;
    }

    .viaticos-table td {
      border: 1px solid #000000;
      padding: 3px 4px;
      font-size: 8pt;
      vertical-align: middle;
      height: 20px;
    }

    /* Columnas autoajustables */
    .col-fecha {
      width: 8.5%;
      text-align: center;
      font-weight: 600;
    }

    .col-doc {
      width: 10.5%;
      text-align: center;
      font-weight: 600;
    }

    .col-estab {
      width: 27%;
      text-align: left;
      font-weight: 600;
      padding-left: 6px !important;
      line-height: 1.15;
      overflow: hidden;
    }

    .col-monto {
      width: 9%;
      text-align: left;
      font-weight: 500;
      padding-left: 5px !important;
      white-space: nowrap;
    }

    /* Fila de Totales por Categoría */
    .viaticos-table tfoot {
      display: table-footer-group;
      page-break-inside: avoid;
    }

    .totals-row td {
      background-color: #000000 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 8.5pt;
      padding: 4px 3px;
      border: 1px solid #000000;
      vertical-align: middle;
    }

    .totals-label {
      text-align: right !important;
      padding-right: 10px !important;
      letter-spacing: 0.4px;
      font-weight: 800 !important;
      font-size: 8.5pt !important;
    }

    .totals-amount {
      text-align: left !important;
      padding-left: 5px !important;
      white-space: nowrap;
    }

    /* Tarjeta de Gran Total */
    .grand-total-bar {
      margin-top: 6px;
      background-color: #000000;
      color: #ffffff;
      padding: 6px 14px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      font-size: 10.5pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      border: 1.5px solid #000000;
    }

    /* Sección de Firmas */
    .signatures-section {
      width: 100%;
      margin-top: 24px;
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
      padding: 0 15px;
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
      width: 220px;
      border-bottom: 1.5px solid #000000;
      vertical-align: bottom;
    }

    .sig-meta {
      width: 220px;
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
      color: #222222;
      line-height: 1.2;
    }

    /* ============================================================ */
    /* REGLAS RESPONSIVAS DE IMPRESIÓN Y ORIENTACIÓN HORIZONTAL     */
    /* ============================================================ */
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
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
      }
    }

    @media print and (orientation: landscape) {
      @page {
        size: letter landscape;
        margin: 5mm 8mm 5mm 8mm;
      }
      .header-container {
        padding: 1px 0 3px 0 !important;
        margin-bottom: 4px !important;
      }
      .header-logo-cell img {
        max-height: 40px !important;
      }
      .header-title-cell h1 {
        font-size: 12pt !important;
      }
      .header-title-cell h2 {
        font-size: 10pt !important;
      }
      .info-box td {
        padding: 2.5px 6px !important;
        font-size: 8.5pt !important;
      }
      .viaticos-table td {
        padding: 2px 3px !important;
        height: 17px !important;
        font-size: 7.5pt !important;
      }
      .viaticos-table th {
        padding: 2.5px 2px !important;
        font-size: 7.5pt !important;
      }
      .totals-row td {
        padding: 2.5px 3px !important;
        font-size: 8pt !important;
      }
      .grand-total-bar {
        padding: 4px 10px !important;
        font-size: 9.5pt !important;
        margin-top: 4px !important;
      }
      .signatures-section {
        margin-top: 14px !important;
      }
      .sig-underline {
        width: 240px !important;
      }
      .sig-meta {
        width: 240px !important;
      }
    }

    /* Modo Vertical si el usuario decide imprimir en vertical */
    body.is-portrait .document-page {
      max-width: 800px;
    }
    body.is-portrait .viaticos-table th {
      font-size: 7pt;
      padding: 3px 1px;
    }
    body.is-portrait .viaticos-table td {
      font-size: 7.5pt;
      padding: 2px 2px;
    }
    body.is-portrait .col-estab {
      font-size: 7pt;
    }
    body.is-portrait .sig-underline {
      width: 170px;
    }
    body.is-portrait .sig-meta {
      width: 170px;
    }
  </style>
</head>
<body>
  <!-- Barra flotante de acciones para pantalla -->
  <div class="action-bar no-print">
    <div style="display: flex; align-items: center; gap: 8px;">
      <strong>Droguería El Olam</strong>
      <span style="opacity: 0.6;">•</span>
      <span>Liquidación de Gastos Por Viáticos</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
      <div class="orient-group">
        <button id="btn-landscape" type="button" class="btn-orient active" onclick="setOrientation('landscape')">
          📑 Horizontal (Recomendado)
        </button>
        <button id="btn-portrait" type="button" class="btn-orient" onclick="setOrientation('portrait')">
          📄 Vertical
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
        <h2>LIQUIDACION DE GASTOS POR VIATICOS</h2>
      </div>
    </div>

    <!-- Información General -->
    <table class="info-box">
      <tr>
        <td style="width: 35%;">
          <div class="info-field-group">
            <span class="info-label">RUTA/GIRA:</span>
            <span class="info-line">${formData.ruta || '&nbsp;'}</span>
          </div>
        </td>
        <td style="width: 35%;">
          <div class="info-field-group">
            <span class="info-label">LIQUIDADO POR:</span>
            <span class="info-line">${formData.liquidadoPor || '&nbsp;'}</span>
          </div>
        </td>
        <td style="width: 30%;">
          <div class="info-field-group">
            <span class="info-label">FECHAS:</span>
            <span class="info-line">${fechasRango}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Tabla Principal con los 6 rubros de gastos oficiales (9 Columnas) -->
    <table class="viaticos-table">
      <thead>
        <tr>
          <th style="width: 8.5%;">FECHA</th>
          <th style="width: 10.5%;">No. FACTURA</th>
          <th style="width: 27%;">ESTABLECIMIENTO</th>
          <th style="width: 9%;">ALIMENTACIÓN</th>
          <th style="width: 9%;">HOTEL</th>
          <th style="width: 9%;">PEAJES Y<br>PARQUEOS</th>
          <th style="width: 9%;">COMBUSTIBLES</th>
          <th style="width: 9%;">FOTOCOPIAS</th>
          <th style="width: 9%;">VARIOS</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="3" class="totals-label">TOTALES POR CATEGORÍA:</td>
          <td class="totals-amount">${totales.alimentacion > 0 ? formatCurrency(totales.alimentacion) : 'Q 0.00'}</td>
          <td class="totals-amount">${totales.hotel > 0 ? formatCurrency(totales.hotel) : 'Q 0.00'}</td>
          <td class="totals-amount">${totales.peajeParqueo > 0 ? formatCurrency(totales.peajeParqueo) : 'Q 0.00'}</td>
          <td class="totals-amount">${totales.combustible > 0 ? formatCurrency(totales.combustible) : 'Q 0.00'}</td>
          <td class="totals-amount">${totales.fotocopias > 0 ? formatCurrency(totales.fotocopias) : 'Q 0.00'}</td>
          <td class="totals-amount">${totales.varios > 0 ? formatCurrency(totales.varios) : 'Q 0.00'}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Barra de Gran Total -->
    <div class="grand-total-bar">
      <span>GRAN TOTAL:&nbsp;&nbsp;${formatCurrency(granTotal)}</span>
    </div>

    <!-- Firmas Oficiales -->
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
                <div class="sig-meta-name">${formData.liquidadoPor || '&nbsp;'}</div>
                <div class="sig-meta-role">Ejecutivo de Ventas</div>
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
                <div class="sig-meta-name">Depto. Contabilidad</div>
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
      if (mode === 'portrait') {
        document.body.classList.add('is-portrait');
        if (styleTag) {
          styleTag.innerHTML = '@page { size: letter portrait; margin: 7mm 8mm 7mm 8mm; }';
        }
        if (btnPort) btnPort.classList.add('active');
        if (btnLand) btnLand.classList.remove('active');
      } else {
        document.body.classList.remove('is-portrait');
        if (styleTag) {
          styleTag.innerHTML = '@page { size: letter landscape; margin: 5mm 8mm 5mm 8mm; }';
        }
        if (btnLand) btnLand.classList.add('active');
        if (btnPort) btnPort.classList.remove('active');
      }
    }
  </script>
</body>
</html>`;
};
