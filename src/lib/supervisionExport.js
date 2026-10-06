import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { LOGO_DATA_URI } from './logo';

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Export Recibos history to PDF
 */
export function exportRecibosToPDF(record) {
  console.log('Exportando recibos a PDF:', record);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  if (LOGO_DATA_URI) {
    try {
      doc.addImage(LOGO_DATA_URI, 'PNG', 14, 10, 22, 22);
    } catch (err) {
      console.warn('Error agregando logo al PDF:', err);
    }
  }

  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Control de Recibos de Caja', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Fecha de Creación: ${formatDate(record.fecha_creacion)}`, 14, yPosition);
  yPosition += 15;

  const datos = record.datos;

  // Viaticos section
  if (datos.viaticos && datos.viaticos.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Viáticos', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    datos.viaticos.forEach((viatico, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.text(`${index + 1}. Fecha: ${viatico.fecha || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Vendedor: ${viatico.vendedor || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Gira: ${viatico.gira || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Cantidad Viáticos: Q${viatico.cantidadViaticos || '0.00'}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Total Recibos: Q${viatico.totalRecibos || '0.00'}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Sobrante: Q${viatico.sobrante || '0.00'}`, 14, yPosition);
      yPosition += 8;
    });
  }

  // Recibos section
  if (datos.recibos && datos.recibos.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Recibos de Caja', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    datos.recibos.forEach((recibo, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.text(`${index + 1}. Fecha: ${recibo.fecha || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Recibo: ${recibo.recibo || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Monto: Q${recibo.monto || '0.00'}`, 14, yPosition);
      yPosition += 5;
      doc.text(`   Concepto: ${recibo.concepto || ''}`, 14, yPosition);
      yPosition += 8;
    });
  }

  const fileName = `Recibos_${formatDate(record.fecha_creacion).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
  console.log('PDF generado:', fileName);
}

/**
 * Export Evaluaciones history to PDF
 * Faithful replica of the requested PDF format
 */
export function exportEvaluacionesToPDF(record) {
  console.log('Exportando evaluaciones a PDF (Formato Fiel):', record);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const datos = record.datos || {};
  const evaluacionesList = datos.evaluaciones || (Array.isArray(record) ? record : []);
  
  const pageWidth = doc.internal.pageSize.getWidth(); // 215.9 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 279.4 mm
  const margin = 25.4; // 1 inch
  const contentWidth = pageWidth - (margin * 2);

  if (evaluacionesList && evaluacionesList.length > 0) {
    evaluacionesList.forEach((evaluacion, index) => {
      if (index > 0) doc.addPage();

      let y = margin;

      // 1. Encabezado con Logo oficial
      if (LOGO_DATA_URI) {
        try {
          doc.addImage(LOGO_DATA_URI, 'PNG', margin, y - 6, 26, 22);
        } catch (err) {
          console.warn('Error agregando logo al PDF:', err);
        }
      }

      // Nombre Droguería
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('DROGUERÍA EL OLAM', margin + 28, y + 6);

      // Título con fondo azul claro
      doc.setFillColor(219, 234, 254); // bg-blue-100 equivalent (RGB)
      doc.rect(pageWidth / 2, y, contentWidth / 2, 12, 'F');
      
      doc.setTextColor(30, 58, 138); // text-blue-900 equivalent
      doc.setFontSize(14);
      doc.text('EVALUACIÓN DE VENDEDOR', (pageWidth / 2) + (contentWidth / 4), y + 8, { align: 'center' });
      doc.setTextColor(0); // Reset to black

      y += 20;

      // 2. Información General
      doc.setFontSize(10);
      doc.setDrawColor(0); // Black borders
      
      // Fecha
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Fecha Evaluación', margin, y);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.rect(margin, y + 2, 40, 8); // Box
      doc.text(evaluacion.fecha || '', margin + 2, y + 7);

      // Vendedor
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Vendedor', margin + 45, y);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.rect(margin + 45, y + 2, 80, 8); // Box
      doc.text(evaluacion.vendedor || '', margin + 47, y + 7);

      // Ruta
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Ruta', margin + 130, y);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.rect(margin + 130, y + 2, contentWidth - 130, 8); // Box
      doc.text(evaluacion.ruta || '', margin + 132, y + 7);

      y += 18;

      // 3. Tabla Principal
      const cols = [
        { name: 'Aspecto a Evaluar', width: 45 },
        { name: 'Descripción del Indicador', width: 65 },
        { name: 'Checklist', width: 15 },
        { name: 'Max %', width: 15 },
        { name: 'Recibido', width: 25 }
      ];

      // Header Row
      doc.setFillColor(219, 234, 254);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setDrawColor(0);
      doc.rect(margin, y, contentWidth, 10); // Border around header

      let x = margin;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(9);
      
      cols.forEach(col => {
        doc.text(col.name, x + 2, y + 6);
        // Vertical line
        doc.line(x + col.width, y, x + col.width, y + 10);
        x += col.width;
      });
      doc.setTextColor(0);

      y += 10;

      // Rows
      let totalScore = 0;
      if (evaluacion.aspectos) {
        doc.setFont('helvetica', 'normal');
        evaluacion.aspectos.forEach(asp => {
          const rowHeight = 10;
          // Check page break
          if (y + rowHeight > pageHeight - margin - 50) { // Reserve space for footer
             doc.addPage();
             y = margin;
             
             // Redraw Header on new page
             doc.setFillColor(219, 234, 254);
             doc.rect(margin, y, contentWidth, 10, 'F');
             doc.setDrawColor(0);
             doc.rect(margin, y, contentWidth, 10); 

             let hx = margin;
             doc.setFont('helvetica', 'bold');
             doc.setTextColor(30, 58, 138);
             doc.setFontSize(9);
             cols.forEach(col => {
                doc.text(col.name, hx + 2, y + 6);
                doc.line(hx + col.width, y, hx + col.width, y + 10);
                hx += col.width;
             });
             doc.setTextColor(0);
             doc.setFont('helvetica', 'normal');
             y += 10;
          }

          // Draw row box
          doc.setDrawColor(0);
          doc.rect(margin, y, contentWidth, rowHeight);
          
          x = margin;
          
          // Aspecto
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(doc.splitTextToSize(asp.aspecto || '', cols[0].width - 4), x + 2, y + 4);
          doc.line(x + cols[0].width, y, x + cols[0].width, y + rowHeight);
          x += cols[0].width;

          // Descripción
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(doc.splitTextToSize(asp.descripcion || asp.indicador || '', cols[1].width - 4), x + 2, y + 3.5);
          doc.line(x + cols[1].width, y, x + cols[1].width, y + rowHeight);
          x += cols[1].width;

          // Checklist
          // Draw box for check
          doc.rect(x + 4, y + 2, 6, 6);
          if (asp.checklist) {
            doc.text('X', x + 5.5, y + 6);
          }
          doc.line(x + cols[2].width, y, x + cols[2].width, y + rowHeight);
          x += cols[2].width;

          // Max %
          doc.setFontSize(9);
          doc.text(`${asp.porcentaje}%`, x + 12, y + 6, { align: 'right' });
          doc.line(x + cols[3].width, y, x + cols[3].width, y + rowHeight);
          x += cols[3].width;

          // Recibido
          doc.text(`${asp.porcentajeRecibido || 0}`, x + 20, y + 6, { align: 'right' });
          // No line needed for last col, the rect covers it
          
          totalScore += parseFloat(asp.porcentajeRecibido || 0);
          y += rowHeight;
        });
      }

      // Grand Total Row
      doc.setFillColor(239, 246, 255); // Lighter blue
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.rect(margin, y, contentWidth, 10); // Border

      doc.setFont('helvetica', 'bold');
      doc.text('GRAND TOTAL:', margin + 110, y + 7);
      doc.text('100%', margin + 137, y + 7, { align: 'right' }); // Under Max %
      doc.setTextColor(30, 58, 138);
      doc.text(`${totalScore.toFixed(0)}%`, margin + 162, y + 7, { align: 'right' }); // Under Recibido
      doc.setTextColor(0);

      y += 15;

      // 4. Observaciones
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Observaciones', margin, y);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      
      y += 2;
      doc.rect(margin, y, contentWidth, 30);
      if (evaluacion.observaciones) {
        doc.setFontSize(9);
        doc.text(doc.splitTextToSize(evaluacion.observaciones, contentWidth - 4), margin + 2, y + 5);
      }

      y += 35;

      // 5. Niveles de Evaluación
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Niveles de Evaluación', margin, y);
      doc.setTextColor(0);
      y += 5;

      // Table Header
      doc.setFillColor(219, 234, 254);
      doc.rect(margin, y, 120, 8, 'F');
      doc.rect(margin, y, 120, 8); // Border
      doc.setFontSize(8);
      doc.text('Rango', margin + 2, y + 5);
      doc.text('Nivel / Descripción', margin + 40, y + 5);
      
      y += 8;

      const levels = [
        { range: '95% - 100%', level: 'Excelente / Top Performer', desc: 'Supera expectativas, modelo a seguir.', color: [21, 128, 61] }, // Green
        { range: '80% - 94%', level: 'Bueno / Competente', desc: 'Cumple con los estándares requeridos.', color: [29, 78, 216] }, // Blue
        { range: '60% - 79%', level: 'Regular / En Observación', desc: 'Necesita mejorar en áreas específicas.', color: [161, 98, 7] }, // Yellow/Orange
        { range: 'Menos del 60%', level: 'Mediocre / Deficiente', desc: 'No cumple con los requisitos mínimos.', color: [185, 28, 28] } // Red
      ];

      levels.forEach(lvl => {
        doc.setDrawColor(0);
        doc.rect(margin, y, 120, 10);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(lvl.range, margin + 2, y + 6);
        
        doc.setTextColor(lvl.color[0], lvl.color[1], lvl.color[2]);
        doc.text(lvl.level, margin + 40, y + 4);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(lvl.desc, margin + 40, y + 8);

        y += 10;
      });

    });
  }

  const dateStr = record.fecha_creacion ? formatDate(record.fecha_creacion) : new Date().toLocaleDateString('es-GT').replace(/\//g, '-');
  const fileName = `Evaluaciones_${dateStr}.pdf`;
  doc.save(fileName);
  console.log('PDF fiel generado:', fileName);
}

/**
 * Export Evaluaciones history to Excel
 */
export function exportEvaluacionesToExcel(record) {
  console.log('Exportando evaluaciones a Excel:', record);

  const datos = record.datos;

  if (datos.evaluaciones && datos.evaluaciones.length > 0) {
    const evaluacionesData = [];

    datos.evaluaciones.forEach(ev => {
      if (ev.aspectos && Array.isArray(ev.aspectos)) {
        ev.aspectos.forEach(asp => {
          evaluacionesData.push({
            'Fecha': ev.fecha || '',
            'Vendedor': ev.vendedor || '',
            'Ruta': ev.ruta || '',
            'Aspecto': asp.aspecto,
            'Indicador': asp.indicador,
            'Checklist': asp.checklist ? 'Sí' : 'No',
            'Porcentaje Máximo': asp.porcentaje,
            'Porcentaje Obtenido': asp.porcentajeRecibido,
            'Observaciones': asp.observaciones || ''
          });
        });
        
        // Add total row
        const totalScore = ev.aspectos.reduce((sum, asp) => sum + (parseFloat(asp.porcentajeRecibido) || 0), 0);
        evaluacionesData.push({
          'Fecha': '',
          'Vendedor': '',
          'Ruta': 'TOTAL',
          'Aspecto': '',
          'Indicador': '',
          'Checklist': '',
          'Porcentaje Máximo': 100,
          'Porcentaje Obtenido': totalScore,
          'Observaciones': ''
        });
        
        // Empty row
        evaluacionesData.push({});
      }
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(evaluacionesData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
      { wch: 30 },
      { wch: 30 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluaciones');

    const fileName = `Evaluaciones_${formatDate(record.fecha_creacion).replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    console.log('Excel generado:', fileName);
  }
}


