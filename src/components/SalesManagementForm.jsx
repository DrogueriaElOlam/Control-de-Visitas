import React, { useState, useEffect, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement, 
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  Save, 
  Trash2, 
  Edit, 
  Search, 
  Printer, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Calendar, 
  Clock,
  History,
  FileText,
  BarChart3,
  ArrowLeft,
  Lock,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

import SalesHistory from './SalesHistory';
import { getLocalDateString } from '../lib/dateUtils';
import { verifyPassword } from '../lib/security';
import { GeneralReport, VendorReport } from './SalesReports';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement, 
  Filler
);

export default function SalesManagementForm() {
  // State for form
  const [date, setDate] = useState(() => getLocalDateString());
  const [time, setTime] = useState('08:00');
  const [team, setTeam] = useState('Equipo A');
  const [salesperson, setSalesperson] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  
  // State for data
  const [sales, setSales] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // View State
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'history', 'general-report', 'vendor-report'
  const [reportVendor, setReportVendor] = useState('');
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);

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

  // Load from localStorage
  useEffect(() => {
    const savedSales = localStorage.getItem('dailySales');
    if (savedSales) {
      try {
        setSales(JSON.parse(savedSales));
      } catch (e) {
        console.error("Error parsing sales from localStorage", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('dailySales', JSON.stringify(sales));
  }, [sales]);

  // Handle Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newSale = {
      id: editingId || Date.now().toString(),
      date,
      time,
      team,
      salesperson,
      saleAmount: parseFloat(saleAmount),
      dailyGoal: parseFloat(dailyGoal),
      timestamp: new Date().toISOString()
    };

    if (editingId) {
      setSales(sales.map(s => s.id === editingId ? newSale : s));
      setEditingId(null);
      alert('Registro actualizado correctamente.');
    } else {
      setSales([...sales, newSale]);
      alert('Venta registrada correctamente.');
    }

    // Reset form fields except date/team which might be repetitive
    setSalesperson('');
    setSaleAmount('');
    setDailyGoal('');
  };

  const handleEdit = (sale) => {
    setDate(sale.date);
    setTime(sale.time);
    setTeam(sale.team);
    setSalesperson(sale.salesperson);
    setSaleAmount(sale.saleAmount);
    setDailyGoal(sale.dailyGoal);
    setEditingId(sale.id);
    setActiveTab('register'); // Switch to register tab
    setCurrentView('dashboard'); // Ensure we are in the main view
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este registro?')) {
      setSales(sales.filter(s => s.id !== id));
    }
  };

  const handleFinalizeDay = () => {
    if (window.confirm('¿Finalizar el día y guardar en historial? Esto limpiará los registros actuales.')) {
      const history = JSON.parse(localStorage.getItem('salesHistory') || '[]');
      const daySummary = {
        date: new Date().toISOString(),
        totalSales: sales.reduce((acc, s) => acc + s.saleAmount, 0),
        recordCount: sales.length,
        records: sales
      };
      localStorage.setItem('salesHistory', JSON.stringify([...history, daySummary]));
      setSales([]);
      alert('Día finalizado y guardado en historial.');
    }
  };

  // --- Calculations for Charts & KPIs ---

  const salesByPerson = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      if (!map[s.salesperson]) {
        map[s.salesperson] = { name: s.salesperson, total: 0, goal: 0, team: s.team };
      }
      map[s.salesperson].total += s.saleAmount;
      map[s.salesperson].goal = Math.max(map[s.salesperson].goal, s.dailyGoal);
    });
    return Object.values(map);
  }, [sales]);

  const productivityChartData = {
    labels: salesByPerson.map(p => p.name),
    datasets: [
      {
        label: 'Venta Total (Q)',
        data: salesByPerson.map(p => p.total),
        backgroundColor: 'rgba(34, 197, 94, 0.6)', 
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
      {
        label: 'Meta Diaria (Q)',
        data: salesByPerson.map(p => p.goal),
        backgroundColor: 'rgba(99, 102, 241, 0.6)', 
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      }
    ]
  };

  const salesByTeam = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      if (!map[s.team]) map[s.team] = 0;
      map[s.team] += s.saleAmount;
    });
    return map;
  }, [sales]);

  const teamChartData = {
    labels: Object.keys(salesByTeam),
    datasets: [
      {
        data: Object.values(salesByTeam),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const salesByHour = useMemo(() => {
    const hours = [
      '08:00', '09:00', '10:00', '11:00', '12:00', 
      '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
    ];
    const map = {};
    hours.forEach(h => map[h] = 0);
    
    sales.forEach(s => {
      // Handle HH:MM format
      if (s.time) {
        const hourPrefix = s.time.split(':')[0] + ':00';
        if (map[hourPrefix] !== undefined) {
          map[hourPrefix] += s.saleAmount;
        }
      }
    });

    return { labels: hours, data: hours.map(h => map[h]) };
  }, [sales]);

  const timelineChartData = {
    labels: salesByHour.labels,
    datasets: [
      {
        label: 'Ventas por Hora (Q)',
        data: salesByHour.data,
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        tension: 0.4,
      }
    ]
  };

  const collectionsChartData = {
    labels: salesByPerson.map(p => p.name),
    datasets: [
      {
        label: 'Vendido',
        data: salesByPerson.map(p => p.total),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
      {
        label: 'Faltante para Meta',
        data: salesByPerson.map(p => {
          const gap = p.goal - p.total;
          return gap > 0 ? gap : 0;
        }),
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      }
    ]
  };

  const totalSales = sales.reduce((acc, s) => acc + s.saleAmount, 0);
  const ticketAverage = sales.length > 0 ? totalSales / sales.length : 0;
  const filteredSales = sales.filter(s => 
    s.salesperson.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const productivityCount = salesByPerson.filter(p => p.total >= p.goal).length;

  // --- Render Logic ---

  if (currentView === 'history') {
    return (
      <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setCurrentView('dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Historial de Ventas</h2>
        </div>
        <SalesHistory />
      </div>
    );
  }

  if (currentView === 'general-report') {
    return (
      <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500 bg-gray-50 min-h-screen">
         <div className="flex justify-between items-center no-print">
          <Button variant="outline" onClick={() => setCurrentView('dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Reporte
          </Button>
        </div>
        <div className="bg-white shadow-lg p-8 rounded-lg">
          <GeneralReport 
            sales={sales}
            totalSales={totalSales}
            ticketAverage={ticketAverage}
            productivityCount={productivityCount}
            salesByPerson={salesByPerson}
            teamChartData={teamChartData}
            timelineChartData={timelineChartData}
            productivityChartData={productivityChartData}
            collectionsChartData={collectionsChartData}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'vendor-report') {
    // Filter data for selected vendor
    const vendorSales = sales.filter(s => s.salesperson === reportVendor);
    const vendorTotal = vendorSales.reduce((acc, s) => acc + s.saleAmount, 0);
    const vendorGoal = Math.max(...vendorSales.map(s => s.dailyGoal), 0);

    return (
      <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center no-print">
          <Button variant="outline" onClick={() => setCurrentView('dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Reporte
          </Button>
        </div>
        <div className="bg-white shadow-lg p-8 rounded-lg">
          <VendorReport 
            vendorName={reportVendor} 
            vendorSales={vendorSales} 
            vendorTotal={vendorTotal} 
            vendorGoal={vendorGoal} 
          />
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Ventas Diaria</h2>
          <p className="text-muted-foreground">Panel de control, reportes y registro de productividad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleLogout} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
          <Button variant="outline" onClick={() => setCurrentView('history')}>
            <History className="mr-2 h-4 w-4" />
            Historial
          </Button>
          
          <Button variant="outline" onClick={() => setCurrentView('general-report')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Reporte General
          </Button>

          <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Reporte Vendedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Seleccionar Vendedor</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Select onValueChange={(val) => setReportVendor(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesByPerson.map(p => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  if (reportVendor) {
                    setIsVendorDialogOpen(false);
                    setCurrentView('vendor-report');
                  }
                }}>
                  Generar Reporte
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" onClick={handleFinalizeDay}>
            <Save className="mr-2 h-4 w-4" />
            Finalizar Día
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="no-print">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="register">Registro</TabsTrigger>
          <TabsTrigger value="admin">Administrador</TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Venta Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Q{totalSales.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Acumulado del día</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Q{ticketAverage.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Por transacción</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sales.length}</div>
                <p className="text-xs text-muted-foreground">Registros totales</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productividad</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productivityCount}/{salesByPerson.length}
                </div>
                <p className="text-xs text-muted-foreground">Vendedores alcanzaron meta</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Tendencia de Ventas (08:00 - 19:00)</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <Line data={timelineChartData} options={{ maintainAspectRatio: false, responsive: true }} />
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Ventas por Equipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex justify-center">
                  <Pie data={teamChartData} options={{ maintainAspectRatio: false, responsive: true }} />
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Productividad Individual</CardTitle>
                <CardDescription>Venta vs Meta por Vendedor</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <Bar 
                    data={productivityChartData} 
                    options={{ 
                      maintainAspectRatio: false, 
                      responsive: true,
                      scales: { y: { beginAtZero: true } }
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Progreso de Metas</CardTitle>
                <CardDescription>Vendido vs Faltante</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Bar 
                    data={collectionsChartData} 
                    options={{ 
                      maintainAspectRatio: false, 
                      responsive: true,
                      scales: { 
                        x: { stacked: true }, 
                        y: { stacked: true, beginAtZero: true } 
                      } 
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REGISTER TAB */}
        <TabsContent value="register">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Editar Venta' : 'Registrar Nueva Venta'}</CardTitle>
                <CardDescription>
                  {editingId 
                    ? 'Modifica los datos del registro seleccionado.' 
                    : 'Ingresa los detalles de la venta diaria.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="date" 
                          type="date" 
                          className="pl-9"
                          value={date} 
                          onChange={e => setDate(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Hora</Label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="time"
                          type="time" 
                          className="pl-9"
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team">Equipo</Label>
                    <Select value={team} onValueChange={setTeam}>
                      <SelectTrigger id="team">
                        <SelectValue placeholder="Seleccionar Equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Equipo A">Equipo A</SelectItem>
                        <SelectItem value="Equipo B">Equipo B</SelectItem>
                        <SelectItem value="Equipo C">Equipo C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salesperson">Vendedor</Label>
                    <div className="relative">
                      <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="salesperson" 
                        placeholder="Nombre del vendedor" 
                        className="pl-9"
                        value={salesperson} 
                        onChange={e => setSalesperson(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Venta (Q)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="amount" 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0.00" 
                          className="pl-9"
                          value={saleAmount} 
                          onChange={e => setSaleAmount(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal">Meta Diaria (Q)</Label>
                      <div className="relative">
                        <Target className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="goal" 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0.00" 
                          className="pl-9"
                          value={dailyGoal} 
                          onChange={e => setDailyGoal(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      {editingId ? 'Actualizar Registro' : 'Registrar Venta'}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingId(null);
                        setSalesperson('');
                        setSaleAmount('');
                        setDailyGoal('');
                      }}>
                        Cancelar Edición
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Mini Report & Search */}
            <Card>
              <CardHeader>
                <CardTitle>Reporte Rápido</CardTitle>
                <CardDescription>Busca vendedores y verifica su estado.</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar vendedor..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.salesperson}</TableCell>
                        <TableCell>
                          {sale.saleAmount >= sale.dailyGoal ? (
                            <Badge className="bg-green-500 hover:bg-green-600">Productivo</Badge>
                          ) : (
                            <Badge variant="secondary">No Productivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">Q{sale.saleAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredSales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No se encontraron registros
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ADMIN TAB */}
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Panel de Administración</CardTitle>
              <CardDescription>Gestiona todos los registros de ventas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Venta (Q)</TableHead>
                    <TableHead>Meta (Q)</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.date}</TableCell>
                      <TableCell>{sale.time}</TableCell>
                      <TableCell>{sale.team}</TableCell>
                      <TableCell>{sale.salesperson}</TableCell>
                      <TableCell>Q{sale.saleAmount.toFixed(2)}</TableCell>
                      <TableCell>Q{sale.dailyGoal.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(sale)}>
                            <Edit className="h-4 w-4 mr-1" /> Modificar
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(sale.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        No hay registros para mostrar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .card { border: none; shadow: none; }
          canvas { min-height: 300px; width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
