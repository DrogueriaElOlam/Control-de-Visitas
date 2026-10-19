// Droguería El Olam - Helper universal de Impresión y Exportación HTML
// Garantiza que todo documento HTML exportado incluya la barra y botón de impresión visible

export const PRINT_ACTION_BAR_STYLES = `
  <style id="olam-print-styles">
    .olam-top-actions-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35);
      z-index: 9999999;
      border-bottom: 3px solid #3b82f6;
      margin-bottom: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .olam-bar-title {
      font-size: 13px;
      font-weight: 700;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .olam-bar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .olam-btn-print {
      background: #16a34a;
      color: #ffffff;
      border: 1px solid #22c55e;
      padding: 10px 22px;
      font-size: 14px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(22, 163, 74, 0.4);
      transition: all 0.2s ease;
      letter-spacing: 0.3px;
    }
    .olam-btn-print:hover {
      background: #15803d;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.6);
    }
    .olam-btn-close {
      background: #dc2626;
      color: #ffffff;
      border: 1px solid #ef4444;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .olam-btn-close:hover {
      background: #b91c1c;
      transform: translateY(-1px);
    }
    .olam-orient-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.12);
      padding: 4px;
      border-radius: 8px;
    }
    .olam-orient-btn {
      background: transparent;
      color: #cbd5e1;
      border: 1px solid transparent;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .olam-orient-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #60a5fa;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
    }
    @media (max-width: 640px) {
      .olam-top-actions-bar {
        flex-direction: column;
        align-items: stretch;
        padding: 10px;
        gap: 8px;
      }
      .olam-bar-actions {
        justify-content: stretch;
        flex-wrap: wrap;
      }
      .olam-orient-group {
        width: 100%;
        justify-content: center;
      }
      .olam-btn-print, .olam-btn-close {
        flex: 1;
        justify-content: center;
      }
    }
    @media print {
      .no-print, .olam-top-actions-bar {
        display: none !important;
      }
    }
    /* Autoajuste universal en modo Horizontal (Landscape) */
    @media print and (orientation: landscape) {
      @page {
        size: letter landscape;
        margin: 5mm 8mm 5mm 8mm;
      }
      body {
        max-width: 100% !important;
        width: 100% !important;
      }
    }
  </style>
`;

export const PRINT_ACTION_BAR_HTML = `
  <div class="olam-top-actions-bar no-print">
    <div class="olam-bar-title">
      <span>📄 Droguería El Olam</span>
      <span style="opacity: 0.6;">•</span>
      <span>Vista de Impresión / Guardado</span>
    </div>
    <div class="olam-bar-actions">
      <div class="olam-orient-group">
        <button type="button" id="olam-orient-port" class="olam-orient-btn active" onclick="setOlamOrientation('portrait')">
          📄 Vertical
        </button>
        <button type="button" id="olam-orient-land" class="olam-orient-btn" onclick="setOlamOrientation('landscape')">
          📑 Horizontal
        </button>
      </div>
      <button type="button" class="olam-btn-print" onclick="window.print()">
        🖨️ IMPRIMIR / GUARDAR EN PDF
      </button>
      <button type="button" class="olam-btn-close" onclick="window.close()">
        ❌ Cerrar
      </button>
    </div>
  </div>
`;

export const PRINT_AUTO_SCRIPT = `
  <script>
    function setOlamOrientation(mode) {
      var btnPort = document.getElementById('olam-orient-port');
      var btnLand = document.getElementById('olam-orient-land');
      var dynStyle = document.getElementById('olam-dyn-page-style');
      if (!dynStyle) {
        dynStyle = document.createElement('style');
        dynStyle.id = 'olam-dyn-page-style';
        document.head.appendChild(dynStyle);
      }
      if (mode === 'landscape') {
        document.body.classList.add('is-landscape');
        dynStyle.innerHTML = '@page { size: letter landscape !important; margin: 5mm 8mm 5mm 8mm !important; }';
        if (btnLand) btnLand.classList.add('active');
        if (btnPort) btnPort.classList.remove('active');
      } else {
        document.body.classList.remove('is-landscape');
        dynStyle.innerHTML = '@page { size: letter portrait !important; margin: 7mm 8mm 7mm 8mm !important; }';
        if (btnPort) btnPort.classList.add('active');
        if (btnLand) btnLand.classList.remove('active');
      }
    }

    // Disparo seguro y automático de impresión
    (function() {
      function triggerPrint() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto-print dialog blocked or canceled:', e);
        }
      }
      if (document.readyState === 'complete') {
        setTimeout(triggerPrint, 500);
      } else {
        window.addEventListener('load', function() {
          setTimeout(triggerPrint, 500);
        });
      }
    })();
  </script>
`;

