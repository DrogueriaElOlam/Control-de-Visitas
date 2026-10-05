import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, History, Search, Target, Download, Calendar, Filter, Users, TrendingUp, TrendingDown, CheckCircle, Lock, LogOut, Plus, Trash2, Edit2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';


import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';
import { verifyPassword } from '../lib/security';

const DEFAULT_VENDEDORES = [
  'Ana Lucia Marroquin',
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
].sort();

const DEFAULT_EQUIPOS = [
  { id: 1, name: 'Equipo 1', meta: 61842, members: ['Elias Quiej', 'Elba Guerra', 'Elio Caceros'] },
  { id: 2, name: 'Equipo 2', meta: 56579, members: ['Karina Pineda', 'Danny Perez', 'Katherine Cardona'] },
  { id: 3, name: 'Equipo 3', meta: 59211, members: ['Ana Lucia Marroquin', 'Klissman Hernandez', 'Patty Mendez'] },
  { id: 4, name: 'Equipo 4', meta: 59211, members: ['Damaris Cartagena', 'Erick Curley', 'Estuardo Cordova', 'Josue Aguilar'] },
  { id: 5, name: 'Equipo 5', meta: 59211, members: ['Wally Natareno', 'Yosmin Perez', 'Jessica Noriega'] }
];

const DEFAULT_PUNTOS = [
  { id: 'puntoInicio', timeId: 'horaInicio', label: 'Inicio' },
  { id: 'puntoMedio', timeId: 'horaMedio', label: 'Medio Día' },
  { id: 'puntoFin', timeId: 'horaFin', label: 'Fin' }
];

const INITIAL_RECORD = {
  puntoInicio: false,
  horaInicio: '',
  puntoMedio: false,
  horaMedio: '',
  puntoFin: false,
  horaFin: '',
  reporteDiario: false,
  publicacion: false,
  devoluciones: '',
  ventas: '',
  cobros: '',
  observaciones: ''
};

