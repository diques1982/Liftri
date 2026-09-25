import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button, Skeleton } from '../ui';
import { toast } from '../../utils/toast';
import { getRoutineDaysWithExercises, getPreviousExerciseData, getPersonalRecords, saveWorkoutSession, getCurrentUserId, getAllExercises } from '../../lib/api';
import { Exercise } from '../../types/database';
import { toDisplayWeight, toDatabaseWeight } from '../../utils/unit';
import confetti from 'canvas-confetti';
import { RestTimer } from './RestTimer';
import '../../styles/theme.css';

const MUSCLE_CATEGORIES = ['Todos', 'Pecho', 'Espalda', 'Brazo', 'Pierna', 'Abdomen', 'Glúteo'];
const BRAZO_SUBCATEGORIES = ['Todos', 'Bíceps', 'Tríceps', 'Hombro', 'Antebrazo'];
const PIERNA_SUBCATEGORIES = ['Todos', 'Cuádricep', 'Femoral', 'Pantorrilla'];

interface WorkoutLoggerProps {
  selectedExercises?: Exercise[]; // Now takes array of exercises directly for Freestyle
  savedExercises?: Exercise[];
  routineId?: string; // Kept for backwards compatibility if needed
  routineName?: string;
  dayId?: string;
  onFinish: () => void;
  onCancel: () => void;
  weightUnit: 'kg' | 'lb';
}

interface ActiveSet {
  id: string;
  weight: string;
  reps: string;
  isCompleted: boolean;
  prevWeight?: number;
  prevReps?: number;
}

interface ActiveExercise {
  id: string; // The routine_exercise.id, used for keys
  exerciseId: string; // The global exercise.id
  name: string;
  image_url?: string;
  sets: ActiveSet[];
}

