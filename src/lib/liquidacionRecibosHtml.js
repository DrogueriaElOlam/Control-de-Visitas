import { LOGO_DATA_URI } from './logo';

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
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY
 */
export const formatDateSimple = (dateString) => {
  if (!dateString) return '';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
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

const MIN_ROWS_PRINT = 15;

/**
 * Genera el documento HTML completo para la Hoja de Trabajo de Liquidación Semanal de Recibos de Caja
 * - 7 columnas oficiales (sin columna de Totales por fila)
 * - Gran Total ubicado en el pie exactamente debajo de la columna de Observaciones
 * - Tipografía con tamaño 9.5pt a 10pt (nada de letras diminutas)
 * - Todo ajustado y proporcionado para una impresión impecable en 1 sola hoja
 */
export const generateLiquidacionRecibosHtml = (formData = {}, receipts = []) => {
  const totals = calculateReceiptTotals(receipts);
  const rowsCount = Math.max(receipts.length, MIN_ROWS_PRINT);

  const tableRowsHtml = Array(rowsCount)
    .fill(null)
    .map((_, index) => {
      const r = receipts[index] || {};
      const boletasNum = parseFloat(r.boletas) || 0;
      const efectivoNum = parseFloat(r.efectivo) || 0;
      const chequeNum = parseFloat(r.cheque) || 0;

      const recibo = r.recibo ? String(r.recibo).trim() : '&nbsp;';
      const codigo = r.codigo ? String(r.codigo).trim() : '&nbsp;';
      const cliente = r.cliente ? String(r.cliente).trim() : '&nbsp;';
      const boletasStr = boletasNum > 0 ? formatCurrency(boletasNum) : (r.boletas === '0' || r.boletas === 0 ? 'Q 0.00' : '&nbsp;');
      const efectivoStr = efectivoNum > 0 ? formatCurrency(efectivoNum) : (r.efectivo === '0' || r.efectivo === 0 ? 'Q 0.00' : '&nbsp;');
      const chequeStr = chequeNum > 0 ? formatCurrency(chequeNum) : (r.cheque === '0' || r.cheque === 0 ? 'Q 0.00' : '&nbsp;');
      const observaciones = r.observaciones ? String(r.observaciones).trim() : '&nbsp;';

      const rowBg = index % 2 === 1 ? '#f8fafc' : '#ffffff';

      return `
        <tr style="background-color: ${rowBg};">
          <td style="border: 1pt solid #000000; padding: 4.5pt 3pt; text-align: center; font-size: 9.5pt; font-weight: bold;">${recibo}</td>
          <td style="border: 1pt solid #000000; padding: 4.5pt 3pt; text-align: center; font-size: 9pt; font-family: monospace; font-weight: 700;">${codigo}</td>
          <td style="border: 1pt solid #000000; padding: 4.5pt 5pt; text-align: left; font-size: 9.5pt; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cliente}</td>
          <td style="border: 1pt solid #000000; padding: 4.5pt 4pt; text-align: right; font-size: 9.5pt; font-weight: 600;">${boletasStr}</td>
          <td style="border: 1pt solid #000000; padding: 4.5pt 4pt; text-align: right; font-size: 9.5pt; font-weight: 600;">${efectivoStr}</td>
          <td style="border: 1pt solid #000000; padding: 4.5pt 4pt; text-align: right; font-size: 9.5pt; font-weight: 600;">${chequeStr}</td>
          <td style="border: 1pt solid #000000; padding: 4.5pt 4pt; text-align: left; font-size: 8.5pt; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${observaciones}</td>
        </tr>
      `;
    })
    .join('');

  const bluePrimary = '#1E3A8A';
  const blueDark = '#0f172a';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquidación de Recibos - ${formData.ejecutivo || 'El Olam'}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 8mm 7mm 8mm 7mm;
    }

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
      font-size: 9.5pt;
      line-height: 1.25;
    }

    .hoja-trabajo {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
    }

    /* Membrete */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5pt;
    }

    .header-table td {
      vertical-align: middle;
      padding: 0;
    }

    .header-logo {
      width: 130px;
      text-align: left;
    }

    .header-logo img {
      max-height: 48px;
      max-width: 125px;
      object-fit: contain;
      display: block;
    }

    .header-titles {
      text-align: center;
      padding: 0 4pt;
    }

    .header-titles h1 {
      margin: 0;
      color: ${bluePrimary};
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .header-titles h2 {
      margin: 2pt 0 0 0;
      color: ${blueDark};
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-badge {
      width: 115px;
      text-align: right;
      font-size: 8pt;
      color: #334155;
      line-height: 1.2;
    }

    .header-badge strong {
      display: block;
      color: ${bluePrimary};
      font-size: 8.5pt;
    }

    /* Cuadro de Información General */
    .info-card {
      width: 100%;
      border: 1.5pt solid ${bluePrimary};
      border-radius: 4pt;
      background-color: #f8fafc;
      margin-bottom: 5pt;
      border-collapse: collapse;
    }

    .info-card td {
      padding: 4pt 6pt;
      font-size: 9.5pt;
      border-bottom: 0.5pt solid #cbd5e1;
    }

    .info-card tr:last-child td {
      border-bottom: none;
    }

    .info-label {
      font-weight: bold;
      color: ${bluePrimary};
      white-space: nowrap;
      width: 15%;
    }

    .info-value {
      font-weight: bold;
      color: #000000;
      border-bottom: 1pt solid #000000;
      width: 35%;
      padding-left: 5pt !important;
    }

    /* Tabla de Datos Principal */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 5pt;
    }

    .data-table thead {
      display: table-header-group;
    }

    .data-table th {
      background-color: ${bluePrimary};
      color: #ffffff;
      font-weight: 800;
      font-size: 9pt;
      text-transform: uppercase;
      text-align: center;
      border: 1pt solid #000000;
      padding: 4.5pt 2pt;
      letter-spacing: 0.3px;
    }

    .data-table tbody tr {
      page-break-inside: avoid;
    }

    .data-table tfoot {
      display: table-footer-group;
      page-break-inside: avoid;
    }

    .totals-row td {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-weight: 900;
      font-size: 9.5pt;
      padding: 4.5pt 3pt;
      border: 1pt solid #000000;
    }

    .totals-row td.gran-total-cell {
      background-color: #1e293b !important;
      color: #fde047 !important; /* Amarillo oro de alta legibilidad */
      font-size: 10.5pt !important;
      font-weight: 900 !important;
      letter-spacing: 0.3px;
    }

    /* Firmas */
    .signatures-section {
      width: 100%;
      margin-top: 12pt;
      page-break-inside: avoid;
    }

    .signatures-table {
      width: 100%;
      border-collapse: collapse;
    }

    .signatures-table td {
      width: 50%;
      text-align: center;
      vertical-align: top;
      padding: 0 25pt;
    }

    .signature-line {
      border-top: 1.5pt solid #000000;
      margin-top: 30pt;
      padding-top: 3pt;
      font-weight: bold;
      font-size: 9.5pt;
      color: #000000;
    }

    .signature-role {
      font-size: 8.5pt;
      color: #334155;
      font-weight: 600;
      margin-top: 2pt;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="hoja-trabajo">
    <!-- Membrete -->
    <table class="header-table">
      <tr>
        <td class="header-logo">
          <img src="${LOGO_DATA_URI}" alt="Droguería El Olam" />
        </td>
        <td class="header-titles">
          <h1>DROGUERÍA EL OLAM</h1>
          <h2>LIQUIDACIÓN SEMANAL DE RECIBOS DE CAJA</h2>
        </td>
        <td class="header-badge">
          <strong>CONTROL OFICIAL</strong>
          Guatemala, C.A.
        </td>
      </tr>
    </table>

    <!-- Información General -->
    <table class="info-card">
      <tr>
        <td class="info-label">Ejecutivo:</td>
        <td class="info-value">${formData.ejecutivo || '&nbsp;'}</td>
        <td class="info-label">Ruta Cubierta:</td>
        <td class="info-value">${formData.rutaCubierta || '&nbsp;'}</td>
      </tr>
      <tr>
        <td class="info-label">Semana del:</td>
        <td class="info-value">${formatDateSimple(formData.semanaDesde) || '&nbsp;'}</td>
        <td class="info-label">Al:</td>
        <td class="info-value">${formatDateSimple(formData.semanaHasta) || '&nbsp;'}</td>
      </tr>
    </table>

    <!-- Cuadro de Recibos (7 Columnas Oficiales) -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 9%;">Recibo</th>
          <th style="width: 9%;">Código</th>
          <th style="width: 31%;">Cliente / Farmacia</th>
          <th style="width: 12.5%;">Boletas (Q)</th>
          <th style="width: 12.5%;">Efectivo (Q)</th>
          <th style="width: 12.5%;">Cheque (Q)</th>
          <th style="width: 13.5%;">Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="3" style="text-align: center; letter-spacing: 0.8px;">TOTALES:</td>
          <td style="text-align: right;">${formatCurrency(totals.boletas)}</td>
          <td style="text-align: right;">${formatCurrency(totals.efectivo)}</td>
          <td style="text-align: right;">${formatCurrency(totals.cheque)}</td>
          <!-- Gran Total debajo de la columna de Observaciones -->
          <td class="gran-total-cell" style="text-align: right;">${formatCurrency(totals.total)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Firmas -->
    <div class="signatures-section">
      <table class="signatures-table">
        <tr>
          <td>
            <div class="signature-line">
              Liquidado Por: ${formData.liquidadoPor || formData.ejecutivo || '_______________________'}
            </div>
            <div class="signature-role">
              ${formData.cargoLiquidado || 'Ejecutivo de Ventas'}
            </div>
          </td>
          <td>
            <div class="signature-line">
              Revisado Por: ${formData.revisadoPor || '_______________________'}
            </div>
            <div class="signature-role">
              Departamento de Créditos y Cobros
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
};
