export interface Profile {
  id: string; // uuid
  name: string;
  role?: string;
  created_at?: string;
}

export interface Routine {
  id: string; // uuid
  user_id: string; // uuid
  name: string;
  created_at?: string;
  routine_days?: RoutineDay[]; // joined
}

export interface RoutineDay {
  id: string; // uuid
  routine_id: string; // uuid
  name: string;
  order_index?: number;
}

export interface RoutineExercise {
  id: string; // uuid
  routine_day_id: string; // uuid
  exercise_id: string; // uuid
  sets: number;
  reps: number;
}

export interface Workout {
  id: string; // uuid
  user_id: string; // uuid
  routine_id?: string; // uuid
  date: string; // date
  duration?: number; // integer (minutes)
}

export interface SetRecord {
  id: string; // uuid
  workout_id: string; // uuid
  exercise_id: string; // uuid
  reps: number;
  weight: number;
}

export interface PersonalRecord {
  id: string; // uuid
  user_id: string; // uuid
  exercise_id: string; // uuid
  max_weight: number;
  updated_at?: string;
}

export interface Exercise {
  id: string; // uuid
  name: string;
  muscle_group?: string;
  subcategory?: string;
  exercise_type?: string;
  equipment?: string;
  image_url?: string;
  video_url?: string;
  created_at?: string;
}

export interface UserExercise {
  user_id: string; // uuid
  exercise_id: string; // uuid
  created_at?: string;
  exercise?: Exercise; // joined data
}

// ===== PLANNER =====

export type ScheduleType = 'today' | 'recurring';

export interface ScheduledWorkout {
  id: string;
  user_id: string;
  routine_id: string;
  name: string;
  schedule_type: ScheduleType;
  scheduled_date?: string;      // YYYY-MM-DD — solo para 'today'
  recurrence_days?: number[];   // 1=Lun, 2=Mar ... 7=Dom
  is_active: boolean;
  created_at: string;
  // Joined
  routine?: Routine;
}

export interface PlannerRoutineExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
}

