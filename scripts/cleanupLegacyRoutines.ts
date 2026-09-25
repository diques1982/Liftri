import { supabase } from '../lib/supabase';

/**
 * Limpia rutinas 'basura' creadas por el diseño antiguo del Planner.
 * Identifica rutinas llamadas "Entrenamiento Programado" que NO tienen programaciones activas.
 *
 * @param userId - ID del usuario autenticado
 * @param dryRun - Si es true, solo imprime lo que se borraría sin afectar la base de datos.
 * @returns - Un resumen de la operación.
 */
export const cleanupLegacyRoutines = async (userId: string, dryRun: boolean = true) => {
  console.log(`\n--- Iniciando ${dryRun ? 'DRY RUN de ' : ''}Limpieza de Legacy Routines ---`);
  
  try {
    // 1. Obtener todas las rutinas del usuario llamadas "Entrenamiento Programado"
    const { data: routines, error: fetchError } = await supabase
      .from('routines')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .eq('name', 'Entrenamiento Programado');

    if (fetchError) throw fetchError;

    if (!routines || routines.length === 0) {
      console.log('✅ No se encontraron rutinas legacy. La base de datos está limpia.');
      return { deletedCount: 0 };
    }

    console.log(`🔍 Se encontraron ${routines.length} rutinas con el nombre "Entrenamiento Programado".`);

    // 2. Verificar si tienen programación activa
    const { data: activeSchedules, error: schedError } = await supabase
      .from('scheduled_workouts')
      .select('routine_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (schedError) throw schedError;

    const activeRoutineIds = new Set(activeSchedules?.map(s => s.routine_id) || []);
    
    // 3. Filtrar las que NO están activas
    const routinesToDelete = routines.filter(r => !activeRoutineIds.has(r.id));
    
    console.log(`⚠️  ${activeRoutineIds.size} rutinas están programadas activamente y serán omitidas.`);
    console.log(`🗑️  ${routinesToDelete.length} rutinas son clones basura y pueden ser eliminadas.`);

    if (dryRun) {
      console.log('--- Fin del DRY RUN. Pasa dryRun=false para ejecutar el borrado real. ---\n');
      return { deletedCount: routinesToDelete.length, dryRun: true };
    }

    if (routinesToDelete.length === 0) {
      return { deletedCount: 0 };
    }

    // 4. Ejecutar el borrado en cascada (manual por seguridad)
    const idsToDelete = routinesToDelete.map(r => r.id);
    let totalDeleted = 0;

    for (const routineId of idsToDelete) {
      // Borrar routine_exercises
      const { data: days } = await supabase.from('routine_days').select('id').eq('routine_id', routineId);
      if (days && days.length > 0) {
        const dayIds = days.map(d => d.id);
        await supabase.from('routine_exercises').delete().in('routine_day_id', dayIds);
      }
      // Borrar routine_days
      await supabase.from('routine_days').delete().eq('routine_id', routineId);
      // Borrar routine
      await supabase.from('routines').delete().eq('id', routineId);
      
      totalDeleted++;
    }

    console.log(`✅ ¡Limpieza completada! Se eliminaron ${totalDeleted} rutinas legacy de forma segura.`);
    return { deletedCount: totalDeleted, dryRun: false };

  } catch (err: any) {
    console.error('❌ Error durante la limpieza:', err.message);
    throw err;
  }
};
