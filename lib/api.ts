import { supabase } from './supabase';
import { 
  Profile, 
  Routine, 
  Workout, 
  SetRecord, 
  PersonalRecord,
  Exercise
} from '../types/database';

// Helper to get current authenticated user
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

export const getProfile = async (): Promise<Profile | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error.message);
    return null;
  }
  return data as Profile;
};

export const updateProfile = async (updates: { name?: string }): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error.message);
    throw error;
  }
};

// Returns total workouts, total volume, and weekly progress
export const getDashboardStats = async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { totalSessions: 0, currentWeekSessions: 0, totalVolume: 0, currentWeekVolume: 0, prevWeekVolume: 0, progressPercentage: 0, lastMonthSessions: 0, lastMonthVolume: 0, mostRecentWorkoutDate: null, mostRecentWorkoutVolume: 0, mostRecentWorkoutCategories: [] };

  // Fetch all workouts for session count
  const { data: workouts, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, date')
    .eq('user_id', userId);

  if (workoutsError) {
    console.error('Error fetching workouts for stats:', workoutsError.message);
    return { totalSessions: 0, currentWeekSessions: 0, totalVolume: 0, currentWeekVolume: 0, prevWeekVolume: 0, progressPercentage: 0, lastMonthSessions: 0, lastMonthVolume: 0, mostRecentWorkoutDate: null, mostRecentWorkoutVolume: 0, mostRecentWorkoutCategories: [] };
  }

  const totalSessions = workouts?.length || 0;
  let totalVolume = 0;
  let currentWeekVolume = 0;
  let prevWeekVolume = 0;
  let lastMonthSessions = 0;
  let lastMonthVolume = 0;
  let mostRecentWorkoutVolume = 0;
  let mostRecentWorkoutCategories: string[] = [];

  let mostRecentWorkoutDate: string | null = null;
  if (totalSessions > 0) {
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    mostRecentWorkoutDate = sortedWorkouts[0].date;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  const startOfPrevWeek = new Date(startOfCurrentWeek.getFullYear(), startOfCurrentWeek.getMonth(), startOfCurrentWeek.getDate() - 7);
  
  const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let currentWeekSessions = 0;

  if (totalSessions > 0) {
    // Count sessions
    workouts.forEach(w => {
      const wDate = new Date(w.date + 'T12:00:00');
      if (wDate >= firstDayOfLastMonth && wDate < firstDayOfCurrentMonth) {
        lastMonthSessions++;
      }
      if (wDate >= startOfCurrentWeek) {
        currentWeekSessions++;
      }
    });

    const workoutIds = workouts.map(w => w.id);
    const { data: sets, error: setsError } = await supabase
      .from('sets')
      .select('workout_id, weight, reps, exercises (muscle_group, subcategory)')
      .in('workout_id', workoutIds);

    if (!setsError && sets) {
      const mostRecentCategoriesSet = new Set<string>();
      
      sets.forEach(set => {
        const volume = set.weight * set.reps;
        totalVolume += volume;

        // Find parent workout date
        const parentWorkout = workouts.find(w => w.id === set.workout_id);
        if (parentWorkout) {
          const wDate = new Date(parentWorkout.date + 'T12:00:00');
          if (wDate >= startOfCurrentWeek) {
            currentWeekVolume += volume;
          } else if (wDate >= startOfPrevWeek && wDate < startOfCurrentWeek) {
            prevWeekVolume += volume;
          }

          if (wDate >= firstDayOfLastMonth && wDate < firstDayOfCurrentMonth) {
            lastMonthVolume += volume;
          }

          if (parentWorkout.date === mostRecentWorkoutDate) {
            mostRecentWorkoutVolume += volume;
            const exData = Array.isArray(set.exercises) ? set.exercises[0] : set.exercises;
            if (exData && exData.muscle_group) {
              let label = exData.muscle_group;
              if (exData.subcategory) {
                label += ` (${exData.subcategory})`;
              }
              mostRecentCategoriesSet.add(label);
            }
          }
        }
      });
      mostRecentWorkoutCategories = Array.from(mostRecentCategoriesSet);
    }
  }

  let progressPercentage = 0;
  if (prevWeekVolume === 0 && currentWeekVolume > 0) {
    progressPercentage = 100;
  } else if (prevWeekVolume > 0) {
    progressPercentage = Math.round(((currentWeekVolume - prevWeekVolume) / prevWeekVolume) * 100);
  }

  return { totalSessions, currentWeekSessions, totalVolume, currentWeekVolume, prevWeekVolume, progressPercentage, lastMonthSessions, lastMonthVolume, mostRecentWorkoutDate, mostRecentWorkoutVolume, mostRecentWorkoutCategories };
};

export const getUserRoutines = async (): Promise<Routine[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('routines')
    .select(`
      id,
      user_id,
      name, 
      created_at,
      routine_days (
        id,
        routine_exercises (id)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching routines:', error.message);
    return [];
  }
  return data as unknown as Routine[];
};

export const getTodayCompletedRoutineIds = async (): Promise<string[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const { data } = await supabase
    .from('workouts')
    .select('routine_id, routine_name_snapshot')
    .eq('user_id', userId)
    .eq('date', localToday);
    
  if (!data) return [];
  
  const completed: string[] = [];
  for (const w of data) {
    if (w.routine_id) completed.push(w.routine_id);
    if (w.routine_name_snapshot) completed.push(w.routine_name_snapshot);
  }
  return completed;
};

export const getRecentWorkouts = async () => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: workouts, error } = await supabase
    .from('workouts')
    .select(`
      id,
      date,
      sets (
        exercise_id,
        exercises ( name, subcategory ),
        weight,
        reps
      )
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent workouts:', error.message);
    return [];
  }

  // Transform the data to match the UI shape. 
  // We'll flatten workouts to list exercises.
  const formattedWorkouts: any[] = [];
  
  // We need PR data to dynamically calculate if these sets were PRs
  const userPRs = await getPersonalRecords(); // map of exercise_id -> max_weight

  for (const w of workouts) {
    if (w.sets && w.sets.length > 0) {
      // Grouping sets by exercise for the UI display
      const exerciseGroups: Record<string, typeof w.sets> = {};
      
      w.sets.forEach((set: any) => {
        // Handle join data safely
        const exName = Array.isArray(set.exercises) ? set.exercises[0]?.name : set.exercises?.name;
        const key = `${set.exercise_id}|||${exName}`;
        
        if (!exerciseGroups[key]) {
          exerciseGroups[key] = [];
        }
        exerciseGroups[key].push(set);
      });

      for (const [key, sets] of Object.entries(exerciseGroups)) {
        const [exerciseId, exerciseName] = key.split('|||');
        const maxWeight = Math.max(...sets.map((s: any) => s.weight));
        
        // Dynamically check if this matches their current PR (simplistic, assumes if it equals max it's a PR highlight)
        const isPR = userPRs[exerciseId] !== undefined && maxWeight >= userPRs[exerciseId];

        formattedWorkouts.push({
          id: `${w.id}-${exerciseId}`,
          exercise: exerciseName || 'Unknown Exercise',
          weight: maxWeight,
          setsReps: `${sets.length} sets`,
          date: new Date(w.date).toLocaleDateString(),
          isPR
        });
      }
    }
  }

  return formattedWorkouts;
};

export const getLatestPR = async (): Promise<(PersonalRecord & { exercises: { name: string } }) | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('personal_records')
    .select(`*, exercises (name)`)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }
  return data as any;
};

