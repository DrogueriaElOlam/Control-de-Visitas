import { useState, useRef } from 'react';
import FormHeader from './FormHeader';
import FormButtons from './FormButtons';
import PersonaIndividualSection from './PersonaIndividualSection';
import PersonaJuridicaSection from './PersonaJuridicaSection';
import ReferenciasSection from './ReferenciasSection';
import DocumentosRequeridosSection from './DocumentosRequeridosSection';
import UsoExclusivoSection from './UsoExclusivoSection';
import ConfirmacionReferenciasSection from './ConfirmacionReferenciasSection';
import AutorizacionFinalSection from './AutorizacionFinalSection';
import { LOGO_DATA_URI } from '../lib/logo';

export default function SolicitudCreditoForm() {
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    // Persona Individual
    nombreComercialInd: '',
    propietario: '',
    nitInd: '',
    direccionNegocioInd: '',
    zonaInd: '',
    municipioInd: '',
    departamentoInd: '',
    patenteComercioInd: '',
    telefonosInd: '',
    direccionPropietario: '',
    encargadoNegocioInd: '',
    telefonoEncargadoInd: '',
    // Persona Jurídica
    nombreComercialJur: '',
    telefonosJur: '',
    nitJur: '',
    razonSocial: '',
    patenteComercioJur: '',
    patenteSociedad: '',
    direccionNegocioJur: '',
    zonaJur: '',
    municipioJur: '',
    departamentoJur: '',
    representanteLegal: '',
    dpiRepresentante: '',
    telefonoRepresentante: '',
    direccionRepresentante: '',
    encargadoNegocioJur: '',
    telefonoEncargadoJur: '',
    // Referencias Comerciales
    refComercial1: '',
    telRefComercial1: '',
    creditoAuto1: '',
    refComercial2: '',
    telRefComercial2: '',
    creditoAuto2: '',
    refComercial3: '',
    telRefComercial3: '',
    creditoAuto3: '',
    refComercial4: '',
    telRefComercial4: '',
    creditoAuto4: '',
    refComercial5: '',
    telRefComercial5: '',
    creditoAuto5: '',
    // Referencias Bancarias
    banco1: '',
    tipoCuenta1: '',
    banco2: '',
    tipoCuenta2: '',
    banco3: '',
    tipoCuenta3: '',
    // Página 2 - Documentos Requeridos
    fechaSolicitud: new Date().toLocaleDateString('es-GT'),
    doc1Adjunto: '',
    doc1Obs: '',
    doc2Adjunto: '',
    doc2Obs: '',
    doc3Adjunto: '',
    doc3Obs: '',
    doc4Adjunto: '',
    doc4Obs: '',
    doc5Adjunto: '',
    doc5Obs: '',
    doc6Adjunto: '',
    doc6Obs: '',
    doc7Adjunto: '',
    doc7Obs: '',
    // Uso Exclusivo Droguería
    codigoSAE: '',
    ruta: '',
    fechaPrimeraCompra: '',
    comprasContado: '',
    promedioCompra: '',
    vendedorAsignado: '',
    // Confirmación Referencias Comerciales
    confRef1Credito: '',
    confRef1Dias: '',
    confRef1Clasificacion: '',
    confRef1Obs: '',
    confRef2Credito: '',
    confRef2Dias: '',
    confRef2Clasificacion: '',
    confRef2Obs: '',
    confRef3Credito: '',
    confRef3Dias: '',
    confRef3Clasificacion: '',
    confRef3Obs: '',
    confRef4Credito: '',
    confRef4Dias: '',
    confRef4Clasificacion: '',
    confRef4Obs: '',
    confRef5Credito: '',
    confRef5Dias: '',
    confRef5Clasificacion: '',
    confRef5Obs: '',
    // Autorización Final
    creditoAutorizado: '',
    diasCreditoAutorizados: '',
    observacionesGenerales: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleClear = () => {
    const emptyData = {};
    Object.keys(formData).forEach(key => {
      emptyData[key] = '';
    });
    setFormData(emptyData);
  };

  const handleExport = () => {
    const logoUrl = LOGO_DATA_URI;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Crédito</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; line-height: 1.4; }
    .page { width: 8.5in; height: 11in; padding: 0.5in; box-sizing: border-box; }
    .page-break { page-break-after: always; }
    
    /* Header */
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
    .header-table td { vertical-align: top; padding: 3pt 0; }
    .company-info h2 { font-size: 10pt; font-weight: bold; margin-bottom: 2pt; }
    .company-info p { font-size: 8pt; margin: 1pt 0; line-height: 1.2; }
    .header-logo { width: 140pt; height: auto; }
    
    /* Title */
    .main-title { background: #1E3A8A; color: white; text-align: center; padding: 6pt; font-size: 12pt; font-weight: bold; margin: 6pt 0 8pt 0; }
    
    /* Sections */
    .section { margin-bottom: 8pt; page-break-inside: avoid; }
    .section-title { background: #1E3A8A; color: white; padding: 4pt; font-size: 10pt; font-weight: bold; margin-bottom: 6pt; line-height: 1.2; }
    
    /* Fields */
    .field-row { display: flex; margin-bottom: 5pt; align-items: flex-end; }
    .field-label { font-weight: bold; font-size: 8pt; margin-right: 3pt; white-space: nowrap; line-height: 1.2; }
    .field-value { border-bottom: 1pt solid black; flex: 1; min-height: 16pt; font-size: 8pt; padding: 3pt 2pt 2pt 2pt; line-height: 1.2; }
    .field-block { margin-bottom: 5pt; page-break-inside: avoid; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6pt; }
    
    /* Tables */
    .data-table { width: 100%; border-collapse: collapse; margin-top: 6pt; margin-bottom: 8pt; }
    .data-table th, .data-table td { border: 1pt solid black; padding: 4pt 3pt; text-align: left; font-size: 8pt; line-height: 1.2; vertical-align: top; }
    .data-table th { background: #E5E5E5; font-weight: bold; }
    .data-table tr { page-break-inside: avoid; page-break-after: auto; }
    .data-table thead { display: table-header-group; }
    
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- PÁGINA 1 -->
  <div class="page page-break">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 70%;">
          <div class="company-info">
            <h2>DISTRIBUIDORA COMERCIAL EL OLAM S.A.</h2>
            <p>7a. Avenida "A" 17-67 Colonia Aurora I Zona 13, Guatemala</p>
            <p>Teléfonos: 2308-4353, 2332-7814, 2339-4613</p>
          </div>
        </td>
        <td style="width: 30%; text-align: right;">
          <img src="${logoUrl}" alt="Logo" class="header-logo" />
        </td>
      </tr>
    </table>
    
    <!-- Main Title -->
    <div class="main-title">SOLICITUD DE CRÉDITO</div>
    
    <!-- PERSONA INDIVIDUAL -->
    <div class="section">
      <div class="section-title">PERSONA INDIVIDUAL</div>
      <div class="field-block">
        <span class="field-label">Nombre Comercial:</span>
        <div class="field-value">${formData.nombreComercialInd || ''}</div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Propietario:</span>
          <div class="field-value">${formData.propietario || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">NIT:</span>
          <div class="field-value">${formData.nitInd || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Dirección Negocio:</span>
          <div class="field-value">${formData.direccionNegocioInd || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Zona:</span>
          <div class="field-value">${formData.zonaInd || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Municipio:</span>
          <div class="field-value">${formData.municipioInd || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Departamento:</span>
          <div class="field-value">${formData.departamentoInd || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">No. Patente de Comercio:</span>
          <div class="field-value">${formData.patenteComercioInd || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Teléfonos:</span>
          <div class="field-value">${formData.telefonosInd || ''}</div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-label">Dirección Exacta del Propietario:</span>
        <div class="field-value">${formData.direccionPropietario || ''}</div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Encargado Responsable del Negocio:</span>
          <div class="field-value">${formData.encargadoNegocioInd || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoEncargadoInd || ''}</div>
        </div>
      </div>
    </div>
    
    <!-- PERSONA JURÍDICA -->
    <div class="section">
      <div class="section-title">PERSONA JURÍDICA (SOCIEDAD ANÓNIMA)</div>
      <div class="field-block">
        <span class="field-label">Nombre Comercial:</span>
        <div class="field-value">${formData.nombreComercialJur || ''}</div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Teléfonos:</span>
          <div class="field-value">${formData.telefonosJur || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">NIT:</span>
          <div class="field-value">${formData.nitJur || ''}</div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-label">Razón Social:</span>
        <div class="field-value">${formData.razonSocial || ''}</div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">No. Patente de Comercio:</span>
          <div class="field-value">${formData.patenteComercioJur || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">No. Patente de Sociedad:</span>
          <div class="field-value">${formData.patenteSociedad || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Dirección Negocio:</span>
          <div class="field-value">${formData.direccionNegocioJur || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Zona:</span>
          <div class="field-value">${formData.zonaJur || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Municipio:</span>
          <div class="field-value">${formData.municipioJur || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Departamento:</span>
          <div class="field-value">${formData.departamentoJur || ''}</div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-label">Nombre del Representante Legal:</span>
        <div class="field-value">${formData.representanteLegal || ''}</div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">DPI Representante Legal:</span>
          <div class="field-value">${formData.dpiRepresentante || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Teléfono Representante Legal:</span>
          <div class="field-value">${formData.telefonoRepresentante || ''}</div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-label">Dirección Exacta del Representante Legal:</span>
        <div class="field-value">${formData.direccionRepresentante || ''}</div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Encargado Responsable del Negocio:</span>
          <div class="field-value">${formData.encargadoNegocioJur || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoEncargadoJur || ''}</div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- PÁGINA 2 -->
  <div class="page page-break">
    <!-- REFERENCIAS COMERCIALES -->
    <div class="section">
      <div class="section-title">REFERENCIAS COMERCIALES</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">No.</th>
            <th style="width: 50%;">Nombre</th>
            <th style="width: 25%;">Teléfonos</th>
            <th style="width: 20%;">Crédito Auto.</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1)</td>
            <td>${formData.refComercial1 || ''}</td>
            <td>${formData.telRefComercial1 || ''}</td>
            <td>${formData.creditoAuto1 || ''}</td>
          </tr>
          <tr>
            <td>2)</td>
            <td>${formData.refComercial2 || ''}</td>
            <td>${formData.telRefComercial2 || ''}</td>
            <td>${formData.creditoAuto2 || ''}</td>
          </tr>
          <tr>
            <td>3)</td>
            <td>${formData.refComercial3 || ''}</td>
            <td>${formData.telRefComercial3 || ''}</td>
            <td>${formData.creditoAuto3 || ''}</td>
          </tr>
          <tr>
            <td>4)</td>
            <td>${formData.refComercial4 || ''}</td>
            <td>${formData.telRefComercial4 || ''}</td>
            <td>${formData.creditoAuto4 || ''}</td>
          </tr>
          <tr>
            <td>5)</td>
            <td>${formData.refComercial5 || ''}</td>
            <td>${formData.telRefComercial5 || ''}</td>
            <td>${formData.creditoAuto5 || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- REFERENCIAS BANCARIAS -->
    <div class="section">
      <div class="section-title">REFERENCIAS BANCARIAS</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50%;">Banco</th>
            <th style="width: 50%;">Tipo de Cuenta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${formData.banco1 || ''}</td>
            <td>${formData.tipoCuenta1 || ''}</td>
          </tr>
          <tr>
            <td>${formData.banco2 || ''}</td>
            <td>${formData.tipoCuenta2 || ''}</td>
          </tr>
          <tr>
            <td>${formData.banco3 || ''}</td>
            <td>${formData.tipoCuenta3 || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- DOCUMENTOS REQUERIDOS -->
    <div class="section">
      <div class="section-title">ANEXAR A LA PRESENTE SOLICITUD DE CRÉDITO (FAVOR ADJUNTAR COPIA)</div>
      <div class="field-block" style="margin-bottom: 12pt;">
        <span class="field-label">Fecha de Solicitud:</span>
        <div class="field-value">${formData.fechaSolicitud || ''}</div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">No.</th>
            <th style="width: 50%;">DOCUMENTO</th>
            <th style="width: 15%;">ADJUNTO</th>
            <th style="width: 30%;">OBSERVACIONES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1)</td>
            <td>Fotocopia de DPI del Propietario o Representante Legal</td>
            <td>${formData.doc1Adjunto || ''}</td>
            <td>${formData.doc1Obs || ''}</td>
          </tr>
          <tr>
            <td>2)</td>
            <td>Fotocopia de Patente de Comercio</td>
            <td>${formData.doc2Adjunto || ''}</td>
            <td>${formData.doc2Obs || ''}</td>
          </tr>
          <tr>
            <td>3)</td>
            <td>Fotocopia de Patente de Sociedad (si aplica)</td>
            <td>${formData.doc3Adjunto || ''}</td>
            <td>${formData.doc3Obs || ''}</td>
          </tr>
          <tr>
            <td>4)</td>
            <td>Fotocopia de RTU</td>
            <td>${formData.doc4Adjunto || ''}</td>
            <td>${formData.doc4Obs || ''}</td>
          </tr>
          <tr>
            <td>5)</td>
            <td>Referencias Comerciales (mínimo 3)</td>
            <td>${formData.doc5Adjunto || ''}</td>
            <td>${formData.doc5Obs || ''}</td>
          </tr>
          <tr>
            <td>6)</td>
            <td>Referencias Bancarias</td>
            <td>${formData.doc6Adjunto || ''}</td>
            <td>${formData.doc6Obs || ''}</td>
          </tr>
          <tr>
            <td>7)</td>
            <td>Otros documentos</td>
            <td>${formData.doc7Adjunto || ''}</td>
            <td>${formData.doc7Obs || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- PÁGINA 3 -->
  <div class="page">
    
    <!-- USO EXCLUSIVO DE DROGUERÍA EL OLAM -->
    <div class="section">
      <div class="section-title">USO EXCLUSIVO DE DROGUERÍA EL OLAM</div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Código SAE:</span>
          <div class="field-value">${formData.codigoSAE || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Ruta:</span>
          <div class="field-value">${formData.ruta || ''}</div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-label">Fecha Primera Compra:</span>
        <div class="field-value">${formData.fechaPrimeraCompra || ''}</div>
      </div>
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Compras de Contado:</span>
          <div class="field-value">${formData.comprasContado || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Promedio de Compra:</span>
          <div class="field-value">${formData.promedioCompra || ''}</div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-label">Vendedor Asignado:</span>
        <div class="field-value">${formData.vendedorAsignado || ''}</div>
      </div>
    </div>
    
    <!-- CONFIRMACIÓN DE REFERENCIAS COMERCIALES -->
    <div class="section">
      <div class="section-title">CONFIRMACIÓN DE REFERENCIAS COMERCIALES</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">No.</th>
            <th style="width: 20%;">Crédito Auto.</th>
            <th style="width: 20%;">Días Autorizados</th>
            <th style="width: 20%;">Clasificación</th>
            <th style="width: 35%;">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1)</td>
            <td>${formData.confRef1Credito || ''}</td>
            <td>${formData.confRef1Dias || ''}</td>
            <td>${formData.confRef1Clasificacion || ''}</td>
            <td>${formData.confRef1Obs || ''}</td>
          </tr>
          <tr>
            <td>2)</td>
            <td>${formData.confRef2Credito || ''}</td>
            <td>${formData.confRef2Dias || ''}</td>
            <td>${formData.confRef2Clasificacion || ''}</td>
            <td>${formData.confRef2Obs || ''}</td>
          </tr>
          <tr>
            <td>3)</td>
            <td>${formData.confRef3Credito || ''}</td>
            <td>${formData.confRef3Dias || ''}</td>
            <td>${formData.confRef3Clasificacion || ''}</td>
            <td>${formData.confRef3Obs || ''}</td>
          </tr>
          <tr>
            <td>4)</td>
            <td>${formData.confRef4Credito || ''}</td>
            <td>${formData.confRef4Dias || ''}</td>
            <td>${formData.confRef4Clasificacion || ''}</td>
            <td>${formData.confRef4Obs || ''}</td>
          </tr>
          <tr>
            <td>5)</td>
            <td>${formData.confRef5Credito || ''}</td>
            <td>${formData.confRef5Dias || ''}</td>
            <td>${formData.confRef5Clasificacion || ''}</td>
            <td>${formData.confRef5Obs || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- AUTORIZACIÓN FINAL -->
    <div class="section">
      <div class="grid-2">
        <div class="field-block">
          <span class="field-label">Crédito Autorizado:</span>
          <div class="field-value">${formData.creditoAutorizado || ''}</div>
        </div>
        <div class="field-block">
          <span class="field-label">Días de Crédito Autorizados:</span>
          <div class="field-value">${formData.diasCreditoAutorizados || ''}</div>
        </div>
      </div>
      <div class="field-block" style="margin-top: 12pt;">
        <span class="field-label">OBSERVACIONES GENERALES:</span>
        <div class="field-value" style="min-height: 50pt; white-space: pre-wrap; padding: 8pt 5pt; line-height: 1.3;">${formData.observacionesGenerales || ''}</div>
      </div>
      <div class="signature-block" style="margin-top: 30pt;">
        <div class="grid-2">
          <div class="signature-column" style="text-align: center;">
            <div class="signature-line" style="border-top: 1pt solid black; margin-top: 30pt;"></div>
            <p style="padding-top: 7pt; font-size: 9pt; line-height: 1.2; font-weight: bold;">Revisado</p>
          </div>
          <div class="signature-column" style="text-align: center;">
            <div class="signature-line" style="border-top: 1pt solid black; margin-top: 30pt;"></div>
            <p style="padding-top: 7pt; font-size: 9pt; line-height: 1.2; font-weight: bold;">Autorizado</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
</body>
</html>`;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    setTimeout(() => {
      newWindow.print();
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6">
      <FormButtons onClear={handleClear} onExport={handleExport} />
      
      <div ref={formRef} className="bg-white p-4 sm:p-6 md:p-8 border-2 border-gray-300">
        <FormHeader logoSize="medium" />
        
        <div className="bg-blue-900 text-white text-center py-2 mb-4 sm:mb-6">
          <h1 className="text-base sm:text-lg font-bold">SOLICITUD DE CRÉDITO</h1>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-900">
          <h2 className="text-sm sm:text-base font-bold text-blue-900 mb-2">PÁGINA 1 - DATOS DEL SOLICITANTE</h2>
        </div>

        <PersonaIndividualSection formData={formData} handleChange={handleChange} />
        <PersonaJuridicaSection formData={formData} handleChange={handleChange} />
        <ReferenciasSection formData={formData} handleChange={handleChange} />

        <div className="my-8 border-t-4 border-blue-900"></div>

        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-700">
          <h2 className="text-sm sm:text-base font-bold text-green-700 mb-2">PÁGINA 2 - DOCUMENTOS Y USO INTERNO</h2>
        </div>

        <DocumentosRequeridosSection formData={formData} handleChange={handleChange} />
        <UsoExclusivoSection formData={formData} handleChange={handleChange} />
        <ConfirmacionReferenciasSection formData={formData} handleChange={handleChange} />
        <AutorizacionFinalSection formData={formData} handleChange={handleChange} />
      </div>
    </div>
  );
}
