import { supabase } from './supabase';

// Helper de paginación ilimitada para superar el tope por defecto de 1,000 filas de Supabase
async function fetchAllHistoryRows(tableName, filters = {}) {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select('*')
      .order('fecha_creacion', { ascending: false })
      .range(from, from + pageSize - 1);

    if (filters.fechaInicio) {
      query = query.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      query = query.lte('fecha_creacion', filters.fechaFin);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
      break;
    }
    allRows.push(...data);
    if (data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }
  return allRows;
}

/**
 * Save Viaticos to history
 */
export async function saveViaticosToHistory(viaticos) {
  console.log('Guardando viáticos en historial...', { viaticos: viaticos.length });

  try {
    const datos = {
      tipo: 'Viaticos',
      viaticos,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('supervision_viaticos_history')
      .insert({ datos })
      .select();

    if (error) {
      console.error('Error al guardar viáticos en historial:', error);
      throw error;
    }

    console.log('Viáticos guardados exitosamente en historial:', data);
    return data[0];
  } catch (error) {
    console.error('Error en saveViaticosToHistory:', error);
    throw error;
  }
}

/**
 * Save Comisiones to history
 */
export async function saveComisionesToHistory(comisiones, observaciones = '') {
  console.log('Guardando comisiones en historial...', { comisiones: comisiones.length });

  try {
    const datos = {
      tipo: 'Historial de Comisiones',
      comisiones,
      observaciones,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('supervision_comisiones_history')
      .insert({ datos })
      .select();

    if (error) {
      console.error('Error al guardar comisiones en historial:', error);
      throw error;
    }

    console.log('Comisiones guardadas exitosamente en historial:', data);
    return data[0];
  } catch (error) {
    console.error('Error en saveComisionesToHistory:', error);
    throw error;
  }
}

/**
 * Save Control de Recibos de Caja to history
 */
export async function saveRecibosToHistory(viaticos, recibos, observaciones = '') {
  console.log('Guardando recibos en historial...', { viaticos: viaticos.length, recibos: recibos.length });

  try {
    const datos = {
      tipo: 'Control de Recibos de Caja',
      viaticos,
      recibos,
      observaciones,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('supervision_recibos_history')
      .insert({ datos })
      .select();

    if (error) {
      console.error('Error al guardar recibos en historial:', error);
      throw error;
    }

    console.log('Recibos guardados exitosamente en historial:', data);
    return data[0];
  } catch (error) {
    console.error('Error en saveRecibosToHistory:', error);
    throw error;
  }
}

/**
 * Save Evaluacion de Vendedor to history
 */
export async function saveEvaluacionesToHistory(evaluaciones, observaciones = '') {
  console.log('Guardando evaluaciones en historial...', { evaluaciones: evaluaciones.length });

  try {
    const datos = {
      tipo: 'Evaluacion de Vendedor',
      evaluaciones,
      observaciones,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('supervision_evaluaciones_history')
      .insert({ datos })
      .select();

    if (error) {
      console.error('Error al guardar evaluaciones en historial:', error);
      throw error;
    }

    console.log('Evaluaciones guardadas exitosamente en historial:', data);
    return data[0];
  } catch (error) {
    console.error('Error en saveEvaluacionesToHistory:', error);
    throw error;
  }
}

/**
 * Save Visitas Proveedores to history
 */
export async function saveVisitasToHistory(visitas, observaciones = '') {
  console.log('Guardando visitas en historial...', { visitas: visitas.length });

  try {
    const datos = {
      tipo: 'Visitas Proveedores',
      visitas,
      observaciones,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('supervision_visitas_history')
      .insert({ datos })
      .select();

    if (error) {
      console.error('Error al guardar visitas en historial:', error);
      throw error;
    }

    console.log('Visitas guardadas exitosamente en historial:', data);
    return data[0];
  } catch (error) {
    console.error('Error en saveVisitasToHistory:', error);
    throw error;
  }
}

/**
 * Get all history records with optional filtering
 */
export async function getAllHistory(filters = {}) {
  console.log('Obteniendo historial con filtros:', filters);

  try {
    const results = {
      viaticos: [],
      comisiones: [],
      recibos: [],
      evaluaciones: [],
      visitas: []
    };

    const [viaticosData, comisionesData, recibosData, evaluacionesData, visitasData] = await Promise.all([
      fetchAllHistoryRows('supervision_viaticos_history', filters),
      fetchAllHistoryRows('supervision_comisiones_history', filters),
      fetchAllHistoryRows('supervision_recibos_history', filters),
      fetchAllHistoryRows('supervision_evaluaciones_history', filters),
      fetchAllHistoryRows('supervision_visitas_history', filters)
    ]);

    results.viaticos = viaticosData || [];
    results.comisiones = comisionesData || [];
    results.recibos = recibosData || [];
    results.evaluaciones = evaluacionesData || [];
    results.visitas = visitasData || [];

    console.log('Historial obtenido:', {
      viaticos: results.viaticos.length,
      comisiones: results.comisiones.length,
      recibos: results.recibos.length,
      evaluaciones: results.evaluaciones.length,
      visitas: results.visitas.length
    });

    return results;
  } catch (error) {
    console.error('Error al obtener historial:', error);
    throw error;
  }
}

/**
 * Get history by type
 */
export async function getHistoryByType(type, filters = {}) {
  console.log('Obteniendo historial por tipo:', type, filters);

  try {
    let tableName;
    switch (type) {
      case 'viaticos':
        tableName = 'supervision_viaticos_history';
        break;
      case 'comisiones':
        tableName = 'supervision_comisiones_history';
        break;
      case 'recibos':
        tableName = 'supervision_recibos_history';
        break;
      case 'evaluaciones':
        tableName = 'supervision_evaluaciones_history';
        break;
      case 'visitas':
        tableName = 'supervision_visitas_history';
        break;
      default:
        throw new Error(`Tipo de historial no válido: ${type}`);
    }

    let query = supabase
      .from(tableName)
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (filters.fechaInicio) {
      query = query.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      query = query.lte('fecha_creacion', filters.fechaFin);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error al obtener historial de ${type}:`, error);
      throw error;
    }

    console.log(`Historial de ${type} obtenido:`, data?.length || 0, 'registros');
    return data || [];
  } catch (error) {
    console.error('Error en getHistoryByType:', error);
    throw error;
  }
}

/**
 * Delete a history record
 */
export async function deleteHistoryRecord(type, id) {
  console.log('Eliminando registro de historial:', { type, id });

  try {
    let tableName;
    switch (type) {
      case 'viaticos':
        tableName = 'supervision_viaticos_history';
        break;
      case 'comisiones':
        tableName = 'supervision_comisiones_history';
        break;
      case 'recibos':
        tableName = 'supervision_recibos_history';
        break;
      case 'evaluaciones':
        tableName = 'supervision_evaluaciones_history';
        break;
      case 'visitas':
        tableName = 'supervision_visitas_history';
        break;
      default:
        throw new Error(`Tipo de historial no válido: ${type}`);
    }

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar registro:', error);
      throw error;
    }

    console.log('Registro eliminado exitosamente');
    return true;
  } catch (error) {
    console.error('Error en deleteHistoryRecord:', error);
    throw error;
  }
}

/**
 * Update a history record
 */
export async function updateHistoryRecord(type, id, datos) {
  console.log('Actualizando registro de historial:', { type, id });

  try {
    let tableName;
    switch (type) {
      case 'viaticos':
        tableName = 'supervision_viaticos_history';
        break;
      case 'comisiones':
        tableName = 'supervision_comisiones_history';
        break;
      case 'recibos':
        tableName = 'supervision_recibos_history';
        break;
      case 'evaluaciones':
        tableName = 'supervision_evaluaciones_history';
        break;
      case 'visitas':
        tableName = 'supervision_visitas_history';
        break;
      default:
        throw new Error(`Tipo de historial no válido: ${type}`);
    }

    const { data, error } = await supabase
      .from(tableName)
      .update({ datos })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error al actualizar registro:', error);
      throw error;
    }

    console.log('Registro actualizado exitosamente:', data);
    return data[0];
  } catch (error) {
    console.error('Error en updateHistoryRecord:', error);
    throw error;
  }
}