export const getExercises = async (): Promise<Exercise[]> => {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching exercises:', error.message);
    return [];
  }
  return data as Exercise[];
};

export interface RoutineSaveData {
  name: string;
  days: {
    name: string;
    exercises: {
      exerciseId: string;
      sets: number;
      reps: number;
    }[];
  }[];
}

export const saveCompleteRoutine = async (data: RoutineSaveData): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    // 1. Insert Routine
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .insert([{ user_id: userId, name: data.name }])
      .select('id')
      .single();

    if (routineError || !routine) throw routineError;

    // 2. Insert Days sequentially
    for (let i = 0; i < data.days.length; i++) {
      const day = data.days[i];
      const { data: routineDay, error: dayError } = await supabase
        .from('routine_days')
        .insert([{ routine_id: routine.id, name: day.name, order_index: i }])
        .select('id')
        .single();

      if (dayError || !routineDay) throw dayError;

      // 3. Insert Exercises for this day
      if (day.exercises.length > 0) {
        const exercisesToInsert = day.exercises.map(ex => ({
          routine_day_id: routineDay.id,
          exercise_id: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps
        }));

        const { error: exerciseError } = await supabase
          .from('routine_exercises')
          .insert(exercisesToInsert);

        if (exerciseError) throw exerciseError;
      }
    }

    return true;
  } catch (err: any) {
    console.error('Error saving routine:', err.message);
    throw new Error(err.message || 'Failed to save routine to database.');
  }
};