export default function DailySupervisionForm() {
  const [currentDate, setCurrentDate] = useState(() => getLocalDateString());
  const [records, setRecords] = useState({});
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('ingreso');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterVendor, setFilterVendor] = useState('');

  const [vendedores, setVendedores] = useState([]);
  const [newVendorName, setNewVendorName] = useState('');
  const [equipos, setEquipos] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [newPuntoLabel, setNewPuntoLabel] = useState('');
  const [activeSettingsTab, setActiveSettingsTab] = useState('vendedores');
  const [showControlPanel, setShowControlPanel] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('formAuth_0lam');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (verifyPassword(passwordInput, null, 'admin')) {
      setIsAuthenticated(true);
      localStorage.setItem('formAuth_0lam', 'true');
      setError('');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('formAuth_0lam');
    setPasswordInput('');
  };

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedVendedores = localStorage.getItem('supervisionVendedores');
    let loadedVendedores = DEFAULT_VENDEDORES;
    if (savedVendedores) {
      try { loadedVendedores = JSON.parse(savedVendedores); } catch (e) {}
    }
    setVendedores(loadedVendedores);

    const savedEquipos = localStorage.getItem('supervisionEquipos');
    let loadedEquipos = DEFAULT_EQUIPOS;
    if (savedEquipos) {
      try { loadedEquipos = JSON.parse(savedEquipos); } catch (e) {}
    }
    setEquipos(loadedEquipos);

    const savedPuntos = localStorage.getItem('supervisionPuntos');
    let loadedPuntos = DEFAULT_PUNTOS;
    if (savedPuntos) {
      try { loadedPuntos = JSON.parse(savedPuntos); } catch (e) {}
    }
    setPuntos(loadedPuntos);

    const savedHistory = localStorage.getItem('dailySupervisionHistory');
    let loadedHistory = [];
    if (savedHistory) {
      try {
        loadedHistory = JSON.parse(savedHistory);
        setHistory(loadedHistory);
      } catch (e) {
        console.error('Error loading history', e);
      }
    }

    const fetchSupabaseHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('daily_supervision_history')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data) {
          const supabaseHistory = data.map(d => d.datos);
          setHistory(supabaseHistory);
          localStorage.setItem('dailySupervisionHistory', JSON.stringify(supabaseHistory));
          
          // Refresh current date record if needed
          const todayStr = getLocalDateString();
          const existingEntry = supabaseHistory.find(h => h.date === todayStr);
          if (existingEntry) {
            const mergedRecords = { ...existingEntry.records };
            loadedVendedores.forEach(v => {
              if (!mergedRecords[v]) mergedRecords[v] = { ...INITIAL_RECORD };
            });
            setRecords(mergedRecords);
          }
        }
      } catch (err) {
        console.error('Error fetching from Supabase:', err);
      }
    };
    fetchSupabaseHistory();

    const todayStr = getLocalDateString();
    const existingEntry = loadedHistory.find(h => h.date === todayStr);

    if (existingEntry) {
      setRecords(existingEntry.records);
    } else {
      const savedDraft = localStorage.getItem('dailySupervisionDraft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Ensure all loaded vendors have an initial record if missing
          loadedVendedores.forEach(v => {
            if (!parsed[v]) parsed[v] = { ...INITIAL_RECORD };
          });
          setRecords(parsed);
        } catch (e) {
          console.error('Error loading draft', e);
        }
      } else {
        const init = {};
        loadedVendedores.forEach(v => init[v] = { ...INITIAL_RECORD });
        setRecords(init);
      }
    }
  }, []);

  // Save draft to LocalStorage
  useEffect(() => {
    if (records && Object.keys(records).length > 0) {
      localStorage.setItem('dailySupervisionDraft', JSON.stringify(records));
    }
  }, [records]);

  // Save vendedores
  useEffect(() => {
    if (vendedores.length > 0) {
      localStorage.setItem('supervisionVendedores', JSON.stringify(vendedores));
    }
  }, [vendedores]);

  useEffect(() => {
    if (equipos.length > 0) {
      localStorage.setItem('supervisionEquipos', JSON.stringify(equipos));
    }
  }, [equipos]);

  useEffect(() => {
    if (puntos.length > 0) {
      localStorage.setItem('supervisionPuntos', JSON.stringify(puntos));
    }
  }, [puntos]);

  const handleMetaChange = (equipoId, newMeta) => {
    const updated = equipos.map(eq => 
      eq.id === equipoId ? { ...eq, meta: parseFloat(newMeta) || 0 } : eq
    );
    setEquipos(updated);
  };

  const handleAddPunto = () => {
    if (newPuntoLabel.trim()) {
      const newId = `punto_${Date.now()}`;
      setPuntos([...puntos, { id: newId, timeId: `hora_${newId}`, label: newPuntoLabel.trim() }]);
      setNewPuntoLabel('');
    }
  };

  const handleRemovePunto = (id) => {
    if (window.confirm('¿Está seguro de eliminar este punto de encuentro?')) {
      setPuntos(puntos.filter(p => p.id !== id));
    }
  };

  const handleEditPuntoLabel = (id, newLabel) => {
    setPuntos(puntos.map(p => p.id === id ? { ...p, label: newLabel } : p));
  };

  const handleAddVendor = () => {
    if (newVendorName.trim() && !vendedores.includes(newVendorName.trim())) {
      const updated = [...vendedores, newVendorName.trim()].sort();
      setVendedores(updated);
      setRecords(prev => ({ ...prev, [newVendorName.trim()]: { ...INITIAL_RECORD } }));
      setNewVendorName('');
    }
  };

  const handleRemoveVendor = (vendorToRemove) => {
    if (window.confirm(`¿Está seguro de eliminar al vendedor ${vendorToRemove}?`)) {
      const updated = vendedores.filter(v => v !== vendorToRemove);
      setVendedores(updated);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setCurrentDate(newDate);
    const existingEntry = history.find(h => h.date === newDate);
    if (existingEntry) {
      // Merge with current vendors list in case new ones were added
      const mergedRecords = { ...existingEntry.records };
      vendedores.forEach(v => {
        if (!mergedRecords[v]) mergedRecords[v] = { ...INITIAL_RECORD };
      });
      setRecords(mergedRecords);
    } else {
      const init = {};
      vendedores.forEach(v => init[v] = { ...INITIAL_RECORD });
      setRecords(init);
    }
  };

  const handleRecordChange = (vendedor, field, value) => {
    setRecords(prev => ({
      ...prev,
      [vendedor]: {
        ...(prev[vendedor] || INITIAL_RECORD),
        [field]: value
      }
    }));
  };

  const isUpdating = history.some(h => h.date === currentDate);

  const handleSaveToHistory = async () => {
    const existingRecordIndex = history.findIndex(h => h.date === currentDate);
    let newHistory;
    
    // Only save records for currently active vendors
    const recordsToSave = {};
    vendedores.forEach(v => {
      recordsToSave[v] = records[v] || { ...INITIAL_RECORD };
    });

    try {
      let entryToSave;
      if (existingRecordIndex !== -1) {
        entryToSave = {
          ...history[existingRecordIndex],
          timestamp: new Date().toISOString(),
          records: recordsToSave,
          puntos: puntos
        };
        newHistory = [...history];
        newHistory[existingRecordIndex] = entryToSave;
        
        // Save to Supabase (upsert if exists)
        await supabase
          .from('daily_supervision_history')
          .upsert({
            id: entryToSave.id,
            date: entryToSave.date,
            datos: entryToSave
          });
          
        alert('Información actualizada en el historial exitosamente.');
      } else {
        entryToSave = {
          id: Date.now().toString(),
          date: currentDate,
          timestamp: new Date().toISOString(),
          records: recordsToSave,
          puntos: puntos
        };
        newHistory = [entryToSave, ...history];
        
        // Save to Supabase (insert new)
        await supabase
          .from('daily_supervision_history')
          .insert({
            id: entryToSave.id,
            date: entryToSave.date,
            datos: entryToSave
          });

        alert('Información guardada en el historial exitosamente.');
      }
      
      setHistory(newHistory);
      localStorage.setItem('dailySupervisionHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error al guardar en Supabase:', error);
      alert('Error al sincronizar con la base de datos. Se guardó localmente.');
      // Fallback a solo local si falla supabase
      if (!newHistory) {
        if (existingRecordIndex !== -1) {
          const updatedEntry = {
            ...history[existingRecordIndex],
            timestamp: new Date().toISOString(),
            records: recordsToSave,
            puntos: puntos
          };
          newHistory = [...history];
          newHistory[existingRecordIndex] = updatedEntry;
        } else {
          const newEntry = {
            id: Date.now().toString(),
            date: currentDate,
            timestamp: new Date().toISOString(),
            records: recordsToSave,
            puntos: puntos
          };
          newHistory = [newEntry, ...history];
        }
      }
      setHistory(newHistory);
      localStorage.setItem('dailySupervisionHistory', JSON.stringify(newHistory));
    }
  };

  const handleExportExcel = (dataToExport, fileName) => {
    const rows = [];
    const exportPuntos = dataToExport.puntos || DEFAULT_PUNTOS;
    
    Object.entries(dataToExport.records || {}).forEach(([vendedor, data]) => {
      const row = {
        'Fecha': dataToExport.date,
        'Vendedor': vendedor,
      };
      
      exportPuntos.forEach(p => {
        row[`Punto ${p.label}`] = data[p.id] ? 'Sí' : 'No';
        row[`Hora ${p.label}`] = data[p.timeId] || '-';
      });
      
      row['Reporte Diario'] = data.reporteDiario ? 'Sí' : 'No';
      row['Hora Rep. Diario'] = data.horaReporteDiario || '-';
      row['Publicación Estados/Ofertas'] = data.publicacion ? 'Sí' : 'No';
      row['Devoluciones'] = data.devoluciones || '-';
      row['Ventas/Pedidos (Q)'] = parseFloat(data.ventas) || 0;
      row['Boletas/Cobros (Q)'] = parseFloat(data.cobros) || 0;
      row['Observaciones'] = data.observaciones;
      
      rows.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Supervisión');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

    const handleExportFilteredExcel = () => {
    if (filteredHistory.length === 0) {
      alert('No hay datos para exportar con los filtros actuales.');
      return;
    }

    // Sheet 1: Datos del formulario
    const rowsFormulario = [];
    filteredHistory.forEach(entry => {
      const exportPuntos = entry.puntos || DEFAULT_PUNTOS;
      Object.entries(entry.records || {}).forEach(([vendedor, data]) => {
        if (filterVendor && !vendedor.toLowerCase().includes(filterVendor.toLowerCase())) return;
        
        const row = {
          'Fecha': entry.date,
          'Vendedor': vendedor,
        };
        
        exportPuntos.forEach(p => {
          row[`Punto ${p.label}`] = data[p.id] ? 'Sí' : 'No';
          row[`Hora ${p.label}`] = data[p.timeId] || '-';
        });
        
        row['Reporte Diario'] = data.reporteDiario ? 'Sí' : 'No';
        row['Hora Rep. Diario'] = data.horaReporteDiario || '-';
        row['Publicación Estados/Ofertas'] = data.publicacion ? 'Sí' : 'No';
        row['Devoluciones'] = data.devoluciones || '-';
        row['Ventas (Q)'] = parseFloat(data.ventas) || 0;
        row['Cobros (Q)'] = parseFloat(data.cobros) || 0;
        row['Observaciones'] = data.observaciones;
        
        rowsFormulario.push(row);
      });
    });

    // Sheet 2: Dashboard Equipos
    const rowsDashboard = [];
    equipos.forEach(equipo => {
      let teamVentas = 0;
      let teamCobros = 0;
      
      filteredHistory.forEach(entry => {
        equipo.members.forEach(member => {
          const rec = (entry.records || {})[member];
          if (rec) {
            teamVentas += parseFloat(rec.ventas) || 0;
            teamCobros += parseFloat(rec.cobros) || 0;
          }
        });
      });
      
      const percentage = Math.min((teamVentas / equipo.meta) * 100, 100).toFixed(1);
      
      rowsDashboard.push({
        'Equipo': equipo.name,
        'Meta (Q)': equipo.meta,
        'Total Ventas (Q)': teamVentas,
        'Total Cobros (Q)': teamCobros,
        'Cumplimiento Meta (%)': percentage + '%',
        'Integrantes': equipo.members.join(', ')
      });
    });

    const worksheetFormulario = XLSX.utils.json_to_sheet(rowsFormulario);
    const worksheetDashboard = XLSX.utils.json_to_sheet(rowsDashboard);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheetFormulario, 'Datos Formulario');
    XLSX.utils.book_append_sheet(workbook, worksheetDashboard, 'Dashboard Equipos');
    
    const fileName = `Supervision_Filtrada_${filterStartDate || 'Inicio'}_a_${filterEndDate || 'Fin'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleDeleteRecord = async (entryId) => {
    if (!window.confirm('¿Está seguro de eliminar este registro del historial? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Eliminar de Supabase
      const { error } = await supabase
        .from('daily_supervision_history')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error al eliminar de Supabase:', error);
        alert('Hubo un error al eliminar el registro en la base de datos.');
        // If supabase fails, we might want to still let them delete locally, but usually it's better to fail or let them know.
      } else {
        console.log('Registro eliminado de Supabase exitosamente.');
      }

      // Eliminar de localStorage y estado local
      const newHistory = history.filter(h => h.id !== entryId);
      setHistory(newHistory);
      localStorage.setItem('dailySupervisionHistory', JSON.stringify(newHistory));
      
      // Si el registro eliminado es el del día actual, limpiamos el formulario
      const deletedEntry = history.find(h => h.id === entryId);
      if (deletedEntry && deletedEntry.date === currentDate) {
        const init = {};
        vendedores.forEach(v => init[v] = { ...INITIAL_RECORD });
        setRecords(init);
        localStorage.removeItem('dailySupervisionDraft');
      }

      alert('Registro eliminado exitosamente.');
    } catch (err) {
      console.error('Error durante la eliminación:', err);
      alert('Error al eliminar el registro.');
    }
  };

  const filteredHistory = history.filter(h => {
    if (filterStartDate && h.date < filterStartDate) return false;
    if (filterEndDate && h.date > filterEndDate) return false;
    return true;
  });

  // Calculate chart data based on filtered history
  const chartData = filteredHistory.map(entry => {
    let totalVentas = 0;
    let totalCobros = 0;
    Object.values(entry.records || {}).forEach(data => {
      totalVentas += parseFloat(data.ventas) || 0;
      totalCobros += parseFloat(data.cobros) || 0;
    });
    return {
      fecha: entry.date,
      Ventas: totalVentas,
      Cobros: totalCobros
    };
  }).reverse(); // chronological order usually left to right


  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-blue-100">
          <CardHeader className="bg-blue-50 border-b border-blue-100 text-center rounded-t-xl">
            <div className="mx-auto bg-blue-600 w-12 h-12 flex items-center justify-center rounded-full mb-4 shadow-md">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-blue-900">Acceso Restringido</CardTitle>
            <CardDescription className="text-blue-700/70">
              Ingrese la contraseña para acceder a este formulario
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-center text-lg"
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all">
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-[95%] xl:max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Supervisión Diaria - Droguería El Olam
          </h2>
          <p className="text-gray-500 mt-1">Control diario de ventas, cobros y metas por equipo</p>
        </div>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={currentDate}
            onChange={handleDateChange}
            className="w-40"
          />
          <Button variant="outline" onClick={handleLogout} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
          <Button onClick={handleSaveToHistory} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isUpdating ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="ingreso" className="rounded-lg">Ingreso de Datos</TabsTrigger>
          <TabsTrigger value="dashboard" className="rounded-lg">Dashboard de Equipos</TabsTrigger>
          <TabsTrigger value="historial" className="rounded-lg">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="ingreso" className="mt-6 space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex justify-end mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowControlPanel(!showControlPanel)}
                className="flex items-center gap-2 text-gray-600 bg-white"
              >
                <Settings className="w-4 h-4" />
                Panel de Control de Vendedores
              </Button>
            </div>
            
            <AnimatePresence>
              {showControlPanel && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <Card className="border border-blue-100 bg-blue-50/30">
                    <CardHeader className="py-4 pb-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        Panel de Configuración
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4">
                      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-white/50 border mb-4">
                          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
                          <TabsTrigger value="puntos">Puntos de Encuentro</TabsTrigger>
                          <TabsTrigger value="metas">Metas de Equipos</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="vendedores" className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Input 
                              placeholder="Nombre del nuevo vendedor..." 
                              value={newVendorName} 
                              onChange={(e) => setNewVendorName(e.target.value)}
                              className="max-w-xs bg-white"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddVendor() }}
                            />
                            <Button onClick={handleAddVendor} className="bg-blue-600">
                              <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {vendedores.map((v, i) => (
                              <div key={`v-${v}-${i}`} className="bg-white border shadow-sm rounded-full px-3 py-1 text-sm flex items-center gap-2">
                                <span>{v}</span>
                                <button onClick={() => handleRemoveVendor(v)} className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="puntos" className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Input 
                              placeholder="Nuevo punto de encuentro..." 
                              value={newPuntoLabel} 
                              onChange={(e) => setNewPuntoLabel(e.target.value)}
                              className="max-w-xs bg-white"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPunto() }}
                            />
                            <Button onClick={handleAddPunto} className="bg-blue-600">
                              <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {puntos.map((p, i) => (
                              <div key={`p1-${p.id}-${i}`} className="bg-white border shadow-sm rounded-lg px-3 py-2 flex items-center gap-2">
                                <Input 
                                  value={p.label}
                                  onChange={(e) => handleEditPuntoLabel(p.id, e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <button onClick={() => handleRemovePunto(p.id)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="metas" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {equipos.map((eq, i) => (
                              <div key={`eq1-${eq.id}-${i}`} className="bg-white border shadow-sm rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-700">{eq.name}</span>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{eq.members.length} integrantes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Q</span>
                                  <Input 
                                    type="number"
                                    value={eq.meta}
                                    onChange={(e) => handleMetaChange(eq.id, e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[1300px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-y">
                      <tr>
                        <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 w-48 shadow-[1px_0_0_0_#eee]">Vendedor</th>
                        {puntos.map((p, i) => (
                          <th key={`th1-${p.id}-${i}`} className="px-2 py-3 text-center">{p.label}</th>
                        ))}
                        <th className="px-2 py-3 text-center">Reporte Diario</th>
                        <th className="px-2 py-3 text-center">Publicación de Estados/Ofertas</th>
                        <th className="px-2 py-3 text-center">Devoluciones</th>
                        <th className="px-4 py-3 text-right">Ventas (Q)</th>
                        <th className="px-4 py-3 text-right">Cobros (Q)</th>
                        <th className="px-4 py-3">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vendedores.map((vendedor, i) => {
                        const rec = records[vendedor] || INITIAL_RECORD;
                        return (
                          <tr key={`tr1-${vendedor}-${i}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-700 sticky left-0 bg-white/95 backdrop-blur z-10 shadow-[1px_0_0_0_#eee]">
                              {vendedor}
                            </td>
                            {puntos.map((p, pIndex) => (
                              <td key={`td1-${vendedor}-${p.id}-${pIndex}`} className="px-2 py-3">
                                <div className="flex flex-col items-center gap-1">
                                  <Checkbox 
                                    checked={!!rec[p.id]} 
                                    onCheckedChange={(c) => handleRecordChange(vendedor, p.id, c)} 
                                  />
                                  <Input 
                                    type="time" 
                                    className="w-24 text-xs h-8 px-2" 
                                    value={rec[p.timeId] || ''}
                                    onChange={(e) => handleRecordChange(vendedor, p.timeId, e.target.value)}
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="px-2 py-3">
                              <div className="flex flex-col items-center gap-1">
                                <Checkbox 
                                  checked={rec.reporteDiario} 
                                  onCheckedChange={(c) => handleRecordChange(vendedor, 'reporteDiario', c)} 
                                />
                                <Input 
                                  type="time" 
                                  className="w-24 text-xs h-8 px-2" 
                                  value={rec.horaReporteDiario || ''}
                                  onChange={(e) => handleRecordChange(vendedor, 'horaReporteDiario', e.target.value)}
                                />
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center align-top pt-5">
                              <Checkbox 
                                checked={rec.publicacion} 
                                onCheckedChange={(c) => handleRecordChange(vendedor, 'publicacion', c)} 
                              />
                            </td>
                            <td className="px-2 py-3 align-top pt-3">
                              <Input 
                                type="text" 
                                className="w-24 h-8 text-sm" 
                                placeholder="Cant."
                                value={rec.devoluciones || ''}
                                onChange={(e) => handleRecordChange(vendedor, 'devoluciones', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3 align-top pt-3">
                              <Input 
                                type="number" 
                                className="w-28 text-right ml-auto h-8 text-sm" 
                                placeholder="0.00"
                                value={rec.ventas || ''}
                                onChange={(e) => handleRecordChange(vendedor, 'ventas', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3 align-top pt-3">
                              <Input 
                                type="number" 
                                className="w-28 text-right ml-auto h-8 text-sm" 
                                placeholder="0.00"
                                value={rec.cobros || ''}
                                onChange={(e) => handleRecordChange(vendedor, 'cobros', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3 align-top pt-3">
                              <Input 
                                type="text" 
                                className="w-full h-8 text-sm min-w-[150px]"
                                placeholder="Observaciones..."
                                value={rec.observaciones || ''}
                                onChange={(e) => handleRecordChange(vendedor, 'observaciones', e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipos.map((equipo, eqIndex) => {
              // We compute based on the full members list regardless if they are active vendors or not
              const teamVentas = equipo.members.reduce((sum, member) => {
                return sum + (parseFloat(records[member]?.ventas) || 0);
              }, 0);
              const percentage = Math.min((teamVentas / equipo.meta) * 100, 100).toFixed(1);
              const isGoalReached = teamVentas >= equipo.meta;
              const deficit = isGoalReached ? 0 : equipo.meta - teamVentas;

              return (
                <Card key={`card-${equipo.id}-${eqIndex}`} className="border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      {equipo.name}
                    </h3>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Meta</p>
                      <p className="font-bold text-gray-800">Q{equipo.meta.toLocaleString('es-GT')}</p>
                    </div>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="mb-6">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-sm text-gray-500">Ventas Actuales</p>
                          <p className={`text-2xl font-bold ${isGoalReached ? 'text-green-600' : 'text-gray-800'}`}>
                            Q{teamVentas.toLocaleString('es-GT', {minimumFractionDigits: 2})}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isGoalReached ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      <Progress value={parseFloat(percentage)} className="h-2" />
                      
                      {!isGoalReached ? (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Déficit: Q{deficit.toLocaleString('es-GT', {minimumFractionDigits: 2})}
                        </p>
                      ) : (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Meta superada por Q{(teamVentas - equipo.meta).toLocaleString('es-GT', {minimumFractionDigits: 2})}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto space-y-3">
                      <p className="text-sm font-medium text-gray-700 border-b pb-2">Integrantes y Aporte</p>
                      {equipo.members.map((member, mIndex) => {
                        const memberVentas = parseFloat(records[member]?.ventas) || 0;
                        const memberAporte = teamVentas > 0 ? ((memberVentas / teamVentas) * 100).toFixed(1) : 0;
                        
                        return (
                          <div key={`member-${equipo.id}-${member}-${mIndex}`} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-gray-100">
                                <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-medium">
                                  {member.split(' ').map(n => n[0]).join('').substring(0,2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{member}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-800">Q{memberVentas.toLocaleString('es-GT')}</p>
                              <p className="text-xs text-gray-400">{memberAporte}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Historial de Supervisiones</CardTitle>
                  <CardDescription>Consulta y exporta los registros diarios guardados</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      type="text" 
                      placeholder="Buscar vendedor..." 
                      className="pl-9 w-48"
                      value={filterVendor}
                      onChange={(e) => setFilterVendor(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-md border p-1">
                    <span className="text-xs text-gray-500 ml-2">Desde:</span>
                    <Input 
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-32 h-8 border-none shadow-none"
                    />
                    <span className="text-xs text-gray-500">Hasta:</span>
                    <Input 
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-32 h-8 border-none shadow-none"
                    />
                  </div>
                  <Button onClick={handleExportFilteredExcel} className="bg-green-600 hover:bg-green-700 h-10 ml-2">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Todo
                  </Button>
                  {(filterStartDate || filterEndDate || filterVendor) && (
                    <Button variant="ghost" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterVendor(''); }} className="px-2 text-red-500 hover:text-red-700">
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {filteredHistory.length > 0 && (
                <div className="mb-8 p-4 border rounded-xl bg-white shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Gráfica de Ventas y Cobros (Filtrados)
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="fecha" tick={{fill: '#6B7280', fontSize: 12}} />
                        <YAxis tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(value) => `Q${value}`} />
                        <RechartsTooltip 
                          formatter={(value) => [`Q${value.toLocaleString('es-GT')}`, undefined]}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Bar dataKey="Ventas" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="Cobros" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay registros en el historial para los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredHistory.map((entry, hIndex) => (
                    <div key={`hist-${entry.id}-${hIndex}`} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">Registro del {entry.date}</h4>
                            <p className="text-xs text-gray-500">Guardado el {new Date(entry.timestamp).toLocaleString('es-GT')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleExportExcel(entry, `Supervision_${entry.date}`)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar Excel
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteRecord(entry.id)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-100 text-gray-600 font-medium">
                            <tr>
                              <th className="px-3 py-2 rounded-tl-lg">Vendedor</th>
                              <th className="px-3 py-2 text-right">Ventas (Q)</th>
                              <th className="px-3 py-2 text-right">Cobros (Q)</th>
                              {(entry.puntos || DEFAULT_PUNTOS).map((p, pIndex) => (
                                <th key={`th2-${entry.id}-${p.id}-${pIndex}`} className="px-3 py-2 text-center">{p.label}</th>
                              ))}
                              <th className="px-3 py-2 text-center">Rep. Diario</th>
                              <th className="px-3 py-2 text-center">Publicación</th>
                              <th className="px-3 py-2 text-center">Devoluciones</th>
                              <th className="px-3 py-2 rounded-tr-lg">Observaciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {Object.entries(entry.records || {})
                              .filter(([vend, data]) => {
                                if (filterVendor && !vend.toLowerCase().includes(filterVendor.toLowerCase())) return false;
                                return data.ventas || data.cobros || data.observaciones || data.puntoInicio || data.puntoMedio || data.puntoFin || data.reporteDiario || data.publicacion || data.devoluciones;
                              })
                              .map(([vendedor, data], vIndex) => (
                              <tr key={`tr2-${entry.id}-${vendedor}-${vIndex}`}>
                                <td className="px-3 py-2 font-medium text-gray-700">{vendedor}</td>
                                <td className="px-3 py-2 text-right font-medium">Q{parseFloat(data.ventas || 0).toLocaleString('es-GT')}</td>
                                <td className="px-3 py-2 text-right">Q{parseFloat(data.cobros || 0).toLocaleString('es-GT')}</td>
                                {(entry.puntos || DEFAULT_PUNTOS).map((p, pIndex) => (
                                  <td key={`td2-${entry.id}-${vendedor}-${p.id}-${pIndex}`} className="px-3 py-2 text-center">
                                    {data[p.id] ? `✅ ${data[p.timeId] || ''}` : '❌'}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center">{data.reporteDiario ? `✅ ${data.horaReporteDiario || ''}` : '❌'}</td>
                                <td className="px-3 py-2 text-center">{data.publicacion ? '✅' : '❌'}</td>
                                <td className="px-3 py-2 text-center">{data.devoluciones || '-'}</td>
                                <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate" title={data.observaciones}>
                                  {data.observaciones || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
