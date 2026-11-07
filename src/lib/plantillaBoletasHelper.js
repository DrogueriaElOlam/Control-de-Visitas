// Droguería El Olam - Motor de Carga Masiva Ultrarrápida, Impresión Oficial e Historial en la Nube para Plantilla de Boletas
import { supabase } from './supabase';
import { LOGO_DATA_URI } from './logo';

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

/**
 * Optimiza y comprime una imagen en milisegundos usando Canvas en paralelo.
 * Reduce fotos pesadas de celular (5-10MB) a ~65-95KB nítidos para carga instantánea y guardado en nube.
 */
export function compressBoletaImage(file, maxDimension = 1150, quality = 0.82) {
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

  // Si se indicó una casilla específica de inicio (ej. "2-3"), calcular su índice lineal (base 0)
  let startLinearIndex = 0;
  if (startBoxId && typeof startBoxId === 'string' && startBoxId.includes('-')) {
    const [pStr, bStr] = startBoxId.split('-');
    const pNum = parseInt(pStr, 10) || 1;
    const bNum = parseInt(bStr, 10) || 1;
    startLinearIndex = (pNum - 1) * 4 + (bNum - 1);
  }

  let currentLinearIndex = startLinearIndex;

  for (const boletaObj of newBoletaObjects) {
    // Si empezó desde 0 (carga masiva general), buscar la primera casilla libre
    if (!startBoxId || newBoletaObjects.length > 1) {
      while (true) {
        const pageNum = Math.floor(currentLinearIndex / 4) + 1;
        const boxNum = (currentLinearIndex % 4) + 1;
        const candidateId = `${pageNum}-${boxNum}`;
        // Si es el primer archivo y el usuario hizo clic en una casilla específica, permitir reemplazarla
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
 * Genera el HTML oficial autoajustable para Imprimir o Descargar la Plantilla de Boletas.
 * Respeta las rotaciones, escalas, brillo, contraste y desplazamientos de cada boleta.
 */
export function generatePlantillaBoletasHtml({ pages = [1], images = {}, metadata = {} }) {
  const vendedor = metadata.vendedor || 'General';
  const ruta = metadata.ruta || '';
  const referencia = metadata.referencia || '';
  const fecha = metadata.fecha || new Date().toISOString().split('T')[0];

  // Filtrar páginas que tengan al menos una imagen, o dejar al menos la página 1
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

          if (!img || !img.src) {
            return `
              <div class="boleta-cell empty-cell">
                <div class="cell-badge">Cuadro ${boxNum}</div>
                <div class="empty-placeholder">Espacio Libre</div>
              </div>
            `;
          }

          const scale = Number(img.scale) || 1;
          const rotation = Number(img.rotation) || 0;
          const brightness = Number(img.brightness) || 100;
          const contrast = Number(img.contrast) || 100;
          const offsetX = Number(img.offsetX) || 0;
          const offsetY = Number(img.offsetY) || 0;

          return `
            <div class="boleta-cell">
              <div class="cell-badge">#${(pageIdx * 4) + Number(boxNum)}</div>
              <div class="boleta-img-wrapper">
                <img
                  src="${img.src}"
                  alt="Boleta ${boxId}"
                  style="
                    transform: translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${scale});
                    filter: brightness(${brightness}%) contrast(${contrast}%);
                  "
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
              <div><strong>Página ${pageIdx + 1} de ${pagesToRender.length}</strong> (${totalBoletas} boleta${totalBoletas === 1 ? '' : 's'})</div>
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
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet-page {
      width: 215.9mm;
      height: 264mm;
      margin: 0 auto 14px auto;
      background: #ffffff;
      padding: 6mm 8mm;
      display: flex;
      flex-direction: column;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
    }
    body.is-landscape .sheet-page {
      width: 279.4mm;
      height: 202mm;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 5px;
      margin-bottom: 8px;
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-logo {
      height: 32px;
      width: auto;
      object-fit: contain;
    }
    .company-title {
      font-size: 12px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: 0.3px;
    }
    .company-sub {
      font-size: 10.5px;
      color: #334155;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
    }
    .boletas-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 8px;
      min-height: 0;
    }
    .boleta-cell {
      position: relative;
      border: 1.8px solid #1e293b;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
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
      top: 5px;
      left: 5px;
      background: rgba(15, 23, 42, 0.78);
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
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
      padding: 3px;
    }
    .boleta-img-wrapper img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      transform-origin: center center;
    }
    @media print {
      body {
        background: #ffffff !important;
      }
      .sheet-page {
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        height: 98vh !important;
        padding: 2mm !important;
      }
    }
  </style>
</head>
<body class="is-portrait">
  ${pagesHtml}
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
    // Guardar hasta los 40 registros más recientes en localStorage para no saturar cuota local
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
  const totalBoletas = Object.keys(images || {}).filter((k) => Boolean(images[k]?.src)).length;

  const recordPayload = {
    tipo: 'plantilla_boletas_record',
    id: recordId,
    vendedor: vendedor || 'General',
    ruta: ruta || '',
    referencia: referencia || '',
    fecha: fecha || nowIso.split('T')[0],
    pages: Array.isArray(pages) && pages.length > 0 ? pages : [1],
    images: images || {},
    totalBoletas,
    totalPaginas: Array.isArray(pages) ? pages.length : 1,
    fecha_creacion: nowIso
  };

  let savedCloudId = null;

  try {
    // Verificar si ya existe en Supabase cuando se está editando
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