export const deleteRoutine = async (routineId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  // 1. Deactivate any associated scheduled workouts
  await supabase
    .from('scheduled_workouts')
    .update({ is_active: false })
    .eq('routine_id', routineId)
    .eq('user_id', userId);

  // 2. Cascade delete
  // Delete routine_exercises
  const { data: days } = await supabase.from('routine_days').select('id').eq('routine_id', routineId);
  if (days && days.length > 0) {
    const dayIds = days.map(d => d.id);
    await supabase.from('routine_exercises').delete().in('routine_day_id', dayIds);
  }

  // Delete routine_days
  await supabase.from('routine_days').delete().eq('routine_id', routineId);

  // Delete routine (this might cascade natively depending on Supabase setup, but we do it manually to be safe)
  const { error } = await supabase.from('routines').delete().eq('id', routineId).eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting routine:', error.message);
    throw new Error('Error al eliminar la rutina.');
  }
};

export const getRoutineDaysWithExercises = async (routineId: string) => {
  const { data: days, error: daysError } = await supabase
    .from('routine_days')
    .select(`
      id,
      name,
      order_index,
      routine_exercises (
        id,
        exercise_id,
        sets,
        reps,
        exercises ( name, muscle_group, subcategory, image_url )
      )
    `)
    .eq('routine_id', routineId)
    .order('order_index', { ascending: true });

  if (daysError) {
    console.error('Error fetching days:', daysError.message);
    return [];
  }
  return days;
};

export const getRoutineDetails = async (routineId: string) => {
  const days = await getRoutineDaysWithExercises(routineId);
  return days;
};

export const updateRoutine = async (routineId: string, data: RoutineSaveData): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    // 1. Update Routine Name
    await supabase
      .from('routines')
      .update({ name: data.name })
      .eq('id', routineId)
      .eq('user_id', userId);

    // 2. Cascade delete existing days and exercises
    const { data: oldDays } = await supabase.from('routine_days').select('id').eq('routine_id', routineId);
    if (oldDays && oldDays.length > 0) {
      const oldDayIds = oldDays.map(d => d.id);
      await supabase.from('routine_exercises').delete().in('routine_day_id', oldDayIds);
    }
    await supabase.from('routine_days').delete().eq('routine_id', routineId);

    // 3. Insert new days and exercises
    for (let i = 0; i < data.days.length; i++) {
      const day = data.days[i];
      const { data: routineDay, error: dayError } = await supabase
        .from('routine_days')
        .insert([{ routine_id: routineId, name: day.name, order_index: i }])
        .select('id')
        .single();

      if (dayError || !routineDay) throw dayError;

      if (day.exercises.length > 0) {
        const exercisesToInsert = day.exercises.map(ex => ({
          routine_day_id: routineDay.id,
          exercise_id: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps
        }));

        const { error: exerciseError } = await supabase
          .from('routine_exercises')
          .insert(exercisesToInsert);

        if (exerciseError) throw exerciseError;
      }
    }

    return true;
  } catch (err: any) {
    console.error('Error updating routine:', err.message);
    throw new Error(err.message || 'Failed to update routine in database.');
  }
};


export const getPersonalRecords = async (): Promise<Record<string, number>> => {
  const userId = await getCurrentUserId();
  if (!userId) return {};

  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_id, max_weight')
    .eq('user_id', userId);

  if (error || !data) return {};

  const prMap: Record<string, number> = {};
  data.forEach(pr => {
    prMap[pr.exercise_id] = pr.max_weight;
  });
  return prMap;
};

