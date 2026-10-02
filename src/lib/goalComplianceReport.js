/**
 * Módulo para generar y exportar el reporte interactivo en HTML de
 * "CUMPLIMIENTO DE METAS POR FECHA" para los vendedores de Droguería El Olam.
 */

import { LOGO_DATA_URI } from './logo';

// Nombres de los días de la semana en español
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Obtiene todas las fechas (YYYY-MM-DD) entre startDate y endDate inclusive
 */
export function getDatesRangeArray(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Obtiene la meta o compromiso diario para un vendedor y fecha
 */
export function getVendorCommitmentForDate(vendorName, dateStr, defaultGoal = 20000) {
  try {
    const dailyKey = `olam_daily_commitment_${vendorName || 'default'}_${dateStr}`;
    const generalKey = `olam_commitment_${vendorName || 'default'}_daily`;
    const savedDaily = localStorage.getItem(dailyKey);
    if (savedDaily && Number(savedDaily) > 0) return Number(savedDaily);
    const savedGen = localStorage.getItem(generalKey);
    if (savedGen && Number(savedGen) > 0) return Number(savedGen);
  } catch (e) {
    console.error('Error leyendo meta:', e);
  }
  return defaultGoal;
}

/**
 * Genera el documento HTML interactivo y abre la ventana para imprimir/guardar o descargar
 */
export function generateGoalComplianceHTMLReport({
  vendorName,
  startDate,
  endDate,
  visits = [],
  dailyGoal = 20000
}) {
  const vendorVisits = visits.filter(v => 
    !vendorName || v.vendorName === vendorName
  );

  const datesList = getDatesRangeArray(startDate, endDate);
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

  // Procesar métricas por cada día
  let totalPeriodSales = 0;
  let totalPeriodGoal = 0;
  let daysMetCount = 0;
  let activeDaysCount = 0;

  const dailyData = datesList.map(dateStr => {
    const dObj = new Date(`${dateStr}T12:00:00`);
    const dayName = DIAS_SEMANA[dObj.getDay()];
    
    // Visitas del día
    const dayVisits = vendorVisits.filter(v => v.visitDate === dateStr);
    
    let salesPresencial = 0;
    let salesTele = 0;

    dayVisits.forEach(v => {
      const amt = Number(v.saleAmount) || 0;
      const vt = (v.visitType || '').toLowerCase();
      const st = (v.saleType || '').toLowerCase();
      const isTele = vt.includes('tele') || vt.includes('tel') || st.includes('tele') || st.includes('tel');
      if (isTele) {
        salesTele += amt;
      } else {
        salesPresencial += amt;
      }
    });

    const dayTotalSales = salesPresencial + salesTele;
    const dayGoal = getVendorCommitmentForDate(vendorName, dateStr, dailyGoal);

    totalPeriodSales += dayTotalSales;
    totalPeriodGoal += dayGoal;

    const isMet = dayTotalSales >= dayGoal && dayGoal > 0;
    if (isMet) daysMetCount++;
    if (dayVisits.length > 0 || dayTotalSales > 0) activeDaysCount++;

    const percent = dayGoal > 0 
      ? Math.round((dayTotalSales / dayGoal) * 100) 
      : (dayTotalSales > 0 ? 100 : 0);

    return {
      date: dateStr,
      dayName,
      title: `${dayName} - ${dateStr}`,
      goal: dayGoal,
      sales: dayTotalSales,
      salesPresencial,
      salesTele,
      isMet,
      percent,
      visitsCount: dayVisits.length
    };
  });

  const periodPercent = totalPeriodGoal > 0 
    ? Math.round((totalPeriodSales / totalPeriodGoal) * 100) 
    : 0;

  // Encontrar el valor máximo entre metas y ventas para la escala visual
  const maxScaleValue = Math.max(
    ...dailyData.map(d => Math.max(d.goal, d.sales)),
    15000
  );

  // Generar el código HTML autónomo con Chart.js y estilos CSS inspirados en la muestra
  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CUMPLIMIENTO DE METAS POR FECHA - ${vendorName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --primary: #1e40af;
      --primary-light: #2563eb;
      --success: #10b981;
      --success-dark: #059669;
      --warning: #f59e0b;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-600: #475569;
      --slate-800: #1e293b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 24px;
      line-height: 1.5;
    }

    .report-wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      padding: 32px;
    }

    /* Header */
    .header-logo-container {
      text-align: center;
      margin-bottom: 8px;
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
      margin-top: 6px;
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

    /* Metadata Card */
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

    /* Overall Summary Card */
    .kpi-banner {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      text-align: center;
    }
    .kpi-item {
      padding: 10px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 10px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 900;
      margin-top: 4px;
    }

    /* Controls Bar */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
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

    /* Daily Cards */
    .daily-cards-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .day-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: transform 0.15s ease;
    }
    .day-header {
      background: #2563eb;
      color: #ffffff;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .day-body {
      padding: 18px;
    }
    .chart-wrapper {
      position: relative;
      height: 90px;
      width: 100%;
      margin-bottom: 14px;
    }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
      padding: 12px 14px;
      text-align: center;
    }
    .metric-col-title {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .metric-col-val {
      font-size: 15px;
      font-weight: 800;
      margin-top: 3px;
    }
    .val-goal {
      color: #1e3a8a;
    }
    .val-sales {
      color: #059669;
    }
    .val-status-ok {
      color: #059669;
    }
    .val-status-wait {
      color: #d97706;
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
      }
      .controls-bar {
        display: none !important;
      }
      .day-card {
        page-break-inside: avoid;
        margin-bottom: 16px;
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
      <h2 class="header-subtitle">CUMPLIMIENTO DE METAS POR FECHA</h2>
    </div>
    
    <hr class="header-divider">

    <!-- Card de Información General -->
    <div class="meta-box">
      <p><strong>Generado por:</strong> ${vendorName}</p>
      <p><strong>Rango de Fechas:</strong> ${startDate} a ${endDate}</p>
      <p><strong>Total de Días:</strong> ${datesList.length} días (Días con actividad: ${activeDaysCount})</p>
      <p><strong>Fecha de Generación:</strong> ${dateGenerationStr}</p>
    </div>

    <!-- Resumen Acumulado de Cumplimiento -->
    <div class="kpi-banner">
      <div class="kpi-grid">
        <div class="kpi-item">
          <div class="kpi-label">Meta Acumulada Período</div>
          <div class="kpi-value">Q${totalPeriodGoal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-label">Monto Alcanzado Total</div>
          <div class="kpi-value">Q${totalPeriodSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-label">% Cumplimiento Global</div>
          <div class="kpi-value">${periodPercent}%</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-label">Días con Meta Cumplida</div>
          <div class="kpi-value">${daysMetCount} de ${datesList.length}</div>
        </div>
      </div>
    </div>

    <!-- Barra de Controles Interactivos -->
    <div class="controls-bar">
      <div class="filter-buttons">
        <button class="filter-btn active" onclick="setVisualMode('both', this)">
          👁️ Ver Todo (Compromiso vs Alcance)
        </button>
        <button class="filter-btn" onclick="setVisualMode('commitment', this)">
          🎯 Solo Compromisos
        </button>
        <button class="filter-btn" onclick="setVisualMode('sales', this)">
          💰 Solo Alcances
        </button>
      </div>

      <button class="action-btn" onclick="window.print()">
        🖨️ Imprimir / Guardar en PDF
      </button>
    </div>

    <!-- Contenedor de Tarjetas Diarias -->
    <div class="daily-cards-container">
      ${dailyData.map((d, index) => `
        <div class="day-card" id="card-${index}">
          <div class="day-header">
            <span>${d.title}</span>
            <span style="font-size:12px; font-weight:600; opacity:0.9;">
              ${d.visitsCount > 0 ? `${d.visitsCount} visitas` : 'Sin visitas'}
            </span>
          </div>
          <div class="day-body">
            <div class="chart-wrapper">
              <canvas id="chart-${index}"></canvas>
            </div>
            
            <div class="metrics-row">
              <div>
                <div class="metric-col-title">Meta Diaria</div>
                <div class="metric-col-val val-goal">
                  Q${d.goal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <div class="metric-col-title">Monto Alcanzado</div>
                <div class="metric-col-val val-sales">
                  Q${d.sales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <div class="metric-col-title">Estado</div>
                <div class="metric-col-val ${d.isMet ? 'val-status-ok' : 'val-status-wait'}">
                  ${d.isMet ? '✓ Cumplido' : (d.sales > 0 ? `En Progreso (${d.percent}%)` : 'Pendiente (0%)')}
                </div>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Pie del reporte -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      Droguería El Olam • Sistema de Control de Visitas y Metas Comerciales • Generado exclusivamente para ${vendorName}
    </div>

  </div>

  <script>
    // Datos inyectados
    const dailyItems = ${JSON.stringify(dailyData)};
    const chartInstances = [];

    // Inicializar gráficas con Chart.js
    dailyItems.forEach((d, idx) => {
      const canvas = document.getElementById('chart-' + idx);
      if (!canvas) return;

      const chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Meta', 'Alcanzado'],
          datasets: [{
            data: [d.goal, d.sales],
            backgroundColor: [
              '#94a3b8', // Meta (Gris suave / azulado)
              d.sales >= d.goal && d.goal > 0 ? '#10b981' : (d.sales > 0 ? '#059669' : '#e2e8f0') // Alcanzado (Verde Esmeralda)
            ],
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 18
          }]
        },
        options: {
          indexAxis: 'y', // Barra horizontal idéntica a la imagen del usuario
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ' ' + context.label + ': Q' + Number(context.raw).toLocaleString('es-GT', { minimumFractionDigits: 2 });
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              suggestedMax: ${Math.round(maxScaleValue * 1.1)},
              grid: { color: '#f1f5f9' },
              ticks: {
                callback: function(val) {
                  return 'Q' + Number(val).toLocaleString('es-GT');
                },
                font: { size: 10 }
              }
            },
            y: {
              grid: { display: false },
              ticks: {
                font: { size: 11, weight: 'bold' }
              }
            }
          }
        }
      });

      chartInstances.push(chart);
    });

    // Control de vista: Ambos, Solo Compromisos o Solo Alcances
    function setVisualMode(mode, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      dailyItems.forEach((d, idx) => {
        const chart = chartInstances[idx];
        if (!chart) return;

        if (mode === 'commitment') {
          chart.data.labels = ['Meta'];
          chart.data.datasets[0].data = [d.goal];
          chart.data.datasets[0].backgroundColor = ['#2563eb'];
        } else if (mode === 'sales') {
          chart.data.labels = ['Alcanzado'];
          chart.data.datasets[0].data = [d.sales];
          chart.data.datasets[0].backgroundColor = [d.sales >= d.goal && d.goal > 0 ? '#10b981' : '#059669'];
        } else {
          chart.data.labels = ['Meta', 'Alcanzado'];
          chart.data.datasets[0].data = [d.goal, d.sales];
          chart.data.datasets[0].backgroundColor = [
            '#94a3b8',
            d.sales >= d.goal && d.goal > 0 ? '#10b981' : (d.sales > 0 ? '#059669' : '#e2e8f0')
          ];
        }
        chart.update();
      });
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
  a.download = `Cumplimiento_Metas_${safeVendor}_${startDate}_a_${endDate}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

