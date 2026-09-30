import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  FileText, 
  Calendar, 
  Download, 
  Printer, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  MapPin, 
  Phone, 
  ExternalLink,
  ChevronRight,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  X,
  AlertCircle,
  Plus,
  Navigation,
  Save,
  Clock,
  FileCode
} from 'lucide-react';
import { addVisitRecord, ALL_ROUTES } from '../lib/db';
import { LOGO_DATA_URI, LOGO_URL } from '../lib/logo';

export default function VendorReportModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  visits = [], 
  vendors = [],
  onVisitAdded
}) {
  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';
  const todayStr = new Date().toISOString().split('T')[0];

  // Vendor selection (Admin can pick vendor, Vendor is locked to self)
  const [selectedVendorName, setSelectedVendorName] = useState(() => {
    if (!isAdmin && currentUser?.name) return currentUser.name;
    // If visits exist, prefer the vendor that has visits or first vendor
    const vendorWithVisits = visits.find(v => v.vendorName)?.vendorName;
    return vendorWithVisits || vendors[0]?.name || currentUser?.name || 'Karina Pineda';
  });

  // Calculate available dates for this vendor
  const availableDatesForVendor = useMemo(() => {
    const dates = Array.from(new Set(
      visits
        .filter(v => !selectedVendorName || v.vendorName === selectedVendorName)
        .map(v => v.visitDate)
        .filter(Boolean)
    )).sort((a, b) => b.localeCompare(a));
    return dates;
  }, [visits, selectedVendorName]);

  // Report configuration state
  const [periodType, setPeriodType] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'custom' | 'all'
  
  // Initialize date to today, or if no visits today but vendor has visits on another day, use that day
  const [selectedDate, setSelectedDate] = useState(() => {
    return availableDatesForVendor.length > 0 ? availableDatesForVendor[0] : todayStr;
  });

  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });

  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Metadata overrides (prefilled but customizable)
  const currentVendorData = vendors.find(v => v.name === selectedVendorName) || currentUser;
  const [routeInput, setRouteInput] = useState(currentVendorData?.route || 'Chiquimula II #63');
  const [teamGoalInput, setTeamGoalInput] = useState(50000);
  const [commitmentGoalInput, setCommitmentGoalInput] = useState(17000);

  // Quick Inline Visit Entry Form State
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [qCode, setQCode] = useState('');
  const [qName, setQName] = useState('');
  const [qSector, setQSector] = useState(routeInput);
  const [qVisitType, setQVisitType] = useState('presencial');
  const [qClientType, setQClientType] = useState('propio');
  const [qPeriod, setQPeriod] = useState('AM');
  const [qHasSale, setQHasSale] = useState(false);
  const [qSaleType, setQSaleType] = useState('presencial');
  const [qSaleAmount, setQSaleAmount] = useState('');
  const [qHasCollection, setQHasCollection] = useState(false);
  const [qCollType, setQCollType] = useState('Transferencia');
  const [qCollAmount, setQCollAmount] = useState('');
  const [qObs, setQObs] = useState('');
  const [qGPS, setQGPS] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Update route and commitment when vendor changes or available dates change
  useEffect(() => {
    if (currentVendorData?.route) {
      setRouteInput(currentVendorData.route);
      setQSector(currentVendorData.route);
    }
    if (periodType === 'daily') {
      setCommitmentGoalInput(17000);
    } else if (periodType === 'weekly') {
      setCommitmentGoalInput(85000);
    } else if (periodType === 'monthly') {
      setCommitmentGoalInput(340000);
    }
  }, [selectedVendorName, periodType]);

  // If vendor changes and has visits on specific dates, align selectedDate if current selectedDate has 0 visits
  useEffect(() => {
    const hasCurrent = visits.some(v => v.vendorName === selectedVendorName && v.visitDate === selectedDate);
    if (!hasCurrent && availableDatesForVendor.length > 0) {
      setSelectedDate(availableDatesForVendor[0]);
    }
  }, [selectedVendorName, availableDatesForVendor]);

  // Capture GPS for quick form
  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este navegador');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setQGPS({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy)
        });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert('No se pudo obtener la ubicación GPS.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit new visit directly into Database and Report
  const handleSaveQuickVisit = async (e) => {
    e.preventDefault();
    if (!qName.trim()) {
      alert('Por favor ingrese el nombre del cliente');
      return;
    }

    setSavingVisit(true);

    const saleNum = qHasSale ? (parseFloat(qSaleAmount) || 0) : 0;
    const collNum = qHasCollection ? (parseFloat(qCollAmount) || 0) : 0;

    const payload = {
      clientCode: qCode.trim() || '0000',
      clientName: qName.trim(),
      sector: qSector.trim() || routeInput,
      visitType: qVisitType,
      clientType: qClientType,
      dayPeriod: qPeriod.toLowerCase() === 'pm' ? 'tarde' : 'mañana',
      hasSale: qHasSale && saleNum > 0,
      saleType: qHasSale ? qSaleType : null,
      saleAmount: saleNum,
      hasCollection: qHasCollection && collNum > 0,
      collectionTransfer: qHasCollection && qCollType === 'Transferencia' ? collNum : 0,
      collectionCheck: qHasCollection && qCollType === 'Cheque' ? collNum : 0,
      collectionBoleta: qHasCollection && qCollType === 'Boleta' ? collNum : 0,
      collectionCash: qHasCollection && qCollType === 'Efectivo' ? collNum : 0,
      collectionAmount: collNum,
      observations: qObs.trim() || (qHasSale ? 'Realizó pedido' : (qHasCollection ? `Canceló con ${qCollType.toLowerCase()}` : '')),
      location: qGPS,
      vendorName: selectedVendorName,
      route: routeInput,
      visitDate: periodType === 'daily' ? selectedDate : todayStr
    };

    try {
      const saved = await addVisitRecord(payload);
      if (onVisitAdded) {
        onVisitAdded(saved);
      }
      setSaveSuccessMsg(`¡Visita a "${qName}" guardada en la base de datos con éxito!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);

      // Reset form fields
      setQCode('');
      setQName('');
      setQHasSale(false);
      setQSaleAmount('');
      setQHasCollection(false);
      setQCollAmount('');
      setQObs('');
      setQGPS(null);
      setShowQuickForm(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar la visita en la base de datos.');
    } finally {
      setSavingVisit(false);
    }
  };

  // Determine active date range and title based on periodType
  const { dateRangeText, periodTitle, filteredVisits } = useMemo(() => {
    let start = '';
    let end = '';
    let title = 'CONTROL DE VISITAS DIARIA';
    let rangeDesc = selectedDate;

    if (periodType === 'daily') {
      start = selectedDate;
      end = selectedDate;
      title = 'CONTROL DE VISITAS DIARIA';
      rangeDesc = selectedDate;
    } else if (periodType === 'weekly') {
      start = selectedWeekStart;
      const startDateObj = new Date(selectedWeekStart + 'T00:00:00');
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + 6);
      end = endDateObj.toISOString().split('T')[0];
      title = 'CONTROL DE VISITAS SEMANAL';
      rangeDesc = `Semana del ${start} al ${end}`;
    } else if (periodType === 'monthly') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      start = `${selectedMonth}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      title = 'CONTROL DE VISITAS MENSUAL';
      rangeDesc = `Mes de ${monthNames[m - 1]} ${y}`;
    } else if (periodType === 'custom') {
      start = customStartDate;
      end = customEndDate;
      title = 'CONTROL DE VISITAS - PERÍODO PERSONALIZADO';
      rangeDesc = `Del ${start} al ${end}`;
    } else {
      // All visits for vendor
      title = 'CONTROL DE VISITAS - TODAS LAS VISITAS REGISTRADAS';
      rangeDesc = 'Historial Completo';
    }

    const filtered = visits.filter(v => {
      // Vendor filter
      if (selectedVendorName && v.vendorName !== selectedVendorName) {
        return false;
      }
      // Date filter
      if (periodType !== 'all') {
        if (v.visitDate < start || v.visitDate > end) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort by date ascending, then time
      if (a.visitDate !== b.visitDate) return a.visitDate.localeCompare(b.visitDate);
      return (a.timestamp || '').localeCompare(b.timestamp || '');
    });

    return {
      dateRangeText: rangeDesc,
      periodTitle: title,
      filteredVisits: filtered
    };
  }, [periodType, selectedDate, selectedWeekStart, selectedMonth, customStartDate, customEndDate, visits, selectedVendorName]);

  // Compute detailed metrics matching and expanding on the template
  const metrics = useMemo(() => {
    const totalVisits = filteredVisits.length;
    
    // Unique clients
    const uniqueClientsSet = new Set(
      filteredVisits.map(v => (v.clientName || '').trim().toLowerCase()).filter(Boolean)
    );
    const clientsVisited = uniqueClientsSet.size;

    // New clients
    const newClients = filteredVisits.filter(v => 
      (v.clientType || '').toLowerCase() === 'nuevo'
    ).length;

    // Sales breakdown
    let totalSales = 0;
    let ordersPersonal = 0;
    let ordersPhone = 0;

    // Collections breakdown
    let totalCollections = 0;
    let collectionsCash = 0;
    let collectionsTransfer = 0;
    let collectionsCheck = 0;
    let collectionsBoleta = 0;

    // Telemarketing calls
    let telemarketingCalls = 0;

    filteredVisits.forEach(v => {
      // Sales
      const saleVal = Number(v.saleAmount) || 0;
      if (v.hasSale || saleVal > 0) {
        totalSales += saleVal;
        const sType = (v.saleType || v.visitType || '').toLowerCase();
        if (sType.includes('tele') || sType.includes('tel')) {
          ordersPhone++;
        } else {
          ordersPersonal++;
        }
      }

      // Collections
      const collVal = Number(v.collectionAmount) || 0;
      const cCash = Number(v.collectionCash) || 0;
      const cTrans = Number(v.collectionTransfer) || 0;
      const cCheck = Number(v.collectionCheck) || 0;
      const cBoleta = Number(v.collectionBoleta) || 0;

      collectionsCash += cCash;
      collectionsTransfer += cTrans;
      collectionsCheck += cCheck;
      collectionsBoleta += cBoleta;

      if (v.hasCollection || collVal > 0) {
        const computed = (cCash + cTrans + cCheck + cBoleta);
        totalCollections += (computed > 0 ? computed : collVal);
      }

      // Calls
      const vType = (v.visitType || '').toLowerCase();
      if (vType.includes('tele') || vType.includes('tel') || (v.saleType || '').toLowerCase().includes('tele')) {
        telemarketingCalls++;
      }
    });

    // Effective visits (visits with sale or collection)
    const effectiveVisits = filteredVisits.filter(v => 
      (v.hasSale || (Number(v.saleAmount) || 0) > 0) || 
      (v.hasCollection || (Number(v.collectionAmount) || 0) > 0)
    ).length;

    const effectivenessPercent = totalVisits > 0 
      ? ((effectiveVisits / totalVisits) * 100).toFixed(1) 
      : '0.0';

    const goalPercent = commitmentGoalInput > 0 
      ? ((totalSales / commitmentGoalInput) * 100).toFixed(1) 
      : '0.0';

    const goalMet = totalSales >= commitmentGoalInput;

    // Collections by Sector
    const collectionsBySectorMap = {};
    const salesBySectorMap = {};

    filteredVisits.forEach(v => {
      const sec = v.sector || v.route || routeInput || 'General';
      const sVal = Number(v.saleAmount) || 0;
      const cVal = Number(v.collectionAmount) || (Number(v.collectionCash) || 0) + (Number(v.collectionTransfer) || 0) + (Number(v.collectionCheck) || 0) + (Number(v.collectionBoleta) || 0);

      collectionsBySectorMap[sec] = (collectionsBySectorMap[sec] || 0) + cVal;
      salesBySectorMap[sec] = (salesBySectorMap[sec] || 0) + sVal;
    });

    return {
      totalVisits,
      clientsVisited,
      newClients,
      ordersPersonal,
      ordersPhone,
      totalSales,
      collectionsCash,
      collectionsTransfer,
      collectionsCheck,
      collectionsBoleta,
      totalCollections,
      telemarketingCalls,
      effectiveVisits,
      effectivenessPercent,
      goalPercent,
      goalMet,
      collectionsBySectorMap,
      salesBySectorMap
    };
  }, [filteredVisits, commitmentGoalInput, routeInput]);

  // Generate HTML for printing or popup (matching and improving user template)
  const buildReportHTML = () => {
    // Sector data prepared for Chart.js
    const sectorLabels = Array.from(
      new Set([
        ...Object.keys(metrics.collectionsBySectorMap),
        ...Object.keys(metrics.salesBySectorMap)
      ])
    );
    if (sectorLabels.length === 0) sectorLabels.push(routeInput || 'Ruta General');

    const collectionsSectorData = sectorLabels.map(s => Number((metrics.collectionsBySectorMap[s] || 0).toFixed(2)));
    const salesSectorData = sectorLabels.map(s => Number((metrics.salesBySectorMap[s] || 0).toFixed(2)));
    const palette = ['#1e40af', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

    // Table rows
    const rowsHtml = filteredVisits.map(v => {
      const saleVal = Number(v.saleAmount) || 0;
      const hasSaleBool = v.hasSale || saleVal > 0;
      const saleTypeLabel = hasSaleBool ? (v.saleType || (v.visitType === 'telemarketing' ? 'Telemarket.' : 'Presencial')) : 'No Compró';

      const cCash = Number(v.collectionCash) || 0;
      const cTrans = Number(v.collectionTransfer) || 0;
      const cCheck = Number(v.collectionCheck) || 0;
      const cBoleta = Number(v.collectionBoleta) || 0;
      const computedColl = (cCash + cTrans + cCheck + cBoleta);
      const collVal = computedColl > 0 ? computedColl : (Number(v.collectionAmount) || 0);
      const hasCollBool = v.hasCollection || collVal > 0;

      let collTypeLabel = 'No Pagó';
      if (hasCollBool) {
        const types = [];
        if (cTrans > 0) types.push('Transferencia');
        if (cCheck > 0) types.push('Cheque');
        if (cBoleta > 0) types.push('Boleta');
        if (cCash > 0) types.push('Efectivo');
        collTypeLabel = types.length > 0 ? types.join(', ') : 'Cobro';
      }

      const coordLink = v.location?.lat && v.location?.lng
        ? `<a href="https://www.google.com/maps?q=${v.location.lat},${v.location.lng}" target="_blank" class="coord-link">${v.location.lat.toFixed(6)}, ${v.location.lng.toFixed(6)}</a>`
        : '<span style="color:#94a3b8">Sin coordenadas</span>';

      const vTypeLabel = (v.visitType || 'presencial').toLowerCase() === 'telemarketing' ? 'Telemarket.' : 'Presencial';
      const cTypeLabel = (v.clientType || 'propio').toLowerCase() === 'nuevo' ? 'Nuevo' : 'Propio';
      const periodLabel = (v.dayPeriod || 'mañana').toLowerCase().includes('tarde') || (v.dayPeriod || '').toUpperCase() === 'PM' ? 'PM' : 'AM';

      return `
        <tr>
          <td>${v.clientCode || '0000'}</td>
          <td><strong>${v.clientName || 'Cliente'}</strong></td>
          <td>${v.sector || v.route || routeInput}</td>
          <td>${vTypeLabel}</td>
          <td>${cTypeLabel}</td>
          <td>${periodLabel}</td>
          <td>${hasSaleBool ? 'Sí' : 'No'}</td>
          <td>${saleTypeLabel}</td>
          <td class="currency">Q${saleVal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${hasCollBool ? 'Sí' : 'No'}</td>
          <td>${collTypeLabel}</td>
          <td class="currency">Q${collVal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${v.observations || '—'}</td>
          ${isAdmin ? `<td>${coordLink}</td>` : ''}
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${periodTitle} - ${selectedVendorName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 20px; color: #1e293b; background: #fff; margin: 0; }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 15px;
      position: relative;
    }
    .top-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f1f5f9;
      border-radius: 8px;
    }
    .action-btn {
      background: #1e40af;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    .action-btn:hover { background: #1d4ed8; }
    .logo {
      max-width: 150px;
      height: auto;
      margin: 0 auto 10px;
      display: block;
    }
    h1 { color: #1e40af; text-align: center; margin: 5px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    h2 { color: #1e40af; text-align: center; margin-top: 0; font-size: 16px; font-weight: 600; text-transform: uppercase; }
    .info { 
      margin: 20px 0; 
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
      padding: 15px 20px; 
      border-radius: 10px; 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 12px;
    }
    .info p { margin: 0; font-size: 13px; color: #334155; }
    .info strong { font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 8.5px; }
    th { background: #1e40af; color: white; padding: 7px 4px; text-align: left; font-size: 8.5px; font-weight: bold; text-transform: uppercase; }
    td { border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 8.5px; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals { background: #dbeafe !important; font-weight: bold; font-size: 11px; }
    .summary { background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 10px; margin: 20px 0; }
    .summary h3 { margin: 0 0 12px 0; color: #1e40af; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .summary-item { text-align: center; padding: 10px 8px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .summary-item .label { font-size: 10px; color: #64748b; display: block; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; }
    .summary-item .value { font-size: 14px; font-weight: 800; color: #1e40af; }
    .charts-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .chart-box {
      background: white;
      padding: 14px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      text-align: center;
    }
    .chart-box h3 {
      color: #1e40af;
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    canvas {
      max-height: 200px !important;
      width: 100% !important;
    }
    .goal-chart {
      background: white;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      margin: 20px auto;
      max-width: 600px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
      page-break-inside: avoid;
    }
    .goal-chart h3 {
      color: #1e40af;
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
    }
    .currency { font-weight: bold; }
    .coord-link {
      color: #2563eb;
      text-decoration: underline;
      cursor: pointer;
      font-size: 7.5px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 5px; }
      .no-print { display: none !important; }
      .goal-chart, .charts-container { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>

  <div class="top-actions no-print">
    <button class="action-btn" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
    <button class="action-btn" style="background:#059669;" onclick="window.close()">❌ Cerrar Ventana</button>
  </div>

  <div class="header">
    <img src="${LOGO_DATA_URI}" alt="Droguería El Olam" class="logo" />
    <h1>DROGUERÍA EL OLAM</h1>
    <h2>${periodTitle}</h2>
  </div>
  
  <div class="info">
    <p><strong>Vendedor:</strong> ${selectedVendorName}</p>
    <p><strong>Ruta / Gira:</strong> ${routeInput}</p>
    <p><strong>Período:</strong> ${dateRangeText}</p>
    <p><strong>Meta del Equipo:</strong> <span class="currency">Q${Number(teamGoalInput).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span></p>
    <p><strong>Compromiso de Venta:</strong> <span class="currency">Q${Number(commitmentGoalInput).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span></p>
    <p><strong>Efectividad en Ruta:</strong> <span class="currency" style="color:#059669;">${metrics.effectivenessPercent}%</span></p>
  </div>

  <h3 style="color:#1e40af; margin-bottom:8px; font-size:14px; font-weight:800;">DETALLE DE VISITAS (${metrics.totalVisits} Registros)</h3>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Cliente</th>
        <th>Sector</th>
        <th>Tipo Visita</th>
        <th>Tipo Cliente</th>
        <th>Horario</th>
        <th>Venta</th>
        <th>Tipo Venta</th>
        <th>Monto Venta</th>
        <th>Cobro</th>
        <th>Tipo Cobro</th>
        <th>Monto Cobro</th>
        <th>Observ.</th>
        ${isAdmin ? '<th>Coordenadas</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="${isAdmin ? 14 : 13}" style="text-align:center; padding:15px; color:#64748b;">No se encontraron visitas registradas en este período.</td></tr>`}
      <tr class="totals">
        <td colspan="8" style="text-align: right; padding-right:8px;">TOTAL VENTAS:</td>
        <td class="currency">Q${metrics.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td colspan="2" style="text-align: right; padding-right:8px;">TOTAL COBROS:</td>
        <td class="currency">Q${metrics.totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td colspan="${isAdmin ? 2 : 1}"></td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <h3>RESUMEN GENERAL Y MÉTRICAS DE EVALUACIÓN</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="label">Clientes Visitados</span>
        <span class="value">${metrics.clientsVisited}</span>
      </div>
      <div class="summary-item">
        <span class="label">Clientes Nuevos</span>
        <span class="value">${metrics.newClients}</span>
      </div>
      <div class="summary-item">
        <span class="label">Pedidos Personalmente</span>
        <span class="value">${metrics.ordersPersonal}</span>
      </div>
      <div class="summary-item">
        <span class="label">Pedidos por Teléfono</span>
        <span class="value">${metrics.ordersPhone}</span>
      </div>
      <div class="summary-item">
        <span class="label">Cobros en Efectivo</span>
        <span class="value currency">Q${metrics.collectionsCash.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="summary-item">
        <span class="label">Boletas / Depósitos</span>
        <span class="value currency">Q${metrics.collectionsBoleta.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="summary-item">
        <span class="label">Cobros Transferencia</span>
        <span class="value currency">Q${metrics.collectionsTransfer.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="summary-item">
        <span class="label">Cobros con Cheque</span>
        <span class="value currency">Q${metrics.collectionsCheck.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="summary-item">
        <span class="label">Llamadas (Telemarketing)</span>
        <span class="value">${metrics.telemarketingCalls}</span>
      </div>
      <div class="summary-item">
        <span class="label">Total Visitas</span>
        <span class="value">${metrics.totalVisits}</span>
      </div>
      <div class="summary-item">
        <span class="label">Visitas Efectivas</span>
        <span class="value">${metrics.effectiveVisits} (${metrics.effectivenessPercent}%)</span>
      </div>
      <div class="summary-item">
        <span class="label">Total Recaudado</span>
        <span class="value currency" style="color:#059669;">Q${metrics.totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  </div>

  <div class="goal-chart">
    <h3>CUMPLIMIENTO DE COMPROMISO DE VENTA</h3>
    <canvas id="goalChart" height="90"></canvas>
    <div style="text-align: center; margin-top: 12px; font-size: 12px;">
      <strong>Compromiso:</strong> <span class="currency">Q${Number(commitmentGoalInput).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span> | 
      <strong>Alcanzado:</strong> <span class="currency">Q${metrics.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span> | 
      <strong style="color: ${metrics.goalMet ? '#059669' : '#d97706'}; font-size:13px;">
        ${metrics.goalMet ? '✓ Meta Cumplida' : 'En Progreso'} (${metrics.goalPercent}%)
      </strong>
    </div>
  </div>

  <div class="charts-container">
    <div class="chart-box">
      <h3>COBROS POR SECTOR</h3>
      <canvas id="collectionsChart"></canvas>
    </div>
    <div class="chart-box">
      <h3>VENTAS POR SECTOR</h3>
      <canvas id="salesChart"></canvas>
    </div>
  </div>

  <div class="footer">
    <p>Documento Oficial Generado por el Sistema de Control de Rendimiento • Droguería El Olam • Fecha de Emisión: ${new Date().toLocaleString('es-GT')}</p>
  </div>

  <script>
    // 1. Goal Bar Chart
    const goalCtx = document.getElementById('goalChart').getContext('2d');
    new Chart(goalCtx, {
      type: 'bar',
      data: {
        labels: ['Compromiso de Venta', 'Monto Alcanzado'],
        datasets: [{
          data: [${Number(commitmentGoalInput)}, ${Number(metrics.totalSales.toFixed(2))}],
          backgroundColor: ['#3b82f6', '${metrics.goalMet ? '#10b981' : '#f59e0b'}'],
          borderColor: ['#1e40af', '${metrics.goalMet ? '#059669' : '#d97706'}'],
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Q' + context.parsed.x.toLocaleString('es-GT', { minimumFractionDigits: 2 });
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'Q' + value.toLocaleString('es-GT');
              }
            }
          }
        }
      }
    });

    // 2. Collections by Sector Pie Chart
    const collectionsCtx = document.getElementById('collectionsChart').getContext('2d');
    new Chart(collectionsCtx, {
      type: 'pie',
      data: {
        labels: ${JSON.stringify(sectorLabels)},
        datasets: [{
          data: ${JSON.stringify(collectionsSectorData)},
          backgroundColor: ${JSON.stringify(palette.slice(0, sectorLabels.length))},
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { font: { size: 9 }, padding: 8 } 
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.parsed;
                const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return context.label + ': Q' + val.toLocaleString('es-GT', { minimumFractionDigits: 2 }) + ' (' + percentage + '%)';
              }
            }
          }
        }
      }
    });

    // 3. Sales by Sector Pie Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    new Chart(salesCtx, {
      type: 'pie',
      data: {
        labels: ${JSON.stringify(sectorLabels)},
        datasets: [{
          data: ${JSON.stringify(salesSectorData)},
          backgroundColor: ${JSON.stringify(palette.slice(0, sectorLabels.length))},
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { font: { size: 9 }, padding: 8 } 
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.parsed;
                const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return context.label + ': Q' + val.toLocaleString('es-GT', { minimumFractionDigits: 2 }) + ' (' + percentage + '%)';
              }
            }
          }
        }
  </script>
</body>
</html>`;
  };

  // Helper to generate clean vendor name
  const getCleanVendorName = () => {
    const rawVendor = selectedVendorName || currentUser?.name || 'Vendedor';
    return rawVendor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents for safe filename
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
  };

  const cleanVendor = getCleanVendorName();

  // Helper to generate exact file name: Reporte_Visitas_[NombreVendedor]_[Fecha].html
  const getHtmlFileName = () => `Reporte_Visitas_${cleanVendor}_${todayStr}.html`;

  // Auto-download standalone HTML file directly
  const handleDownloadHTML = () => {
    try {
      const html = buildReportHTML();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getHtmlFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Error al autodescargar reporte HTML:', e);
      alert('Error al autodescargar el reporte en HTML');
    }
  };

  // Auto-download standalone PDF file directly
  const handleDownloadPDF = () => {
    if (filteredVisits.length === 0) {
      alert('No hay visitas registradas para el período y vendedor seleccionados.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header Banner (Droguería El Olam Deep Blue)
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DROGUERÍA EL OLAM', 14, 11);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Control Diario de Visitas & Rendimiento en Ruta', 14, 17);

      doc.setFontSize(8.5);
      doc.text(`Fecha de Emisión: ${todayStr}`, 235, 11);
      doc.text(`Vendedor: ${selectedVendorName}`, 235, 17);

      // Summary Strip
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Ruta: ${routeInput}   |   Período: ${dateRangeText}   |   Ventas: Q${metrics.totalSales.toFixed(2)}   |   Cobros: Q${metrics.totalCollections.toFixed(2)}   |   Efectivas: ${metrics.effectiveVisits}/${metrics.totalVisits} (${metrics.effectivenessPercent}%)`,
        14,
        30
      );

      // Table data
      const tableData = filteredVisits.map((v, i) => {
        const sVal = Number(v.saleAmount) || 0;
        const cVal = Number(v.collectionAmount) || 0;
        return [
          i + 1,
          v.visitDate || '',
          v.clientCode || '0000',
          v.clientName || 'Cliente',
          v.sector || v.route || '',
          (v.visitType || 'presencial').toUpperCase(),
          (v.clientType || 'propio').toUpperCase(),
          (v.dayPeriod || 'AM').toUpperCase(),
          sVal > 0 ? `Q${sVal.toFixed(2)}` : '—',
          cVal > 0 ? `Q${cVal.toFixed(2)}` : '—',
          v.observations || '—'
        ];
      });

      autoTable(doc, {
        startY: 34,
        head: [['#', 'Fecha', 'Cód.', 'Cliente', 'Sector / Gira', 'Modalidad', 'Tipo', 'Horario', 'Venta', 'Cobro', 'Observaciones']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5
        },
        styles: {
          fontSize: 7,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 20 },
          2: { cellWidth: 15 },
          3: { cellWidth: 55 },
          4: { cellWidth: 30 },
          5: { cellWidth: 20 },
          6: { cellWidth: 16 },
          7: { cellWidth: 15 },
          8: { cellWidth: 24, halign: 'right' },
          9: { cellWidth: 24, halign: 'right' },
          10: { cellWidth: 55 }
        }
      });

      const pdfFileName = `Reporte_Visitas_${cleanVendor}_${todayStr}.pdf`;
      doc.save(pdfFileName);
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar el archivo PDF');
    }
  };

  // Open printable HTML in browser
  const handlePrintHTML = () => {
    const html = buildReportHTML();
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } else {
      alert('Por favor habilite las ventanas emergentes (pop-ups) en su navegador para imprimir el reporte.');
    }
  };

  // Export structured Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredVisits.length === 0) {
      alert('No hay visitas registradas para el período y vendedor seleccionados.');
      return;
    }

    try {
      // 1. KPI Summary Sheet
      const summaryRows = [
        { 'Métrica / Indicador': 'EMPRESA', 'Valor': 'DROGUERÍA EL OLAM' },
        { 'Métrica / Indicador': 'TIPO DE REPORTE', 'Valor': periodTitle },
        { 'Métrica / Indicador': 'VENDEDOR', 'Valor': selectedVendorName },
        { 'Métrica / Indicador': 'RUTA / GIRA', 'Valor': routeInput },
        { 'Métrica / Indicador': 'PERÍODO', 'Valor': dateRangeText },
        { 'Métrica / Indicador': 'META DEL EQUIPO', 'Valor': `Q${Number(teamGoalInput).toFixed(2)}` },
        { 'Métrica / Indicador': 'COMPROMISO DE VENTA', 'Valor': `Q${Number(commitmentGoalInput).toFixed(2)}` },
        { 'Métrica / Indicador': 'VENTAS TOTALES ALCANZADAS', 'Valor': `Q${metrics.totalSales.toFixed(2)}` },
        { 'Métrica / Indicador': '% CUMPLIMIENTO META', 'Valor': `${metrics.goalPercent}%` },
        { 'Métrica / Indicador': 'TOTAL COBROS RECAUDADOS', 'Valor': `Q${metrics.totalCollections.toFixed(2)}` },
        { 'Métrica / Indicador': 'Cobro en Efectivo', 'Valor': `Q${metrics.collectionsCash.toFixed(2)}` },
        { 'Métrica / Indicador': 'Cobro por Transferencia', 'Valor': `Q${metrics.collectionsTransfer.toFixed(2)}` },
        { 'Métrica / Indicador': 'Cobro con Cheque', 'Valor': `Q${metrics.collectionsCheck.toFixed(2)}` },
        { 'Métrica / Indicador': 'Cobro por Boletas/Depósitos', 'Valor': `Q${metrics.collectionsBoleta.toFixed(2)}` },
        { 'Métrica / Indicador': 'TOTAL DE VISITAS REGISTRADAS', 'Valor': metrics.totalVisits },
        { 'Métrica / Indicador': 'Clientes Visitados Únicos', 'Valor': metrics.clientsVisited },
        { 'Métrica / Indicador': 'Clientes Nuevos Captados', 'Valor': metrics.newClients },
        { 'Métrica / Indicador': 'Pedidos Presenciales', 'Valor': metrics.ordersPersonal },
        { 'Métrica / Indicador': 'Pedidos por Telemarketing', 'Valor': metrics.ordersPhone },
        { 'Métrica / Indicador': 'Llamadas Telemarketing', 'Valor': metrics.telemarketingCalls },
        { 'Métrica / Indicador': 'Visitas Efectivas', 'Valor': `${metrics.effectiveVisits} (${metrics.effectivenessPercent}%)` }
      ];

      // 2. Visits Detail Sheet
      const detailRows = filteredVisits.map((v, i) => {
        const saleVal = Number(v.saleAmount) || 0;
        const cCash = Number(v.collectionCash) || 0;
        const cTrans = Number(v.collectionTransfer) || 0;
        const cCheck = Number(v.collectionCheck) || 0;
        const cBoleta = Number(v.collectionBoleta) || 0;
        const collVal = (cCash + cTrans + cCheck + cBoleta) > 0 
          ? (cCash + cTrans + cCheck + cBoleta) 
          : (Number(v.collectionAmount) || 0);

        return {
          'No.': i + 1,
          'Fecha': v.visitDate || '',
          'Código': v.clientCode || '0000',
          'Cliente': v.clientName || '',
          'Sector / Gira': v.sector || v.route || '',
          'Tipo Visita': (v.visitType || 'presencial').toUpperCase(),
          'Tipo Cliente': (v.clientType || 'propio').toUpperCase(),
          'Horario': (v.dayPeriod || 'mañana').toUpperCase(),
          '¿Venta?': (v.hasSale || saleVal > 0) ? 'SÍ' : 'NO',
          'Tipo Venta': (v.hasSale || saleVal > 0) ? (v.saleType || v.visitType || 'Presencial') : 'No Compró',
          'Monto Venta (Q)': saleVal,
          '¿Cobro?': (v.hasCollection || collVal > 0) ? 'SÍ' : 'NO',
          'Cobro Efectivo (Q)': cCash,
          'Cobro Transferencia (Q)': cTrans,
          'Cobro Cheque (Q)': cCheck,
          'Cobro Boleta (Q)': cBoleta,
          'Monto Cobro Total (Q)': collVal,
          ...(isAdmin ? {
            'GPS Latitud': v.location?.lat || '',
            'GPS Longitud': v.location?.lng || '',
            'Precisión GPS': v.location?.accuracy ? `±${v.location.accuracy}m` : '',
            'Enlace Google Maps': v.location?.lat && v.location?.lng ? `https://www.google.com/maps?q=${v.location.lat},${v.location.lng}` : '',
          } : {}),
          'Observaciones': v.observations || ''
        };
      });

      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 35 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_KPIs');

      const wsDetail = XLSX.utils.json_to_sheet(detailRows);
      wsDetail['!cols'] = Object.keys(detailRows[0] || {}).map(k => ({ wch: Math.max(k.length + 3, 14) }));
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle_Visitas');

      // Clean filename without "CUSTOM"
      const fileName = `Reporte_Visitas_${cleanVendor}_${todayStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error(e);
      alert('Error al generar el archivo Excel');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-4 sm:p-6 flex items-center justify-between border-b border-blue-700/50">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-md">
              <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Exportar Reporte de Rendimiento & Visitas
                </h3>
                <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Alimentado en tiempo real con las visitas ingresadas por el vendedor y sincronizado en Supabase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 hover:text-white transition-all"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">

          {/* Success message banner if quick visit saved */}
          {saveSuccessMsg && (
            <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={20} className="animate-bounce" />
              <div className="text-xs font-bold">{saveSuccessMsg}</div>
            </div>
          )}

          {/* Active Data Sourcing Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 block">
                  Visitas cargadas desde la Base de Datos para: <span className="underline decoration-blue-400">{selectedVendorName}</span>
                </span>
                <span className="text-[11px] text-blue-700/80 dark:text-blue-300">
                  {filteredVisits.length} visitas incluidas en este reporte ({dateRangeText})
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap"
                title={`Descargar archivo PDF: Reporte_Visitas_${cleanVendor}_${todayStr}.pdf`}
              >
                <FileText size={14} />
                <span>Descargar PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHTML}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap"
                title={`Descargar archivo HTML: ${getHtmlFileName()}`}
              >
                <FileCode size={14} />
                <span>Descargar HTML</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQuickForm(!showQuickForm)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap"
              >
                <Plus size={14} />
                <span>{showQuickForm ? 'Ocultar Formulario' : '+ Ingresar Visita'}</span>
              </button>
            </div>
          </div>

          {/* Inline Quick Visit Form (Allows vendor to fill report rows on the fly) */}
          {showQuickForm && (
            <form onSubmit={handleSaveQuickVisit} className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800 dark:to-slate-850 p-4 sm:p-5 rounded-2xl border-2 border-blue-400/40 dark:border-blue-700 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-black uppercase text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Llenar Datos de Nueva Visita para este Reporte
                </span>
                <span className="text-[10px] text-slate-500">Se guardará en Supabase y se sumará al reporte</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Código Cliente</label>
                  <input
                    type="text"
                    placeholder="Ej. 5259"
                    value={qCode}
                    onChange={(e) => setQCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg dark:text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Farmacia San Rafael"
                    value={qName}
                    onChange={(e) => setQName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sector / Gira</label>
                  <input
                    type="text"
                    value={qSector}
                    onChange={(e) => setQSector(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tipo Visita</label>
                  <select
                    value={qVisitType}
                    onChange={(e) => setQVisitType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg dark:text-white"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="telemarketing">Telemarketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tipo Cliente</label>
                  <select
                    value={qClientType}
                    onChange={(e) => setQClientType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg dark:text-white"
                  >
                    <option value="propio">Propio</option>
                    <option value="nuevo">Nuevo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Horario</label>
                  <select
                    value={qPeriod}
                    onChange={(e) => setQPeriod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg dark:text-white"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Coordenadas GPS</label>
                    <button
                      type="button"
                      onClick={handleCaptureGPS}
                      className={`w-full py-1.5 px-2 rounded-lg border font-bold text-[11px] flex items-center justify-center gap-1 ${
                        qGPS ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <MapPin size={12} />
                      <span>{isLocating ? 'Capturando...' : (qGPS ? '✓ GPS Capturado' : 'Capturar GPS')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sales & Collection sub-row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                {/* Venta box */}
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={qHasSale}
                        onChange={(e) => setQHasSale(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>¿Se realizó Venta?</span>
                    </label>
                  </div>
                  {qHasSale && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-[10px] text-slate-400">Tipo Venta</label>
                        <select
                          value={qSaleType}
                          onChange={(e) => setQSaleType(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded text-xs"
                        >
                          <option value="presencial">Presencial</option>
                          <option value="telemarketing">Telemarket.</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Monto Venta (Q)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={qSaleAmount}
                          onChange={(e) => setQSaleAmount(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-bold text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cobro box */}
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={qHasCollection}
                        onChange={(e) => setQHasCollection(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>¿Se realizó Cobro?</span>
                    </label>
                  </div>
                  {qHasCollection && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-[10px] text-slate-400">Tipo Cobro</label>
                        <select
                          value={qCollType}
                          onChange={(e) => setQCollType(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded text-xs"
                        >
                          <option value="Transferencia">Transferencia</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Boleta">Boleta / Depósito</option>
                          <option value="Efectivo">Efectivo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Monto Cobro (Q)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={qCollAmount}
                          onChange={(e) => setQCollAmount(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-bold text-xs text-emerald-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Observation & Save Button */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Observaciones (Ej. Canceló con depósito / Realizó pedido)"
                  value={qObs}
                  onChange={(e) => setQObs(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-xs dark:text-white"
                />
                <button
                  type="submit"
                  disabled={savingVisit}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md whitespace-nowrap"
                >
                  <Save size={14} />
                  <span>{savingVisit ? 'Guardando...' : 'Guardar y Añadir'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 1. Selector de Período (Diario / Semanal / Mensual / Todas) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Seleccione el Tipo de Reporte
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setPeriodType('daily')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  periodType === 'daily'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Calendar size={15} />
                <span>Diario</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('weekly')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  periodType === 'weekly'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <BarChart3 size={15} />
                <span>Semanal</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  periodType === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <PieIcon size={15} />
                <span>Mensual</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  periodType === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Filter size={15} />
                <span>Rango</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('all')}
                className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  periodType === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 size={15} />
                <span>Todas</span>
              </button>
            </div>
          </div>

          {/* Quick Date Chips if vendor has visits on other dates */}
          {availableDatesForVendor.length > 0 && periodType === 'daily' && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400">Fechas con visitas registradas:</span>
              {availableDatesForVendor.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedDate === d
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  📅 {d}
                </button>
              ))}
            </div>
          )}

          {/* 2. Filtros de Fecha y Parámetros del Reporte */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Date Control */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {periodType === 'daily' && 'Fecha Específica'}
                  {periodType === 'weekly' && 'Lunes de Inicio de Semana'}
                  {periodType === 'monthly' && 'Mes y Año del Reporte'}
                  {periodType === 'custom' && 'Rango Personalizado'}
                  {periodType === 'all' && 'Período'}
                </label>
                {periodType === 'daily' && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold dark:text-white"
                  />
                )}
                {periodType === 'weekly' && (
                  <input
                    type="date"
                    value={selectedWeekStart}
                    onChange={(e) => setSelectedWeekStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold dark:text-white"
                  />
                )}
                {periodType === 'monthly' && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold dark:text-white"
                  />
                )}
                {periodType === 'custom' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-semibold"
                    />
                    <span className="text-xs text-slate-400">a</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}
                {periodType === 'all' && (
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                    Historial Completo de Visitas
                  </div>
                )}
              </div>

              {/* Vendor Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Vendedor
                </label>
                {isAdmin ? (
                  <select
                    value={selectedVendorName}
                    onChange={(e) => setSelectedVendorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold dark:text-white"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.name}>{v.name} ({v.route})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={selectedVendorName}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed"
                  />
                )}
              </div>

              {/* Route / Gira */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Ruta / Gira
                </label>
                <input
                  type="text"
                  value={routeInput}
                  onChange={(e) => setRouteInput(e.target.value)}
                  placeholder="Ej. Chiquimula II #63"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold dark:text-white"
                />
              </div>

            </div>

            {/* Goals Configuration row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Compromiso de Venta (Meta a Evaluar en Quetzales)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Q</span>
                  <input
                    type="number"
                    value={commitmentGoalInput}
                    onChange={(e) => setCommitmentGoalInput(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Meta del Equipo (Quetzales)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Q</span>
                  <input
                    type="number"
                    value={teamGoalInput}
                    onChange={(e) => setTeamGoalInput(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* 3. Vista Previa de Métricas y KPIs en Tiempo Real */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                Resumen Ejecutivo del Período ({dateRangeText})
              </h4>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredVisits.length} visitas encontradas
              </span>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 text-center">
                <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block mb-1">
                  Ventas Totales
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-900 dark:text-blue-200">
                  Q{metrics.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </span>
                <span className={`block text-[10px] font-extrabold mt-0.5 ${metrics.goalMet ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {metrics.goalMet ? '✓ Meta Cumplida' : 'En Progreso'} ({metrics.goalPercent}%)
                </span>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                  Cobros Recaudados
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-900 dark:text-emerald-200">
                  Q{metrics.totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </span>
                <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                  Efectivo: Q{metrics.collectionsCash.toFixed(0)} | Boletas: Q{metrics.collectionsBoleta.toFixed(0)}
                </span>
              </div>

              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 text-center">
                <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block mb-1">
                  Visitas & Efectividad
                </span>
                <span className="text-lg sm:text-xl font-black text-indigo-900 dark:text-indigo-200">
                  {metrics.effectiveVisits} / {metrics.totalVisits}
                </span>
                <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                  {metrics.effectivenessPercent}% tasa de efectividad
                </span>
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-center">
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block mb-1">
                  Clientes & Nuevos
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-900 dark:text-amber-200">
                  {metrics.clientsVisited} clientes
                </span>
                <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                  {metrics.newClients} nuevos captados
                </span>
              </div>
            </div>
          </div>

          {/* Table preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Detalle de Visitas que se Exportarán ({filteredVisits.length} Registros)
              </span>
              <span className="text-[11px] text-slate-400">
                Mostrando {Math.min(filteredVisits.length, 10)} de {filteredVisits.length}
              </span>
            </div>

            {filteredVisits.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
                <p>No se encontraron visitas registradas para los filtros seleccionados.</p>
                <button
                  type="button"
                  onClick={() => setShowQuickForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all text-xs"
                >
                  + Agregar la primera visita a este reporte
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Sector</th>
                      <th className="p-2.5">Tipo Visita</th>
                      <th className="p-2.5">Horario</th>
                      <th className="p-2.5">Venta</th>
                      <th className="p-2.5">Cobro</th>
                      <th className="p-2.5">Observaciones</th>
                      {isAdmin && <th className="p-2.5">GPS</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredVisits.slice(0, 10).map((v, i) => {
                      const sVal = Number(v.saleAmount) || 0;
                      const cVal = Number(v.collectionAmount) || 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2 font-bold text-blue-600">{v.clientCode || '0000'}</td>
                          <td className="p-2 font-medium">{v.clientName}</td>
                          <td className="p-2 text-slate-500">{v.sector || v.route}</td>
                          <td className="p-2 capitalize">{v.visitType || 'presencial'}</td>
                          <td className="p-2 uppercase">{v.dayPeriod?.includes('tarde') ? 'PM' : 'AM'}</td>
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-100">
                            {sVal > 0 ? `Q${sVal.toFixed(2)}` : '—'}
                          </td>
                          <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400">
                            {cVal > 0 ? `Q${cVal.toFixed(2)}` : '—'}
                          </td>
                          <td className="p-2 text-slate-500 truncate max-w-[150px]">{v.observations || '—'}</td>
                          {isAdmin && (
                            <td className="p-2 text-slate-400">
                              {v.location?.lat ? '✓ Con GPS' : 'Sin GPS'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer with Export Buttons */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <span>🔒 Datos 100% persistidos en Supabase • Reporte listo para imprimir o enviar en PDF</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold transition-all"
            >
              Cerrar
            </button>

            {/* BOTÓN 1: Descargar PDF Directo */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-red-500/25 transition-all"
              title={`Descargar archivo PDF: Reporte_Visitas_${cleanVendor}_${todayStr}.pdf`}
            >
              <FileText size={16} />
              <span>Descargar PDF</span>
            </button>

            {/* BOTÓN 2: Descargar HTML con Nombre y Fecha */}
            <button
              type="button"
              onClick={handleDownloadHTML}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-orange-500/25 transition-all"
              title={`Descargar archivo HTML: ${getHtmlFileName()}`}
            >
              <FileCode size={16} />
              <span>Descargar HTML</span>
            </button>

            {/* BOTÓN 3: Descargar Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-emerald-500/20 transition-all"
              title={`Descargar archivo Excel: Reporte_Visitas_${cleanVendor}_${todayStr}.xlsx`}
            >
              <Download size={16} />
              <span>Descargar Excel</span>
            </button>

            {/* BOTÓN 4: Imprimir en Navegador */}
            <button
              type="button"
              onClick={handlePrintHTML}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition-all"
              title="Abrir vista de impresión / diálogo"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