/**
 * Export Visitas history to PDF
 */
export function exportVisitasToPDF(record) {
  console.log('Exportando visitas a PDF:', record);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  if (LOGO_DATA_URI) {
    try {
      doc.addImage(LOGO_DATA_URI, 'PNG', 14, 10, 22, 22);
    } catch (err) {
      console.warn('Error agregando logo al PDF:', err);
    }
  }

  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Visitas Proveedores', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Fecha de Creación: ${formatDate(record.fecha_creacion)}`, 14, yPosition);
  yPosition += 15;

  const datos = record.datos;

  if (datos.visitas && datos.visitas.length > 0) {
    doc.setFontSize(9);

    datos.visitas.forEach((visita, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont(undefined, 'bold');
      doc.text(`Visita ${index + 1}`, 14, yPosition);
      yPosition += 6;

      doc.setFont(undefined, 'normal');
      doc.text(`Fecha de Visita: ${visita.fechaVisita || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Proveedor: ${visita.proveedor || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Representante: ${visita.representante || ''}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Teléfono: ${visita.telefono || ''}`, 14, yPosition);
      yPosition += 5;

      if (visita.temasTratados) {
        doc.text('Temas Tratados:', 14, yPosition);
        yPosition += 5;
        const lines = doc.splitTextToSize(visita.temasTratados, pageWidth - 28);
        lines.forEach(line => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 14, yPosition);
          yPosition += 5;
        });
      }

      yPosition += 5;
    });
  }

  const fileName = `Visitas_${formatDate(record.fecha_creacion).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
  console.log('PDF generado:', fileName);
}

/**
 * Export Recibos history to Excel
 */
export function exportRecibosToExcel(record) {
  console.log('Exportando recibos a Excel:', record);

  const datos = record.datos;
  const workbook = XLSX.utils.book_new();

  // Viaticos sheet
  if (datos.viaticos && datos.viaticos.length > 0) {
    const viaticosData = datos.viaticos.map(v => ({
      'Fecha': v.fecha || '',
      'Vendedor': v.vendedor || '',
      'Gira': v.gira || '',
      'Cantidad Viáticos': v.cantidadViaticos || '0.00',
      'Cantidad Recibos': v.cantidadRecibos || '0',
      'Total Recibos': v.totalRecibos || '0.00',
      'Sobrante': v.sobrante || '0.00'
    }));

    const viaticosSheet = XLSX.utils.json_to_sheet(viaticosData);
    XLSX.utils.book_append_sheet(workbook, viaticosSheet, 'Viáticos');
  }

  // Recibos sheet
  if (datos.recibos && datos.recibos.length > 0) {
    const recibosData = datos.recibos.map(r => ({
      'Fecha': r.fecha || '',
      'Recibo': r.recibo || '',
      'Monto': r.monto || '0.00',
      'Concepto': r.concepto || ''
    }));

    const recibosSheet = XLSX.utils.json_to_sheet(recibosData);
    XLSX.utils.book_append_sheet(workbook, recibosSheet, 'Recibos');
  }

  const fileName = `Recibos_${formatDate(record.fecha_creacion).replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  console.log('Excel generado:', fileName);
}



/**
 * Export Visitas history to Excel
 */
export function exportVisitasToExcel(record) {
  console.log('Exportando visitas a Excel:', record);

  const datos = record.datos;

  if (datos.visitas && datos.visitas.length > 0) {
    const visitasData = datos.visitas.map(v => ({
      'Fecha de Visita': v.fechaVisita || '',
      'Proveedor': v.proveedor || '',
      'Representante': v.representante || '',
      'Teléfono': v.telefono || '',
      'Temas Tratados': v.temasTratados || ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(visitasData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 50 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitas');

    const fileName = `Visitas_${formatDate(record.fecha_creacion).replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    console.log('Excel generado:', fileName);
  }
}
