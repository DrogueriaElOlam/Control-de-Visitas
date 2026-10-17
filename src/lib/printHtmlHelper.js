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
    @media (max-width: 640px) {
      .olam-top-actions-bar {
        flex-direction: column;
        align-items: stretch;
        padding: 10px;
        gap: 8px;
      }
      .olam-bar-actions {
        justify-content: stretch;
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
 */
export function injectPrintFeatures(rawHtml) {
  let html = rawHtml;

  // 1. Inyectar estilos en </head> si no existen
  if (!html.includes('id="olam-print-styles"')) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${PRINT_ACTION_BAR_STYLES}\n</head>`);
    } else {
      html = `${PRINT_ACTION_BAR_STYLES}\n${html}`;
    }
  }

  // 2. Inyectar barra superior después de <body>
  if (!html.includes('olam-top-actions-bar')) {
    if (html.includes('<body')) {
      html = html.replace(/(<body[^>]*>)/i, `$1\n${PRINT_ACTION_BAR_HTML}`);
    } else {
      html = `${PRINT_ACTION_BAR_HTML}\n${html}`;
    }
  }

  // 3. Inyectar script de auto-impresión antes de </body> si no hay script de print
  if (!html.includes('triggerPrint') && !html.includes('window.print()')) {
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
export function openAndPrintHtml(rawHtml, fallbackTitle = 'Formulario') {
  const preparedHtml = injectPrintFeatures(rawHtml);
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
  downloadHtmlFile(preparedHtml, `${fallbackTitle}.html`);
  alert('Se descargó el archivo HTML porque el navegador bloqueó la ventana emergente. Ábrelo y presiona el botón verde de Imprimir.');
  return false;
}

/**
 * Descarga el archivo HTML en el dispositivo asegurando la barra de impresión
 */
export function downloadHtmlFile(rawHtml, fileName = 'documento.html') {
  const preparedHtml = injectPrintFeatures(rawHtml);
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
