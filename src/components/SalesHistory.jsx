import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, Trash2 } from 'lucide-react';

export default function SalesHistory({ onRestore }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('salesHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing history", e);
      }
    }
  }, []);

  const handleDelete = (index) => {
    if (window.confirm('¿Eliminar este registro del historial?')) {
      const newHistory = history.filter((_, i) => i !== index);
      setHistory(newHistory);
      localStorage.setItem('salesHistory', JSON.stringify(newHistory));
    }
  };

  const calculateTotal = (records) => {
    return records.reduce((acc, r) => acc + (r.saleAmount || 0), 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial Acumulado de Ventas</CardTitle>
          <CardDescription>Registro histórico de cierres diarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Cierre</TableHead>
                <TableHead>Total Ventas</TableHead>
                <TableHead>Transacciones</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((day, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {new Date(day.date).toLocaleDateString()} {new Date(day.date).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>Q{day.totalSales?.toFixed(2) || calculateTotal(day.records).toFixed(2)}</TableCell>
                  <TableCell>{day.recordCount || day.records?.length || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                       {/* Optional: Add restore/view functionality later if needed */}
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No hay historial disponible
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
