import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Save, FileSpreadsheet, Send, Printer, Trash2, History, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function BroadcastRecordatoriosForm() {
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [fileName, setFileName] = useState('');
  
  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('broadcast_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('broadcast_history', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Assume first column is phone number, second optional name
      // Skip header row if it looks like a header (contains text not numbers)
      let startIndex = 0;
      if (data.length > 0 && typeof data[0][0] === 'string' && isNaN(data[0][0])) {
        startIndex = 1;
      }

      const newContacts = [];
      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (row && row[0]) {
          newContacts.push({
            id: Date.now() + i,
            phone: String(row[0]).replace(/[^0-9]/g, ''), // Clean phone number
            name: row[1] || '',
            sent: false,
            confirmed: false,
            sentDate: null
          });
        }
      }
      setContacts(newContacts);
    };
    reader.readAsArrayBuffer(file);
  };

  const generateLink = (phone) => {
    // Determine if phone needs country code. Assume Guatemala (+502) if length is 8, or just use as is if long.
    let cleanPhone = phone;
    if (phone.length === 8) {
      cleanPhone = `502${phone}`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleSendClick = (id) => {
    setContacts(contacts.map(c => {
      if (c.id === id) {
        return { ...c, sent: true, sentDate: new Date().toISOString() };
      }
      return c;
    }));
  };

  const toggleConfirmed = (id) => {
    setContacts(contacts.map(c => {
      if (c.id === id) {
        return { ...c, confirmed: !c.confirmed };
      }
      return c;
    }));
  };

  const handleSaveToHistory = () => {
    const sessionRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      message: message,
      contacts: contacts.map(c => ({
        phone: c.phone,
        name: c.name,
        sentDate: c.sentDate,
        confirmed: c.confirmed
      }))
    };
    
    // Filter out contacts that weren't interacted with? Or save all? 
    // Requirement: "Historial que muestre número de teléfono, fecha y hora de envío, checkbox para confirmar recepción"
    // Saving the whole session seems appropriate.
    
    setHistory([sessionRecord, ...history]);
    alert("Datos guardados en el historial.");
  };

  const handleClearForm = () => {
    if (window.confirm("¿Estás seguro de limpiar el formulario actual?")) {
      setContacts([]);
      setMessage('');
      setFileName('');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("¿Estás seguro de borrar todo el historial?")) {
      setHistory([]);
    }
  };

  const exportToHTML = () => {
    // Simple print logic
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Reporte de Envíos</title>');
    printWindow.document.write('<style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid black; padding: 8px; text-align: left; } body { font-family: sans-serif; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Reporte de Envíos - Broadcast Recordatorios</h1>');
    
    history.forEach(session => {
      printWindow.document.write(`<h3>Fecha: ${new Date(session.date).toLocaleString()}</h3>`);
      printWindow.document.write(`<p><strong>Mensaje:</strong> ${session.message}</p>`);
      printWindow.document.write('<table><thead><tr><th>Teléfono</th><th>Nombre</th><th>Hora Envío</th><th>Confirmado</th></tr></thead><tbody>');
      session.contacts.forEach(c => {
        printWindow.document.write(`<tr>
          <td>${c.phone}</td>
          <td>${c.name}</td>
          <td>${c.sentDate ? new Date(c.sentDate).toLocaleTimeString() : '-'}</td>
          <td>${c.confirmed ? 'Sí' : 'No'}</td>
        </tr>`);
      });
      printWindow.document.write('</tbody></table><hr/>');
    });

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new">Nuevo Broadcast</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Mensaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Cargar Archivo (Excel/CSV)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="file-upload" 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileUpload} 
                      className="cursor-pointer"
                    />
                  </div>
                  {fileName && <p className="text-sm text-muted-foreground">Archivo: {fileName}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje General</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Escribe tu mensaje aquí..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este mensaje se usará para generar los links de WhatsApp.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {contacts.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lista de Contactos ({contacts.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleClearForm}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpiar
                  </Button>
                  <Button onClick={handleSaveToHistory}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Sesión
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Confirmación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>{contact.phone}</TableCell>
                          <TableCell>{contact.name || '-'}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                              onClick={() => handleSendClick(contact.id)}
                            >
                              <a 
                                href={generateLink(contact.phone)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center text-green-600 hover:text-green-700"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Enviar WA
                              </a>
                            </Button>
                          </TableCell>
                          <TableCell>
                            {contact.sentDate ? (
                              <span className="text-xs text-green-600 font-medium">
                                Enviado: {new Date(contact.sentDate).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Pendiente</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={`confirm-${contact.id}`} 
                                checked={contact.confirmed}
                                onCheckedChange={() => toggleConfirmed(contact.id)}
                              />
                              <label 
                                htmlFor={`confirm-${contact.id}`} 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Recibido
                              </label>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historial de Envíos</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClearHistory} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Borrar Historial
                </Button>
                <Button onClick={exportToHTML}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir / Exportar HTML
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay historial disponible.
                </div>
              ) : (
                <div className="space-y-8">
                  {history.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">Sesión: {new Date(session.date).toLocaleString()}</h3>
                          <p className="text-sm text-gray-500 mt-1">Mensaje: "{session.message}"</p>
                        </div>
                        <div className="text-sm text-gray-500">
                          Total contactos: {session.contacts.length}
                        </div>
                      </div>
                      
                      <div className="rounded-md border bg-slate-50">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Teléfono</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Hora Envío</TableHead>
                              <TableHead>Confirmado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.contacts.map((c, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{c.phone}</TableCell>
                                <TableCell>{c.name || '-'}</TableCell>
                                <TableCell>{c.sentDate ? new Date(c.sentDate).toLocaleTimeString() : '-'}</TableCell>
                                <TableCell>
                                  {c.confirmed ? (
                                    <span className="text-green-600 font-bold">Sí</span>
                                  ) : (
                                    <span className="text-gray-400">No</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
