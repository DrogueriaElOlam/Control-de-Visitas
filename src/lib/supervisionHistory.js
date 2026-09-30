import { supabase } from './supabase';

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

    // Get viaticos history
    let viaticosQuery = supabase
      .from('supervision_viaticos_history')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (filters.fechaInicio) {
      viaticosQuery = viaticosQuery.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      viaticosQuery = viaticosQuery.lte('fecha_creacion', filters.fechaFin);
    }

    const { data: viaticosData, error: viaticosError } = await viaticosQuery;
    if (viaticosError) throw viaticosError;
    results.viaticos = viaticosData || [];

    // Get comisiones history
    let comisionesQuery = supabase
      .from('supervision_comisiones_history')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (filters.fechaInicio) {
      comisionesQuery = comisionesQuery.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      comisionesQuery = comisionesQuery.lte('fecha_creacion', filters.fechaFin);
    }

    const { data: comisionesData, error: comisionesError } = await comisionesQuery;
    if (comisionesError) throw comisionesError;
    results.comisiones = comisionesData || [];

    // Get recibos history
    let recibosQuery = supabase
      .from('supervision_recibos_history')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (filters.fechaInicio) {
      recibosQuery = recibosQuery.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      recibosQuery = recibosQuery.lte('fecha_creacion', filters.fechaFin);
    }

    const { data: recibosData, error: recibosError } = await recibosQuery;
    if (recibosError) throw recibosError;
    results.recibos = recibosData || [];

    // Get evaluaciones history
    let evaluacionesQuery = supabase
      .from('supervision_evaluaciones_history')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (filters.fechaInicio) {
      evaluacionesQuery = evaluacionesQuery.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      evaluacionesQuery = evaluacionesQuery.lte('fecha_creacion', filters.fechaFin);
    }

    const { data: evaluacionesData, error: evaluacionesError } = await evaluacionesQuery;
    if (evaluacionesError) throw evaluacionesError;
    results.evaluaciones = evaluacionesData || [];

    // Get visitas history
    let visitasQuery = supabase
      .from('supervision_visitas_history')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (filters.fechaInicio) {
      visitasQuery = visitasQuery.gte('fecha_creacion', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      visitasQuery = visitasQuery.lte('fecha_creacion', filters.fechaFin);
    }

    const { data: visitasData, error: visitasError } = await visitasQuery;
    if (visitasError) throw visitasError;
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