export const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ selectedExercises, savedExercises = [], routineId, routineName, dayId, onFinish, onCancel, weightUnit }) => {
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [initialPersonalRecords, setInitialPersonalRecords] = useState<Record<string, number>>({});
  const [confettiFired, setConfettiFired] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);
  const [activeImage, setActiveImage] = useState<{ title: string; url: string } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('Todos');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [restTimerKey, setRestTimerKey] = useState<number>(0);
  const [showRestTimer, setShowRestTimer] = useState<boolean>(false);
  const [restTimerDuration, setRestTimerDuration] = useState<number>(90);
  const [catalogExercises, setCatalogExercises] = useState<Exercise[]>(savedExercises || []);

  // Sync prop changes
  useEffect(() => {
    if (savedExercises && savedExercises.length > 0) {
      setCatalogExercises(savedExercises);
    }
  }, [savedExercises]);

  // Fetch exercises to ensure we have muscle group and video data
  useEffect(() => {
    if (!savedExercises || savedExercises.length === 0) {
      getAllExercises().then(data => {
        if (data && data.length > 0) {
          setCatalogExercises(data);
        }
      }).catch(console.error);
    }
  }, [savedExercises]);

  // Prevent background scroll when exercise selector is open
  useEffect(() => {
    if (showExerciseSelector) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showExerciseSelector]);

  // Load persisted rest timer on mount
  useEffect(() => {
    const targetTimeStr = localStorage.getItem('liftri_rest_timer_target');
    if (targetTimeStr) {
      const targetTime = parseInt(targetTimeStr, 10);
      const now = Date.now();
      if (targetTime > now) {
        const remaining = Math.ceil((targetTime - now) / 1000);
        setRestTimerDuration(remaining);
        setRestTimerKey(now);
        setShowRestTimer(true);
      } else {
        localStorage.removeItem('liftri_rest_timer_target');
      }
    }
  }, []);

  const handleCloseRestTimer = () => {
    localStorage.removeItem('liftri_rest_timer_target');
    setShowRestTimer(false);
  };

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  useEffect(() => {
    const initWorkout = async () => {
      setLoading(true);
      try {
        // 1. Fetch user PRs for real-time comparison
        const prs = await getPersonalRecords();
        setInitialPersonalRecords(prs);

        // Check for active workout in local storage
        const currentUserId = await getCurrentUserId();
        const savedStr = localStorage.getItem('liftri_active_workout');
        if (savedStr) {
          try {
            const savedState = JSON.parse(savedStr);
            if (savedState && savedState.startTime) {
              // Discard if it belongs to a different user
              if (savedState.userId && savedState.userId !== currentUserId) {
                localStorage.removeItem('liftri_active_workout');
              } else {
                const startDate = new Date(savedState.startTime);
                const now = new Date();
                // Only load if it's from the same day
                if (startDate.toDateString() === now.toDateString()) {
                  setExercises(savedState.exercises || []);
                  setStartTime(savedState.startTime);
                  setLoading(false);
                  return; // Skip normal initialization
                } else {
                  localStorage.removeItem('liftri_active_workout');
                }
              }
            }
          } catch (e) {
            console.error('Failed to parse active workout', e);
            localStorage.removeItem('liftri_active_workout');
          }
        }

        // 2. Map exercises (Freestyle from library)
        if (selectedExercises && selectedExercises.length > 0) {
          const prevDataList = await Promise.all(
            selectedExercises.map(ex => getPreviousExerciseData(ex.id))
          );
          const activeEx = selectedExercises.map((ex, idx) => {
            const prevData = prevDataList[idx];
            const isBw = /push|pull|chin|dip|plank|crunch|sit/i.test(ex.name || '');
            const sets: ActiveSet[] = [];
            sets.push({
              id: Date.now().toString() + '0' + ex.id,
              weight: prevData ? String(toDisplayWeight(prevData.weight, weightUnit)) : (isBw ? '0' : ''),
              reps: prevData ? String(prevData.reps) : '10', // default 10 reps
              isCompleted: false,
              prevWeight: prevData ? toDisplayWeight(prevData.weight, weightUnit) : undefined,
              prevReps: prevData?.reps
            });
            return { id: ex.id, exerciseId: ex.id, name: ex.name || 'Unknown', image_url: ex.image_url, sets };
          });
          setExercises(activeEx);
        } 
        // 3. Fallback to routine day logic if routineId is provided
        else if (routineId && dayId) {
          const days = await getRoutineDaysWithExercises(routineId);
          const day = days.find(d => d.id === dayId);
          if (day && day.routine_exercises) {
            const prevDataList = await Promise.all(
              day.routine_exercises.map(ex => getPreviousExerciseData(ex.exercise_id))
            );
            const activeEx = day.routine_exercises.map((ex, idx) => {
              const exAny = ex as any;
              const exName = Array.isArray(exAny.exercises) ? exAny.exercises[0]?.name : exAny.exercises?.name;
              const prevData = prevDataList[idx];
              const isBw = /push|pull|chin|dip|plank|crunch|sit/i.test(exName || '');
              const sets: ActiveSet[] = [];
              for (let i = 0; i < ex.sets; i++) {
                sets.push({
                  id: Date.now().toString() + i + ex.id,
                  weight: prevData ? String(toDisplayWeight(prevData.weight, weightUnit)) : (isBw ? '0' : ''),
                  reps: prevData ? String(prevData.reps) : String(ex.reps),
                  isCompleted: false,
                  prevWeight: prevData ? toDisplayWeight(prevData.weight, weightUnit) : undefined,
                  prevReps: prevData?.reps
                });
              }
              const exImage = Array.isArray(exAny.exercises) ? exAny.exercises[0]?.image_url : exAny.exercises?.image_url;
              return { id: ex.id, exerciseId: ex.exercise_id, name: exName || 'Unknown', image_url: exImage, sets };
            });
            setExercises(activeEx);
          }
        }
        setStartTime(Date.now()); // Start timer once data is loaded
      } catch (err) {
        console.error('Failed to initialize workout', err);
      } finally {
        setLoading(false);
      }
    };

    initWorkout();
  }, [routineId, dayId, selectedExercises]);

  // Auto-save to localStorage whenever exercises or startTime changes
  useEffect(() => {
    if (loading || exercises.length === 0) return;
    getCurrentUserId().then((uid: string | null) => {
      const stateToSave = {
        userId: uid,
        startTime,
        routineId,
        routineName,
        exercises
      };
      localStorage.setItem('liftri_active_workout', JSON.stringify(stateToSave));
    });
  }, [exercises, startTime, routineId, loading]);

  const getExerciseMuscleGroup = (exerciseId: string): string => {
    const ex = catalogExercises.find(e => e.id === exerciseId);
    return ex?.muscle_group || 'General';
  };

  const exercisesByCategory = React.useMemo(() => {
    const groups: Record<string, { exercise: ActiveExercise; originalIndex: number }[]> = {};
    
    exercises.forEach((ex, idx) => {
      const rawGroup = getExerciseMuscleGroup(ex.exerciseId);
      const cat = rawGroup.charAt(0).toUpperCase() + rawGroup.slice(1).toLowerCase();
      
      const normalizedCat = ['Pecho', 'Espalda', 'Pierna', 'Brazo', 'Abdomen', 'Glúteo'].includes(cat) 
        ? cat : 'General';
        
      if (!groups[normalizedCat]) {
        groups[normalizedCat] = [];
      }
      groups[normalizedCat].push({ exercise: ex, originalIndex: idx });
    });
    
    return groups;
  }, [exercises, catalogExercises]);

  const getBaselinePR = (exId: string, sets: ActiveSet[]) => {
    const dbPR = initialPersonalRecords[exId] || 0;
    const maxPrevWeight = Math.max(0, ...sets.map(s => s.prevWeight ? toDatabaseWeight(s.prevWeight, weightUnit) : 0));
    return Math.max(dbPR, maxPrevWeight);
  };

  const moveExerciseUpInGroup = (originalIndex: number, groupExercises: { exercise: ActiveExercise; originalIndex: number }[], itemIndex: number) => {
    if (itemIndex === 0) return;
    const prevOriginalIndex = groupExercises[itemIndex - 1].originalIndex;
    const newEx = [...exercises];
    const temp = newEx[prevOriginalIndex];
    newEx[prevOriginalIndex] = newEx[originalIndex];
    newEx[originalIndex] = temp;
    setExercises(newEx);
  };

  const moveExerciseDownInGroup = (originalIndex: number, groupExercises: { exercise: ActiveExercise; originalIndex: number }[], itemIndex: number) => {
    if (itemIndex === groupExercises.length - 1) return;
    const nextOriginalIndex = groupExercises[itemIndex + 1].originalIndex;
    const newEx = [...exercises];
    const temp = newEx[nextOriginalIndex];
    newEx[nextOriginalIndex] = newEx[originalIndex];
    newEx[originalIndex] = temp;
    setExercises(newEx);
  };

  const toggleSetComplete = (exerciseId: string, setId: string) => {
    // 1. Find the exercise and set to check if it's a new PR
    const parentEx = exercises.find(ex => ex.id === exerciseId);
    const targetSet = parentEx?.sets.find(s => s.id === setId);

    if (parentEx && targetSet && !targetSet.isCompleted) {
      const w = parseFloat(targetSet.weight);
      const r = parseInt(targetSet.reps, 10);
      if (targetSet.weight !== '' && !isNaN(w) && w >= 0 && targetSet.reps !== '' && !isNaN(r) && r > 0) {
        const baselinePR = getBaselinePR(parentEx.exerciseId, parentEx.sets);
        const wInKg = toDatabaseWeight(w, weightUnit);
        if (wInKg > 0 && wInKg > baselinePR && !confettiFired[parentEx.exerciseId]) {
          confetti({
            zIndex: 9999,
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
            disableForReducedMotion: true
          });
          setConfettiFired(prev => ({
            ...prev,
            [parentEx.exerciseId]: true
          }));
        }
      }

      // Rest Timer Trigger
      const restTimerEnabled = localStorage.getItem('liftri_rest_timer_enabled') !== 'false';
      if (restTimerEnabled) {
        const duration = Number(localStorage.getItem('liftri_rest_timer_duration')) || 90;
        const targetTime = Date.now() + duration * 1000;
        localStorage.setItem('liftri_rest_timer_target', targetTime.toString());
        setRestTimerDuration(duration);
        setRestTimerKey(Date.now());
        setShowRestTimer(true);
      }
    }

    // 2. Perform the normal state update
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              if (!s.isCompleted) {
                const w = parseFloat(s.weight);
                const r = parseInt(s.reps, 10);
                if (s.weight === '' || isNaN(w) || w < 0) {
                  toast.error(`⚠️ Ingresa un peso válido (mayor o igual a 0) para ${ex.name}`);
                  return s;
                }
                if (s.reps === '' || isNaN(r) || r <= 0) {
                  toast.error(`⚠️ Ingresa un número de repeticiones válido (mayor a 0) para ${ex.name}`);
                  return s;
                }
              }
              return { ...s, isCompleted: !s.isCompleted };
            }
            return s;
          })
        };
      }
      return ex;
    }));
  };

  const updateSet = (exId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id !== exId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const addSet = (exId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id !== exId) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: ActiveSet = {
        id: Date.now().toString(),
        weight: lastSet ? lastSet.weight : '',
        reps: lastSet ? lastSet.reps : '',
        isCompleted: false,
        prevWeight: lastSet ? lastSet.prevWeight : undefined,
        prevReps: lastSet ? lastSet.prevReps : undefined
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    }));
  };

  const deleteSet = (exId: string, setId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id !== exId) return ex;
      return { ...ex, sets: ex.sets.filter(s => s.id !== setId) };
    }));
  };

  const moveExerciseUp = (index: number) => {
    if (index === 0) return;
    const newEx = [...exercises];
    const temp = newEx[index - 1];
    newEx[index - 1] = newEx[index];
    newEx[index] = temp;
    setExercises(newEx);
  };

  const moveExerciseDown = (index: number) => {
    if (index === exercises.length - 1) return;
    const newEx = [...exercises];
    const temp = newEx[index + 1];
    newEx[index + 1] = newEx[index];
    newEx[index] = temp;
    setExercises(newEx);
  };

  const deleteExercise = (exId: string) => {
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    if (!confirm(`¿Eliminar "${ex.name}" de la rutina de hoy?`)) return;
    setExercises(prev => prev.filter(e => e.id !== exId));
    toast.success(`"${ex.name}" eliminado de la rutina.`);
  };


  const handleAppendExercise = async (ex: Exercise) => {
    try {
      const prevData = await getPreviousExerciseData(ex.id);
      const isBw = /push|pull|chin|dip|plank|crunch|sit/i.test(ex.name || '');
      const sets: ActiveSet[] = [];
      sets.push({
        id: Date.now().toString() + '0' + ex.id,
        weight: prevData ? String(toDisplayWeight(prevData.weight, weightUnit)) : (isBw ? '0' : ''),
        reps: prevData ? String(prevData.reps) : '10',
        isCompleted: false,
        prevWeight: prevData ? toDisplayWeight(prevData.weight, weightUnit) : undefined,
        prevReps: prevData?.reps
      });
      const newActiveEx: ActiveExercise = { 
        id: ex.id + Date.now().toString(), // Ensure unique ID if added twice
        exerciseId: ex.id, 
        name: ex.name || 'Unknown', 
        image_url: ex.image_url,
        sets 
      };
      setExercises([...exercises, newActiveEx]);
      setShowExerciseSelector(false);
      toast.success(`${ex.name} añadido a la rutina.`);
    } catch (err) {
      console.error(err);
      toast.error('Error al agregar el ejercicio.');
    }
  };


  const handleFinish = async () => {
    const allSets = exercises.flatMap(ex => ex.sets);
    const completedSets = allSets.filter(s => s.isCompleted);
    if (completedSets.length === 0) {
      toast.error('Debes marcar al menos un set como completado (✓) para poder guardar.');
      return;
    }
    const incompleteSets = allSets.filter(s => !s.isCompleted);
    if (incompleteSets.length > 0) {
      // Find the exercise name for the first incomplete set
      const firstIncomplete = exercises.find(ex => ex.sets.some(s => !s.isCompleted));
      toast.error(`Tienes sets sin completar en "${firstIncomplete?.name}". Márcalos con ✓ o elimínalos para guardar.`);
      return;
    }

    setSaving(true);
    
    const newPRs = [];
    for (const ex of exercises) {
      const exCompletedSets = ex.sets.filter(s => s.isCompleted);
      if (exCompletedSets.length === 0) continue;
      
      const maxWeight = Math.max(...exCompletedSets.map(s => parseFloat(s.weight) || 0));
      const maxWeightInKg = toDatabaseWeight(maxWeight, weightUnit);
      
      const baselinePR = initialPersonalRecords[ex.exerciseId] || Math.max(0, ...ex.sets.map(s => s.prevWeight ? toDatabaseWeight(s.prevWeight, weightUnit) : 0));
      
      if (maxWeightInKg > 0 && maxWeightInKg > baselinePR) {
        newPRs.push({
          exercise_id: ex.exerciseId,
          max_weight: maxWeightInKg
        });
      }
    }

    const durationMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));

    const dataToSave = {
      routineId,
      routineNameSnapshot: routineName,
      duration: durationMinutes,
      sets: completedSets.map(s => {
        const parentEx = exercises.find(e => e.sets.some(xs => xs.id === s.id))!;
        return {
          exercise_id: parentEx.exerciseId,
          weight: toDatabaseWeight(s.weight, weightUnit),
          reps: parseInt(s.reps, 10)
        };
      }),
      newPRs
    };

    try {
      await saveWorkoutSession(dataToSave);
      localStorage.removeItem('liftri_active_workout'); // Clear on successful save
      localStorage.removeItem('liftri_rest_timer_target'); // Clear rest timer too!
      setSaving(false);
      setShowSuccess(true);
      toast.success('Workout saved successfully!');
      setTimeout(() => {
        onFinish();
      }, 1500);
    } catch (error: any) {
      setSaving(false);
      toast.error(error.message || 'Failed to save workout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="logger-container page-wrapper" style={{ padding: 'var(--spacing-md)' }}>
        <Skeleton height="60px" style={{ marginBottom: 'var(--spacing-md)' }} />
        <Skeleton height="200px" style={{ marginBottom: 'var(--spacing-md)' }} />
        <Skeleton height="200px" style={{ marginBottom: 'var(--spacing-md)' }} />
      </div>
    );
  }

  return (
    <div className="logger-container page-wrapper">
      {/* Sticky Header Wrapper */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="logger-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{selectedExercises ? 'Entrenamiento' : 'Rutina'}</h2>
            <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, marginTop: 4 }}>
              Tiempo: {Math.floor((Date.now() - startTime) / 60000)} min
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowCancelConfirm(true)} style={{ padding: '8px 16px', borderRadius: '20px' }}>Cancelar</Button>
        </div>
        
        {showRestTimer && (
          <div style={{ padding: '0 16px 12px 16px' }}>
            <RestTimer 
              key={restTimerKey}
              duration={restTimerDuration}
              onClose={handleCloseRestTimer}
            />
          </div>
        )}
      </div>

      <div className="logger-content">
        {!showRestTimer && (
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.4, paddingLeft: '4px' }}>
            💡 Cada vez que termines un set, asegúrate de marcar su casilla (✓) a la derecha.
          </p>
        )}
        {Object.entries(exercisesByCategory).map(([category, groupItems]) => (
          <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div 
              style={{
                backgroundColor: 'rgba(204, 255, 0, 0.1)',
                borderLeft: '4px solid var(--color-primary)',
                padding: '8px 16px',
                borderRadius: '0 8px 8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => toggleCategoryCollapse(category)}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {category}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  {groupItems.length} {groupItems.length === 1 ? 'ejercicio' : 'ejercicios'}
                </span>
                <svg 
                  viewBox="0 0 24 24" 
                  width="16" 
                  height="16" 
                  stroke="var(--color-primary)" 
                  strokeWidth="3" 
                  fill="none" 
                  style={{ 
                    transform: collapsedCategories[category] ? 'rotate(0deg)' : 'rotate(180deg)', 
                    transition: 'transform 0.2s ease-in-out' 
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
            
            {!collapsedCategories[category] && groupItems.map(({ exercise: ex, originalIndex }, itemIndex) => {
              const baselinePR = getBaselinePR(ex.exerciseId, ex.sets);
              const completedPRSets = ex.sets.filter(s => {
                if (!s.isCompleted) return false;
                const wInKg = toDatabaseWeight(parseFloat(s.weight) || 0, weightUnit);
                return wInKg > 0 && wInKg > baselinePR;
              });
              const hasPR = completedPRSets.length > 0;
              const maxCompletedWeight = hasPR ? Math.max(...completedPRSets.map(s => parseFloat(s.weight) || 0)) : 0;

              return (
                <Card key={ex.id} className={`logger-card ${hasPR ? 'pr-achieved' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {ex.image_url && (
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%', 
                          backgroundColor: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          border: '1px solid var(--color-border)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          marginLeft: '8px'
                        }}>
                          <img src={ex.image_url} alt={ex.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <h3 
                        className="logger-ex-title" 
                        style={{ margin: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--color-border)' }}
                        onClick={() => {
                        const savedEx = catalogExercises.find(e => e.id === ex.exerciseId);
                        if (savedEx && savedEx.video_url) {
                          setActiveVideo({ title: savedEx.name, url: savedEx.video_url });
                        } else {
                          toast.error('No hay video disponible para este ejercicio.');
                        }
                      }}
                    >
                      {itemIndex + 1}. {ex.name}
                      {/push|pull|chin|dip|plank|crunch|sit/i.test(ex.name) && (
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 'normal', marginLeft: 8, textDecoration: 'none' }}>
                          (Bodyweight)
                        </span>
                      )}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        onClick={() => moveExerciseUpInGroup(originalIndex, groupItems, itemIndex)} 
                        disabled={itemIndex === 0}
                        style={{ background: 'none', border: 'none', color: itemIndex === 0 ? 'var(--color-border)' : 'var(--color-text)', cursor: itemIndex === 0 ? 'default' : 'pointer', display: 'flex', padding: '4px' }}
                        title="Mover arriba"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="18 15 12 9 6 15"></polyline></svg>
                      </button>
                      <button 
                        onClick={() => moveExerciseDownInGroup(originalIndex, groupItems, itemIndex)} 
                        disabled={itemIndex === groupItems.length - 1}
                        style={{ background: 'none', border: 'none', color: itemIndex === groupItems.length - 1 ? 'var(--color-border)' : 'var(--color-text)', cursor: itemIndex === groupItems.length - 1 ? 'default' : 'pointer', display: 'flex', padding: '4px' }}
                        title="Mover abajo"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                      <button 
                        onClick={() => deleteExercise(ex.id)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '4px' }}
                        title="Eliminar ejercicio de la rutina"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14H6L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                          <path d="M9 6V4h6v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {hasPR ? (
                    <div className="pr-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pr-banner-icon">🏆</span>
                        ¡Nuevo Récord Personal!
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        {maxCompletedWeight} {weightUnit === 'lb' ? 'Lb' : 'KG'}
                      </div>
                    </div>
                  ) : baselinePR > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 16px', backgroundColor: 'rgba(204, 255, 0, 0.05)', borderRadius: '10px', border: '1px solid rgba(204, 255, 0, 0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600 }}>
                        <span style={{ fontSize: '18px' }}>🏆</span>
                        Récord Personal
                      </div>
                      <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '14px' }}>
                        {toDisplayWeight(baselinePR, weightUnit)} {weightUnit === 'lb' ? 'Lb' : 'KG'}
                      </div>
                    </div>
                  ) : null}

                  <div className="logger-table-header">
                    <span className="col-set">Set</span>
                    <span className="col-prev">Previous</span>
                    <span className="col-input">{weightUnit === 'lb' ? 'Lb' : 'KG'}</span>
                    <span className="col-input">Reps</span>
                    <span className="col-check">✓</span>
                    <span style={{ width: '24px' }}></span>
                  </div>

                  {ex.sets.map((set, sIndex) => {
                    const currentWeightNum = parseFloat(set.weight);
                    const currentRepsNum = parseInt(set.reps, 10);
                    
                    const isInvalidWeight = set.weight === '' || isNaN(currentWeightNum) || currentWeightNum < 0;
                    const isInvalidReps = set.reps === '' || isNaN(currentRepsNum) || currentRepsNum <= 0;

                    return (
                      <div key={set.id} className={`logger-row ${set.isCompleted ? 'completed' : ''}`}>
                        <span className="col-set">{sIndex + 1}</span>
                        <span className="col-prev">
                          {set.prevWeight !== undefined ? `${set.prevWeight} ${weightUnit === 'lb' ? 'Lb' : 'KG'} x ${set.prevReps}` : '-'}
                        </span>
                        <div className="col-input" style={{ position: 'relative' }}>
                          <input 
                            type="number" 
                            value={set.weight} 
                            onChange={e => updateSet(ex.id, set.id, 'weight', e.target.value)}
                            disabled={set.isCompleted}
                            className={`${isInvalidWeight && !set.isCompleted ? 'input-error' : ''}`}
                          />
                        </div>
                        <div className="col-input">
                          <input 
                            type="number" 
                            value={set.reps} 
                            onChange={e => updateSet(ex.id, set.id, 'reps', e.target.value)}
                            disabled={set.isCompleted}
                            className={isInvalidReps && !set.isCompleted ? 'input-error' : ''}
                          />
                        </div>

                        <div className="col-check">
                          <button 
                            className={`check-btn ${set.isCompleted ? 'checked' : ''}`}
                            onClick={() => toggleSetComplete(ex.id, set.id)}
                          >
                            {set.isCompleted && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                        </div>
                        <button 
                          onClick={() => deleteSet(ex.id, set.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          title="Eliminar set"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    );
                  })}
                  
                  <button className="add-set-btn" onClick={() => addSet(ex.id)}>
                    + Add Set
                  </button>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      <div className="logger-footer">
        <Button 
          variant="outline" 
          style={{ 
            width: '100%', 
            padding: '16px 0', 
            fontSize: 16,
            marginBottom: '12px'
          }} 
          onClick={() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            setShowExerciseSelector(true);
          }} 
        >
          + Add Exercise
        </Button>
        <Button 
          variant="primary" 
          style={{ 
            width: '100%', 
            padding: '16px 0', 
            fontSize: 18,
            backgroundColor: showSuccess ? '#4ade80' : undefined,
            transition: 'all 0.3s ease'
          }} 
          onClick={() => {
            const allSets = exercises.flatMap(ex => ex.sets);
            const completedSets = allSets.filter(s => s.isCompleted);
            if (completedSets.length === 0) {
              toast.error('Debes marcar al menos un set como completado (✓) para poder guardar.');
              return;
            }
            const incompleteSets = allSets.filter(s => !s.isCompleted);
            if (incompleteSets.length > 0) {
              const firstIncomplete = exercises.find(ex => ex.sets.some(s => !s.isCompleted));
              toast.error(`Tienes sets sin completar en "${firstIncomplete?.name}". Márcalos con ✓ o elimínalos para guardar.`);
              return;
            }
            setShowFinishConfirm(true);
          }} 
          disabled={saving || showSuccess}
        >
          {saving ? 'Saving...' : showSuccess ? '✓ Workout Saved!' : 'Finish Workout'}
        </Button>
      </div>

      {showFinishConfirm && createPortal(
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700 }}>¿Terminar Entrenamiento?</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              ¿Estás seguro de que deseas guardar y finalizar esta rutina?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                variant="outline" 
                style={{ flex: 1 }} 
                onClick={() => setShowFinishConfirm(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                style={{ flex: 1 }} 
                onClick={() => {
                  setShowFinishConfirm(false);
                  handleFinish();
                }}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCancelConfirm && createPortal(
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700, color: 'var(--color-error)' }}>¿Cancelar Entrenamiento?</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              ¿Seguro que quieres cancelar este entrenamiento? Se perderá todo el progreso y no se guardará nada.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                variant="outline" 
                style={{ flex: 1 }} 
                onClick={() => setShowCancelConfirm(false)}
              >
                Volver
              </Button>
              <Button 
                variant="primary" 
                style={{ flex: 1, backgroundColor: 'var(--color-error)', color: '#fff', border: 'none' }} 
                onClick={() => {
                  setShowCancelConfirm(false);
                  localStorage.removeItem('liftri_active_workout');
                  localStorage.removeItem('liftri_rest_timer_target');
                  onCancel();
                }}
              >
                Sí, cancelar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showExerciseSelector && (() => {
        const filteredSelectorExercises = catalogExercises.filter(ex => {
          const catMatch = !filterCategory || ex.muscle_group === filterCategory;
          const queryMatch = !searchQuery || (ex.name || '').toLowerCase().includes(searchQuery.toLowerCase());
          const needsSubcat = filterCategory && (filterCategory.toLowerCase() === 'brazo' || filterCategory.toLowerCase() === 'pierna');
          const subcatMatch = !needsSubcat || subcategoryFilter === 'Todos' || (ex.subcategory && ex.subcategory.toLowerCase() === subcategoryFilter.toLowerCase());
          return catMatch && queryMatch && subcatMatch;
        });

        return createPortal(
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh',
            backgroundColor: 'var(--color-background)', zIndex: 1000,
            display: 'flex', flexDirection: 'column',
            overscrollBehavior: 'none',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}>
            {/* Header */}
            <div style={{ padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-border)' }}>
              <button 
                onClick={() => {
                  setShowExerciseSelector(false);
                  setSearchQuery('');
                  setFilterCategory('');
                  setSubcategoryFilter('Todos');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: '8px', display: 'flex' }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              </button>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>Agregar Ejercicio</h3>
              <button 
                onClick={() => {
                  setShowExerciseSelector(false);
                  setSearchQuery('');
                  setFilterCategory('');
                  setSubcategoryFilter('Todos');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}
              >
                Cancelar
              </button>
            </div>

            {/* Search bar */}
            <div style={{ padding: '16px 16px 8px 16px' }}>
              <input 
                type="text" 
                placeholder="Buscar ejercicio..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', 
                  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', outline: 'none', fontSize: 16
                }}
              />
            </div>

            {/* Category Navigation Chips */}
            <div style={{ padding: '8px 16px 4px 16px' }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {MUSCLE_CATEGORIES.map(cat => {
                  const isActive = (cat === 'Todos' && !filterCategory) || filterCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setFilterCategory(cat === 'Todos' ? '' : cat);
                        setSubcategoryFilter('Todos');
                      }}
                      style={{
                        flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                        border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: isActive ? 'rgba(var(--color-primary-rgb,200,255,0),0.15)' : 'transparent',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 400,
                        transition: 'all 0.15s'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategory chips for Brazo / Pierna */}
            {filterCategory && (filterCategory.toLowerCase() === 'brazo' || filterCategory.toLowerCase() === 'pierna') && (
              <div style={{ padding: '4px 16px 8px 16px' }}>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                  {(filterCategory.toLowerCase() === 'brazo' ? BRAZO_SUBCATEGORIES : PIERNA_SUBCATEGORIES).map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSubcategoryFilter(sub)}
                      style={{
                        flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                        border: subcategoryFilter === sub ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: subcategoryFilter === sub ? 'rgba(var(--color-primary-rgb,200,255,0),0.12)' : 'transparent',
                        color: subcategoryFilter === sub ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        cursor: 'pointer', fontSize: 12, fontWeight: subcategoryFilter === sub ? 700 : 400,
                        transition: 'all 0.15s'
                      }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scrollable Exercises List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredSelectorExercises.map(ex => (
                <div 
                  key={ex.id} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, 
                    backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: 12, 
                    border: '1px solid transparent' 
                  }}
                >
                  {/* Thumbnail with tap-to-expand */}
                  <div style={{ flexShrink: 0, width: 48, height: 48 }}>
                    {ex.image_url ? (
                      <img
                        src={ex.image_url}
                        alt={ex.name}
                        loading="lazy"
                        onClick={() => setActiveImage({ title: ex.name, url: ex.image_url! })}
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', backgroundColor: '#fff', cursor: 'zoom-in' }}
                      />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 10 }}>N/A</div>
                    )}
                  </div>

                  {/* Info and Video Link */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span 
                      onClick={() => {
                        if (ex.video_url) {
                          setActiveVideo({ title: ex.name, url: ex.video_url });
                        }
                      }}
                      style={{ 
                        margin: 0, fontSize: 15, fontWeight: 600, display: 'block',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: ex.video_url ? 'pointer' : 'default',
                        textDecoration: ex.video_url ? 'underline' : 'none',
                        textDecorationColor: ex.video_url ? 'var(--color-primary)' : 'transparent',
                        textUnderlineOffset: '3px',
                        color: 'var(--color-text)'
                      }}
                    >
                      {ex.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, textTransform: 'capitalize' }}>
                      {ex.subcategory ? `${ex.muscle_group} • ${ex.subcategory}` : ex.muscle_group}
                    </span>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={() => {
                      handleAppendExercise(ex);
                      setSearchQuery('');
                      setFilterCategory('');
                      setSubcategoryFilter('Todos');
                    }}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', 
                      backgroundColor: 'var(--color-primary)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#000', fontWeight: 'bold', fontSize: 18,
                      flexShrink: 0
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
              {filteredSelectorExercises.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '24px' }}>
                  No se encontraron ejercicios.
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Video Modal - Playing in loop, inline, muted like in Exercises */}
      {activeVideo && createPortal(
        <div 
          onClick={() => setActiveVideo(null)} 
          style={{ 
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 99999, 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 
          }}
        >
          <h3 style={{ color: 'white', marginBottom: 20, textAlign: 'center', fontSize: 18 }}>{activeVideo.title}</h3>
          {activeVideo.url.includes('youtube.com') || activeVideo.url.includes('youtu.be') ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: 600, paddingTop: '56.25%', borderRadius: 16, overflow: 'hidden' }}>
              <iframe
                src={activeVideo.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
              />
            </div>
          ) : (
            <video 
              src={activeVideo.url} 
              autoPlay 
              loop 
              playsInline 
              muted 
              style={{ width: '100%', maxHeight: '60vh', borderRadius: 16, objectFit: 'contain', backgroundColor: '#fff' }} 
            />
          )}
          <Button variant="outline" style={{ marginTop: 24 }} onClick={() => setActiveVideo(null)}>Cerrar</Button>
        </div>,
        document.body
      )}

      {/* Image Modal for Expanded Thumbnails */}
      {activeImage && createPortal(
        <div 
          onClick={() => setActiveImage(null)} 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.94)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <h3 style={{ color: 'white', marginBottom: 20, textAlign: 'center', fontSize: 18, fontWeight: 600 }}>{activeImage.title}</h3>
          <img src={activeImage.url} alt={activeImage.title} style={{ width: '100%', maxWidth: 500, maxHeight: '65vh', borderRadius: 16, objectFit: 'contain', backgroundColor: '#fff', padding: 12, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }} />
          <Button variant="outline" style={{ marginTop: 24 }} onClick={() => setActiveImage(null)}>Cerrar</Button>
        </div>,
        document.body
      )}

    </div>
  );
};
