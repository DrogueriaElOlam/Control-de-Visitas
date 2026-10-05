import React, { useState, useEffect } from 'react';
import { Trash2, Save, X, Settings, Plus, Minus, Loader2, Edit, Check, Printer, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";

const isE2bSandbox = window.location.hostname.includes('e2b.app') || window.location.hostname.includes('e2b.dev') || window.self !== window.top;

export default function VendorEvaluationForm({ 
  onSave, 
  onCancel, 
  initialData = null 
}) {
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  // Template State (for Admin Mode)
  const [templateAspects, setTemplateAspects] = useState([]);
  const [sellerRoutes, setSellerRoutes] = useState({});
  const [tableHeaders, setTableHeaders] = useState([
    "Aspecto a Evaluar", 
    "Descripción del Indicador", 
    "Checklist", 
    "Porcentaje de Evaluación", 
    "Porcentaje Recibido", 
    "Grand Total"
  ]);

  // Form State (for Evaluation Mode)
  const [formData, setFormData] = useState({
    fecha: getLocalDateString(),
    vendedor: '',
    ruta: '',
    observaciones: '',
    aspectos: []
  });

  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const [showSandboxWarning, setShowSandboxWarning] = useState(false);

  const handleExportPDF = () => {
    if (isE2bSandbox) {
      setShowSandboxWarning(true);
      return;
    }
    window.print();
  };


  // Fetch Settings on Mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoadingSettings(true);
        const { data, error } = await supabase
          .from('vendor_evaluation_settings')
          .select('*')
          .single();

        if (error) {
            console.error("Error fetching settings:", error);
            // Fallback if table is empty or error (though we seeded it)
            return;
        }

        if (data) {
          setSettingsId(data.id);
          setTemplateAspects(data.aspects_template);
          setSellerRoutes(data.vendor_routes);
          if (data.table_headers) setTableHeaders(data.table_headers);

          // Initialize form data aspects if not in edit mode (or even if in edit mode, we might need structure)
          if (!initialData) {
            setFormData(prev => ({ ...prev, aspectos: JSON.parse(JSON.stringify(data.aspects_template)) }));
          }
        }
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [initialData]);

  // Handle Initial Data for Editing an Evaluation
  useEffect(() => {
    if (initialData && !loadingSettings && templateAspects.length > 0) {
      setEditMode(true);
      
      let loadedAspects = JSON.parse(JSON.stringify(templateAspects));
      
      if (initialData.aspectos) {
        loadedAspects = loadedAspects.map(newAsp => {
            const oldAsp = initialData.aspectos.find(a => 
                (a.id === newAsp.id) || 
                (a.description === newAsp.description) ||
                (a.indicador === newAsp.indicador)
            );
            return oldAsp ? { ...newAsp, checklist: oldAsp.checklist } : newAsp;
        });
      }

      setFormData({
        ...initialData,
        aspectos: loadedAspects
      });
    }
  }, [initialData, loadingSettings, templateAspects]);

  // Update Available Routes when Vendor Changes
  useEffect(() => {
    if (formData.vendedor && sellerRoutes[formData.vendedor]) {
      setAvailableRoutes(sellerRoutes[formData.vendedor]);
    } else {
      setAvailableRoutes([]);
    }
  }, [formData.vendedor, sellerRoutes]);

  // Handle Checkbox (Evaluation Mode)
  const handleCheckboxChange = (id, checked) => {
    setFormData(prev => ({
      ...prev,
      aspectos: prev.aspectos.map(asp => 
        asp.id === id ? { ...asp, checklist: checked } : asp
      )
    }));
  };

  // --------------------------------------------------------------------------
  // ADMIN MODE HANDLERS
  // --------------------------------------------------------------------------

  const handleAdminHeaderChange = (index, value) => {
    const newHeaders = [...tableHeaders];
    newHeaders[index] = value;
    setTableHeaders(newHeaders);
  };

  const handleAdminAspectChange = (index, field, value) => {
    const newAspects = [...templateAspects];
    newAspects[index] = { ...newAspects[index], [field]: value };
    // Auto-update ID if needed? No, ID should be stable or generic.
    // If weight changes, we might want to ensure numbers.
    if (field === 'weight') {
        newAspects[index][field] = parseFloat(value) || 0;
    }
    setTemplateAspects(newAspects);
  };

  const handleAddRow = () => {
    const newRow = {
      id: `new_${Date.now()}`,
      category: "NUEVA CATEGORÍA",
      description: "Nueva descripción",
      indicador: "Nuevo Indicador",
      weight: 0,
      checklist: false
    };
    setTemplateAspects([...templateAspects, newRow]);
  };

  const handleDeleteRow = (index) => {
    const newAspects = [...templateAspects];
    newAspects.splice(index, 1);
    setTemplateAspects(newAspects);
  };

  const saveAdminChanges = async () => {
    if (!settingsId) return;
    
    try {
      const { error } = await supabase
        .from('vendor_evaluation_settings')
        .update({
          aspects_template: templateAspects,
          vendor_routes: sellerRoutes,
          table_headers: tableHeaders,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingsId);

      if (error) throw error;
      
      alert("Cambios administrativos guardados correctamente.");
      // Also update the current form data structure to reflect changes immediately
      setFormData(prev => ({
        ...prev,
        aspectos: JSON.parse(JSON.stringify(templateAspects))
      }));
      setIsAdminMode(false);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Error al guardar los cambios.");
    }
  };

  const discardAdminChanges = async () => {
    setLoadingSettings(true);
    // Refetch
    const { data } = await supabase
      .from('vendor_evaluation_settings')
      .select('*')
      .single();
      
    if (data) {
      setTemplateAspects(data.aspects_template);
      setSellerRoutes(data.vendor_routes);
      if (data.table_headers) setTableHeaders(data.table_headers);
    }
    setLoadingSettings(false);
    setIsAdminMode(false);
  };

  // Vendor Management Handlers
  const handleAddVendor = (name) => {
    if (name && !sellerRoutes[name]) {
        setSellerRoutes({ ...sellerRoutes, [name]: [] });
    }
  };

  const handleDeleteVendor = (name) => {
    const newRoutes = { ...sellerRoutes };
    delete newRoutes[name];
    setSellerRoutes(newRoutes);
  };

  const handleAddRoute = (vendor, route) => {
    if (vendor && route) {
        setSellerRoutes({
            ...sellerRoutes,
            [vendor]: [...(sellerRoutes[vendor] || []), route]
        });
    }
  };

  const handleDeleteRoute = (vendor, routeIndex) => {
    const newRoutes = [...sellerRoutes[vendor]];
    newRoutes.splice(routeIndex, 1);
    setSellerRoutes({ ...sellerRoutes, [vendor]: newRoutes });
  };


  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  // Grouping Logic
  // Use templateAspects in Admin Mode, formData.aspectos in Evaluation Mode
  const activeAspects = isAdminMode ? templateAspects : formData.aspectos;

  const groupedAspects = activeAspects.reduce((acc, asp) => {
    if (!acc[asp.category]) {
      acc[asp.category] = { items: [], totalWeight: 0, receivedScore: 0 };
    }
    acc[asp.category].items.push(asp);
    acc[asp.category].totalWeight += (parseFloat(asp.weight) || 0);
    if (asp.checklist) {
      acc[asp.category].receivedScore += (parseFloat(asp.weight) || 0);
    }
    return acc;
  }, {});

  const categories = Object.keys(groupedAspects);
  const totalScore = categories.reduce((sum, cat) => sum + groupedAspects[cat].receivedScore, 0);

  const averageScore = Math.round(totalScore);
  const needsImprovement = averageScore < 80;
  const aspectsToImprove = activeAspects.filter(asp => !asp.checklist);
  
  const chartData = categories.map(cat => ({
    name: cat,
    "Puntaje Obtenido": Number(groupedAspects[cat].receivedScore.toFixed(2)),
    "Puntaje Máximo": Number(groupedAspects[cat].totalWeight.toFixed(2))
  }));


  const handleSubmit = () => {
    if (!formData.vendedor || !formData.fecha || !formData.ruta) {
      alert('Por favor complete la fecha, el vendedor y la ruta.');
      return;
    }
    
    const enrichedAspects = formData.aspectos.map(asp => ({
        ...asp,
        aspecto: asp.category,
        porcentaje: asp.weight,
        porcentajeRecibido: asp.checklist ? asp.weight : 0
    }));

    onSave({ 
      ...formData,
      aspectos: enrichedAspects,
      total: totalScore,
    });
  };

  const headerBg = "bg-blue-100";
  const borderColor = "border-black";

  if (loadingSettings) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div className="bg-white p-4 max-w-[1400px] mx-auto border border-black shadow-xl font-sans text-xs relative">
      
      {/* Admin Mode Toggle */}
      <div className="absolute top-4 right-4 print:hidden">
         {!isAdminMode ? (
             <Button variant="ghost" size="sm" onClick={() => setIsAdminMode(true)} className="text-gray-500 hover:text-black">
                 <Settings className="w-4 h-4 mr-2" /> Modo Administrador
             </Button>
         ) : (
             <div className="flex gap-2">
                 <Button variant="destructive" size="sm" onClick={discardAdminChanges}>
                     <X className="w-4 h-4 mr-2" /> Descartar Cambios
                 </Button>
                 <Button variant="default" size="sm" onClick={saveAdminChanges} className="bg-green-600 hover:bg-green-700">
                     <Save className="w-4 h-4 mr-2" /> Guardar Cambios Administrativos
                 </Button>
             </div>
         )}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center mb-4">EVALUACIÓN DE DESEMPEÑO DE VENDEDORES RUTERO</h1>
      </div>

      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
        <div>
           <label className="block font-bold mb-1">Fecha Evaluación:</label>
           <Input 
              type="date" 
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              className="w-full border-black rounded-none h-8 text-xs"
              disabled={isAdminMode}
            />
        </div>
        <div>
            <label className="block font-bold mb-1">Vendedor:</label>
            <Select 
              value={formData.vendedor} 
              onValueChange={(val) => setFormData({...formData, vendedor: val, ruta: ''})}
              disabled={isAdminMode}
            >
              <SelectTrigger className="w-full border-black rounded-none h-8 text-xs">
                <SelectValue placeholder="Seleccionar Vendedor" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(sellerRoutes).sort().map((v, i) => (
                  <SelectItem key={i} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
        <div>
            <label className="block font-bold mb-1">Ruta:</label>
            <Select 
              value={formData.ruta} 
              onValueChange={(val) => setFormData({...formData, ruta: val})}
              disabled={!formData.vendedor || isAdminMode}
            >
              <SelectTrigger className="w-full border-black rounded-none h-8 text-xs">
                <SelectValue placeholder="Seleccionar Ruta" />
              </SelectTrigger>
              <SelectContent>
                {availableRoutes.map((r, i) => (
                  <SelectItem key={i} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      {/* Admin: Vendor Management */}
      {isAdminMode && (
          <div className="mb-8 p-4 border-2 border-dashed border-gray-400 bg-gray-50">
              <h3 className="font-bold text-lg mb-4">Gestión de Vendedores y Rutas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                      <h4 className="font-bold mb-2">Vendedores</h4>
                      <div className="flex gap-2 mb-2">
                          <Input id="new-vendor" placeholder="Nuevo Vendedor" className="h-8" />
                          <Button size="sm" onClick={() => {
                              const el = document.getElementById('new-vendor');
                              handleAddVendor(el.value);
                              el.value = '';
                          }}><Plus className="w-4 h-4" /></Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto border border-gray-300 p-2">
                          {Object.keys(sellerRoutes).sort().map(vendor => (
                              <div key={vendor} className="flex justify-between items-center py-1 border-b last:border-0">
                                  <span>{vendor}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteVendor(vendor)}>
                                      <Trash2 className="w-3 h-3" />
                                  </Button>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h4 className="font-bold mb-2">Rutas para: {formData.vendedor || "(Seleccione un vendedor arriba)"}</h4>
                      {formData.vendedor ? (
                          <>
                            <div className="flex gap-2 mb-2">
                                <Input id="new-route" placeholder="Nueva Ruta" className="h-8" />
                                <Button size="sm" onClick={() => {
                                    const el = document.getElementById('new-route');
                                    handleAddRoute(formData.vendedor, el.value);
                                    el.value = '';
                                }}><Plus className="w-4 h-4" /></Button>
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-gray-300 p-2">
                                {sellerRoutes[formData.vendedor]?.map((route, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-1 border-b last:border-0">
                                        <span>{route}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteRoute(formData.vendedor, idx)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                          </>
                      ) : (
                          <p className="text-gray-500 italic">Seleccione un vendedor en el desplegable principal para editar sus rutas.</p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Main Table */}
      <div className="mb-6 overflow-x-auto">
        <table className={`w-full border-collapse border ${borderColor} text-xs`}>
          <thead>
            <tr className={`${headerBg} text-center font-bold`}>
              {tableHeaders.map((header, idx) => (
                  <th key={idx} className={`border ${borderColor} p-1 ${idx === 2 ? 'w-12' : idx >= 3 ? 'w-16' : ''}`}>
                      {isAdminMode ? (
                          <Input 
                            value={header} 
                            onChange={(e) => handleAdminHeaderChange(idx, e.target.value)} 
                            className="h-6 text-xs text-center font-bold bg-transparent border-none p-0 focus:ring-0" 
                          />
                      ) : header}
                  </th>
              ))}
              {isAdminMode && <th className={`border ${borderColor} p-1 w-8`}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {categories.map((category, catIdx) => {
              const { items, receivedScore } = groupedAspects[category];
              return items.map((item, itemIdx) => {
                // Find global index for editing
                const globalIndex = activeAspects.findIndex(a => a === item);
                
                return (
                <tr key={item.id || globalIndex} className="hover:bg-gray-50">
                  
                  {/* Category Column (1) */}
                  {itemIdx === 0 && (
                    <td className={`border ${borderColor} p-2 font-bold align-middle bg-gray-50`} rowSpan={items.length}>
                      {isAdminMode ? (
                          <Input 
                             value={item.category} 
                             onChange={(e) => handleAdminAspectChange(globalIndex, 'category', e.target.value)}
                             className="h-full w-full text-xs font-bold bg-transparent border-gray-300"
                          />
                      ) : category}
                    </td>
                  )}

                  {/* Indicator & Description (2) */}
                  <td className={`border ${borderColor} p-2`}>
                    {isAdminMode ? (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-blue-900 w-16">Indicador:</span>
                                <Input 
                                    value={item.indicador} 
                                    onChange={(e) => handleAdminAspectChange(globalIndex, 'indicador', e.target.value)}
                                    className="h-6 text-xs flex-1"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 w-16">Desc:</span>
                                <Input 
                                    value={item.description} 
                                    onChange={(e) => handleAdminAspectChange(globalIndex, 'description', e.target.value)}
                                    className="h-6 text-xs flex-1"
                                />
                            </div>
                        </div>
                    ) : (
                        <><span className="font-semibold text-blue-900">{item.indicador}:</span> {item.description}</>
                    )}
                  </td>

                  {/* Checklist (3) */}
                  <td className={`border ${borderColor} p-1 text-center align-middle`}>
                    {!isAdminMode && (
                        <Checkbox 
                        checked={item.checklist} 
                        onCheckedChange={(checked) => handleCheckboxChange(item.id, checked)}
                        className="h-5 w-5 border-black data-[state=checked]:bg-blue-600 mx-auto"
                        />
                    )}
                    {isAdminMode && <span className="text-gray-400">-</span>}
                  </td>

                  {/* Porcentaje de Evaluación (Item Weight) (4) */}
                  <td className={`border ${borderColor} p-1 text-center align-middle`}>
                    {isAdminMode ? (
                        <Input 
                            type="number"
                            value={item.weight}
                            onChange={(e) => handleAdminAspectChange(globalIndex, 'weight', e.target.value)}
                            className="h-6 text-xs text-center w-full"
                        />
                    ) : `${item.weight}%`}
                  </td>

                  {/* Porcentaje Recibido (Category Total) (5) */}
                  {itemIdx === 0 && (
                     <td className={`border ${borderColor} p-1 text-center font-bold align-middle bg-gray-50`} rowSpan={items.length}>
                       {Math.round(receivedScore)}%
                     </td>
                  )}

                  {/* Grand Total (6) */}
                  {catIdx === 0 && itemIdx === 0 && (
                    <td className={`border ${borderColor} p-2 text-center align-middle font-bold text-lg bg-blue-50`} rowSpan={activeAspects.length}>
                      {Math.round(totalScore)}%
                    </td>
                  )}

                  {/* Admin Actions */}
                  {isAdminMode && (
                      <td className={`border ${borderColor} p-1 text-center align-middle`}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteRow(globalIndex)}>
                              <Trash2 className="w-3 h-3" />
                          </Button>
                      </td>
                  )}
                </tr>
              )});
            })}
          </tbody>
        </table>
        {isAdminMode && (
            <div className="mt-2">
                <Button variant="outline" size="sm" onClick={handleAddRow} className="w-full border-dashed border-gray-400 text-gray-500 hover:text-black hover:border-black">
                    <Plus className="w-4 h-4 mr-2" /> Agregar Nueva Fila
                </Button>
            </div>
        )}
      </div>

      
      {/* Resultados de Evaluación */}
      {!isAdminMode && (
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
        <div className="border border-black p-4">
          <h3 className="font-bold text-lg border-b border-black pb-2 mb-4 uppercase">Resultado de Evaluación</h3>
          <div className="mb-4">
            <span className="font-bold text-gray-700">Promedio General: </span>
            <span className={`text-xl font-bold ${averageScore >= 80 ? 'text-green-600' : 'text-red-600'}`}>
              {averageScore}%
            </span>
          </div>
          
          <div className="mb-4">
            <span className="font-bold text-gray-700">Estado: </span>
            <span className={`font-bold ${needsImprovement ? 'text-red-600' : 'text-green-600'}`}>
              {needsImprovement ? 'Requiere Mejoras' : 'Desempeño Aceptable/Sobresaliente'}
            </span>
          </div>

          {aspectsToImprove.length > 0 && (
            <div>
              <span className="font-bold text-red-600 flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" /> Aspectos a Mejorar:
              </span>
              <ul className="list-disc pl-5 text-xs text-gray-700 space-y-1">
                {aspectsToImprove.map((asp, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">{asp.category}:</span> {asp.indicador} - {asp.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aspectsToImprove.length === 0 && (
             <p className="text-green-600 text-sm font-semibold mt-4">¡Excelente! Se cumplieron todos los aspectos evaluados.</p>
          )}
        </div>

        <div className="border border-black p-4 h-64">
          <h3 className="font-bold text-lg border-b border-black pb-2 mb-4 uppercase">Análisis Gráfico</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" />
              <YAxis tick={{fontSize: 10}} />
              <RechartsTooltip />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="Puntaje Obtenido" fill="#3b82f6" name="Obtenido" />
              <Bar dataKey="Puntaje Máximo" fill="#9ca3af" name="Máximo" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* Observations */}
      <div className="mb-6">
        <label className="block font-bold mb-1 border-b border-black pb-1">Observaciones / Hallazgos</label>
        <Textarea 
          value={formData.observaciones}
          onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
          className={`w-full h-24 border ${borderColor} rounded-none resize-none p-2 text-sm`}
          placeholder="..."
          disabled={isAdminMode}
        />
      </div>

      {/* Rating Table - Static for now, could be dynamic if needed */}
      <div className="mb-6">
        <h3 className="font-bold mb-2 uppercase text-center border-b border-black">Niveles de Evaluación del Vendedor</h3>
        <table className={`w-full text-xs border-collapse border ${borderColor}`}>
          <thead>
            <tr className={`${headerBg}`}>
              <th className={`border ${borderColor} px-2 py-1 text-center w-32`}>Rango %</th>
              <th className={`border ${borderColor} px-2 py-1 text-center w-1/3`}>Calificacion</th>
              <th className={`border ${borderColor} px-2 py-1 text-center`}>Perfil del Vendedor</th>
            </tr>
          </thead>
          <tbody>
            <tr className={Math.round(totalScore) >= 95 ? "bg-green-200" : ""}>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>95% - 100%</td>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>Excelente / Top Performer</td>
              <td className={`border ${borderColor} px-2 py-1 text-center`}>Supera expectativas, modelo a seguir.</td>
            </tr>
            <tr className={Math.round(totalScore) >= 80 && Math.round(totalScore) <= 94 ? "bg-blue-200" : ""}>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>80% - 94%</td>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>Bueno / Competente</td>
              <td className={`border ${borderColor} px-2 py-1 text-center`}>Cumple con los estándares requeridos.</td>
            </tr>
            <tr className={Math.round(totalScore) >= 60 && Math.round(totalScore) <= 79 ? "bg-yellow-200" : ""}>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>60% - 79%</td>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>Regular / En Observación</td>
              <td className={`border ${borderColor} px-2 py-1 text-center`}>Necesita mejorar en áreas específicas.</td>
            </tr>
            <tr className={Math.round(totalScore) < 60 ? "bg-red-200" : ""}>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>Menos del 60%</td>
              <td className={`border ${borderColor} px-2 py-1 font-bold text-center`}>Mediocre / Deficiente</td>
              <td className={`border ${borderColor} px-2 py-1 text-center`}>No cumple con los requisitos mínimos.</td>
            </tr>
          </tbody>
        </table>
      </div>

      
      <div className="flex justify-end gap-4 print:hidden">
        <Button variant="outline" onClick={handleExportPDF} className="border-black rounded-none">
          <Printer className="w-4 h-4 mr-2" /> Exportar a PDF
        </Button>
        <Button variant="outline" onClick={onCancel} className="border-black rounded-none">
          <X className="w-4 h-4 mr-2" /> Cancelar
        </Button>
        <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 border-black rounded-none" disabled={isAdminMode}>
          <Save className="w-4 h-4 mr-2" /> {editMode ? 'Actualizar Evaluación' : 'Guardar Evaluación'}
        </Button>
      </div>

      <Dialog open={showSandboxWarning} onOpenChange={setShowSandboxWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Funcionalidad no disponible</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
            Estás en un entorno de desarrollo. Esta funcionalidad de exportación a PDF (impresión) requiere que publiques la aplicación a producción para funcionar correctamente.
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSandboxWarning(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
