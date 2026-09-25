import { supabase } from './supabase';
import { getCurrentUserId } from './api';
import { ScheduledWorkout, Exercise } from '../types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Routine Templates ────────────────────────────────────────────────────────

export const createRoutineTemplate = async (
  exercises: Exercise[],
  name?: string
): Promise<any> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  // Auto-generate name based on exercises if not provided
  let finalName = name;
  if (!finalName || finalName.trim() === '') {
    if (exercises.length > 0) {
      const muscleMap = new Map<string, Set<string>>();
      exercises.forEach(e => {
        const muscle = e.muscle_group || 'Varios';
        if (!muscleMap.has(muscle)) {
          muscleMap.set(muscle, new Set());
        }
        if (e.subcategory && e.subcategory.trim() !== '') {
          muscleMap.get(muscle)!.add(e.subcategory.trim());
        }
      });

      const muscleStrings = Array.from(muscleMap.entries()).map(([muscle, subcategories]) => {
        if (subcategories.size > 0) {
          return `${muscle} (${Array.from(subcategories).join(', ')})`;
        }
        return muscle;
      });

      finalName = muscleStrings.length > 0 ? `Rutina de ${muscleStrings.join(', ')}` : 'Rutina Personalizada';
    } else {
      finalName = 'Rutina Personalizada';
    }
  }

  // 1. Create a Routine
  const { data: routine, error: routineErr } = await supabase
    .from('routines')
    .insert({ user_id: userId, name: finalName })
    .select('*')
    .single();

  if (routineErr || !routine) throw routineErr ?? new Error('Error creando rutina');

  // 2. Create a single Routine Day
  const { data: day, error: dayErr } = await supabase
    .from('routine_days')
    .insert({ routine_id: routine.id, name: 'Día 1', order_index: 0 })
    .select('id')
    .single();

  if (dayErr || !day) throw dayErr ?? new Error('Error creando día');

  // 3. Create Routine Exercises (default 3 sets / 10 reps)
  if (exercises.length > 0) {
    const exRows = exercises.map((ex) => ({
      routine_day_id: day.id,
      exercise_id: ex.id,
      sets: 3,
      reps: 10,
    }));

    const { error: exErr } = await supabase.from('routine_exercises').insert(exRows);
    if (exErr) throw exErr;
  }

  return routine;
};

// ─── Schedule Workout ────────────────────────────────────────────────────────

export const scheduleExistingRoutine = async (
  routineId: string,
  scheduleType: 'today' | 'recurring',
  dateOrDays?: string | number[]
): Promise<ScheduledWorkout> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No autenticado');

  // Fetch routine name for the scheduled workout label
  const { data: routineData } = await supabase
    .from('routines')
    .select('name')
    .eq('id', routineId)
    .single();
    
  const routineName = routineData?.name || 'Entrenamiento Programado';

  const payload: Record<string, unknown> = {
    user_id: userId,
    routine_id: routineId,
    name: routineName,
    schedule_type: scheduleType,
    is_active: true,
  };

  if (scheduleType === 'today') {
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    payload.scheduled_date = (typeof dateOrDays === 'string' && dateOrDays) ? dateOrDays : localToday;
  } else {
    payload.recurrence_days = Array.isArray(dateOrDays) ? dateOrDays : [];
  }

  const { data: scheduled, error: schedErr } = await supabase
    .from('scheduled_workouts')
    .insert(payload)
    .select('*')
    .single();

  if (schedErr || !scheduled) throw schedErr ?? new Error('Error programando');

  return scheduled as ScheduledWorkout;
};

// ─── Get All Active Scheduled Workouts ───────────────────────────────────────

export const getScheduledWorkouts = async (): Promise<ScheduledWorkout[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select('*, routine:routines(id, name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scheduled workouts:', error.message);
    return [];
  }

  const workouts = (data ?? []) as ScheduledWorkout[];
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Automatically hide expired 'today' workouts from the past
  const validWorkouts = workouts.filter(w => {
    if (w.schedule_type === 'today' && w.scheduled_date) {
      return w.scheduled_date >= localToday;
    }
    return true;
  });

  // Optional: In background, deactivate the expired ones
  const expiredIds = workouts
    .filter(w => w.schedule_type === 'today' && w.scheduled_date && w.scheduled_date < localToday)
    .map(w => w.id);
    
  if (expiredIds.length > 0) {
    supabase.from('scheduled_workouts').update({ is_active: false }).in('id', expiredIds).then();
  }

  return validWorkouts;
};

export const getScheduledWorkoutsWithExercises = async (): Promise<any[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select(`
      *,
      routine:routines (
        id,
        name,
        routine_days (
          id,
          name,
          order_index,
          routine_exercises (
            id,
            sets,
            reps,
            exercises (*)
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scheduled workouts with exercises:', error.message);
    return [];
  }

  return data ?? [];
};

// ─── Get Today's Workout (for Dashboard widget) ───────────────────────────────

export const getTodayScheduledWorkouts = async (): Promise<ScheduledWorkout[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayDow = d.getDay(); // 0=Sun..6=Sat
  // Convert JS (0=Sun) to our model (1=Mon..7=Sun)
  const todayDay = todayDow === 0 ? 7 : todayDow;

  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select('*, routine:routines(id, name, routine_days(id))')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data) return [];

  // Check for a 'today' type matching today's date OR a 'recurring' type matching today's weekday
  const matches = (data as ScheduledWorkout[]).filter((sw) => {
    if (sw.schedule_type === 'today') return sw.scheduled_date === localToday;
    if (sw.schedule_type === 'recurring') return sw.recurrence_days?.includes(todayDay);
    return false;
  });

  return matches;
};

// ─── Delete / Deactivate ─────────────────────────────────────────────────────

export const deleteScheduledWorkout = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('scheduled_workouts')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
};

// ─── Expand Recurring to Dates (for calendar) ────────────────────────────────
// Given a list of scheduled workouts, returns a map: { 'YYYY-MM-DD' → ScheduledWorkout[] }

export const buildPlannedDatesMap = (
  scheduled: ScheduledWorkout[],
  year: number,
  month: number  // 0-indexed
): Map<string, ScheduledWorkout[]> => {
  const map = new Map<string, ScheduledWorkout[]>();

  const addToMap = (dateStr: string, sw: ScheduledWorkout) => {
    if (!map.has(dateStr)) map.set(dateStr, []);
    map.get(dateStr)!.push(sw);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (const sw of scheduled) {
    if (!sw.is_active) continue;

    if (sw.schedule_type === 'today' && sw.scheduled_date) {
      // Only show if within this month
      const d = new Date(sw.scheduled_date + 'T12:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        addToMap(sw.scheduled_date, sw);
      }
    } else if (sw.schedule_type === 'recurring' && sw.recurrence_days?.length) {
      // Expand to every matching weekday of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dow = date.getDay(); // 0=Sun
        const dayNum = dow === 0 ? 7 : dow; // 1=Mon..7=Sun

        if (sw.recurrence_days.includes(dayNum)) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          addToMap(dateStr, sw);
        }
      }
    }
  }

  return map;
};
