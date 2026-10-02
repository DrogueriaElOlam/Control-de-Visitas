/**
 * Módulo para generar y exportar el reporte interactivo en HTML de
 * "RESUMEN MENSUAL POR RUTA/GIRA" de Droguería El Olam.
 * Coincide exactamente con la estructura de la imagen de referencia.
 */

import { LOGO_DATA_URI } from './logo';

export function generateMonthlyRouteHTMLReport({
  vendorName = 'Vendedor',
  startDate,
  endDate,
  visits = []
}) {
  // 1. Filtrar visitas dentro del rango de fechas
  const filteredVisits = visits.filter(v => {
    // Si viene nombre de vendedor y no es General, filtrar por vendedor
    if (vendorName && vendorName !== 'General' && vendorName !== 'Todos los Vendedores') {
      if (v.vendorName && v.vendorName !== vendorName) return false;
    }
    if (!v.visitDate) return false;
    if (startDate && v.visitDate < startDate) return false;
    if (endDate && v.visitDate > endDate) return false;
    return true;
  });

  // 2. Agrupación por Ruta/Gira
  const routesMap = {};

  filteredVisits.forEach(v => {
    const rawRoute = (v.route || v.sector || '').trim();
    const routeKey = rawRoute || 'Sin ruta';

    if (!routesMap[routeKey]) {
      routesMap[routeKey] = {
        route: routeKey,
        visitsCount: 0,
        totalCollections: 0,
        totalSales: 0
      };
    }

    routesMap[routeKey].visitsCount += 1;
    routesMap[routeKey].totalCollections += Number(v.collectionAmount) || 0;
    routesMap[routeKey].totalSales += Number(v.saleAmount) || 0;
  });

  const routesList = Object.values(routesMap);

  // Ordenar por total de cobros + ventas desc
  routesList.sort((a, b) => (b.totalCollections + b.totalSales) - (a.totalCollections + a.totalSales));

  // 3. Totales globales
  const totalVisits = filteredVisits.length;
  const grandTotalCollections = routesList.reduce((acc, r) => acc + r.totalCollections, 0);
  const grandTotalSales = routesList.reduce((acc, r) => acc + r.totalSales, 0);

  // Fecha y hora de generación
  const now = new Date();
  const dateGenerationStr = now.toLocaleString('es-GT', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Paleta de colores atractiva para múltiples rutas en las gráficas circulares
  const colorPalette = [
    '#3b82f6', // Azul primario
    '#10b981', // Verde esmeralda
    '#f59e0b', // Ámbar
    '#8b5cf6', // Púrpura
    '#06b6d4', // Cian
    '#ec4899', // Rosa
    '#f97316', // Naranja
    '#14b8a6', // Teal
    '#6366f1', // Índigo
    '#64748b'  // Slate
  ];

  const labels = routesList.length > 0 ? routesList.map(r => r.route) : ['Sin registros'];
  const collectionsData = routesList.length > 0 ? routesList.map(r => r.totalCollections) : [0];
  const salesData = routesList.length > 0 ? routesList.map(r => r.totalSales) : [0];

  const chartColors = labels.map((_, i) => colorPalette[i % colorPalette.length]);

  // Generar filas de la tabla HTML
  const tableRowsHtml = routesList.length > 0
    ? routesList.map(r => `
      <tr>
        <td class="td-route">${r.route}</td>
        <td class="td-number">${r.visitsCount}</td>
        <td class="td-collections">Q${r.totalCollections.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="td-sales">Q${r.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">
          No se encontraron visitas registradas en este período.
        </td>
      </tr>
    `;

  // Construcción del documento HTML
  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumen Mensual por Ruta - ${vendorName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 24px;
      line-height: 1.5;
    }
    .report-wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }

    /* Header Institucional */
    .header-logo-container {
      text-align: center;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .header-logo-img {
      max-height: 85px;
      width: auto;
      max-width: 260px;
      object-fit: contain;
      display: block;
      margin: 0 auto 10px auto;
    }
    .header-title {
      color: #1e40af;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      text-align: center;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .header-subtitle {
      color: #2563eb;
      font-size: 17px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .header-divider {
      height: 3px;
      background: #1d4ed8;
      border: none;
      margin: 18px 0 24px 0;
      border-radius: 2px;
    }

    /* Card de Metadatos */
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #334155;
    }
    .meta-box p {
      margin-bottom: 4px;
    }
    .meta-box p:last-child {
      margin-bottom: 0;
    }
    .meta-box strong {
      color: #0f172a;
      font-weight: 700;
    }

    /* Barra de Controles y Filtros de Gráfica */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 24px;
    }
    .filter-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .filter-btn {
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
    }
    .filter-btn:hover:not(.active) {
      background: #e2e8f0;
    }
    .action-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .action-btn:hover {
      background: #1e293b;
    }

    /* Tabla de Datos */
    .table-container {
      width: 100%;
      margin-bottom: 30px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    thead th {
      background: #f8fafc;
      color: #64748b;
      font-weight: 700;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    tbody td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tbody tr:hover {
      background: #f8fafc;
    }
    .td-route {
      font-weight: 600;
    }
    .td-number {
      text-align: center;
      font-weight: 600;
    }
    .td-collections {
      text-align: right;
      font-weight: 700;
      color: #2563eb;
    }
    .td-sales {
      text-align: right;
      font-weight: 700;
      color: #059669;
    }
    tfoot tr {
      background: #f8fafc;
      font-weight: 900;
      border-top: 2px solid #cbd5e1;
    }
    tfoot td {
      padding: 14px 16px;
      color: #0f172a;
    }
    .tfoot-label {
      font-weight: 900;
      letter-spacing: 0.5px;
    }

    /* Contenedor de Gráficas */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
    .chart-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .chart-title {
      font-size: 13px;
      font-weight: 800;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      text-align: center;
    }
    .chart-wrapper {
      position: relative;
      width: 100%;
      max-width: 320px;
      height: 280px;
    }
    .bar-chart-card {
      grid-column: span 2;
      width: 100%;
    }
    @media (max-width: 768px) {
      .bar-chart-card {
        grid-column: span 1;
      }
    }
    .bar-wrapper {
      position: relative;
      width: 100%;
      height: 320px;
    }

    /* Print media styles */
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .report-wrapper {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
        border: none;
      }
      .controls-bar {
        display: none !important;
      }
      .chart-card {
        page-break-inside: avoid;
        box-shadow: none;
        border: 1px solid #cbd5e1;
      }
    }
  </style>
</head>
<body>

  <div class="report-wrapper">
    
    <!-- Header Institucional -->
    <div class="header-logo-container">
      <img src="${LOGO_DATA_URI}" alt="Droguería El Olam" class="header-logo-img" />
      <h1 class="header-title">DROGUERÍA EL OLAM</h1>
      <h2 class="header-subtitle">RESUMEN MENSUAL POR RUTA/GIRA</h2>
    </div>
    
    <hr class="header-divider">

    <!-- Card de Información General -->
    <div class="meta-box">
      <p><strong>Generado por:</strong> ${vendorName}</p>
      <p><strong>Rango de Fechas:</strong> ${startDate} a ${endDate}</p>
      <p><strong>Total de Registros:</strong> ${totalVisits}</p>
      <p><strong>Fecha de Generación:</strong> ${dateGenerationStr}</p>
    </div>

    <!-- Barra de Controles Interactivos -->
    <div class="controls-bar">
      <div class="filter-buttons">
        <button class="filter-btn active" onclick="switchChartView('both', this)">
          🍩 Gráficas Redondas (Oficial)
        </button>
        <button class="filter-btn" onclick="switchChartView('bars', this)">
          📊 Gráfica de Barras (Comparativa)
        </button>
        <button class="filter-btn" onclick="switchChartView('all', this)">
          👁️ Ver Todas
        </button>
      </div>

      <button class="action-btn" onclick="window.print()">
        🖨️ Imprimir / Guardar en PDF
      </button>
    </div>

    <!-- Tabla de Resumen por Ruta -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Ruta/Gira</th>
            <th style="text-align: center;">Visitas</th>
            <th style="text-align: right;">Total Cobros</th>
            <th style="text-align: right;">Total Ventas</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td class="tfoot-label">TOTALES</td>
            <td class="td-number" style="font-weight: 900;">${totalVisits}</td>
            <td class="td-collections" style="font-size: 14px;">Q${grandTotalCollections.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="td-sales" style="font-size: 14px;">Q${grandTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Sección de Gráficas -->
    <div class="charts-grid" id="chartsContainer">
      
      <!-- Gráfica 1: Distribución de Cobros por Ruta -->
      <div class="chart-card" id="cardCollections">
        <div class="chart-title">DISTRIBUCIÓN DE COBROS POR RUTA</div>
        <div class="chart-wrapper">
          <canvas id="chartCollections"></canvas>
        </div>
      </div>

      <!-- Gráfica 2: Distribución de Ventas por Ruta -->
      <div class="chart-card" id="cardSales">
        <div class="chart-title">DISTRIBUCIÓN DE VENTAS POR RUTA</div>
        <div class="chart-wrapper">
          <canvas id="chartSales"></canvas>
        </div>
      </div>

      <!-- Gráfica 3: Comparativa de Barras Lado a Lado (Cobros vs Ventas) -->
      <div class="chart-card bar-chart-card" id="cardBars" style="display: none;">
        <div class="chart-title">COMPARATIVA DE COBROS VS VENTAS POR RUTA (QUETZALES)</div>
        <div class="bar-wrapper">
          <canvas id="chartBars"></canvas>
        </div>
      </div>

    </div>

  </div>

  <script>
    const labels = ${JSON.stringify(labels)};
    const collectionsData = ${JSON.stringify(collectionsData)};
    const salesData = ${JSON.stringify(salesData)};
    const chartColors = ${JSON.stringify(chartColors)};

    // Gráfica Redonda 1: Cobros
    const ctxColl = document.getElementById('chartCollections').getContext('2d');
    new Chart(ctxColl, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: collectionsData,
          backgroundColor: chartColors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 11, weight: 'bold' },
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                return context.label + ': Q' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
            }
          }
        },
        cutout: '55%'
      }
    });

    // Gráfica Redonda 2: Ventas
    const ctxSales = document.getElementById('chartSales').getContext('2d');
    new Chart(ctxSales, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: salesData,
          backgroundColor: chartColors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 11, weight: 'bold' },
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                return context.label + ': Q' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
            }
          }
        },
        cutout: '55%'
      }
    });

    // Gráfica de Barras Comparativa: Cobros vs Ventas
    const ctxBars = document.getElementById('chartBars').getContext('2d');
    new Chart(ctxBars, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Cobros (Q)',
            data: collectionsData,
            backgroundColor: '#2563eb',
            borderRadius: 6
          },
          {
            label: 'Total Ventas (Q)',
            data: salesData,
            backgroundColor: '#10b981',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'Q' + Number(value).toLocaleString('en-US');
              },
              font: { weight: 'bold' }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { weight: 'bold' } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 12, weight: 'bold' } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': Q' + Number(context.raw || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
              }
            }
          }
        }
      }
    });

    // Alternar vistas de gráficas
    function switchChartView(view, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const cardColl = document.getElementById('cardCollections');
      const cardSales = document.getElementById('cardSales');
      const cardBars = document.getElementById('cardBars');

      if (view === 'bars') {
        cardColl.style.display = 'none';
        cardSales.style.display = 'none';
        cardBars.style.display = 'block';
      } else if (view === 'all') {
        cardColl.style.display = 'flex';
        cardSales.style.display = 'flex';
        cardBars.style.display = 'block';
      } else {
        // 'both' (redondas)
        cardColl.style.display = 'flex';
        cardSales.style.display = 'flex';
        cardBars.style.display = 'none';
      }
    }
  </script>
</body>
</html>`;

  // Autodescarga inmediata del archivo HTML en el navegador
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeVendor = (vendorName || 'Vendedor').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
  a.href = url;
  a.download = `Resumen_Mensual_Ruta_${safeVendor}_${startDate}_a_${endDate}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
