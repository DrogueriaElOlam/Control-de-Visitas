import { useState } from 'react';
import { FileDown, Trash2 } from 'lucide-react';
import FormHeader from './FormHeader';

export default function SolicitudEmpleoForm() {
  const [formData, setFormData] = useState({
    // Datos Personales
    nombre: '',
    cedula: '',
    fechaNacimiento: '',
    edad: '',
    lugarNacimiento: '',
    nacionalidad: '',
    
    // Datos Familiares
    estadoCivil: '',
    nombreConyuge: '',
    hijos: '',
    personasCargo: '',
    
    // Dirección y Contacto
    direccion: '',
    zona: '',
    municipio: '',
    departamento: '',
    telefono: '',
    celular: '',
    email: '',
    
    // Información Laboral
    cargoSolicita: '',
    salarioDeseado: '',
    disponibilidadInmediata: '',
    fechaDisponible: '',
    
    // Educación
    nivelAcademico: '',
    institucion: '',
    titulo: '',
    añoGraduacion: '',
    
    // Referencias Personales (3)
    refPersonal1Nombre: '',
    refPersonal1Telefono: '',
    refPersonal1Ocupacion: '',
    refPersonal2Nombre: '',
    refPersonal2Telefono: '',
    refPersonal2Ocupacion: '',
    refPersonal3Nombre: '',
    refPersonal3Telefono: '',
    refPersonal3Ocupacion: '',
    
    // Referencias Laborales (2)
    refLaboral1Empresa: '',
    refLaboral1Cargo: '',
    refLaboral1Telefono: '',
    refLaboral2Empresa: '',
    refLaboral2Cargo: '',
    refLaboral2Telefono: '',
    
    // Experiencia Laboral (3)
    exp1Empresa: '',
    exp1Cargo: '',
    exp1Periodo: '',
    exp1Motivo: '',
    exp2Empresa: '',
    exp2Cargo: '',
    exp2Periodo: '',
    exp2Motivo: '',
    exp3Empresa: '',
    exp3Cargo: '',
    exp3Periodo: '',
    exp3Motivo: '',
    
    // Información Adicional
    habilidades: '',
    idiomas: '',
    licenciaConducir: '',
    vehiculoPropio: '',
    
    // Declaración
    fecha: '',
    firma: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todos los campos?')) {
      setFormData({
        nombre: '', cedula: '', fechaNacimiento: '', edad: '', lugarNacimiento: '', nacionalidad: '',
        estadoCivil: '', nombreConyuge: '', hijos: '', personasCargo: '',
        direccion: '', zona: '', municipio: '', departamento: '', telefono: '', celular: '', email: '',
        cargoSolicita: '', salarioDeseado: '', disponibilidadInmediata: '', fechaDisponible: '',
        nivelAcademico: '', institucion: '', titulo: '', añoGraduacion: '',
        refPersonal1Nombre: '', refPersonal1Telefono: '', refPersonal1Ocupacion: '',
        refPersonal2Nombre: '', refPersonal2Telefono: '', refPersonal2Ocupacion: '',
        refPersonal3Nombre: '', refPersonal3Telefono: '', refPersonal3Ocupacion: '',
        refLaboral1Empresa: '', refLaboral1Cargo: '', refLaboral1Telefono: '',
        refLaboral2Empresa: '', refLaboral2Cargo: '', refLaboral2Telefono: '',
        exp1Empresa: '', exp1Cargo: '', exp1Periodo: '', exp1Motivo: '',
        exp2Empresa: '', exp2Cargo: '', exp2Periodo: '', exp2Motivo: '',
        exp3Empresa: '', exp3Cargo: '', exp3Periodo: '', exp3Motivo: '',
        habilidades: '', idiomas: '', licenciaConducir: '', vehiculoPropio: '',
        fecha: '', firma: ''
      });
    }
  };

  const handleExport = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Solicitud de Empleo</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; color: #000; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
          .header-table { border: none; margin-bottom: 10px; }
          .header-table td { border: none; padding: 2px; }
          .logo-cell { width: 30%; text-align: right; vertical-align: top; }
          .address-cell { width: 70%; text-align: left; vertical-align: top; font-size: 8px; line-height: 1.4; }
          .title { background: #4a5568; color: white; text-align: center; padding: 6px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
          .section-title { background: #e2e8f0; font-weight: bold; text-align: center; padding: 4px; font-size: 10px; }
          .label { font-weight: bold; font-size: 8px; }
          .value { font-size: 9px; min-height: 16px; }
          .full-width { width: 100%; }
          .half-width { width: 50%; }
          .third-width { width: 33.33%; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="address-cell">
              <strong style="font-size: 10px;">DISTRIBUIDORA COMERCIAL EL OLAM S.A.</strong><br>
              7a. Avenida "A" 17-67 Zona 13, Guatemala<br>
              Teléfonos: 2308-4353, 2332-7814, 2339-4613
            </td>
            <td class="logo-cell">
              <img src="/logo.png" 
                   alt="Logo" style="width: 100px; height: auto; display: block; margin-left: auto;">
            </td>
          </tr>
        </table>

        <div class="title">SOLICITUD DE EMPLEO</div>

        <table>
          <tr><td colspan="4" class="section-title">DATOS PERSONALES</td></tr>
          <tr>
            <td class="label">Nombre Completo:</td>
            <td colspan="3" class="value">${formData.nombre}</td>
          </tr>
          <tr>
            <td class="label">Cédula/DPI:</td>
            <td class="value">${formData.cedula}</td>
            <td class="label">Fecha Nacimiento:</td>
            <td class="value">${formData.fechaNacimiento}</td>
          </tr>
          <tr>
            <td class="label">Edad:</td>
            <td class="value">${formData.edad}</td>
            <td class="label">Lugar Nacimiento:</td>
            <td class="value">${formData.lugarNacimiento}</td>
          </tr>
          <tr>
            <td class="label">Nacionalidad:</td>
            <td colspan="3" class="value">${formData.nacionalidad}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">DATOS FAMILIARES</td></tr>
          <tr>
            <td class="label">Estado Civil:</td>
            <td class="value">${formData.estadoCivil}</td>
            <td class="label">Nombre Cónyuge:</td>
            <td class="value">${formData.nombreConyuge}</td>
          </tr>
          <tr>
            <td class="label">Número de Hijos:</td>
            <td class="value">${formData.hijos}</td>
            <td class="label">Personas a Cargo:</td>
            <td class="value">${formData.personasCargo}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">DIRECCIÓN Y CONTACTO</td></tr>
          <tr>
            <td class="label">Dirección:</td>
            <td colspan="3" class="value">${formData.direccion}</td>
          </tr>
          <tr>
            <td class="label">Zona:</td>
            <td class="value">${formData.zona}</td>
            <td class="label">Municipio:</td>
            <td class="value">${formData.municipio}</td>
          </tr>
          <tr>
            <td class="label">Departamento:</td>
            <td class="value">${formData.departamento}</td>
            <td class="label">Teléfono:</td>
            <td class="value">${formData.telefono}</td>
          </tr>
          <tr>
            <td class="label">Celular:</td>
            <td class="value">${formData.celular}</td>
            <td class="label">Email:</td>
            <td class="value">${formData.email}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">INFORMACIÓN LABORAL</td></tr>
          <tr>
            <td class="label">Cargo que Solicita:</td>
            <td class="value">${formData.cargoSolicita}</td>
            <td class="label">Salario Deseado:</td>
            <td class="value">${formData.salarioDeseado}</td>
          </tr>
          <tr>
            <td class="label">Disponibilidad Inmediata:</td>
            <td class="value">${formData.disponibilidadInmediata}</td>
            <td class="label">Fecha Disponible:</td>
            <td class="value">${formData.fechaDisponible}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">EDUCACIÓN</td></tr>
          <tr>
            <td class="label">Nivel Académico:</td>
            <td class="value">${formData.nivelAcademico}</td>
            <td class="label">Institución:</td>
            <td class="value">${formData.institucion}</td>
          </tr>
          <tr>
            <td class="label">Título Obtenido:</td>
            <td class="value">${formData.titulo}</td>
            <td class="label">Año Graduación:</td>
            <td class="value">${formData.añoGraduacion}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">REFERENCIAS PERSONALES</td></tr>
          <tr>
            <td class="label">1. Nombre:</td>
            <td class="value">${formData.refPersonal1Nombre}</td>
            <td class="label">Teléfono:</td>
            <td class="value">${formData.refPersonal1Telefono}</td>
          </tr>
          <tr>
            <td class="label">Ocupación:</td>
            <td colspan="3" class="value">${formData.refPersonal1Ocupacion}</td>
          </tr>
          <tr>
            <td class="label">2. Nombre:</td>
            <td class="value">${formData.refPersonal2Nombre}</td>
            <td class="label">Teléfono:</td>
            <td class="value">${formData.refPersonal2Telefono}</td>
          </tr>
          <tr>
            <td class="label">Ocupación:</td>
            <td colspan="3" class="value">${formData.refPersonal2Ocupacion}</td>
          </tr>
          <tr>
            <td class="label">3. Nombre:</td>
            <td class="value">${formData.refPersonal3Nombre}</td>
            <td class="label">Teléfono:</td>
            <td class="value">${formData.refPersonal3Telefono}</td>
          </tr>
          <tr>
            <td class="label">Ocupación:</td>
            <td colspan="3" class="value">${formData.refPersonal3Ocupacion}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">REFERENCIAS LABORALES</td></tr>
          <tr>
            <td class="label">1. Empresa:</td>
            <td class="value">${formData.refLaboral1Empresa}</td>
            <td class="label">Cargo:</td>
            <td class="value">${formData.refLaboral1Cargo}</td>
          </tr>
          <tr>
            <td class="label">Teléfono:</td>
            <td colspan="3" class="value">${formData.refLaboral1Telefono}</td>
          </tr>
          <tr>
            <td class="label">2. Empresa:</td>
            <td class="value">${formData.refLaboral2Empresa}</td>
            <td class="label">Cargo:</td>
            <td class="value">${formData.refLaboral2Cargo}</td>
          </tr>
          <tr>
            <td class="label">Teléfono:</td>
            <td colspan="3" class="value">${formData.refLaboral2Telefono}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">EXPERIENCIA LABORAL</td></tr>
          <tr>
            <td class="label">1. Empresa:</td>
            <td class="value">${formData.exp1Empresa}</td>
            <td class="label">Cargo:</td>
            <td class="value">${formData.exp1Cargo}</td>
          </tr>
          <tr>
            <td class="label">Período:</td>
            <td class="value">${formData.exp1Periodo}</td>
            <td class="label">Motivo Salida:</td>
            <td class="value">${formData.exp1Motivo}</td>
          </tr>
          <tr>
            <td class="label">2. Empresa:</td>
            <td class="value">${formData.exp2Empresa}</td>
            <td class="label">Cargo:</td>
            <td class="value">${formData.exp2Cargo}</td>
          </tr>
          <tr>
            <td class="label">Período:</td>
            <td class="value">${formData.exp2Periodo}</td>
            <td class="label">Motivo Salida:</td>
            <td class="value">${formData.exp2Motivo}</td>
          </tr>
          <tr>
            <td class="label">3. Empresa:</td>
            <td class="value">${formData.exp3Empresa}</td>
            <td class="label">Cargo:</td>
            <td class="value">${formData.exp3Cargo}</td>
          </tr>
          <tr>
            <td class="label">Período:</td>
            <td class="value">${formData.exp3Periodo}</td>
            <td class="label">Motivo Salida:</td>
            <td class="value">${formData.exp3Motivo}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">INFORMACIÓN ADICIONAL</td></tr>
          <tr>
            <td class="label">Habilidades:</td>
            <td colspan="3" class="value">${formData.habilidades}</td>
          </tr>
          <tr>
            <td class="label">Idiomas:</td>
            <td class="value">${formData.idiomas}</td>
            <td class="label">Licencia Conducir:</td>
            <td class="value">${formData.licenciaConducir}</td>
          </tr>
          <tr>
            <td class="label">Vehículo Propio:</td>
            <td colspan="3" class="value">${formData.vehiculoPropio}</td>
          </tr>
        </table>

        <table>
          <tr><td colspan="4" class="section-title">DECLARACIÓN</td></tr>
          <tr>
            <td colspan="4" class="value" style="padding: 8px;">
              Declaro que la información proporcionada en esta solicitud es verdadera y completa. 
              Autorizo a la empresa a verificar la información y referencias proporcionadas.
            </td>
          </tr>
          <tr>
            <td class="label">Fecha:</td>
            <td class="value">${formData.fecha}</td>
            <td class="label">Firma:</td>
            <td class="value">${formData.firma}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solicitud_empleo_${formData.nombre || 'formulario'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <FormHeader size="medium" />
        
        <div className="bg-gray-700 text-white text-center py-3 px-4">
          <h1 className="text-lg sm:text-xl font-bold">SOLICITUD DE EMPLEO</h1>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Limpiar
            </button>
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              <FileDown className="w-5 h-5" />
              Exportar a PDF
            </button>
          </div>

          {/* Datos Personales */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">DATOS PERSONALES</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cédula/DPI</label>
                  <input
                    type="text"
                    name="cedula"
                    value={formData.cedula}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={formData.fechaNacimiento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Edad</label>
                  <input
                    type="number"
                    name="edad"
                    value={formData.edad}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lugar de Nacimiento</label>
                  <input
                    type="text"
                    name="lugarNacimiento"
                    value={formData.lugarNacimiento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nacionalidad</label>
                <input
                  type="text"
                  name="nacionalidad"
                  value={formData.nacionalidad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Datos Familiares */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">DATOS FAMILIARES</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estado Civil</label>
                  <select
                    name="estadoCivil"
                    value={formData.estadoCivil}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Soltero/a">Soltero/a</option>
                    <option value="Casado/a">Casado/a</option>
                    <option value="Divorciado/a">Divorciado/a</option>
                    <option value="Viudo/a">Viudo/a</option>
                    <option value="Unión Libre">Unión Libre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Cónyuge</label>
                  <input
                    type="text"
                    name="nombreConyuge"
                    value={formData.nombreConyuge}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Hijos</label>
                  <input
                    type="number"
                    name="hijos"
                    value={formData.hijos}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Personas a Cargo</label>
                  <input
                    type="number"
                    name="personasCargo"
                    value={formData.personasCargo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dirección y Contacto */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">DIRECCIÓN Y CONTACTO</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección Completa</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Zona</label>
                  <input
                    type="text"
                    name="zona"
                    value={formData.zona}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Municipio</label>
                  <input
                    type="text"
                    name="municipio"
                    value={formData.municipio}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    name="departamento"
                    value={formData.departamento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Celular</label>
                  <input
                    type="tel"
                    name="celular"
                    value={formData.celular}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">INFORMACIÓN LABORAL</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cargo que Solicita</label>
                  <input
                    type="text"
                    name="cargoSolicita"
                    value={formData.cargoSolicita}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Salario Deseado</label>
                  <input
                    type="text"
                    name="salarioDeseado"
                    value={formData.salarioDeseado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Disponibilidad Inmediata</label>
                  <select
                    name="disponibilidadInmediata"
                    value={formData.disponibilidadInmediata}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Disponible</label>
                  <input
                    type="date"
                    name="fechaDisponible"
                    value={formData.fechaDisponible}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Educación */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">EDUCACIÓN</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nivel Académico</label>
                  <select
                    name="nivelAcademico"
                    value={formData.nivelAcademico}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Primaria">Primaria</option>
                    <option value="Secundaria">Secundaria</option>
                    <option value="Bachillerato">Bachillerato</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Universidad">Universidad</option>
                    <option value="Postgrado">Postgrado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Institución</label>
                  <input
                    type="text"
                    name="institucion"
                    value={formData.institucion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Título Obtenido</label>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Año de Graduación</label>
                  <input
                    type="number"
                    name="añoGraduacion"
                    value={formData.añoGraduacion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Referencias Personales */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">REFERENCIAS PERSONALES</h2>
            </div>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="border-b border-gray-200 pb-3 last:border-0">
                  <p className="text-xs font-bold text-gray-600 mb-2">{num}. Referencia Personal</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      name={`refPersonal${num}Nombre`}
                      value={formData[`refPersonal${num}Nombre`]}
                      onChange={handleChange}
                      placeholder="Nombre completo"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="tel"
                        name={`refPersonal${num}Telefono`}
                        value={formData[`refPersonal${num}Telefono`]}
                        onChange={handleChange}
                        placeholder="Teléfono"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        name={`refPersonal${num}Ocupacion`}
                        value={formData[`refPersonal${num}Ocupacion`]}
                        onChange={handleChange}
                        placeholder="Ocupación"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Referencias Laborales */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">REFERENCIAS LABORALES</h2>
            </div>
            <div className="p-4 space-y-4">
              {[1, 2].map((num) => (
                <div key={num} className="border-b border-gray-200 pb-3 last:border-0">
                  <p className="text-xs font-bold text-gray-600 mb-2">{num}. Referencia Laboral</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      name={`refLaboral${num}Empresa`}
                      value={formData[`refLaboral${num}Empresa`]}
                      onChange={handleChange}
                      placeholder="Nombre de la empresa"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        name={`refLaboral${num}Cargo`}
                        value={formData[`refLaboral${num}Cargo`]}
                        onChange={handleChange}
                        placeholder="Cargo que ocupó"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="tel"
                        name={`refLaboral${num}Telefono`}
                        value={formData[`refLaboral${num}Telefono`]}
                        onChange={handleChange}
                        placeholder="Teléfono"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Experiencia Laboral */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">EXPERIENCIA LABORAL</h2>
            </div>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="border-b border-gray-200 pb-3 last:border-0">
                  <p className="text-xs font-bold text-gray-600 mb-2">{num}. Empleo Anterior</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        name={`exp${num}Empresa`}
                        value={formData[`exp${num}Empresa`]}
                        onChange={handleChange}
                        placeholder="Nombre de la empresa"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        name={`exp${num}Cargo`}
                        value={formData[`exp${num}Cargo`]}
                        onChange={handleChange}
                        placeholder="Cargo"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        name={`exp${num}Periodo`}
                        value={formData[`exp${num}Periodo`]}
                        onChange={handleChange}
                        placeholder="Período (ej: 2020-2022)"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        name={`exp${num}Motivo`}
                        value={formData[`exp${num}Motivo`]}
                        onChange={handleChange}
                        placeholder="Motivo de salida"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Información Adicional */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">INFORMACIÓN ADICIONAL</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Habilidades Especiales</label>
                <textarea
                  name="habilidades"
                  value={formData.habilidades}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Idiomas</label>
                  <input
                    type="text"
                    name="idiomas"
                    value={formData.idiomas}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Licencia de Conducir</label>
                  <select
                    name="licenciaConducir"
                    value={formData.licenciaConducir}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vehículo Propio</label>
                  <select
                    name="vehiculoPropio"
                    value={formData.vehiculoPropio}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Declaración y Firma */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-200 px-4 py-2">
              <h2 className="font-bold text-sm">DECLARACIÓN</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-700 leading-relaxed">
                Declaro que la información proporcionada en esta solicitud es verdadera y completa. 
                Autorizo a la empresa a verificar la información y referencias proporcionadas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Firma (Nombre completo)</label>
                  <input
                    type="text"
                    name="firma"
                    value={formData.firma}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
