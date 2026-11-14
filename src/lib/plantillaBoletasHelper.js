// Droguería El Olam - Motor de Carga Masiva Ultrarrápida, Renderizado Exacto WYSIWYG (Canvas), Impresión Oficial e Historial en la Nube para Plantilla de Boletas
import { supabase } from './supabase';
import { LOGO_DATA_URI } from './logo';
import { injectPrintFeatures, downloadHtmlFile } from './printHtmlHelper';

export const BOLETAS_HISTORY_LOCAL_KEY = 'olam_plantilla_boletas_history_v1';
export const BOLETAS_CLOUD_DATE_KEY = '2099-12-24';

export const OFFICIAL_VENDORS_LIST = [
  'Ana Lucia Marroquin',
  'Antonio Celada',
  'Danny Perez',
  'Elias Quiej',
  'Elio Caceros',
  'Erick Curley',
  'Estuardo Cordova',
  'Jessica Noriega',
  'Josue Aguilar',
  'Karina Pineda',
  'Klissman Hernandez',
  'Wally Natareno'
];

// Caché en memoria de objetos HTMLImageElement para dibujo instantáneo en Canvas
const imageElementCache = new Map();

export function loadImageElement(src) {
  if (!src) return Promise.resolve(null);
  if (imageElementCache.has(src)) {
    const cached = imageElementCache.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      imageElementCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Dibuja una boleta en un Canvas aplicando exactamente la rotación, escala (ampliación),
 * posición X/Y, brillo y contraste tal y como se ve en pantalla.
 * Garantiza que al rotar 90°/270° o ampliar, la imagen se encuadre igual en pantalla, impresión y PDF.
 */
export function drawBoletaOnCanvas(ctx, img, settings = {}, canvasWidth = 800, canvasHeight = 1000) {
  if (!ctx) return;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (!img) {
    ctx.restore();
    return;
  }

  const scale = Number(settings.scale) || 1;
  const rotation = Number(settings.rotation) || 0;
  const brightness = Number(settings.brightness) || 100;
  const contrast = Number(settings.contrast) || 100;
  const offsetX = Number(settings.offsetX) || 0;
  const offsetY = Number(settings.offsetY) || 0;

  const pad = 14;
  const availW = canvasWidth - pad * 2;
  const availH = canvasHeight - pad * 2;

  const rad = (rotation * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));

  const imgW = img.naturalWidth || img.width || 1;
  const imgH = img.naturalHeight || img.height || 1;

  // Calcular dimensiones envolventes tras la rotación para que al girar 90° encaje completa sin cortarse
  const rotatedW = imgW * absCos + imgH * absSin;
  const rotatedH = imgW * absSin + imgH * absCos;

  const baseFitScale = Math.min(availW / rotatedW, availH / rotatedH);
  const drawW = imgW * baseFitScale;
  const drawH = imgH * baseFitScale;

  // Desplazamiento X / Y en coordenadas reales de la casilla (siempre horizontal y vertical respecto a la hoja)
  const shiftX = (offsetX / 100) * (canvasWidth * 0.45);
  const shiftY = (offsetY / 100) * (canvasHeight * 0.45);

  ctx.translate(canvasWidth / 2 + shiftX, canvasHeight / 2 + shiftY);
  ctx.rotate(rad);
  ctx.scale(scale, scale);

  if (brightness !== 100 || contrast !== 100) {
    try {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    } catch (_) {}
  }

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Genera una imagen JPG ya procesada ("horneada") con todas las modificaciones visuales
 * (rotación, zoom/escala, desplazamiento, brillo y contraste) en proporción exacta 4:5.
 */
export async function bakeBoletaToDataUrl(boletaObj, canvasWidth = 880, canvasHeight = 1100) {
  if (!boletaObj || !boletaObj.src) return null;
  const img = await loadImageElement(boletaObj.src);
  if (!img) return boletaObj.src;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  drawBoletaOnCanvas(ctx, img, boletaObj, canvasWidth, canvasHeight);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Procesa en paralelo todas las boletas de la plantilla para obtener sus imágenes finales
 * exactamente como se ven en pantalla antes de imprimir o exportar.
 */
export async function bakeAllBoletasMap(images = {}) {
  const keys = Object.keys(images).filter((k) => Boolean(images[k]?.src));
  const bakedMap = {};

  await Promise.all(
    keys.map(async (key) => {
      const item = images[key];
      const bakedDataUrl = await bakeBoletaToDataUrl(item, 880, 1100);
      bakedMap[key] = {
        ...item,
        bakedSrc: bakedDataUrl || item.src
      };
    })
  );

  return bakedMap;
}

/**
 * Optimiza y comprime una imagen en milisegundos usando Canvas en paralelo.
 * Reduce fotos pesadas de celular (5-10MB) a ~65-95KB nítidos para carga instantánea y guardado en nube.
 */
export function compressBoletaImage(file, maxDimension = 1200, quality = 0.84) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(objectUrl);

        resolve({
          src: optimizedDataUrl,
          name: file.name || 'boleta.jpg',
          scale: 1,
          rotation: 0,
          brightness: 100,
          contrast: 100,
          offsetX: 0,
          offsetY: 0
        });
      } catch (err) {
        console.warn('Fallback FileReader en compresión de boleta:', err);
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve({
            src: ev.target.result,
            name: file.name || 'boleta.jpg',
            scale: 1,
            rotation: 0,
            brightness: 100,
            contrast: 100,
            offsetX: 0,
            offsetY: 0
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = (ev) => {
        resolve({
          src: ev.target.result,
          name: file.name || 'boleta.jpg',
          scale: 1,
          rotation: 0,
          brightness: 100,
          contrast: 100,
          offsetX: 0,
          offsetY: 0
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Procesa múltiples archivos de boletas simultáneamente en paralelo.
 */
export async function processMultipleBoletasFast(fileList) {
  const files = Array.from(fileList || []).filter(
    (f) => f && (f.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|heic)$/i.test(f.name || ''))
  );
  if (files.length === 0) return [];

  const results = await Promise.all(files.map((file) => compressBoletaImage(file)));
  return results.filter(Boolean);
}

/**
 * Distribuye automáticamente un lote de imágenes en las casillas disponibles (4 por página),
 * creando automáticamente todas las páginas necesarias.
 */
export function distributeBoletasIntoGrid(currentPages, currentImages, newBoletaObjects, startBoxId = null) {
  const updatedImages = { ...(currentImages || {}) };
  let maxPage = Math.max(1, ...(currentPages || [1]));

  let startLinearIndex = 0;
  if (startBoxId && typeof startBoxId === 'string' && startBoxId.includes('-')) {
    const [pStr, bStr] = startBoxId.split('-');
    const pNum = parseInt(pStr, 10) || 1;
    const bNum = parseInt(bStr, 10) || 1;
    startLinearIndex = (pNum - 1) * 4 + (bNum - 1);
  }

  let currentLinearIndex = startLinearIndex;

  for (const boletaObj of newBoletaObjects) {
    if (!startBoxId || newBoletaObjects.length > 1) {
      while (true) {
        const pageNum = Math.floor(currentLinearIndex / 4) + 1;
        const boxNum = (currentLinearIndex % 4) + 1;
        const candidateId = `${pageNum}-${boxNum}`;
        if (startBoxId && candidateId === startBoxId && boletaObj === newBoletaObjects[0]) {
          break;
        }
        if (!updatedImages[candidateId]) {
          break;
        }
        currentLinearIndex++;
      }
    }

    const targetPage = Math.floor(currentLinearIndex / 4) + 1;
    const targetBox = (currentLinearIndex % 4) + 1;
    const targetBoxId = `${targetPage}-${targetBox}`;

    updatedImages[targetBoxId] = boletaObj;
    if (targetPage > maxPage) {
      maxPage = targetPage;
    }
    currentLinearIndex++;
  }

  const updatedPages = Array.from({ length: maxPage }, (_, idx) => idx + 1);
  return { pages: updatedPages, images: updatedImages };
}

/**
 * Genera el HTML oficial para Imprimir o Descargar la Plantilla de Boletas.
 * - Garantiza estrictamente 4 boletas por hoja tamaño Carta sin cortarse jamás (medidas exactas en mm).
 * - Si se proveen imágenes ya horneadas (`bakedSrc`), las imprime píxel por píxel idénticas a la pantalla;
 *   además incluye un renderizador Canvas de respaldo en el propio HTML para que siempre respete rotaciones y zoom.
 */
export function generatePlantillaBoletasHtml({ pages = [1], images = {}, metadata = {} }) {
  const vendedor = metadata.vendedor || 'General';
  const ruta = metadata.ruta || '';
  const referencia = metadata.referencia || '';
  const fecha = metadata.fecha || new Date().toISOString().split('T')[0];

  // Filtrar páginas que tengan al menos una imagen, o dejar la página 1
  const activePages = pages.filter((pNum) =>
    ['1', '2', '3', '4'].some((bNum) => Boolean(images[`${pNum}-${bNum}`]?.src))
  );
  const pagesToRender = activePages.length > 0 ? activePages : [1];
  const totalBoletas = Object.keys(images).filter((k) => Boolean(images[k]?.src)).length;

  const pagesHtml = pagesToRender
    .map((pageNum, pageIdx) => {
      const boxesHtml = ['1', '2', '3', '4']
        .map((boxNum) => {
          const boxId = `${pageNum}-${boxNum}`;
          const img = images[boxId];
          const globalNum = pageIdx * 4 + Number(boxNum);

          if (!img || !img.src) {
            return `
              <div class="boleta-cell empty-cell">
                <div class="cell-badge">Boleta #${globalNum}</div>
                <div class="empty-placeholder">Espacio Libre</div>
              </div>
            `;
          }

          // Si ya viene horneada (bakedSrc), contiene la rotación, zoom, posición y brillo exactos
          const displaySrc = img.bakedSrc || img.src;
          const isPreBaked = Boolean(img.bakedSrc);

          const scale = Number(img.scale) || 1;
          const rotation = Number(img.rotation) || 0;
          const brightness = Number(img.brightness) || 100;
          const contrast = Number(img.contrast) || 100;
          const offsetX = Number(img.offsetX) || 0;
          const offsetY = Number(img.offsetY) || 0;

          return `
            <div class="boleta-cell">
              <div class="cell-badge">#${globalNum}</div>
              <div class="boleta-img-wrapper">
                <img
                  src="${displaySrc}"
                  alt="Boleta ${boxId}"
                  class="boleta-printable-img"
                  data-prebaked="${isPreBaked ? '1' : '0'}"
                  data-scale="${scale}"
                  data-rotation="${rotation}"
                  data-brightness="${brightness}"
                  data-contrast="${contrast}"
                  data-offset-x="${offsetX}"
                  data-offset-y="${offsetY}"
                />
              </div>
            </div>
          `;
        })
        .join('');

      const isLastPage = pageIdx === pagesToRender.length - 1;

      return `
        <div class="sheet-page ${!isLastPage ? 'page-break' : ''}">
          <div class="sheet-header">
            <div class="header-left">
              <img src="${LOGO_DATA_URI}" alt="Droguería El Olam" class="header-logo" />
              <div>
                <div class="company-title">DROGUERÍA EL OLAM • PLANTILLA OFICIAL DE BOLETAS BANCARIAS</div>
                <div class="company-sub">
                  <span><strong>Ejecutivo:</strong> ${vendedor}</span>
                  ${ruta ? `<span> • <strong>Ruta:</strong> ${ruta}</span>` : ''}
                  ${referencia ? `<span> • <strong>Ref:</strong> ${referencia}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="header-right">
              <div><strong>Fecha:</strong> ${fecha}</div>
              <div><strong>Hoja ${pageIdx + 1} de ${pagesToRender.length}</strong> (${totalBoletas} boleta${totalBoletas === 1 ? '' : 's'})</div>
            </div>
          </div>

          <div class="boletas-grid">
            ${boxesHtml}
          </div>
        </div>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Plantilla de Boletas - ${vendedor} (${fecha})</title>
  <style id="orientation-style">
    @page {
      size: letter portrait;
      margin: 5mm 6mm 5mm 6mm;
    }
  </style>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      font-family: Arial, Helvetica, sans-serif;
      background: #e2e8f0;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Vista en pantalla previa a imprimir: Hoja Carta exacta */
    .sheet-page {
      width: 196mm;
      height: 254mm;
      max-height: 254mm;
      margin: 0 auto 14px auto;
      background: #ffffff;
      padding: 2mm 3mm;
      display: flex;
      flex-direction: column;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    body.is-landscape .sheet-page {
      width: 258mm;
      height: 192mm;
      max-height: 192mm;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .sheet-header {
      height: 10mm;
      min-height: 10mm;
      max-height: 10mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #1e3a8a;
      padding-bottom: 1mm;
      margin-bottom: 2mm;
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo {
      height: 8mm;
      width: auto;
      object-fit: contain;
    }
    .company-title {
      font-size: 10.5px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: 0.2px;
      line-height: 1.15;
    }
    .company-sub {
      font-size: 9px;
      color: #334155;
      margin-top: 1px;
      line-height: 1.15;
    }
    .header-right {
      text-align: right;
      font-size: 9px;
      color: #334155;
      line-height: 1.2;
      white-space: nowrap;
    }
    /* Cuadrícula estricta 2x2: 4 boletas exactas por hoja (proporción 4:5 idéntica al editor) sin desbordar jamás */
    .boletas-grid {
      width: 100%;
      height: 238mm;
      max-height: 238mm;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 3mm;
      flex-shrink: 0;
    }
    body.is-landscape .boletas-grid {
      height: 176mm;
      max-height: 176mm;
    }
    .boleta-cell {
      position: relative;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      border: 1.5px solid #1e293b;
      border-radius: 4px;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .empty-cell {
      border: 1.5px dashed #cbd5e1;
      background: #f8fafc;
    }
    .empty-placeholder {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
    }
    .cell-badge {
      position: absolute;
      top: 4px;
      left: 4px;
      background: rgba(15, 23, 42, 0.82);
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 800;
      padding: 1.5px 5px;
      border-radius: 4px;
      z-index: 5;
    }
    .boleta-img-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #ffffff;
    }
    .boleta-img-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .sheet-page {
        width: 196mm !important;
        height: 254mm !important;
        max-height: 254mm !important;
        margin: 0 auto !important;
        padding: 1mm 2mm !important;
        border: none !important;
        box-shadow: none !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      body.is-landscape .sheet-page {
        width: 258mm !important;
        height: 192mm !important;
        max-height: 192mm !important;
      }
      .boletas-grid {
        height: 238mm !important;
        max-height: 238mm !important;
      }
      body.is-landscape .boletas-grid {
        height: 176mm !important;
        max-height: 176mm !important;
      }
    }
  </style>
</head>
<body class="is-portrait">
  ${pagesHtml}
  <script>
    // Si alguna imagen no venía pre-horneada, aplicarle en Canvas su rotación, zoom y brillo exactos
    (function() {
      var imgs = document.querySelectorAll('img.boleta-printable-img[data-prebaked="0"]');
      imgs.forEach(function(imgEl) {
        function bakeInPlace() {
          if (imgEl.getAttribute('data-prebaked') === '1') return;
          var scale = parseFloat(imgEl.getAttribute('data-scale')) || 1;
          var rotation = parseFloat(imgEl.getAttribute('data-rotation')) || 0;
          var brightness = parseFloat(imgEl.getAttribute('data-brightness')) || 100;
          var contrast = parseFloat(imgEl.getAttribute('data-contrast')) || 100;
          var offsetX = parseFloat(imgEl.getAttribute('data-offset-x')) || 0;
          var offsetY = parseFloat(imgEl.getAttribute('data-offset-y')) || 0;

          if (scale === 1 && rotation === 0 && brightness === 100 && contrast === 100 && offsetX === 0 && offsetY === 0) {
            imgEl.setAttribute('data-prebaked', '1');
            return;
          }

          try {
            var cw = 880, ch = 1100, pad = 14;
            var availW = cw - pad * 2, availH = ch - pad * 2;
            var rad = (rotation * Math.PI) / 180;
            var absCos = Math.abs(Math.cos(rad)), absSin = Math.abs(Math.sin(rad));
            var iw = imgEl.naturalWidth || imgEl.width || 1;
            var ih = imgEl.naturalHeight || imgEl.height || 1;
            var rotW = iw * absCos + ih * absSin;
            var rotH = iw * absSin + ih * absCos;
            var fit = Math.min(availW / rotW, availH / rotH);
            var dw = iw * fit, dh = ih * fit;

            var canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, cw, ch);
            var sx = (offsetX / 100) * (cw * 0.45);
            var sy = (offsetY / 100) * (ch * 0.45);
            ctx.translate(cw / 2 + sx, ch / 2 + sy);
            ctx.rotate(rad);
            ctx.scale(scale, scale);
            if (brightness !== 100 || contrast !== 100) {
              ctx.filter = 'brightness(' + brightness + '%) contrast(' + contrast + '%)';
            }
            ctx.drawImage(imgEl, -dw / 2, -dh / 2, dw, dh);
            imgEl.setAttribute('data-prebaked', '1');
            imgEl.src = canvas.toDataURL('image/jpeg', 0.9);
          } catch (e) {}
        }
        if (imgEl.complete && imgEl.naturalWidth > 0) {
          bakeInPlace();
        } else {
          imgEl.addEventListener('load', bakeInPlace, { once: true });
        }
      });
    })();
  </script>
</body>
</html>`;
}

/**
 * Normaliza un registro del historial de plantillas de boletas
 */
function normalizeBoletaHistoryRecord(raw, idx = 0) {
  if (!raw) return null;
  let datos = raw.supervision_data || raw.datos || raw;
  if (typeof datos === 'string') {
    try {
      datos = JSON.parse(datos);
    } catch (_) {
      return null;
    }
  }
  if (!datos || typeof datos !== 'object') return null;

  const images = datos.images && typeof datos.images === 'object' ? datos.images : {};
  const pages = Array.isArray(datos.pages) && datos.pages.length > 0 ? datos.pages : [1];
  const totalBoletas = Object.keys(images).filter((k) => Boolean(images[k]?.src)).length;

  return {
    id: raw.id || datos.id || `boletas_${Date.now()}_${idx}`,
    vendedor: datos.vendedor || raw.vendor_name || 'General',
    ruta: datos.ruta || '',
    referencia: datos.referencia || '',
    fecha: datos.fecha || (raw.created_at ? raw.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    pages,
    images,
    totalBoletas,
    totalPaginas: pages.length,
    fecha_creacion: datos.fecha_creacion || raw.created_at || new Date().toISOString()
  };
}

export function getLocalBoletasHistory() {
  try {
    const raw = localStorage.getItem(BOLETAS_HISTORY_LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, idx) => normalizeBoletaHistoryRecord(item, idx)).filter(Boolean);
  } catch (_) {
    return [];
  }
}

export function saveLocalBoletasHistory(records) {
  try {
    if (!Array.isArray(records)) return;
    localStorage.setItem(BOLETAS_HISTORY_LOCAL_KEY, JSON.stringify(records.slice(0, 40)));
  } catch (err) {
    console.warn('Aviso cuota localStorage en historial de boletas (respaldado en Supabase):', err);
  }
}

/**
 * Obtiene el historial completo de Plantillas de Boletas combinando Supabase y respaldo local
 */
export async function fetchPlantillaBoletasHistory() {
  const localRecords = getLocalBoletasHistory();
  let cloudRecords = [];

  try {
    const { data, error } = await supabase
      .from('daily_supervision_history')
      .select('*')
      .eq('date', BOLETAS_CLOUD_DATE_KEY)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      cloudRecords = data
        .map((row, idx) => {
          const norm = normalizeBoletaHistoryRecord(row, idx);
          if (norm) norm.cloudRowId = row.id;
          return norm;
        })
        .filter(Boolean);
    }
  } catch (err) {
    console.warn('Error consultando historial de boletas en la nube:', err);
  }

  const mergedMap = new Map();
  for (const rec of cloudRecords) {
    mergedMap.set(String(rec.id), rec);
  }
  for (const rec of localRecords) {
    if (!mergedMap.has(String(rec.id))) {
      mergedMap.set(String(rec.id), rec);
    }
  }

  const finalList = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.fecha_creacion || 0).getTime() - new Date(a.fecha_creacion || 0).getTime()
  );

  saveLocalBoletasHistory(finalList);
  return finalList;
}

/**
 * Guarda o actualiza una Plantilla de Boletas en Supabase y LocalStorage
 */
export async function savePlantillaBoletasRecord({ id = null, vendedor, ruta, referencia, fecha, pages, images }) {
  const nowIso = new Date().toISOString();
  const recordId = id || `boletas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // No guardar bakedSrc duplicado en la nube para ahorrar mitad de espacio (se guarda src + ajustes y el script/baker lo procesa al instante)
  const cleanImagesForStorage = {};
  Object.keys(images || {}).forEach((k) => {
    if (images[k]?.src) {
      const { bakedSrc, ...rest } = images[k];
      cleanImagesForStorage[k] = rest;
    }
  });

  const totalBoletas = Object.keys(cleanImagesForStorage).length;

  const recordPayload = {
    tipo: 'plantilla_boletas_record',
    id: recordId,
    vendedor: vendedor || 'General',
    ruta: ruta || '',
    referencia: referencia || '',
    fecha: fecha || nowIso.split('T')[0],
    pages: Array.isArray(pages) && pages.length > 0 ? pages : [1],
    images: cleanImagesForStorage,
    totalBoletas,
    totalPaginas: Array.isArray(pages) ? pages.length : 1,
    fecha_creacion: nowIso
  };

  let savedCloudId = null;

  try {
    if (id) {
      const { data: existingRows } = await supabase
        .from('daily_supervision_history')
        .select('id, supervision_data')
        .eq('date', BOLETAS_CLOUD_DATE_KEY);

      const matchRow = (existingRows || []).find(
        (r) => String(r.id) === String(id) || String(r.supervision_data?.id) === String(id)
      );

      if (matchRow) {
        const { error: updErr } = await supabase
          .from('daily_supervision_history')
          .update({
            vendor_name: recordPayload.vendedor,
            supervision_data: recordPayload
          })
          .eq('id', matchRow.id);

        if (!updErr) {
          savedCloudId = matchRow.id;
        }
      }
    }

    if (!savedCloudId) {
      const { data: insData, error: insErr } = await supabase
        .from('daily_supervision_history')
        .insert([
          {
            date: BOLETAS_CLOUD_DATE_KEY,
            vendor_name: recordPayload.vendedor,
            supervision_data: recordPayload
          }
        ])
        .select('id');

      if (!insErr && insData && insData[0]) {
        savedCloudId = insData[0].id;
        recordPayload.id = savedCloudId;
      }
    }
  } catch (err) {
    console.warn('Error guardando plantilla de boletas en Supabase:', err);
  }

  const normalized = normalizeBoletaHistoryRecord(recordPayload);
  const currentLocal = getLocalBoletasHistory();
  const filteredLocal = currentLocal.filter(
    (r) => String(r.id) !== String(id) && String(r.id) !== String(normalized.id)
  );
  const updatedLocal = [normalized, ...filteredLocal];
  saveLocalBoletasHistory(updatedLocal);

  return normalized;
}

/**
 * Elimina una Plantilla de Boletas del Historial (Supabase + LocalStorage)
 */
export async function deletePlantillaBoletasRecord(recordId) {
  try {
    const { data: rows } = await supabase
      .from('daily_supervision_history')
      .select('id, supervision_data')
      .eq('date', BOLETAS_CLOUD_DATE_KEY);

    const targets = (rows || []).filter(
      (r) => String(r.id) === String(recordId) || String(r.supervision_data?.id) === String(recordId)
    );

    for (const t of targets) {
      await supabase.from('daily_supervision_history').delete().eq('id', t.id);
    }
  } catch (err) {
    console.warn('Error eliminando registro de boletas en Supabase:', err);
  }

  const currentLocal = getLocalBoletasHistory();
  const updatedLocal = currentLocal.filter((r) => String(r.id) !== String(recordId));
  saveLocalBoletasHistory(updatedLocal);
  return true;
}

/**
 * Abre la ventana de impresión de forma síncrona (evitando bloqueadores de popups),
 * hornea en Canvas todas las boletas con su rotación, escala/ampliación, posición, brillo y contraste exactos,
 * y dispara la impresión con 4 boletas exactas por hoja sin recortes.
 */
export async function printBoletasWithExactBaking({ pages = [1], images = {}, metadata = {}, fallbackTitle = 'Plantilla_Boletas' }) {
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head><meta charset="UTF-8"><title>Preparando impresión...</title></head>
          <body style="font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 90vh; color: #1e3a8a; font-weight: bold;">
            Preparando boletas con tus ajustes de rotación y ampliación para impresión exacta...
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (_) {}
  }

  const bakedImages = await bakeAllBoletasMap(images);
  const rawHtml = generatePlantillaBoletasHtml({
    pages,
    images: bakedImages,
    metadata
  });
  const preparedHtml = injectPrintFeatures(rawHtml, 'portrait');

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(preparedHtml);
      printWindow.document.close();
      printWindow.focus();
      return true;
    } catch (e) {
      console.error('Error escribiendo en ventana de impresión:', e);
    }
  }

  downloadHtmlFile(preparedHtml, `${fallbackTitle}.html`, 'portrait');
  return false;
}

/**
 * Descarga el archivo HTML con todas las boletas ya horneadas (rotación, zoom, brillo y encuadre exactos).
 */
export async function downloadBoletasHtmlWithExactBaking({ pages = [1], images = {}, metadata = {}, fileName = 'Plantilla_Boletas.html' }) {
  const bakedImages = await bakeAllBoletasMap(images);
  const rawHtml = generatePlantillaBoletasHtml({
    pages,
    images: bakedImages,
    metadata
  });
  downloadHtmlFile(rawHtml, fileName, 'portrait');
}

