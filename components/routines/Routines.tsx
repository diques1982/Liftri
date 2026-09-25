import React, { useEffect, useState } from 'react';
import { Button, Card, Skeleton, ConfirmModal } from '../ui';
import { getWeeklyWorkouts } from '../../lib/api';
import { toDisplayWeight } from '../../utils/unit';
import { getScheduledWorkoutsWithExercises, deleteScheduledWorkout, scheduleExistingRoutine, createRoutineTemplate } from '../../lib/planner';
import { RoutineLibrary } from './RoutineLibrary';
import { ScheduleModal } from './ScheduleModal';
import { toast } from '../../utils/toast';
import '../../styles/theme.css';

const MUSCLE_IMAGES: Record<string, string> = {
  'Pecho': 'https://images.unsplash.com/photo-1616279969856-759f316a5ac1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'Espalda': 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'Pierna': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'Brazo': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'Abdomen': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'Glúteo': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'General': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
};

export const Routines: React.FC<{ 
  weightUnit: 'kg' | 'lb';
  onNavigate?: (tab: string) => void;
}> = ({ weightUnit, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay() || 7; // Convert Sun (0) to 7
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day + 1); // Monday
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [routineToSchedule, setRoutineToSchedule] = useState<string | null>(null);

  const fetchWeek = async (monday: Date) => {
    setLoading(true);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    // Format YYYY-MM-DD local
    const startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const endStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    try {
      const [weeklyData, schedData] = await Promise.all([
        getWeeklyWorkouts(startStr, endStr),
        getScheduledWorkoutsWithExercises()
      ]);
      setWorkouts(weeklyData);
      setScheduledWorkouts(schedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    try {
      await deleteScheduledWorkout(id);
      fetchWeek(currentWeekStart); // refresh
    } catch (err) {
      console.error('Error deleting scheduled workout:', err);
    }
    setScheduleToDelete(null);
  };

  useEffect(() => {
    fetchWeek(currentWeekStart);
  }, [currentWeekStart]);

  const changeWeek = (offset: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + offset * 7);
    setCurrentWeekStart(newStart);
    
    // Reset selected date to the Monday of the new week if moving away, 
    // or keep today if navigating back to current week
    const today = new Date();
    today.setHours(0,0,0,0);
    const newSunday = new Date(newStart);
    newSunday.setDate(newSunday.getDate() + 6);
    
    if (today >= newStart && today <= newSunday) {
      setSelectedDate(today);
    } else {
      setSelectedDate(newStart);
    }
  };

  const getDaysArray = () => {
    const days = [];
    const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      });
    }
    return days;
  };

  const days = getDaysArray();
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }, []);

  const getScheduledWorkoutsForDay = React.useCallback((date: Date, dateStr: string) => {
    const dow = date.getDay();
    const dayNum = dow === 0 ? 7 : dow;
    
    return scheduledWorkouts.filter(sw => {
      if (sw.schedule_type === 'today') {
        return sw.scheduled_date === dateStr;
      } else if (sw.schedule_type === 'recurring') {
        return sw.recurrence_days?.includes(dayNum);
      }
      return false;
    });
  }, [scheduledWorkouts]);

  const isSelectedDateFutureOrToday = selectedDate.getTime() >= today.getTime();
  const scheduledForSelectedDay = React.useMemo(() => {
    if (!isSelectedDateFutureOrToday) return [];
    return getScheduledWorkoutsForDay(selectedDate, selectedDateStr);
  }, [isSelectedDateFutureOrToday, selectedDate, selectedDateStr, getScheduledWorkoutsForDay]);

  const mockSelectedWorkouts = React.useMemo(() => {
    if (scheduledForSelectedDay.length === 0) return [];
    
    return scheduledForSelectedDay.map(sw => {
      const routineDay = sw.routine?.routine_days?.[0];
      const mockSets: any[] = [];
      
      if (routineDay && routineDay.routine_exercises) {
        routineDay.routine_exercises.forEach((re: any) => {
          const ex = re.exercises;
          if (!ex) return;
          
          for (let i = 0; i < re.sets; i++) {
            mockSets.push({
              id: `mock-set-${re.id}-${i}`,
              exercise_id: ex.id,
              weight: 0,
              reps: re.reps,
              exercises: ex
            });
          }
        });
      }
      
      return {
        isScheduled: true,
        scheduledWorkoutId: sw.id,
        routineId: sw.routine?.id,
        routineName: sw.routine?.name,
        dayId: routineDay?.id,
        name: sw.name,
        sets: mockSets
      };
    });
  }, [scheduledForSelectedDay]);

  // Find ALL workouts for selected date
  const completedWorkouts = workouts.filter(w => w.date === selectedDateStr);
  const workoutsToDisplay: any[] = completedWorkouts.length > 0 
    ? [{
        isScheduled: false,
        routineId: completedWorkouts[0].routine_id,
        name: completedWorkouts[0].routine_name_snapshot || 'Completado',
        duration: completedWorkouts.reduce((acc, w) => acc + (w.duration || 0), 0),
        totalVolume: completedWorkouts.flatMap(w => w.sets || []).reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0),
        sets: completedWorkouts.flatMap(w => w.sets || [])
      }]
    : mockSelectedWorkouts;

  const handleStartScheduledWorkout = (workout: any) => {
    if (!workout.routineId || !workout.dayId) return;
    
    localStorage.setItem('liftri_start_routine_id', workout.routineId);
    if (workout.routineName) {
      localStorage.setItem('liftri_start_routine_name', workout.routineName);
    }
    localStorage.setItem('liftri_start_day_id', workout.dayId);
    localStorage.setItem('liftri_start_active_workout', 'true');
    localStorage.removeItem('liftri_active_workout');
    
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  const handleRepeatNow = (workout: any) => {
    const exercisesMap = new Map();
    workout.sets.forEach((s: any) => {
      if (s.exercises && !exercisesMap.has(s.exercises.id)) {
        exercisesMap.set(s.exercises.id, s.exercises);
      }
    });
    const exercises = Array.from(exercisesMap.values());
    if (exercises.length === 0) return;

    const stateToSave = {
      userId: 'current',
      startTime: Date.now(),
      routineId: workout.routineId || null,
      routineName: workout.name || 'Rutina Repetida',
      exercises: exercises.map((ex: any) => ({
        exerciseId: ex.id,
        sets: []
      }))
    };
    
    localStorage.setItem('liftri_active_workout', JSON.stringify(stateToSave));
    localStorage.removeItem('liftri_start_active_workout');
    
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  const handleSchedulePastWorkout = async (workout: any) => {
    try {
      let rId = workout.routineId;
      if (!rId) {
        const exercisesMap = new Map();
        workout.sets.forEach((s: any) => {
          if (s.exercises && !exercisesMap.has(s.exercises.id)) {
            exercisesMap.set(s.exercises.id, s.exercises);
          }
        });
        const exercises = Array.from(exercisesMap.values());
        const newRoutine = await createRoutineTemplate(exercises, workout.name || 'Rutina Repetida');
        rId = newRoutine.id;
      }
      setRoutineToSchedule(rId);
      setShowScheduleModal(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error al preparar programación');
    }
  };

  const handleScheduleSave = async (scheduleType: 'today' | 'recurring', recurrenceDays: number[], specificDate?: string) => {
    if (!routineToSchedule) return;
    try {
      await scheduleExistingRoutine(routineToSchedule, scheduleType, specificDate || recurrenceDays);
      toast.success('Rutina programada ✓');
      setShowScheduleModal(false);
      setRoutineToSchedule(null);
      fetchWeek(currentWeekStart);
    } catch (e: any) {
      toast.error(e.message ?? 'Error al programar');
    }
  };

  // Not grouping all workouts into one string anymore, doing it per workout during render
  // This helper groups sets for a single workout object
  const getGroupedByCategory = (workoutSets: any[]) => {
    if (!workoutSets) return [];
    
    const groups: Record<string, any> = {};
    workoutSets.forEach((s: any) => {
      const ex = s.exercises;
      if (!ex) return;
      if (!groups[ex.id]) {
        groups[ex.id] = {
          id: ex.id,
          name: ex.name,
          muscleGroup: ex.muscle_group,
          subcategory: ex.subcategory,
          type: ex.exercise_type,
          sets: []
        };
      }
      groups[ex.id].sets.push(s);
    });
    
    const categories: Record<string, { exercises: any[], subcategories: Set<string> }> = {};
    Object.values(groups).forEach((ex: any) => {
      const catRaw = ex.muscleGroup || 'General';
      const cat = catRaw.charAt(0).toUpperCase() + catRaw.slice(1).toLowerCase();
      
      const normalizedCat = ['Pecho', 'Espalda', 'Pierna', 'Brazo', 'Abdomen', 'Glúteo'].includes(cat) 
        ? cat : 'General';

      if (!categories[normalizedCat]) categories[normalizedCat] = { exercises: [], subcategories: new Set() };
      categories[normalizedCat].exercises.push(ex);
      if (ex.subcategory && ex.subcategory.toLowerCase() !== 'todos') {
        categories[normalizedCat].subcategories.add(ex.subcategory);
      }
    });
    
    return Object.entries(categories).map(([category, data]) => ({
      category,
      exercises: data.exercises,
      subcategoriesText: data.subcategories.size > 0 ? `(${Array.from(data.subcategories).join(' - ')})` : ''
    }));
  };

  const getTrainedMuscles = (grouped: any[]) => {
    if (grouped.length === 0) return '';
    return grouped.map(g => g.category + (g.subcategoriesText ? ` ${g.subcategoriesText}` : '')).join(', ');
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const currentMonthName = monthNames[currentWeekStart.getMonth()];
  const currentYear = currentWeekStart.getFullYear();

  return (
    <div className="routines-container page-wrapper" style={{ padding: '16px', paddingBottom: '100px' }}>
      
      {/* Calendar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
          {currentMonthName} {currentYear}
        </h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => changeWeek(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button onClick={() => changeWeek(1)} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      {/* Week Strip */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        backgroundColor: 'var(--color-surface)', 
        borderRadius: '16px',
        padding: '12px 8px',
        border: '1px solid var(--color-border)',
        marginBottom: '16px'
      }}>
        {days.map((d, i) => {
          const isSelected = d.dateStr === selectedDateStr;
          const hasWorkout = workouts.some(w => w.date === d.dateStr);
          const isFutureDay = d.date.getTime() >= today.getTime();
          const scheduledWorkouts = getScheduledWorkoutsForDay(d.date, d.dateStr);
          const hasScheduledWorkout = scheduledWorkouts.length > 0;

          return (
            <div 
              key={i} 
              onClick={() => setSelectedDate(d.date)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                padding: '8px 4px',
                borderRadius: '12px',
                backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                color: isSelected ? '#000' : 'var(--color-text)',
                cursor: 'pointer',
                minWidth: '40px'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#000' : 'var(--color-text-muted)' }}>
                {d.dayName}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                {d.dayNumber}
              </span>
              {hasWorkout && !isSelected && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: 4 }} />
              )}
              {!hasWorkout && isFutureDay && hasScheduledWorkout && !isSelected && (
                <div style={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  border: '1.5px solid var(--color-text-muted)', 
                  boxSizing: 'border-box',
                  marginTop: 4 
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Workout Details */}
      {loading ? (
        <div>
          <Skeleton height="40px" width="200px" style={{ marginBottom: '8px' }} />
          <Skeleton height="20px" width="150px" style={{ marginBottom: '24px' }} />
          <Skeleton height="200px" />
        </div>
      ) : workoutsToDisplay.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0 0 0', color: 'var(--color-text-muted)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <h3 style={{ fontSize: 18, color: 'var(--color-text)', marginBottom: 8 }}>Descanso</h3>
          <p>{isSelectedDateFutureOrToday ? 'No tienes entrenamientos programados para este día.' : 'No registraste entrenamientos este día.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {workoutsToDisplay.map((workout, index) => {
            const groupedByCategory = getGroupedByCategory(workout.sets);
            const trainedMuscles = getTrainedMuscles(groupedByCategory);

            return (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0' }}>
                        {workout.isScheduled ? (workout.name || 'Programado') : workout.name}
                      </h2>
                      {workout.isScheduled && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button 
                            variant="primary" 
                            onClick={() => handleStartScheduledWorkout(workout)}
                            style={{ 
                              padding: '6px 14px', 
                              fontSize: '13px', 
                              fontWeight: 700, 
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(204, 255, 0, 0.2)'
                            }}
                          >
                            <span>Empezar</span>
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setScheduleToDelete(workout.scheduledWorkoutId)}
                            style={{ 
                              padding: '6px 10px', 
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-muted)'
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </Button>
                        </div>
                      )}
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '15px' }}>
                      {trainedMuscles || 'Sesión General'}
                    </p>
                  </div>
                  {!workout.isScheduled && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {workout.totalVolume > 0 && (
                        <div style={{ backgroundColor: 'var(--color-surface)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                          {((workout.totalVolume * (weightUnit === 'lb' ? 2.20462 : 1)) / 1000).toFixed(1)}k {weightUnit === 'lb' ? 'Lb' : 'KG'}
                        </div>
                      )}
                      {workout.duration > 0 && (
                        <div style={{ backgroundColor: 'var(--color-surface)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                          {workout.duration} min
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!workout.isScheduled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
                      Repetir esta rutina
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Button 
                        variant="primary" 
                        onClick={(e) => { e.stopPropagation(); handleRepeatNow(workout); }}
                        style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 800, borderRadius: '12px', textAlign: 'center' }}
                      >
                        Empezar ya
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={(e) => { e.stopPropagation(); handleSchedulePastWorkout(workout); }}
                        style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 800, borderRadius: '12px', color: 'var(--color-text)', borderColor: 'var(--color-border)', textAlign: 'center' }}
                      >
                        Programar
                      </Button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {groupedByCategory.map((group) => {
                    const isExpanded = expandedCategory === `${index}-${group.category}`;
                    const bgImg = MUSCLE_IMAGES[group.category] || MUSCLE_IMAGES['General'];

                    return (
                      <div key={group.category} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                        {/* Header (Accordion Toggle) */}
                        <div 
                          onClick={() => setExpandedCategory(isExpanded ? null : `${index}-${group.category}`)}
                          style={{
                            position: 'relative',
                            height: '100px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 20px'
                          }}
                        >
                          <img 
                            src={bgImg} 
                            alt={group.category}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                          />
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%)' }} />
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>
                              {group.category}
                            </span>
                            {(group as any).subcategoriesText && (
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                {(group as any).subcategoriesText}
                              </span>
                            )}
                          </div>
                          <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" strokeWidth="3" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {group.exercises.map((ex: any) => (
                              <div key={ex.id}>
                                <div style={{ marginBottom: '16px' }}>
                                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700 }}>{ex.name}</h3>
                                  <span style={{ color: 'var(--color-primary)', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                    {ex.type || 'COMPUESTO'}
                                  </span>
                                </div>
                                
                                <div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 40px', gap: '16px', marginBottom: '12px', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
                                    <span>SERIE</span>
                                    <span>PESO ({weightUnit === 'lb' ? 'LB' : 'KG'})</span>
                                    <span>REPS</span>
                                    <span></span>
                                  </div>
                                                          {ex.sets.map((set: any, idx: number) => (
                                    <div key={set.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 40px', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>
                                        {idx + 1}
                                      </div>
                                      <div style={{ backgroundColor: 'var(--color-background)', padding: '10px 12px', borderRadius: '8px', fontSize: '16px', fontWeight: 600, color: workout.isScheduled ? 'var(--color-text-muted)' : 'inherit' }}>
                                        {workout.isScheduled ? '--' : toDisplayWeight(set.weight, weightUnit)}
                                      </div>
                                      <div style={{ backgroundColor: 'var(--color-background)', padding: '10px 12px', borderRadius: '8px', fontSize: '16px', fontWeight: 600 }}>
                                        {set.reps}
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        {workout.isScheduled ? (
                                          <svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--color-text-muted)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                          </svg>
                                        ) : (
                                          <svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--color-primary)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scheduleToDelete && (
        <ConfirmModal
          title="Eliminar programación"
          message="¿Estás seguro de que deseas eliminar esta programación de rutina?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={() => handleDeleteScheduled(scheduleToDelete)}
          onCancel={() => setScheduleToDelete(null)}
          isDestructive={true}
        />
      )}

      {/* Routine Library Section Removed */}
      {showScheduleModal && (
        <ScheduleModal
          onSave={handleScheduleSave}
          onClose={() => { setShowScheduleModal(false); setRoutineToSchedule(null); }}
        />
      )}
    </div>
  );
};
