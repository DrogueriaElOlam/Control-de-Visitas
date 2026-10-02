// Cash Collections & Bank Deposits layer for Droguería El Olam
// Manages "Reporte Cobros en Efectivo" with correlative, boleta, bank selection, amounts, and observations.

export const BANK_OPTIONS = [
  'Banco Agromercantil (BAM)',
  'Banco Industrial (Bi)',
  'Banco G&T Continental (G&T)',
  'Banco de America Central (BAC)'
];

const STORAGE_KEY = 'olam_cash_collection_reports_v2';

export function getAllCashReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(r => {
          const rows = (r.rows || r.items || []).map((row, idx) => ({
            ...row,
            no: idx + 1,
            monto: Number(row.monto) || 0,
            boleta: String(row.boleta || '').replace(/\D/g, '')
          }));
          const total = rows.reduce((acc, row) => acc + (Number(row.monto) || 0), 0);
          const obs = r.observaciones || r.observations || '';
          return {
            ...r,
            rows,
            items: rows,
            total,
            observaciones: obs,
            observations: obs
          };
        });
      }
    }
  } catch (e) {
    console.error('Error reading cash reports:', e);
  }
  return [];
}

export function saveAllCashReports(reports) {
  try {
    const normalized = (reports || []).map(r => {
      const rows = (r.rows || r.items || []).map((row, idx) => ({
        ...row,
        no: idx + 1,
        monto: Number(row.monto) || 0,
        boleta: String(row.boleta || '').replace(/\D/g, '')
      }));
      const total = rows.reduce((acc, row) => acc + (Number(row.monto) || 0), 0);
      const obs = r.observaciones || r.observations || '';
      return {
        ...r,
        rows,
        items: rows,
        total,
        observaciones: obs,
        observations: obs
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_cash_reports_changed', { detail: normalized }));
    }
  } catch (e) {
    console.error('Error saving cash reports:', e);
  }
}

// Get reports filtered by vendor and optional date
export function getCashReportsForVendor(vendorName, date = null) {
  const all = getAllCashReports();
  if (!vendorName) return all;
  
  const normVendor = vendorName.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  return all.filter(rep => {
    const repNorm = (rep.vendorName || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const vendorMatch = repNorm === normVendor || repNorm.includes(normVendor) || normVendor.includes(repNorm);
    if (!vendorMatch) return false;
    if (date) {
      return rep.date === date;
    }
    return true;
  });
}

// Create an empty new report structure
export function createNewCashReport(vendorName, date = null) {
  const reportDate = date || new Date().toISOString().split('T')[0];
  const all = getAllCashReports();

  // Create new unique report
  const newReport = {
    id: `cash_rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: 'Reporte Cobros en Efectivo',
    vendorName: vendorName || 'General',
    date: reportDate,
    rows: [
      {
        id: `row_${Date.now()}_1`,
        no: 1,
        boleta: '',
        banco: 'Banco Industrial (Bi)',
        monto: 0,
        clientName: ''
      }
    ],
    total: 0,
    observaciones: '',
    observations: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  newReport.items = newReport.rows;

  all.push(newReport);
  saveAllCashReports(all);
  return newReport;
}

// Directly record a cash collection coming from a registered visit
export function addCashRecordFromVisit({ vendorName, visitDate, monto, clientName, boleta = '', observations = '', visitId = '' }) {
  const cashNum = Number(monto) || 0;
  if (cashNum <= 0) return null;

  const date = visitDate || new Date().toISOString().split('T')[0];
  const vendor = vendorName || 'General';
  const allReports = getAllCashReports();

  const normVendor = vendor.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  let rep = allReports.find(r => {
    const rDate = r.date;
    const rVendor = (r.vendorName || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return rDate === date && (rVendor === normVendor || rVendor.includes(normVendor) || normVendor.includes(rVendor));
  });

  if (!rep) {
    rep = {
      id: `cash_rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: 'Reporte Cobros en Efectivo',
      vendorName: vendor,
      date: date,
      rows: [
        {
          id: `row_${Date.now()}_1`,
          no: 1,
          boleta: String(boleta || '').replace(/\D/g, ''),
          banco: 'Banco Industrial (Bi)',
          monto: cashNum,
          clientName: clientName || '',
          visitId: visitId || `vis_${Date.now()}`
        }
      ],
      total: cashNum,
      observaciones: observations ? `Cobro recaudado: ${clientName || 'Cliente'}` : '',
      observations: observations ? `Cobro recaudado: ${clientName || 'Cliente'}` : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    rep.items = rep.rows;
    allReports.push(rep);
  } else {
    rep.rows = rep.rows || rep.items || [];
    // Si la única fila existente tiene monto 0 y boleta vacía, reutilizarla
    if (rep.rows.length === 1 && (Number(rep.rows[0].monto) === 0 || !rep.rows[0].monto) && !rep.rows[0].boleta) {
      rep.rows[0].monto = cashNum;
      rep.rows[0].clientName = clientName || '';
      rep.rows[0].boleta = String(boleta || '').replace(/\D/g, '');
      rep.rows[0].visitId = visitId || `vis_${Date.now()}`;
    } else {
      // Verificar si ya existe este cobro por visitId o por cliente y monto exacto
      const exists = rep.rows.some(r => (visitId && r.visitId === visitId) || (clientName && r.clientName === clientName && Number(r.monto) === cashNum));
      if (!exists) {
        rep.rows.push({
          id: `row_${Date.now()}_${rep.rows.length + 1}`,
          no: rep.rows.length + 1,
          boleta: String(boleta || '').replace(/\D/g, ''),
          banco: 'Banco Industrial (Bi)',
          monto: cashNum,
          clientName: clientName || '',
          visitId: visitId || `vis_${Date.now()}`
        });
      }
    }

    rep.rows = rep.rows.map((r, idx) => ({ ...r, no: idx + 1 }));
    rep.total = rep.rows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
    rep.items = rep.rows;
    rep.observations = rep.observaciones;
    rep.updatedAt = new Date().toISOString();
  }

  saveAllCashReports(allReports);
  return rep;
}

// Save or update an existing report
export function saveCashReport(report) {
  if (!report || !report.id) return null;
  const all = getAllCashReports();
  
  const rows = (report.rows || report.items || []).map((r, idx) => ({
    ...r,
    no: idx + 1,
    monto: Number(r.monto) || 0,
    boleta: String(r.boleta || '').replace(/\D/g, '')
  }));

  const total = rows.reduce((sum, r) => sum + r.monto, 0);
  const obs = report.observaciones || report.observations || '';

  const updatedReport = {
    ...report,
    rows,
    items: rows,
    total,
    observaciones: obs,
    observations: obs,
    updatedAt: new Date().toISOString()
  };

  const idx = all.findIndex(r => r.id === report.id);
  if (idx !== -1) {
    all[idx] = updatedReport;
  } else {
    all.push(updatedReport);
  }

  saveAllCashReports(all);
  return updatedReport;
}

// Delete a report
export function deleteCashReport(reportId) {
  const all = getAllCashReports();
  const filtered = all.filter(r => r.id !== reportId);
  saveAllCashReports(filtered);
  return filtered;
}

// Automatically sync cash collections recorded in visits into cash reports
export function syncCashFromVisits(visits = [], currentVendorName = null) {
  if (!Array.isArray(visits) || visits.length === 0) return getAllCashReports();

  // Filter visits that collected cash
  const cashVisits = visits.filter(v => {
    const cash = Number(v.collectionCash || v.collectionAmounts?.efectivo || 0);
    return cash > 0;
  });

  cashVisits.forEach(v => {
    const vendor = v.vendorName || currentVendorName || 'General';
    const date = v.visitDate || (v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    const cashAmount = Number(v.collectionCash || v.collectionAmounts?.efectivo || 0);
    const visitId = String(v.id || v.clientName);

    addCashRecordFromVisit({
      vendorName: vendor,
      visitDate: date,
      monto: cashAmount,
      clientName: v.clientName,
      boleta: v.collectionBoleta || '',
      observations: v.observations || '',
      visitId: visitId
    });
  });

  return getAllCashReports();
}
