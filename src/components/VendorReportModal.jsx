import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
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
  FileCode,
  Layers,
  ArrowUpRight,
  Banknote,
  Trash2
} from 'lucide-react';
import { addVisitRecord, ALL_ROUTES } from '../lib/db';
import { LOGO_DATA_URI, LOGO_URL } from '../lib/logo';
import { getCashReportsForVendor, syncCashFromVisits, createNewCashReport, deleteCashReport } from '../lib/cashCollections';
import { getLocalDateString } from '../lib/dateUtils';

const CHART_PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

export default function VendorReportModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  visits = [], 
  vendors = [],
  onVisitAdded,
  onOpenCashModal
}) {
  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';
  const todayStr = getLocalDateString();

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
    const today = getLocalDateString();
    const [y, m, d] = today.split('-').map(Number);
    const dateObj = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
    const day = dateObj.getDay();
    const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    dateObj.setDate(diff);
    return getLocalDateString(dateObj);
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = getLocalDateString();
    return today.slice(0, 7);
  });

  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Metadata overrides (prefilled but customizable)
  const currentVendorData = vendors.find(v => v.name === selectedVendorName) || currentUser;
  const [routeInput, setRouteInput] = useState(currentVendorData?.route || 'Chiquimula II #63');
  const [teamGoalInput, setTeamGoalInput] = useState(50000);
  
  // Tab selector for interactive chart preview in modal: 'commitment' | 'sales_sector' | 'collections_sector'
  const [chartActiveTab, setChartActiveTab] = useState('commitment');

  // Helper key to store and recover vendor commitment across sessions
  const getCommitmentKey = (vendor, period) => `olam_commitment_${vendor || 'default'}_${period || 'daily'}`;

  const [commitmentGoalInput, setCommitmentGoalInput] = useState(() => {
    const key = `olam_commitment_${selectedVendorName || currentUser?.name || 'default'}_daily`;
    const saved = localStorage.getItem(key);
    return saved && Number(saved) > 0 ? Number(saved) : 17000;
  });

  // Handler to update and persist commitment goal directly
  const handleUpdateCommitment = (val) => {
    const num = Number(val) || 0;
    setCommitmentGoalInput(num);
    const key = getCommitmentKey(selectedVendorName, periodType);
    localStorage.setItem(key, String(num));
  };

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
    const key = getCommitmentKey(selectedVendorName, periodType);
    const saved = localStorage.getItem(key);
    if (saved && Number(saved) > 0) {
      setCommitmentGoalInput(Number(saved));
    } else {
      if (periodType === 'daily') {
        setCommitmentGoalInput(17000);
      } else if (periodType === 'weekly') {
        setCommitmentGoalInput(85000);
      } else if (periodType === 'monthly') {
        setCommitmentGoalInput(340000);
      }
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
      const [sy, sm, sd] = selectedWeekStart.split('-').map(Number);
      const startDateObj = new Date(sy, (sm || 1) - 1, sd || 1, 12, 0, 0);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + 6);
      end = getLocalDateString(endDateObj);
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

  const [cashRefreshTick, setCashRefreshTick] = useState(0);

  // Listener para actualización en tiempo real cuando se guarda un cobro en efectivo
  useEffect(() => {
    const handleCashReportsChanged = () => {
      setCashRefreshTick(prev => prev + 1);
    };
    window.addEventListener('olam_cash_reports_changed', handleCashReportsChanged);
    return () => window.removeEventListener('olam_cash_reports_changed', handleCashReportsChanged);
  }, []);

  // Sincronizar visitas con cobros en efectivo y obtener reportes correspondientes
  const vendorCashReports = useMemo(() => {
    if (!selectedVendorName) return [];
    try {
      syncCashFromVisits(filteredVisits, selectedVendorName);
      const allForVendor = getCashReportsForVendor(selectedVendorName);
      
      if (periodType === 'daily') {
        const dailyMatches = allForVendor.filter(r => r.date === selectedDate);
        // Si hay del día exacto mostrarlos; de lo contrario si hay de hoy
        if (dailyMatches.length > 0) return dailyMatches;
        const todayMatches = allForVendor.filter(r => r.date === todayStr);
        return todayMatches.length > 0 ? todayMatches : allForVendor.slice(0, 3);
      } else if (periodType === 'weekly') {
        const [sy, sm, sd] = selectedWeekStart.split('-').map(Number);
        const startDateObj = new Date(sy, (sm || 1) - 1, sd || 1, 12, 0, 0);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(startDateObj.getDate() + 6);
        const endStr = getLocalDateString(endDateObj);
        return allForVendor.filter(r => r.date >= selectedWeekStart && r.date <= endStr);
      } else if (periodType === 'monthly') {
        return allForVendor.filter(r => r.date && r.date.startsWith(selectedMonth));
      } else if (periodType === 'custom') {
        return allForVendor.filter(r => r.date >= customStartDate && r.date <= customEndDate);
      }
      return allForVendor;
    } catch (e) {
      console.error('Error al obtener reportes de cobros en efectivo:', e);
      return [];
    }
  }, [selectedVendorName, filteredVisits, periodType, selectedDate, selectedWeekStart, selectedMonth, customStartDate, customEndDate, cashRefreshTick]);

  // Manejador para borrar cuadro de cobros en efectivo si se guardó por error
  const handleDeleteCashReport = (reportId, reportDate, index) => {
    const confirmMsg = `¿Estás seguro de que deseas eliminar este cuadro de cobros en efectivo?\n\nFecha: ${reportDate || 'Sin fecha'}\n${vendorCashReports.length > 1 ? `Cuadro #${index + 1}` : ''}\n\nEsta acción no se puede deshacer.`;
    if (window.confirm(confirmMsg)) {
      deleteCashReport(reportId);
      setCashRefreshTick(prev => prev + 1);
    }
  };

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
    let totalSalesPresencial = 0;
    let totalSalesTelemarketing = 0;
    let ordersPersonal = 0;
    let ordersPhone = 0;

    // Collections breakdown
    let totalCollections = 0;
    let totalCollectionsPresencial = 0;
    let totalCollectionsTelemarketing = 0;
    let collectionsCash = 0;
    let collectionsTransfer = 0;
    let collectionsCheck = 0;
    let collectionsBoleta = 0;

    // Telemarketing calls
    let telemarketingCalls = 0;

    // Sector maps: Global and separated by modality
    const salesBySectorMap = {};
    const salesPresencialBySector = {};
    const salesTelemarketingBySector = {};

    const collectionsBySectorMap = {};
    const collectionsPresencialBySector = {};
    const collectionsTelemarketingBySector = {};

    filteredVisits.forEach(v => {
      const sec = v.sector || v.route || routeInput || 'General';
      const vType = (v.visitType || 'presencial').toLowerCase();
      const sType = (v.saleType || '').toLowerCase();
      const isTele = vType.includes('tele') || vType.includes('tel') || sType.includes('tele') || sType.includes('tel');

      // Sales calculation
      const saleVal = Number(v.saleAmount) || 0;
      if (v.hasSale || saleVal > 0) {
        totalSales += saleVal;
        salesBySectorMap[sec] = (salesBySectorMap[sec] || 0) + saleVal;

        if (isTele) {
          ordersPhone++;
          totalSalesTelemarketing += saleVal;
          salesTelemarketingBySector[sec] = (salesTelemarketingBySector[sec] || 0) + saleVal;
        } else {
          ordersPersonal++;
          totalSalesPresencial += saleVal;
          salesPresencialBySector[sec] = (salesPresencialBySector[sec] || 0) + saleVal;
        }
      }

      // Collections calculation
      const collVal = Number(v.collectionAmount) || 0;
      const cCash = Number(v.collectionCash) || 0;
      const cTrans = Number(v.collectionTransfer) || 0;
      const cCheck = Number(v.collectionCheck) || 0;
      const cBoleta = Number(v.collectionBoleta) || 0;

      collectionsCash += cCash;
      collectionsTransfer += cTrans;
      collectionsCheck += cCheck;
      collectionsBoleta += cBoleta;

      const computedColl = (cCash + cTrans + cCheck + cBoleta);
      const effectiveCollVal = (computedColl > 0 ? computedColl : collVal);

      if (v.hasCollection || effectiveCollVal > 0) {
        totalCollections += effectiveCollVal;
        collectionsBySectorMap[sec] = (collectionsBySectorMap[sec] || 0) + effectiveCollVal;

        if (isTele) {
          totalCollectionsTelemarketing += effectiveCollVal;
          collectionsTelemarketingBySector[sec] = (collectionsTelemarketingBySector[sec] || 0) + effectiveCollVal;
        } else {
          totalCollectionsPresencial += effectiveCollVal;
          collectionsPresencialBySector[sec] = (collectionsPresencialBySector[sec] || 0) + effectiveCollVal;
        }
      }

      // Calls count
      if (isTele) {
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

    // Formatted array data for Recharts Pie Charts
    const salesPresencialChartData = Object.entries(salesPresencialBySector).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));

    const salesTelemarketingChartData = Object.entries(salesTelemarketingBySector).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));

    const collectionsPresencialChartData = Object.entries(collectionsPresencialBySector).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));

    const collectionsTelemarketingChartData = Object.entries(collectionsTelemarketingBySector).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));

    return {
      totalVisits,
      clientsVisited,
      newClients,
      ordersPersonal,
      ordersPhone,
      totalSales,
      totalSalesPresencial,
      totalSalesTelemarketing,
      collectionsCash,
      collectionsTransfer,
      collectionsCheck,
      collectionsBoleta,
      totalCollections,
      totalCollectionsPresencial,
      totalCollectionsTelemarketing,
      telemarketingCalls,
      effectiveVisits,
      effectivenessPercent,
      goalPercent,
      goalMet,
      collectionsBySectorMap,
      salesBySectorMap,
      salesPresencialBySector,
      salesTelemarketingBySector,
      collectionsPresencialBySector,
      collectionsTelemarketingBySector,
      salesPresencialChartData,
      salesTelemarketingChartData,
      collectionsPresencialChartData,
      collectionsTelemarketingChartData
    };
  }, [filteredVisits, commitmentGoalInput, routeInput]);

  // Generate HTML for printing or popup (matching and improving user template)
  const buildReportHTML = () => {
    const palette = ['#1e40af', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

    // Sector data prepared for Chart.js separated by modality
    const salesPresencialSectors = Object.keys(metrics.salesPresencialBySector);
    const salesPresencialLabels = salesPresencialSectors.length > 0 ? salesPresencialSectors : [routeInput || 'Ruta General'];
    const salesPresencialData = salesPresencialSectors.length > 0 
      ? salesPresencialSectors.map(s => Number((metrics.salesPresencialBySector[s] || 0).toFixed(2)))
      : [0];

    const salesTelemarketingSectors = Object.keys(metrics.salesTelemarketingBySector);
    const salesTelemarketingLabels = salesTelemarketingSectors.length > 0 ? salesTelemarketingSectors : ['Telemarketing'];
    const salesTelemarketingData = salesTelemarketingSectors.length > 0 
      ? salesTelemarketingSectors.map(s => Number((metrics.salesTelemarketingBySector[s] || 0).toFixed(2)))
      : [0];

    const collectionsPresencialSectors = Object.keys(metrics.collectionsPresencialBySector);
    const collectionsPresencialLabels = collectionsPresencialSectors.length > 0 ? collectionsPresencialSectors : [routeInput || 'Ruta General'];
    const collectionsPresencialData = collectionsPresencialSectors.length > 0 
      ? collectionsPresencialSectors.map(s => Number((metrics.collectionsPresencialBySector[s] || 0).toFixed(2)))
      : [0];

    const collectionsTelemarketingSectors = Object.keys(metrics.collectionsTelemarketingBySector);
    const collectionsTelemarketingLabels = collectionsTelemarketingSectors.length > 0 ? collectionsTelemarketingSectors : ['Telemarketing'];
    const collectionsTelemarketingData = collectionsTelemarketingSectors.length > 0 
      ? collectionsTelemarketingSectors.map(s => Number((metrics.collectionsTelemarketingBySector[s] || 0).toFixed(2)))
      : [0];

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

    // Preparar cuadros de Reporte Cobros en Efectivo (idéntico al formato PDF solicitado)
    const cashReportsHtml = (vendorCashReports && vendorCashReports.length > 0) ? `
      <div style="margin-top: 25px; margin-bottom: 25px;">
        <div style="font-weight: 800; font-size: 13px; color: #1e40af; text-transform: uppercase; border-bottom: 2px solid #bfdbfe; padding-bottom: 6px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
          <span>Reporte Cobros en Efectivo (${vendorCashReports.length} ${vendorCashReports.length === 1 ? 'cuadro preparado' : 'cuadros preparados'})</span>
          <span style="font-size: 11px; color: #64748b; font-weight: normal;">Boletas & Depósitos Bancarios</span>
        </div>

        <div style="display: grid; grid-template-columns: ${vendorCashReports.length > 1 ? 'repeat(auto-fit, minmax(420px, 1fr))' : '1fr'}; gap: 20px;">
          ${vendorCashReports.map((cr, idx) => {
            const items = cr.rows || cr.items || [];
            const totalMonto = items.reduce((acc, it) => acc + (Number(it.monto) || 0), 0);
            return `
              <div style="border: 2px solid #1e3a8a; border-radius: 8px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                <div style="background: #1e3a8a; color: white; padding: 9px 14px; font-weight: bold; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                  <span>Reporte Cobros en Efectivo ${vendorCashReports.length > 1 ? `#${idx + 1}` : ''}</span>
                  <span style="background: rgba(255,255,255,0.22); padding: 2px 8px; border-radius: 4px; font-size: 11px;">Fecha: ${cr.date || '—'}</span>
                </div>

                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
                  <thead>
                    <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; color: #1e293b;">
                      <th style="padding: 7px 10px; width: 45px; text-align: center; border-right: 1px solid #e2e8f0;">No.</th>
                      <th style="padding: 7px 10px; border-right: 1px solid #e2e8f0;">Boleta</th>
                      <th style="padding: 7px 10px; border-right: 1px solid #e2e8f0;">Banco</th>
                      <th style="padding: 7px 10px; text-align: right;">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map(item => `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 10px; text-align: center; font-weight: bold; color: #64748b; border-right: 1px solid #e2e8f0;">${item.no}</td>
                        <td style="padding: 6px 10px; font-family: monospace; font-size: 12px; border-right: 1px solid #e2e8f0;">${item.boleta || '—'}</td>
                        <td style="padding: 6px 10px; border-right: 1px solid #e2e8f0;">${item.banco || '—'}</td>
                        <td style="padding: 6px 10px; text-align: right; font-weight: bold; color: #0f172a;">Q${Number(item.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    `).join('')}
                    <tr style="background: #f8fafc; border-top: 2px solid #cbd5e1; font-weight: bold;">
                      <td colspan="3" style="padding: 8px 10px; text-align: right; text-transform: uppercase; border-right: 1px solid #e2e8f0; font-size: 12px;">Total</td>
                      <td style="padding: 8px 10px; text-align: right; color: #059669; font-size: 13px;">Q${totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>

                <div style="padding: 10px 14px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #334155;">
                  <strong>Observaciones:</strong>
                  <div style="margin-top: 4px; color: #475569; font-style: italic; white-space: pre-wrap;">${cr.observations || 'Sin observaciones'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

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

  ${cashReportsHtml}

  <div class="goal-chart">
    <h3>CUMPLIMIENTO DE COMPROMISO DE VENTA</h3>
    <div style="position:relative; height:120px; width:100%;">
      <canvas id="goalChart"></canvas>
    </div>
    <div style="text-align: center; margin-top: 12px; font-size: 12px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
      <strong>Compromiso Indicado:</strong> <span class="currency">Q${Number(commitmentGoalInput).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span> | 
      <strong>Total Alcanzado:</strong> <span class="currency">Q${metrics.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span> | 
      <strong style="color: ${metrics.goalMet ? '#059669' : '#d97706'}; font-size:13px;">
        ${metrics.goalMet ? '✓ Meta Cumplida' : 'En Progreso'} (${metrics.goalPercent}%)
      </strong>
      <div style="font-size:11px; color:#64748b; margin-top:5px;">
        Presencial: <strong>Q${metrics.totalSalesPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong> &nbsp;•&nbsp; 
        Telemarketing: <strong>Q${metrics.totalSalesTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong> &nbsp;•&nbsp; 
        ${metrics.totalSales >= commitmentGoalInput 
          ? `<span style="color:#059669; font-weight:bold;">¡Meta superada por Q${(metrics.totalSales - commitmentGoalInput).toLocaleString('es-GT', { minimumFractionDigits: 2 })}!</span>` 
          : `<span style="color:#d97706; font-weight:bold;">Faltan Q${(commitmentGoalInput - metrics.totalSales).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>`}
      </div>
    </div>
  </div>

  <div style="margin-top:22px; margin-bottom:8px; font-weight:800; font-size:12px; color:#1e40af; text-transform:uppercase; border-bottom:2px solid #bfdbfe; padding-bottom:4px;">
    VENTAS POR SECTOR (PRESENCIAL Y TELEMARKETING)
  </div>
  <div class="charts-container">
    <div class="chart-box">
      <h3>VENTAS PRESENCIALES POR SECTOR (Total: Q${metrics.totalSalesPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })})</h3>
      <div style="position:relative; height:210px; width:100%;">
        <canvas id="salesPresencialChart"></canvas>
      </div>
    </div>
    <div class="chart-box">
      <h3>VENTAS TELEMARKETING POR SECTOR (Total: Q${metrics.totalSalesTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })})</h3>
      <div style="position:relative; height:210px; width:100%;">
        <canvas id="salesTelemarketingChart"></canvas>
      </div>
    </div>
  </div>

  <div style="margin-top:22px; margin-bottom:8px; font-weight:800; font-size:12px; color:#059669; text-transform:uppercase; border-bottom:2px solid #bbf7d0; padding-bottom:4px;">
    COBROS POR SECTOR (PRESENCIAL Y TELEMARKETING)
  </div>
  <div class="charts-container">
    <div class="chart-box">
      <h3>COBROS PRESENCIALES POR SECTOR (Total: Q${metrics.totalCollectionsPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })})</h3>
      <div style="position:relative; height:210px; width:100%;">
        <canvas id="collectionsPresencialChart"></canvas>
      </div>
    </div>
    <div class="chart-box">
      <h3>COBROS TELEMARKETING POR SECTOR (Total: Q${metrics.totalCollectionsTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })})</h3>
      <div style="position:relative; height:210px; width:100%;">
        <canvas id="collectionsTelemarketingChart"></canvas>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Documento Oficial Generado por el Sistema de Control de Rendimiento • Droguería El Olam • Fecha de Emisión: ${new Date().toLocaleString('es-GT')}</p>
  </div>

  <script>
    // 1. Goal Bar Chart
    const goalCanvas = document.getElementById('goalChart');
    if (goalCanvas) {
      new Chart(goalCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Compromiso', 'Alcanzado Total', 'Venta Presencial', 'Venta Telemarketing'],
          datasets: [{
            data: [
              ${Number(commitmentGoalInput)}, 
              ${Number(metrics.totalSales.toFixed(2))},
              ${Number(metrics.totalSalesPresencial.toFixed(2))},
              ${Number(metrics.totalSalesTelemarketing.toFixed(2))}
            ],
            backgroundColor: ['#2563eb', '${metrics.goalMet ? '#10b981' : '#f59e0b'}', '#3b82f6', '#8b5cf6'],
            borderColor: ['#1d4ed8', '${metrics.goalMet ? '#059669' : '#d97706'}', '#2563eb', '#7c3aed'],
            borderWidth: 1.5,
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
                label: function(ctx) {
                  return 'Q' + ctx.parsed.x.toLocaleString('es-GT', { minimumFractionDigits: 2 });
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
    }

    // Helper function to build safe doughnut/pie charts
    function makeSafePie(canvasId, labels, data, colors) {
      const el = document.getElementById(canvasId);
      if (!el) return;
      const hasData = Array.isArray(data) && data.some(v => Number(v) > 0);
      const chartLabels = hasData ? labels : ['Sin Registros'];
      const chartData = hasData ? data : [1];
      const chartColors = hasData ? colors.slice(0, chartLabels.length) : ['#e2e8f0'];

      new Chart(el.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
            backgroundColor: chartColors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: 'bottom', 
              labels: { font: { size: 9 }, padding: 8 } 
            },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  if (!hasData) return 'Sin registros en este período';
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const val = ctx.parsed;
                  const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ctx.label + ': Q' + val.toLocaleString('es-GT', { minimumFractionDigits: 2 }) + ' (' + percentage + '%)';
                }
              }
            }
          }
        }
      });
    }

    // Initialize the 4 pie charts
    makeSafePie('salesPresencialChart', ${JSON.stringify(salesPresencialLabels)}, ${JSON.stringify(salesPresencialData)}, ${JSON.stringify(palette)});
    makeSafePie('salesTelemarketingChart', ${JSON.stringify(salesTelemarketingLabels)}, ${JSON.stringify(salesTelemarketingData)}, ${JSON.stringify(palette)});
    makeSafePie('collectionsPresencialChart', ${JSON.stringify(collectionsPresencialLabels)}, ${JSON.stringify(collectionsPresencialData)}, ${JSON.stringify(palette)});
    makeSafePie('collectionsTelemarketingChart', ${JSON.stringify(collectionsTelemarketingLabels)}, ${JSON.stringify(collectionsTelemarketingData)}, ${JSON.stringify(palette)});
  </script>
