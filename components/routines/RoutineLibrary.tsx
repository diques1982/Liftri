import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Card, Skeleton, ConfirmModal } from '../ui';
import { MuscleSelector } from '../dashboard/MuscleSelector';
import { ExerciseSelector } from '../dashboard/ExerciseSelector';
import { getAllExercises, getUserRoutines, deleteRoutine, getRoutineDetails } from '../../lib/api';
import { createRoutineTemplate, scheduleExistingRoutine } from '../../lib/planner';
import { Exercise, Routine } from '../../types/database';
import { toast } from '../../utils/toast';
import { ScheduleModal } from './ScheduleModal';
import { RoutineEditor } from './RoutineEditor';
import { cleanupLegacyRoutines } from '../../scripts/cleanupLegacyRoutines';
import { getCurrentUserId } from '../../lib/api';

type LibraryStep = 'list' | 'name' | 'muscles' | 'exercises';

export const RoutineLibrary: React.FC<{
  onRoutineScheduled?: () => void;
  resetKey?: number;
}> = ({ onRoutineScheduled, resetKey }) => {
  const [step, setStep] = useState<LibraryStep>('list');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create flow state
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [savedExercises, setSavedExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [newRoutineName, setNewRoutineName] = useState('');
  
  // Schedule flow state
  const [routineToSchedule, setRoutineToSchedule] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Details & Editor state
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [routineDetailsCache, setRoutineDetailsCache] = useState<Record<string, any>>({});
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<{ id: string, name: string } | null>(null);

  const loadRoutines = async () => {
    setLoading(true);
    const data = await getUserRoutines();
    setRoutines(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRoutines();
    // Pre-fetch some library exercises to improve perceived performance
    getAllExercises();
  }, []);

  useEffect(() => {
    if (resetKey && resetKey > 0) {
      setStep('list');
      setEditingRoutineId(null);
      setShowScheduleModal(false);
      setRoutineToDelete(null);
    }
  }, [resetKey]);

  useEffect(() => {
    if (step === 'list' && !editingRoutineId) {
      loadRoutines();
    }
  }, [step, editingRoutineId]);

  // Expose cleanup script to window for manual execution via DevTools
  useEffect(() => {
    (window as any).runLiftriCleanup = async (dryRun: boolean = true) => {
      const uid = await getCurrentUserId();
      if (uid) {
        const result = await cleanupLegacyRoutines(uid, dryRun);
        if (!dryRun) loadRoutines();
        return result;
      }
    };
  }, []);

  const handleCreateNew = () => {
    setNewRoutineName('');
    setStep('name');
  };

  const handleNameContinue = async () => {
    try {
      // Prevent iOS Safari keyboard scroll bug by blurring and resetting scroll
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      const allEx = await getAllExercises();
      setSavedExercises(allEx);
      setStep('exercises');
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar ejercicios');
    }
  };

  const handleMusclesContinue = (muscles: string[]) => {
    setSelectedMuscles(muscles);
    setStep('exercises');
  };

  const handleExercisesSelected = async (exercises: Exercise[]) => {
    if (exercises.length === 0) {
      toast.error('Selecciona al menos un ejercicio');
      return;
    }
    
    // Build final name: use user input or auto-generate from muscle groups
    const finalName = newRoutineName.trim() || (
      'Rutina de ' + [...new Set(exercises.map(e => e.muscle_group).filter(Boolean))].join(', ')
    );

    try {
      await createRoutineTemplate(exercises, finalName);
      toast.success('Rutina creada y guardada en Mis Rutinas');
      setStep('list');
      setSelectedExercises([]);
      setSelectedMuscles([]);
      setNewRoutineName('');
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar la rutina');
    }
  };

  const handleScheduleClick = (routineId: string) => {
    setRoutineToSchedule(routineId);
    setShowScheduleModal(true);
  };

  const handleScheduleSave = async (scheduleType: 'today' | 'recurring', recurrenceDays: number[], specificDate?: string) => {
    if (!routineToSchedule) return;
    
    try {
      await scheduleExistingRoutine(routineToSchedule, scheduleType, specificDate || recurrenceDays);
      toast.success('Rutina programada ✓');
      setShowScheduleModal(false);
      setRoutineToSchedule(null);
      if (onRoutineScheduled) onRoutineScheduled();
    } catch (e: any) {
      toast.error(e.message ?? 'Error al programar');
    }
  };

  const confirmDeleteRoutine = async (routineId: string) => {
    try {
      await deleteRoutine(routineId);
      toast.success('Rutina eliminada correctamente');
      loadRoutines(); // Reload the list
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la rutina');
    }
    setRoutineToDelete(null);
  };

  const handleDeleteClick = (routineId: string, routineName: string) => {
    setRoutineToDelete({ id: routineId, name: routineName });
  };

  const handleExpand = async (routineId: string) => {
    if (expandedRoutineId === routineId) {
      setExpandedRoutineId(null);
      return;
    }
    setExpandedRoutineId(routineId);
    
    // Fetch details if not cached
    if (!routineDetailsCache[routineId]) {
      setLoadingDetailsId(routineId);
      try {
        const details = await getRoutineDetails(routineId);
        setRoutineDetailsCache(prev => ({ ...prev, [routineId]: details }));
      } catch (err) {
        console.error('Failed to load routine details', err);
      } finally {
        setLoadingDetailsId(null);
      }
    }
  };

  const handleEditClick = async (e: React.MouseEvent, routineId: string) => {
    e.stopPropagation(); // prevent accordion toggle
    
    // Ensure we have details before editing
    if (!routineDetailsCache[routineId]) {
      setLoadingDetailsId(routineId);
      try {
        const details = await getRoutineDetails(routineId);
        setRoutineDetailsCache(prev => ({ ...prev, [routineId]: details }));
      } catch (err) {
        toast.error('No se pudo cargar la rutina para editarla.');
        setLoadingDetailsId(null);
        return;
      }
      setLoadingDetailsId(null);
    }
    
    setEditingRoutineId(routineId);
  };

  if (editingRoutineId) {
    const routine = routines.find(r => r.id === editingRoutineId);
    const details = routineDetailsCache[editingRoutineId];
    return (
      <RoutineEditor
        routineId={editingRoutineId}
        initialName={routine?.name || ''}
        initialExercises={details || []}
        onClose={() => setEditingRoutineId(null)}
        onSave={() => {
          setEditingRoutineId(null);
          // Invalidating cache so next expand reloads
          setRoutineDetailsCache(prev => {
            const newCache = { ...prev };
            delete newCache[editingRoutineId];
            return newCache;
          });
        }}
      />
    );
  }

  if (step === 'name') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--color-background)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button onClick={() => setStep('list')} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: 8, display: 'flex' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>Nueva Rutina</h3>
        </div>

        {/* Body — no flex:1, button stays close to content */}
        <div style={{ padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Nombre de la rutina
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Ej: Push Day, Piernas Lunes..."
              value={newRoutineName}
              onChange={e => setNewRoutineName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameContinue()}
              style={{
                width: '100%', padding: '16px', borderRadius: 14,
                border: '2px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
                fontSize: 18, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
              Puedes dejarlo en blanco y se generará automáticamente según los ejercicios.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleNameContinue}
            style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 800, borderRadius: 14 }}
          >
            Seleccionar Ejercicios →
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'muscles') {
    return createPortal(
      <div style={{ position: 'fixed', top: '70px', left: 0, right: 0, bottom: 'calc(80px + env(safe-area-inset-bottom))', backgroundColor: 'var(--color-background)', zIndex: 2000, overflowY: 'auto' }}>
        <MuscleSelector onContinue={handleMusclesContinue} onBack={() => setStep('list')} />
      </div>,
      document.body
    );
  }

  if (step === 'exercises') {
    return createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', backgroundColor: 'var(--color-background)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
        <ExerciseSelector
          allExercises={savedExercises}
          onStartWorkout={handleExercisesSelected}
          onBack={() => setStep('name')}
          startButtonLabel="Guardar Rutina ✓"
        />
      </div>,
      document.body
    );
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
          Mis Rutinas
        </h3>
        <Button 
          variant="outline" 
          onClick={handleCreateNew}
          style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 700, borderRadius: '12px' }}
        >
          + Nueva
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton height="80px" borderRadius="16px" />
          <Skeleton height="80px" borderRadius="16px" />
        </div>
      ) : routines.length === 0 ? (
        <Card style={{ padding: '32px 16px', textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, background: 'transparent' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 14 }}>
            No tienes rutinas guardadas.<br />
            Crea una nueva para tenerla siempre lista.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {routines.map(routine => {
            // Count exercises roughly from the light fetch (first day)
            const exCount = (routine as any).routine_days?.[0]?.routine_exercises?.length || 0;
            const isExpanded = expandedRoutineId === routine.id;
            const isDetailsLoading = loadingDetailsId === routine.id;
            const details = routineDetailsCache[routine.id];

            return (
              <Card 
                key={routine.id} 
                onClick={() => handleExpand(routine.id)}
                style={{ 
                  padding: '16px', 
                  border: isExpanded ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', 
                  backgroundColor: 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
                        {routine.name}
                      </h4>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                      {exCount} {exCount === 1 ? 'ejercicio' : 'ejercicios'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      variant="outline" 
                      onClick={(e) => handleEditClick(e, routine.id)}
                      style={{ padding: '6px', fontSize: '13px', borderRadius: '10px', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      title="Editar rutina"
                    >
                      ✏️
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(routine.id, routine.name); }}
                      style={{ padding: '6px', fontSize: '13px', borderRadius: '10px', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      title="Eliminar rutina"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </Button>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <Button 
                    variant="primary" 
                    onClick={(e) => { e.stopPropagation(); handleScheduleClick(routine.id); }}
                    style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 800, borderRadius: '10px' }}
                  >
                    Empezar / Programar
                  </Button>
                </div>

                {/* Inline Expanded Content */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                    {isDetailsLoading ? (
                      <Skeleton height="60px" borderRadius="12px" />
                    ) : details ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {details.flatMap((day: any) => day.routine_exercises).map((ex: any, idx: number) => (
                          <div key={ex.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', padding: '10px 12px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              {/* Image Thumbnail */}
                              <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
                                {ex.exercises?.image_url ? (
                                  <img src={ex.exercises.image_url} alt={ex.exercises.name} style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#fff' }} />
                                ) : (
                                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>N/A</span>
                                )}
                              </div>
                              {/* Text Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.exercises?.name}</span>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{ex.exercises?.muscle_group}</span>
                              </div>
                            </div>
                            <div style={{ backgroundColor: 'var(--color-surface)', padding: '4px 8px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0, marginLeft: 8 }}>
                              {ex.sets} x {ex.reps}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>No hay ejercicios en esta rutina.</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showScheduleModal && (
        <ScheduleModal
          onSave={handleScheduleSave}
          onClose={() => { setShowScheduleModal(false); setRoutineToSchedule(null); }}
        />
      )}

      {routineToDelete && (
        <ConfirmModal
          title="Eliminar rutina"
          message={`¿Estás seguro de que quieres eliminar la rutina "${routineToDelete.name}"?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={() => confirmDeleteRoutine(routineToDelete.id)}
          onCancel={() => setRoutineToDelete(null)}
          isDestructive={true}
        />
      )}
    </div>
  );
};
