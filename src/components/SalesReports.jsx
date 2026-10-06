import React from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Register ChartJS components (in case they aren't registered globally in the parent)
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

export const GeneralReport = ({ sales, totalSales, ticketAverage, productivityCount, salesByPerson, teamChartData, timelineChartData, productivityChartData, collectionsChartData }) => {
  return (
    <div className="space-y-8 p-8 max-w-[210mm] mx-auto bg-white text-black print:p-0">
      <div className="flex flex-col items-center justify-center text-center border-b pb-4">
        <img src="/logo.png" alt="Droguería El Olam" className="h-16 w-auto object-contain mb-3" />
        <h1 className="text-3xl font-bold text-slate-800">Reporte General de Ventas</h1>
        <p className="text-gray-500 mt-1 text-sm">Generado el: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border p-4 rounded-lg text-center">
          <div className="text-sm text-gray-500">Venta Total</div>
          <div className="text-2xl font-bold">Q{totalSales.toFixed(2)}</div>
        </div>
        <div className="border p-4 rounded-lg text-center">
          <div className="text-sm text-gray-500">Ticket Promedio</div>
          <div className="text-2xl font-bold">Q{ticketAverage.toFixed(2)}</div>
        </div>
        <div className="border p-4 rounded-lg text-center">
          <div className="text-sm text-gray-500">Transacciones</div>
          <div className="text-2xl font-bold">{sales.length}</div>
        </div>
        <div className="border p-4 rounded-lg text-center">
          <div className="text-sm text-gray-500">Productividad</div>
          <div className="text-2xl font-bold">{productivityCount}/{salesByPerson.length}</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-8">
        <div className="h-[300px] border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Ventas por Hora</h3>
          <Line data={timelineChartData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="h-[300px] border p-4 rounded-lg flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-2">Ventas por Equipo</h3>
          <Pie data={teamChartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="h-[300px] border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Productividad por Vendedor</h3>
        <Bar data={productivityChartData} options={{ maintainAspectRatio: false }} />
      </div>

      {/* Data Table */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Resumen por Vendedor</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Venta</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesByPerson.map((person, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{person.name}</TableCell>
                <TableCell>{person.team}</TableCell>
                <TableCell className="text-right">Q{person.goal.toFixed(2)}</TableCell>
                <TableCell className="text-right">Q{person.total.toFixed(2)}</TableCell>
                <TableCell className={`text-right ${person.total >= person.goal ? 'text-green-600' : 'text-red-600'}`}>
                  {person.total >= person.goal ? '+' : ''}Q{(person.total - person.goal).toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {person.total >= person.goal ? (
                    <Badge className="bg-green-500">Cumplido</Badge>
                  ) : (
                    <Badge variant="destructive">Pendiente</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const VendorReport = ({ vendorName, vendorSales, vendorTotal, vendorGoal }) => {
  // Chart Data for specific vendor
  const chartData = {
    labels: ['Meta', 'Venta Actual'],
    datasets: [
      {
        label: 'Monto (Q)',
        data: [vendorGoal, vendorTotal],
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',
          vendorTotal >= vendorGoal ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          vendorTotal >= vendorGoal ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const productivity = vendorGoal > 0 ? (vendorTotal / vendorGoal) * 100 : 0;

  return (
    <div className="space-y-8 p-8 max-w-[210mm] mx-auto bg-white text-black print:p-0">
      <div className="flex flex-col items-center justify-center text-center border-b pb-4">
        <img src="/logo.png" alt="Droguería El Olam" className="h-16 w-auto object-contain mb-3" />
        <h1 className="text-3xl font-bold text-slate-800">Reporte Individual de Ventas</h1>
        <h2 className="text-2xl text-blue-700 font-bold mt-1">{vendorName}</h2>
        <p className="text-gray-500 mt-1 text-sm">Generado el: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border p-4 rounded-lg text-center">
          <div className="text-sm text-gray-500">Venta Total</div>
          <div className="text-2xl font-bold">Q{vendorTotal.toFixed(2)}</div>
        </div>
        <div className="border p-4 rounded-lg text-center">
          <div className="text-sm text-gray-500">Meta Diaria</div>
          <div className="text-2xl font-bold">Q{vendorGoal.toFixed(2)}</div>
        </div>
        <div className="border p-4 rounded-lg text-center">
          <div className="text-sm text-gray-500">Productividad</div>
          <div className={`text-2xl font-bold ${productivity >= 100 ? 'text-green-600' : 'text-red-600'}`}>
            {productivity.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Progreso vs Meta</h3>
        <Bar 
          data={chartData} 
          options={{ 
            maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal bar for variety
            scales: { x: { beginAtZero: true } }
          }} 
        />
      </div>

      {/* Transactions Table */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Detalle de Transacciones</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorSales.map((sale, idx) => (
              <TableRow key={idx}>
                <TableCell>{sale.time}</TableCell>
                <TableCell>{sale.team}</TableCell>
                <TableCell className="text-right">Q{sale.saleAmount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {vendorSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Sin registros hoy
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