</body>
</html>`;
  };

  // Helper to generate clean vendor name
  const getCleanVendorName = () => {
    // Para vendedores, usar siempre su nombre de usuario de forma canónica
    const rawVendor = (!isAdmin && currentUser?.name)
      ? currentUser.name
      : (selectedVendorName || currentUser?.name || 'Vendedor');
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
        `Período: ${dateRangeText}   |   Ventas: Q${metrics.totalSales.toFixed(2)}   |   Cobros: Q${metrics.totalCollections.toFixed(2)}   |   Efectivas: ${metrics.effectiveVisits}/${metrics.totalVisits} (${metrics.effectivenessPercent}%)`,
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

      // Tablas oficiales de Reporte Cobros en Efectivo (idéntico al formato PDF solicitado)
      if (vendorCashReports && vendorCashReports.length > 0) {
        vendorCashReports.forEach((cr, rIdx) => {
          let lastY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 40;
          if (lastY > 155) {
            doc.addPage();
            lastY = 18;
          }

          doc.setFillColor(30, 58, 138);
          doc.rect(14, lastY, 269, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text(`REPORTE COBROS EN EFECTIVO — FECHA: ${cr.date || todayStr} (${rIdx + 1} de ${vendorCashReports.length})`, 17, lastY + 4.8);

          const cashItems = cr.rows || cr.items || [];
          const cashTableBody = cashItems.map(it => [
            it.no,
            it.boleta || '—',
            it.banco || '—',
            `Q${Number(it.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ]);

          const totalMonto = cashItems.reduce((acc, it) => acc + (Number(it.monto) || 0), 0);
          cashTableBody.push(['', 'Total', '', `Q${totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);

          autoTable(doc, {
            startY: lastY + 7,
            head: [['No.', 'Boleta', 'Banco', 'Monto']],
            body: cashTableBody,
            theme: 'grid',
            headStyles: {
              fillColor: [51, 65, 85],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 7.5
            },
            styles: {
              fontSize: 7.5,
              cellPadding: 1.8
            },
            columnStyles: {
              0: { cellWidth: 14, halign: 'center' },
              1: { cellWidth: 60 },
              2: { cellWidth: 100 },
              3: { cellWidth: 45, halign: 'right' }
            }
          });

          if (cr.observations) {
            const obsY = doc.lastAutoTable.finalY + 4;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text(`Observaciones: ${cr.observations}`, 14, obsY);
          }
        });
      }

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
        { 'Métrica / Indicador': 'PERÍODO', 'Valor': dateRangeText },
        { 'Métrica / Indicador': 'META DEL EQUIPO', 'Valor': `Q${Number(teamGoalInput).toFixed(2)}` },
        { 'Métrica / Indicador': 'COMPROMISO DE VENTA', 'Valor': `Q${Number(commitmentGoalInput).toFixed(2)}` },
        { 'Métrica / Indicador': 'VENTAS TOTALES ALCANZADAS', 'Valor': `Q${metrics.totalSales.toFixed(2)}` },
        { 'Métrica / Indicador': '  - Ventas Presenciales en Ruta', 'Valor': `Q${metrics.totalSalesPresencial.toFixed(2)}` },
        { 'Métrica / Indicador': '  - Ventas por Telemarketing', 'Valor': `Q${metrics.totalSalesTelemarketing.toFixed(2)}` },
        { 'Métrica / Indicador': '% CUMPLIMIENTO META', 'Valor': `${metrics.goalPercent}%` },
        { 'Métrica / Indicador': 'TOTAL COBROS RECAUDADOS', 'Valor': `Q${metrics.totalCollections.toFixed(2)}` },
        { 'Métrica / Indicador': '  - Cobros Presenciales en Ruta', 'Valor': `Q${metrics.totalCollectionsPresencial.toFixed(2)}` },
        { 'Métrica / Indicador': '  - Cobros por Telemarketing', 'Valor': `Q${metrics.totalCollectionsTelemarketing.toFixed(2)}` },
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

      // 3. Cash Collections Sheet (Reporte Cobros en Efectivo)
      if (vendorCashReports && vendorCashReports.length > 0) {
        const cashRows = [];
        vendorCashReports.forEach((cr, idx) => {
          (cr.rows || cr.items || []).forEach(it => {
            cashRows.push({
              'Reporte #': idx + 1,
              'Fecha': cr.date || '',
              'No.': it.no,
              'Boleta': it.boleta || '',
              'Banco': it.banco || '',
              'Monto (Q)': Number(it.monto || 0),
              'Observaciones': cr.observaciones || cr.observations || ''
            });
          });
        });
        if (cashRows.length > 0) {
          const wsCash = XLSX.utils.json_to_sheet(cashRows);
          wsCash['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 20 }, { wch: 32 }, { wch: 16 }, { wch: 40 }];
          XLSX.utils.book_append_sheet(wb, wsCash, 'Cobros_Efectivo');
        }
      }

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
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap"
                title={`Descargar archivo Excel: Reporte_Visitas_${cleanVendor}_${todayStr}.xlsx`}
              >
                <Download size={14} />
                <span>Descargar Excel</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
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
                      <option key={v.id} value={v.name}>{v.name}</option>
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

            </div>

            {/* Goals Configuration row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    Compromiso de Venta (Meta a Evaluar en Quetzales)
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Guardado auto.</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Q</span>
                  <input
                    type="number"
                    value={commitmentGoalInput}
                    onChange={(e) => handleUpdateCommitment(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Rápido:</span>
                  {[15000, 17000, 20000, 25000, 30000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleUpdateCommitment(amt)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition-all ${
                        commitmentGoalInput === amt 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Q{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
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

          {/* SECCIÓN OFICIAL: REPORTE COBROS EN EFECTIVO (UBICADA ANTES DE LAS GRÁFICAS) */}
          <div className="bg-white dark:bg-slate-900 border-2 border-blue-900/20 dark:border-blue-700/40 rounded-3xl p-4 sm:p-6 shadow-md space-y-4">
            
            {/* Header del bloque con botones de acción */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Banknote size={20} />
                  </span>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                      Reporte Cobros en Efectivo
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {vendorCashReports.length} {vendorCashReports.length === 1 ? 'Reporte' : 'Reportes'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Depósitos bancarios y boletas trasladadas del registro de cobro en efectivo
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones: Editar manualmente y Crea nuevo reporte Cobros en Efectivo */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenCashModal && onOpenCashModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm"
                  title="Editar líneas, boletas, bancos y observaciones"
                >
                  <span>Editar manualmente</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenCashModal && onOpenCashModal()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-blue-500/20"
                  title="Crear otro cuadro adicional con selector de fecha para depósitos al día siguiente"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>Crea nuevo reporte Cobros en Efectivo</span>
                </button>
              </div>
            </div>

            {/* Listado de cuadros o mensaje cuando no hay aún */}
            {vendorCashReports.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Banknote size={36} className="mx-auto text-slate-400 mb-2 opacity-60" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No hay reportes de cobros en efectivo registrados para este período
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Los cobros en efectivo ingresados en el registro de visitas se transfieren automáticamente con su correlativo, o puedes crear un cuadro nuevo con fecha personalizada.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenCashModal && onOpenCashModal()}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Plus size={14} />
                  <span>Crea nuevo reporte Cobros en Efectivo</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendorCashReports.map((cr, idx) => {
                  const items = cr.rows || cr.items || [];
                  const totalMonto = items.reduce((acc, it) => acc + (Number(it.monto) || 0), 0);
                  return (
                    <div 
                      key={cr.id || idx}
                      className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
                    >
                      {/* Cabecera del cuadro igual al PDF */}
                      <div>
                        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm tracking-wide">
                              Reporte Cobros en Efectivo {vendorCashReports.length > 1 ? `(#${idx + 1})` : ''}
                            </span>
                            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-semibold">
                              Fecha: {cr.date || todayStr}
                            </span>
                          </div>

                          {/* Botón de Borrado si el vendedor guardó por error */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCashReport(cr.id, cr.date, idx)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-600 active:scale-95 text-white text-[11px] font-bold transition-all shadow-sm border border-red-400/40 cursor-pointer"
                            title="Eliminar este cuadro de cobros si se guardó por error"
                          >
                            <Trash2 size={13} className="shrink-0" />
                            <span>Borrar cuadro</span>
                          </button>
                        </div>

                        {/* Tabla estructurada conforme al PDF */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                <th className="py-2 px-3 w-12 text-center border-r border-slate-200 dark:border-slate-700">No.</th>
                                <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">Boleta</th>
                                <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">Banco</th>
                                <th className="py-2 px-3 text-right">Monto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {items.map((it) => (
                                <tr key={it.id || it.no} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="py-2 px-3 text-center font-bold text-slate-400 border-r border-slate-200 dark:border-slate-800">
                                    {it.no}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                                    {it.boleta ? it.boleta : <span className="text-slate-400 italic text-[11px]">Por ingresar</span>}
                                  </td>
                                  <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                      {it.banco || '—'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                                    Q{Number(it.monto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                              {/* Fila Total */}
                              <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-black">
                                <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                                  Total
                                </td>
                                <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 text-sm font-black">
                                  Q{totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Observaciones al pie */}
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Observaciones:</span>
                        <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                          {cr.observations || 'Sin observaciones registradas.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* 4. SECCIÓN INTERACTIVA DE GRÁFICAS: COMPROMISO, VENTAS Y COBROS POR SECTOR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={16} className="text-blue-600 dark:text-blue-400" />
                  Rendimiento Gráfico: Compromiso & Sectores
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Visualización gráfica del compromiso indicado y desglose por sector en presencial y telemarketing
                </p>
              </div>

              {/* Chart Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setChartActiveTab('commitment')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    chartActiveTab === 'commitment'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Target size={13} />
                  <span>Compromiso de Venta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartActiveTab('sales_sector')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    chartActiveTab === 'sales_sector'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <PieIcon size={13} />
                  <span>Ventas por Sector</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartActiveTab('collections_sector')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    chartActiveTab === 'collections_sector'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <PieIcon size={13} />
                  <span>Cobros por Sector</span>
                </button>
              </div>
            </div>

            {/* TAB 1: CUMPLIMIENTO DE COMPROMISO DE VENTA */}
            {chartActiveTab === 'commitment' && (
              <div className="space-y-4">
                {/* Comparison Card */}
                <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-slate-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-slate-900/40 p-4 sm:p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                        Meta vs Real Alcanzado ({selectedVendorName})
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                          Q{metrics.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-400">
                          alcanzados de Q{Number(commitmentGoalInput).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-bold block text-slate-700 dark:text-slate-200">
                          {metrics.goalPercent}% Logrado
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          metrics.goalMet 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {metrics.goalMet ? '✓ Meta Cumplida' : 'En Progreso'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-4 sm:h-5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
                      {/* Presencial segment */}
                      <div 
                        className="h-full bg-blue-600 rounded-l-full transition-all duration-700"
                        style={{ 
                          width: commitmentGoalInput > 0 
                            ? `${Math.min(100, (metrics.totalSalesPresencial / commitmentGoalInput) * 100)}%` 
                            : '0%' 
                        }}
                        title={`Venta Presencial: Q${metrics.totalSalesPresencial.toFixed(2)}`}
                      />
                      {/* Telemarketing segment */}
                      <div 
                        className="h-full bg-purple-600 transition-all duration-700"
                        style={{ 
                          width: commitmentGoalInput > 0 
                            ? `${Math.min(100, (metrics.totalSalesTelemarketing / commitmentGoalInput) * 100)}%` 
                            : '0%' 
                        }}
                        title={`Venta Telemarketing: Q${metrics.totalSalesTelemarketing.toFixed(2)}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
                      <span>Inicio (Q0)</span>
                      <span>
                        {metrics.totalSales >= commitmentGoalInput 
                          ? `🎉 Meta superada por Q${(metrics.totalSales - commitmentGoalInput).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` 
                          : `Faltan Q${(commitmentGoalInput - metrics.totalSales).toLocaleString('es-GT', { minimumFractionDigits: 2 })} para la meta`}
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">Meta: Q{Number(commitmentGoalInput).toLocaleString('es-GT')}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-breakdown badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                        Venta Presencial (Ruta)
                      </span>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        Q{metrics.totalSalesPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {metrics.totalSales > 0 ? ((metrics.totalSalesPresencial / metrics.totalSales) * 100).toFixed(1) : 0}%
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
                        Venta Telemarketing (Llamadas)
                      </span>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        Q{metrics.totalSalesTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {metrics.totalSales > 0 ? ((metrics.totalSalesTelemarketing / metrics.totalSales) * 100).toFixed(1) : 0}%
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <DollarSign size={12} />
                        Total Recaudado en Cobros
                      </span>
                      <div className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Q{metrics.totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {metrics.effectiveVisits} efectivas
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VENTAS POR SECTOR (PRESENCIAL Y TELEMARKETING) */}
            {chartActiveTab === 'sales_sector' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Ventas Presenciales por Sector */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      Ventas Presenciales por Sector
                    </span>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-400">
                      Total: Q{metrics.totalSalesPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {metrics.salesPresencialChartData.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-xs text-slate-400 italic">
                      Sin ventas presenciales registradas en este período.
                    </div>
                  ) : (
                    <>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={metrics.salesPresencialChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {metrics.salesPresencialChartData.map((entry, index) => (
                                <Cell key={`cell-sp-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Venta']}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-2 divide-y divide-slate-200/60 dark:divide-slate-700/60 text-xs">
                        {metrics.salesPresencialChartData.map((item, idx) => {
                          const pct = metrics.totalSalesPresencial > 0 
                            ? ((item.value / metrics.totalSalesPresencial) * 100).toFixed(1) 
                            : 0;
                          return (
                            <div key={item.name} className="py-1.5 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                                />
                                {item.name}
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                Q{item.value.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Ventas Telemarketing por Sector */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                      Ventas Telemarketing por Sector
                    </span>
                    <span className="text-xs font-black text-purple-700 dark:text-purple-400">
                      Total: Q{metrics.totalSalesTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {metrics.salesTelemarketingChartData.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-xs text-slate-400 italic">
                      Sin ventas por telemarketing registradas en este período.
                    </div>
                  ) : (
                    <>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={metrics.salesTelemarketingChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {metrics.salesTelemarketingChartData.map((entry, index) => (
                                <Cell key={`cell-st-${index}`} fill={CHART_PALETTE[(index + 3) % CHART_PALETTE.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Venta Telemarketing']}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-2 divide-y divide-slate-200/60 dark:divide-slate-700/60 text-xs">
                        {metrics.salesTelemarketingChartData.map((item, idx) => {
                          const pct = metrics.totalSalesTelemarketing > 0 
                            ? ((item.value / metrics.totalSalesTelemarketing) * 100).toFixed(1) 
                            : 0;
                          return (
                            <div key={item.name} className="py-1.5 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: CHART_PALETTE[(idx + 3) % CHART_PALETTE.length] }}
                                />
                                {item.name}
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                Q{item.value.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: COBROS POR SECTOR (PRESENCIAL Y TELEMARKETING) */}
            {chartActiveTab === 'collections_sector' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Cobros Presenciales por Sector */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      Cobros Presenciales en Ruta
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                      Total: Q{metrics.totalCollectionsPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {metrics.collectionsPresencialChartData.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-xs text-slate-400 italic">
                      Sin cobros presenciales registrados en este período.
                    </div>
                  ) : (
                    <>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={metrics.collectionsPresencialChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {metrics.collectionsPresencialChartData.map((entry, index) => (
                                <Cell key={`cell-cp-${index}`} fill={CHART_PALETTE[(index + 1) % CHART_PALETTE.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Cobro Presencial']}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-2 divide-y divide-slate-200/60 dark:divide-slate-700/60 text-xs">
                        {metrics.collectionsPresencialChartData.map((item, idx) => {
                          const pct = metrics.totalCollectionsPresencial > 0 
                            ? ((item.value / metrics.totalCollectionsPresencial) * 100).toFixed(1) 
                            : 0;
                          return (
                            <div key={item.name} className="py-1.5 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: CHART_PALETTE[(idx + 1) % CHART_PALETTE.length] }}
                                />
                                {item.name}
                              </span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                Q{item.value.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Cobros Telemarketing por Sector */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Cobros Telemarketing (Gestión Telefónica)
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                      Total: Q{metrics.totalCollectionsTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {metrics.collectionsTelemarketingChartData.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-xs text-slate-400 italic">
                      Sin cobros por telemarketing registrados en este período.
                    </div>
                  ) : (
                    <>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={metrics.collectionsTelemarketingChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {metrics.collectionsTelemarketingChartData.map((entry, index) => (
                                <Cell key={`cell-ct-${index}`} fill={CHART_PALETTE[(index + 4) % CHART_PALETTE.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Cobro Telemarketing']}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-2 divide-y divide-slate-200/60 dark:divide-slate-700/60 text-xs">
                        {metrics.collectionsTelemarketingChartData.map((item, idx) => {
                          const pct = metrics.totalCollectionsTelemarketing > 0 
                            ? ((item.value / metrics.totalCollectionsTelemarketing) * 100).toFixed(1) 
                            : 0;
                          return (
                            <div key={item.name} className="py-1.5 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: CHART_PALETTE[(idx + 4) % CHART_PALETTE.length] }}
                                />
                                {item.name}
                              </span>
                              <span className="font-bold text-amber-700 dark:text-amber-400">
                                Q{item.value.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}

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