export const getPreviousExerciseData = async (exerciseId: string) => {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from('sets')
    .select('weight, reps, workouts!inner(user_id, date)')
    .eq('workouts.user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('id', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return { weight: data[0].weight, reps: data[0].reps };
};

export interface WorkoutSaveData {
  routineId?: string;
  routineNameSnapshot?: string;
  duration: number; // in minutes
  sets: {
    exercise_id: string;
    weight: number;
    reps: number;
  }[];
  newPRs: { exercise_id: string; max_weight: number }[];
}

export const saveWorkoutSession = async (workoutData: WorkoutSaveData): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    // 0. Ensure the user profile exists (prevents foreign key violation on first workouts)
    await supabase
      .from('profiles')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

    // 1. Create Workout Session
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let workout;
    let workoutError;

    const res1 = await supabase
      .from('workouts')
      .insert([{ 
        user_id: userId, 
        routine_id: workoutData.routineId || null,
        routine_name_snapshot: workoutData.routineNameSnapshot || null,
        date: localToday, // YYYY-MM-DD
        duration: workoutData.duration
      }])
      .select('id')
      .single();

    if (res1.error && res1.error.message.includes('routine_name_snapshot')) {
      // Fallback if the user hasn't run the SQL script to add the column yet
      const res2 = await supabase
        .from('workouts')
        .insert([{ 
          user_id: userId, 
          routine_id: workoutData.routineId || null,
          date: localToday, 
          duration: workoutData.duration
        }])
        .select('id')
        .single();
      workout = res2.data;
      workoutError = res2.error;
    } else {
      workout = res1.data;
      workoutError = res1.error;
    }

    if (workoutError || !workout) throw workoutError;

    // 2. Insert Sets
    if (workoutData.sets.length > 0) {
      const setsToInsert = workoutData.sets.map(s => ({
        workout_id: workout.id,
        exercise_id: s.exercise_id,
        weight: s.weight,
        reps: s.reps
      }));

      const { error: setsError } = await supabase
        .from('sets')
        .insert(setsToInsert);

      if (setsError) throw setsError;
    }

    // 3. Upsert Personal Records safely
    if (workoutData.newPRs.length > 0) {
      for (const pr of workoutData.newPRs) {
        const { data: existingPR } = await supabase
          .from('personal_records')
          .select('id, max_weight')
          .eq('user_id', userId)
          .eq('exercise_id', pr.exercise_id)
          .single();

        if (existingPR) {
          // Only update if the new weight is genuinely higher
          if (pr.max_weight > existingPR.max_weight) {
            await supabase
              .from('personal_records')
              .update({ max_weight: pr.max_weight, updated_at: new Date().toISOString() })
              .eq('id', existingPR.id);
          }
        } else {
          // First-time PR
          await supabase
            .from('personal_records')
            .insert([{
              user_id: userId,
              exercise_id: pr.exercise_id,
              max_weight: pr.max_weight,
              updated_at: new Date().toISOString()
            }]);
        }
      }
    }

    // 4. Deactivate completed 'today' scheduled workouts
    if (workoutData.routineId) {
      await supabase
        .from('scheduled_workouts')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('routine_id', workoutData.routineId)
        .eq('schedule_type', 'today')
        .eq('scheduled_date', localToday);
    }

    return true;
  } catch (err: any) {
    console.error('Error saving workout:', err.message);
    throw new Error(err.message || 'Failed to save workout to database.');
  }
};

export const getWeeklyWorkouts = async (startDate: string, endDate: string) => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      sets (
        id,
        weight,
        reps,
        exercises (
          id,
          name,
          muscle_group,
          equipment,
          exercise_type,
          subcategory
        )
      )
    `)
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching weekly workouts:', error.message);
    return [];
  }

  return data;
};

export const uploadExerciseImage = async (file: File): Promise<string> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    // Client-side image compression
    const compressedFile = await new Promise<File>((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 600;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas to Blob failed'));
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp',
            lastModified: Date.now(),
          }));
        }, 'image/webp', 0.8);
      };
      img.onerror = (error) => reject(error);
    });

    const fileExt = 'webp';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `exercises/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('exercise-images')
      .upload(filePath, compressedFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('exercise-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err: any) {
    console.error('Error uploading image:', err.message);
    throw new Error(err.message || 'Failed to upload image.');
  }
};

export interface CreateExerciseParams {
  name: string;
  muscle_group: string;
  subcategory?: string;
  exercise_type?: string;
  equipment?: string;
  image_url?: string;
  video_url?: string;
}

export const createExercise = async (params: CreateExerciseParams): Promise<Exercise> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    const { data, error } = await supabase
      .from('exercises')
      .insert([params])
      .select('*')
      .single();

    if (error) throw error;
    return data as Exercise;
  } catch (err: any) {
    console.error('Error creating exercise:', err.message);
    throw new Error(err.message || 'Failed to create exercise in database.');
  }
};