/**
 * Inserta la barra de acciones, estilos y script de impresión en cualquier HTML
 * Permite definir defaultOrientation ('landscape' | 'portrait')
 */
export function injectPrintFeatures(rawHtml, defaultOrientation = 'portrait') {
  let html = rawHtml;

  // 1. Inyectar estilos en </head> si no existen
  if (!html.includes('id="olam-print-styles"')) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${PRINT_ACTION_BAR_STYLES}\n</head>`);
    } else {
      html = `${PRINT_ACTION_BAR_STYLES}\n${html}`;
    }
  }

  // 2. Inyectar barra superior después de <body> sólo si no hay ya una barra de acciones
  if (!html.includes('olam-top-actions-bar') && !html.includes('action-bar')) {
    const isLand = defaultOrientation === 'landscape';
    const dynamicBar = `
  <div class="olam-top-actions-bar no-print">
    <div class="olam-bar-title">
      <span>📄 Droguería El Olam</span>
      <span style="opacity: 0.6;">•</span>
      <span>Vista de Impresión / Guardado</span>
    </div>
    <div class="olam-bar-actions">
      <div class="olam-orient-group">
        <button type="button" id="olam-orient-land" class="olam-orient-btn ${isLand ? 'active' : ''}" onclick="setOlamOrientation('landscape')">
          📑 Horizontal ${isLand ? '(Recomendado)' : ''}
        </button>
        <button type="button" id="olam-orient-port" class="olam-orient-btn ${!isLand ? 'active' : ''}" onclick="setOlamOrientation('portrait')">
          📄 Vertical
        </button>
      </div>
      <button type="button" class="olam-btn-print" onclick="window.print()">
        🖨️ IMPRIMIR / GUARDAR EN PDF
      </button>
      <button type="button" class="olam-btn-close" onclick="window.close()">
        ❌ Cerrar
      </button>
    </div>
  </div>
`;
    if (html.includes('<body')) {
      html = html.replace(/(<body[^>]*>)/i, `$1\n${dynamicBar}`);
    } else {
      html = `${dynamicBar}\n${html}`;
    }
  }

  // 3. Inyectar script de auto-impresión antes de </body> si no hay script de print
  if (!html.includes('setOlamOrientation') && !html.includes('setOrientation')) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${PRINT_AUTO_SCRIPT}\n</body>`);
    } else {
      html = `${html}\n${PRINT_AUTO_SCRIPT}`;
    }
  }

  return html;
}

/**
 * Abre una ventana emergente y dispara la impresión directamente
 */
export function openAndPrintHtml(rawHtml, fallbackTitle = 'Formulario', defaultOrientation = 'portrait') {
  const preparedHtml = injectPrintFeatures(rawHtml, defaultOrientation);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(preparedHtml);
      printWindow.document.close();
      printWindow.focus();

      // Disparar print directamente con temporizador confiable
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (err) {
          console.warn('print() bloqueado en ventana emergente:', err);
        }
      }, 600);
      return true;
    } catch (e) {
      console.error('Error escribiendo en ventana de impresión:', e);
    }
  }

  // Si el navegador bloqueó la ventana emergente, autodescargar el archivo HTML
  downloadHtmlFile(preparedHtml, `${fallbackTitle}.html`, defaultOrientation);
  alert('Se descargó el archivo HTML porque el navegador bloqueó la ventana emergente. Ábrelo y presiona el botón verde de Imprimir.');
  return false;
}

/**
 * Descarga el archivo HTML en el dispositivo asegurando la barra de impresión
 */
export function downloadHtmlFile(rawHtml, fileName = 'documento.html', defaultOrientation = 'portrait') {
  const preparedHtml = injectPrintFeatures(rawHtml, defaultOrientation);
  const blob = new Blob([preparedHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
