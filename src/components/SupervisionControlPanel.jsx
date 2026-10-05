import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getLocalDateString } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Plus, Trash2, Edit2, Save, Users, Target, Clock, UserPlus, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function SupervisionControlPanel({ onDataChange }) {
  const [activeTab, setActiveTab] = useState('metas'); // Changed to metas to show the new stuff easily
  
  // Data state
  const [equipos, setEquipos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supervisionHistory, setSupervisionHistory] = useState([]);

  // Forms state
  const [newVendor, setNewVendor] = useState({ name: '', last_name: '', team_id: '' });
  const [newTeam, setNewTeam] = useState({ name: '' });
  const [newPoint, setNewPoint] = useState({ label: '' });

  // Month selector for General Goal
  const getCurrentMonthStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsRes, vendorsRes, settingsRes, historyRes] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('vendors').select('*').order('name'),
        supabase.from('supervision_settings').select('*').limit(1).single(),
        supabase.from('daily_supervision_history').select('*')
      ]);

      setEquipos(teamsRes.data || []);
      setVendedores(vendorsRes.data || []);
      
      let sData = settingsRes.data || { monthly_goal: 0, meeting_points: [], monthly_goals: {} };
      if (!sData.monthly_goals) sData.monthly_goals = {};
      setSettings(sData);

      setSupervisionHistory(historyRes.data || []);

      if (onDataChange) onDataChange();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Calculations for charts
  const chartData = useMemo(() => {
    if (!settings || !equipos.length) return [];

    const todayStr = getLocalDateString();
    
    // Get general goal for the selected month
    const currentMonthGoal = parseFloat(settings.monthly_goals?.[selectedMonth] || settings.monthly_goal || 0);

    return equipos.map(eq => {
      const teamVendors = vendedores.filter(v => v.team_id === eq.id).map(v => v.name);
      
      // Calculate Daily Reach
      let teamDailyReach = 0;
      const todayHistory = supervisionHistory.find(h => h.date === todayStr);
      if (todayHistory && todayHistory.datos?.records) {
        teamVendors.forEach(vendorName => {
          const vData = todayHistory.datos.records[vendorName];
          if (vData && vData.ventas) {
             teamDailyReach += parseFloat(vData.ventas) || 0;
          }
        });
      }

      // Calculate Monthly Reach (for selected month)
      let teamMonthlyReach = 0;
      supervisionHistory.forEach(h => {
        if (h.date.startsWith(selectedMonth) && h.datos?.records) {
          teamVendors.forEach(vendorName => {
            const vData = h.datos.records[vendorName];
            if (vData && vData.ventas) {
               teamMonthlyReach += parseFloat(vData.ventas) || 0;
            }
          });
        }
      });

      const metaDiaria = eq.meta || 0;
      
      // Calculate Percentages
      const pctDiarioDeMetaDiaria = metaDiaria > 0 ? (teamDailyReach / metaDiaria) * 100 : 0;
      // Porcentaje de alcance diario en relacion a la meta mensual
      const pctDiarioDeMetaMensual = currentMonthGoal > 0 ? (teamDailyReach / currentMonthGoal) * 100 : 0;
      
      // Déficit (lo que falta para alcanzar 100% de la meta general del mes para este equipo o global? The prompt says "lo que falta para alcanzar 100% de la meta general")
      // Assuming deficit is Meta General - team's monthly reach (so they know how much the team needs to cover to reach the global goal, or maybe their share of it).
      const deficitGeneral = Math.max(0, currentMonthGoal - teamMonthlyReach);

      return {
        name: eq.name,
        alcanceDiario: teamDailyReach,
        alcanceMensual: teamMonthlyReach,
        metaDiaria: metaDiaria,
        pctMetaDiaria: parseFloat(pctDiarioDeMetaDiaria.toFixed(1)),
        pctMetaMensual: parseFloat(pctDiarioDeMetaMensual.toFixed(2)),
        deficit: deficitGeneral
      };
    });
  }, [equipos, vendedores, settings, supervisionHistory, selectedMonth]);

  // Vendors
  const handleAddVendor = async () => {
    if (!newVendor.name || !newVendor.team_id) return;
    await supabase.from('vendors').insert([newVendor]);
    setNewVendor({ name: '', last_name: '', team_id: '' });
    loadData();
  };

  const handleRemoveVendor = async (id) => {
    if (!window.confirm('¿Eliminar vendedor?')) return;
    await supabase.from('vendors').delete().eq('id', id);
    loadData();
  };

  const handleChangeVendorTeam = async (id, team_id) => {
    await supabase.from('vendors').update({ team_id }).eq('id', id);
    loadData();
  };

  // Teams
  const handleAddTeam = async () => {
    if (!newTeam.name) return;
    await supabase.from('teams').insert([{ name: newTeam.name }]);
    setNewTeam({ name: '' });
    loadData();
  };

  const handleRemoveTeam = async (id) => {
    if (!window.confirm('¿Eliminar equipo? Los vendedores perderán este equipo.')) return;
    await supabase.from('teams').delete().eq('id', id);
    loadData();
  };

  const handleUpdateTeamName = async (id, name) => {
    await supabase.from('teams').update({ name }).eq('id', id);
    loadData();
  };
  
  const handleUpdateTeamMeta = async (id, meta) => {
    await supabase.from('teams').update({ meta: parseFloat(meta) || 0 }).eq('id', id);
    loadData();
  };

  // Settings
  const handleUpdateMonthlyGoal = async (month, val) => {
    if (!settings?.id) return;
    const currentGoals = settings.monthly_goals || {};
    const updatedGoals = { ...currentGoals, [month]: parseFloat(val) || 0 };
    await supabase.from('supervision_settings').update({ 
      monthly_goals: updatedGoals,
      monthly_goal: parseFloat(val) || 0 // Sync the legacy field for compatibility
    }).eq('id', settings.id);
    loadData();
  };

  const handleAddPoint = async () => {
    if (!newPoint.label || !settings?.id) return;
    const newId = 'punto_' + Date.now();
    const currentPoints = settings.meeting_points || [];
    const newPointsList = [...currentPoints, { id: newId, timeId: 'hora_' + newId, label: newPoint.label }];
    await supabase.from('supervision_settings').update({ meeting_points: newPointsList }).eq('id', settings.id);
    setNewPoint({ label: '' });
    loadData();
  };

  const handleRemovePoint = async (pointId) => {
    if (!settings?.id) return;
    const currentPoints = settings.meeting_points || [];
    const newPointsList = currentPoints.filter(p => p.id !== pointId);
    await supabase.from('supervision_settings').update({ meeting_points: newPointsList }).eq('id', settings.id);
    loadData();
  };

  const handleUpdatePointLabel = async (pointId, label) => {
    if (!settings?.id) return;
    const currentPoints = settings.meeting_points || [];
    const newPointsList = currentPoints.map(p => p.id === pointId ? { ...p, label } : p);
    await supabase.from('supervision_settings').update({ meeting_points: newPointsList }).eq('id', settings.id);
    loadData();
  };

  if (loading) return <div className="p-4 text-center">Cargando configuración...</div>;

  return (
    <Card className="border border-blue-100 bg-white shadow-sm mb-6">
      <CardHeader className="bg-gray-50 border-b pb-4">
        <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
          <Settings className="w-5 h-5 text-blue-600" />
          Panel de Control Administrativo
        </CardTitle>
        <CardDescription>Gestiona vendedores, equipos, metas y puntos de encuentro.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6 bg-gray-100 h-12">
            <TabsTrigger value="vendedores" className="flex gap-2"><UserPlus className="w-4 h-4"/> Vendedores</TabsTrigger>
            <TabsTrigger value="equipos" className="flex gap-2"><Users className="w-4 h-4"/> Equipos</TabsTrigger>
            <TabsTrigger value="metas" className="flex gap-2"><Target className="w-4 h-4"/> Metas</TabsTrigger>
            <TabsTrigger value="puntos" className="flex gap-2"><Clock className="w-4 h-4"/> Puntos de Encuentro</TabsTrigger>
          </TabsList>

          <TabsContent value="vendedores" className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h3 className="font-medium mb-3 text-gray-700">Agregar Nuevo Vendedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                  <Input placeholder="Nombre" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Apellido (Opcional)</label>
                  <Input placeholder="Apellido" value={newVendor.last_name} onChange={e => setNewVendor({...newVendor, last_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Equipo</label>
                  <Select value={newVendor.team_id} onValueChange={v => setNewVendor({...newVendor, team_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipos.map(eq => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddVendor} className="bg-blue-600"><Plus className="w-4 h-4 mr-2"/> Agregar</Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">Nombre Completo</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Equipo Asignado</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendedores.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{v.name} {v.last_name}</td>
                      <td className="px-4 py-3">
                        <Select value={v.team_id} onValueChange={(val) => handleChangeVendorTeam(v.id, val)}>
                          <SelectTrigger className="w-[200px] h-8">
                            <SelectValue placeholder="Sin equipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {equipos.map(eq => (
                              <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveVendor(v.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="equipos" className="space-y-6">
            <div className="flex gap-3">
              <Input placeholder="Nombre del nuevo equipo..." value={newTeam.name} onChange={e => setNewTeam({name: e.target.value})} className="max-w-sm"/>
              <Button onClick={handleAddTeam} className="bg-blue-600"><Plus className="w-4 h-4 mr-2"/> Crear Equipo</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipos.map(eq => (
                <div key={eq.id} className="border rounded-lg p-4 bg-white shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <Input 
                      value={eq.name} 
                      onChange={(e) => handleUpdateTeamName(eq.id, e.target.value)} 
                      className="font-bold border-none bg-transparent px-1 h-8 focus-visible:ring-1"
                    />
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleRemoveTeam(eq.id)}>
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500 px-1">
                    {vendedores.filter(v => v.team_id === eq.id).length} integrantes
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metas" className="space-y-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
                  <Target className="w-5 h-5"/> Meta General Mensual
                </h3>
                <p className="text-sm text-blue-700">Selecciona el mes y asigna la meta global de ventas.</p>
              </div>
              <div className="flex items-center gap-3">
                <Input 
                  type="month" 
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-40 bg-white"
                />
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                  <span className="font-bold text-gray-500">Q</span>
                  <Input 
                    type="number" 
                    value={settings?.monthly_goals?.[selectedMonth] ?? (settings?.monthly_goal || 0)} 
                    onChange={e => handleUpdateMonthlyGoal(selectedMonth, e.target.value)}
                    className="w-32 font-bold text-lg border-none focus-visible:ring-0 shadow-none text-right"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5"/> Metas por Equipo
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipos.map(eq => (
                  <div key={eq.id} className="border rounded-lg p-4 flex justify-between items-center bg-white">
                    <span className="font-medium">{eq.name}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Meta Diaria</span>
                      <div className="flex items-center gap-2 w-32 border rounded px-2">
                        <span className="text-gray-400 text-sm">Q</span>
                        <Input 
                          type="number" 
                          value={eq.meta || 0} 
                          onChange={e => handleUpdateTeamMeta(eq.id, e.target.value)}
                          className="h-8 border-none focus-visible:ring-0 text-right px-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rendimiento de Equipos Chart */}
            <div className="border rounded-lg p-6 bg-white shadow-sm mt-8">
              <div className="mb-6">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600"/> Rendimiento de Equipos
                </h3>
                <p className="text-sm text-gray-500">
                  Visualiza el progreso de cada equipo respecto a la Meta Diaria y la Meta General ({selectedMonth}).
                </p>
              </div>
              
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" 
                           tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" 
                           tickFormatter={(value) => `Q${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}`} 
                           axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      formatter={(value, name, props) => {
                        if (name === 'pctMetaDiaria') return [`${value}%`, '% Meta Diaria'];
                        if (name === 'pctMetaMensual') return [`${value}%`, '% Meta Mensual (Global)'];
                        if (name === 'deficit') return [`Q${value.toLocaleString()}`, 'Déficit Meta General'];
                        return [value, name];
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    
                    {/* Barras de porcentaje (Izquierda) */}
                    <Bar yAxisId="left" dataKey="pctMetaDiaria" name="% Meta Diaria" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar yAxisId="left" dataKey="pctMetaMensual" name="% Meta Mensual (Global)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                    
                    {/* Barra de déficit (Derecha) */}
                    <Bar yAxisId="right" dataKey="deficit" name="Déficit Meta General" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
                    
                    <ReferenceLine yAxisId="left" y={100} stroke="#22c55e" strokeDasharray="3 3" label={{ position: 'top', value: '100% Meta', fill: '#22c55e', fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-center">
                 <div className="bg-blue-50 text-blue-700 p-3 rounded-lg">
                    <span className="font-bold block text-lg">{chartData.filter(d => d.pctMetaDiaria >= 100).length}</span>
                    Equipos en track (Meta Diaria)
                 </div>
                 <div className="bg-purple-50 text-purple-700 p-3 rounded-lg">
                    <span className="font-bold block text-lg">{chartData.filter(d => d.pctMetaMensual >= (new Date().getDate() / 30) * 100).length}</span>
                    Equipos en track (Meta Mensual)
                 </div>
                 <div className="bg-red-50 text-red-700 p-3 rounded-lg">
                    <span className="font-bold block text-lg">Q{Math.max(0, (settings?.monthly_goals?.[selectedMonth] || settings?.monthly_goal || 0) - chartData.reduce((acc, curr) => acc + curr.alcanceMensual, 0)).toLocaleString()}</span>
                    Déficit Total Acumulado
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="puntos" className="space-y-6">
            <div className="flex gap-3">
              <Input placeholder="Nuevo punto de encuentro..." value={newPoint.label} onChange={e => setNewPoint({label: e.target.value})} className="max-w-sm"/>
              <Button onClick={handleAddPoint} className="bg-blue-600"><Plus className="w-4 h-4 mr-2"/> Agregar Punto</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(settings?.meeting_points || []).map(p => (
                <div key={p.id} className="border rounded-lg p-3 flex justify-between items-center bg-gray-50">
                  <Input 
                    value={p.label} 
                    onChange={e => handleUpdatePointLabel(p.id, e.target.value)}
                    className="border-none bg-transparent font-medium focus-visible:ring-1"
                  />
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleRemovePoint(p.id)}>
                    <Trash2 className="w-4 h-4"/>
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