export const uploadExerciseVideo = async (file: File): Promise<string> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('exercise-images')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('exercise-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err: any) {
    console.error('Error uploading video:', err.message);
    throw new Error(err.message || 'Failed to upload video.');
  }
};

export const getAllExercises = async (): Promise<Exercise[]> => {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('muscle_group', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching catalog:', error.message);
    return [];
  }
  return (data || []) as Exercise[];
};


export interface RapidApiExercise {
  exerciseId: string;
  name: string;
  imageUrl?: string;
  videoUrl?: string;
  muscleGroup?: string;
  equipment?: string;
  exerciseType?: string;
}

export const searchRapidApiExercises = async (query: string): Promise<RapidApiExercise[]> => {
  if (!query.trim()) return [];
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (!apiKey) throw new Error('RapidAPI key not configured in .env file.');

  // Spanish to English dictionary for search queries
  const dictionary: Record<string, string> = {
    // Muscle groups
    'pierna': 'leg',
    'piernas': 'leg',
    'pecho': 'chest',
    'espalda': 'back',
    'brazo': 'arm',
    'brazos': 'arm',
    'biceps': 'bicep',
    'bíceps': 'bicep',
    'triceps': 'tricep',
    'tríceps': 'tricep',
    'hombro': 'shoulder',
    'hombros': 'shoulder',
    'deltoides': 'deltoid',
    'abdomen': 'abs',
    'abdominales': 'abs',
    'abdominal': 'abs',
    'core': 'core',
    'gluteo': 'glute',
    'gluteos': 'glute',
    'glúteo': 'glute',
    'glúteos': 'glute',
    'pantorrilla': 'calf',
    'pantorrillas': 'calves',
    'isquiotibial': 'hamstring',
    'isquiotibiales': 'hamstring',
    'femoral': 'hamstring',
    'cuadriceps': 'quadricep',
    'cuádriceps': 'quadricep',
    'cuadricep': 'quadricep',
    'trapecio': 'trapezius',
    'trapezi': 'trapezius',
    'lumbar': 'lower back',
    'lumbares': 'lower back',
    'espalda baja': 'lower back',
    'espalda alta': 'upper back',
    'pectoral': 'chest',
    'pectorales': 'chest',
    'antebrazo': 'forearm',
    'antebrazos': 'forearm',
    // Exercises
    'flexiones': 'push up',
    'sentadilla': 'squat',
    'sentadillas': 'squat',
    'peso muerto': 'deadlift',
    'peso muerto rumano': 'romanian deadlift',
    'dominadas': 'pull up',
    'jalones': 'lat pulldown',
    'jalon': 'lat pulldown',
    'jalón': 'lat pulldown',
    'press de banca': 'bench press',
    'press banca': 'bench press',
    'press militar': 'shoulder press',
    'press hombros': 'shoulder press',
    'curl de biceps': 'bicep curl',
    'curl biceps': 'bicep curl',
    'curl de bíceps': 'bicep curl',
    'curl femoral': 'leg curl',
    'curl pierna': 'leg curl',
    'curl piernas': 'leg curl',
    'curl acostado': 'lying leg curl',
    'curl sentado': 'seated leg curl',
    'extension de cuadriceps': 'leg extension',
    'extension de pierna': 'leg extension',
    'extensión de pierna': 'leg extension',
    'prensa': 'leg press',
    'prensa de pierna': 'leg press',
    'remo': 'row',
    'remo con barra': 'barbell row',
    'remo con mancuerna': 'dumbbell row',
    'fondos': 'dip',
    'fondos de triceps': 'tricep dip',
    'aperturas': 'fly',
    'aperturas de pecho': 'chest fly',
    'cruce de poleas': 'cable crossover',
    'peso muerto sumo': 'sumo deadlift',
    'zancada': 'lunge',
    'zancadas': 'lunge',
    'hip thrust': 'hip thrust',
    'empuje de cadera': 'hip thrust',
    'plancha': 'plank',
    'burpee': 'burpee',
    'burpees': 'burpees',
    'salto': 'jump',
    'saltos': 'jump',
    'caminata': 'walk',
    'correr': 'run',
    'trote': 'jog',
    'elevacion de talones': 'calf raise',
    'elevación de talones': 'calf raise',
    'pullover': 'pullover',
    'tricep frances': 'skull crusher',
    'tricep francés': 'skull crusher',
    'rompe craneos': 'skull crusher',
    'vuelos': 'lateral raise',
    'elevaciones laterales': 'lateral raise',
    'remo al menton': 'upright row',
    'remo al mentón': 'upright row',
  };

  // Convert to lowercase to match dictionary
  const lowerQuery = query.toLowerCase().trim();
  
  // Check if we have an exact translation, otherwise keep original query
  const translatedQuery = dictionary[lowerQuery] || lowerQuery;

  try {
    const res = await fetch(`https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1/exercises/search?search=${encodeURIComponent(translatedQuery)}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error('Failed to fetch from RapidAPI');
    const response = await res.json();
    return Array.isArray(response) ? response : (response.data || response.exercises || []);
  } catch (err) {
    console.error('RapidAPI Error:', err);
    return [];
  }
};

export const syncExerciseFromApi = async (apiEx: RapidApiExercise): Promise<Exercise> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Check if it already exists by name
  const { data: existing } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', apiEx.name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing as Exercise;
  }

  // If not, insert it (Requires Admin role based on current RLS)
  const { data: newEx, error } = await supabase
    .from('exercises')
    .insert([{
      name: apiEx.name,
      image_url: apiEx.imageUrl,
      muscle_group: apiEx.muscleGroup || 'Other',
      equipment: apiEx.equipment || 'Ninguno',
      exercise_type: apiEx.exerciseType || 'Repeticiones con peso'
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Error syncing API exercise to Supabase:', error.message);
    throw new Error('Failed to save exercise to Supabase. Make sure you have Admin privileges.');
  }

  return newEx as Exercise;
};

// --- USER EXERCISES (PERSONAL LIBRARY) ---

export const getUserExercises = async (): Promise<Exercise[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  const { data, error } = await supabase
    .from('user_exercises')
    .select(`
      exercise_id,
      muscle_group_override,
      exercises (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user exercises:', error.message);
    return [];
  }

  // Extract the nested exercise objects, applying user's personal muscle_group_override if set
  return data
    .map(row => {
      const ex = row.exercises as any as Exercise;
      if (!ex) return null;
      if (row.muscle_group_override) {
        ex.muscle_group = row.muscle_group_override;
      }
      return ex;
    })
    .filter(Boolean) as Exercise[];
};

export const saveUserExercise = async (exerciseId: string, muscleGroupOverride?: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  const row: any = { user_id: userId, exercise_id: exerciseId };
  if (muscleGroupOverride) row.muscle_group_override = muscleGroupOverride;

  const { error } = await supabase
    .from('user_exercises')
    .insert([row]);

  if (error && error.code !== '23505') { // Ignore unique violation if already saved
    // If already saved but no override yet, try updating the override
    if (error.code === '23505' && muscleGroupOverride) {
      await updateExerciseMuscleGroup(exerciseId, muscleGroupOverride);
      return;
    }
    console.error('Error saving user exercise:', error.message);
    throw new Error('Failed to save exercise to your library.');
  }
};

export const updateExerciseMuscleGroup = async (exerciseId: string, muscleGroup: string, subcategory?: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  // Update the user's personal override in user_exercises
  const updatePayload: Record<string, any> = { muscle_group_override: muscleGroup };
  if (subcategory !== undefined) {
    updatePayload.subcategory_override = subcategory;
  }

  const { error } = await supabase
    .from('user_exercises')
    .update(updatePayload)
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId);

  if (error) throw new Error(error.message);
};

export const removeUserExercise = async (exerciseId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  const { error } = await supabase
    .from('user_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId);

  if (error) {
    console.error('Error removing user exercise:', error.message);
    throw new Error('Failed to remove exercise from your library.');
  }
};

export const updateGlobalExercise = async (
  exerciseId: string, 
  params: { name: string; muscle_group: string; subcategory?: string; image_url?: string; video_url?: string }
): Promise<Exercise> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    const { data, error } = await supabase
      .from('exercises')
      .update(params)
      .eq('id', exerciseId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Exercise;
  } catch (err: any) {
    console.error('Error updating global exercise:', err.message);
    throw new Error(err.message || 'Failed to update global exercise.');
  }
};

export const deleteGlobalExercise = async (exerciseId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated.');

  try {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId);

    if (error) throw error;
  } catch (err: any) {
    console.error('Error deleting global exercise:', err.message);
    throw new Error(err.message || 'Failed to delete global exercise.');
  }
};

