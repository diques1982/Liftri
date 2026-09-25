import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button, Card, Skeleton, Input } from '../ui';
import { getProfile, getDashboardStats, createExercise, uploadExerciseImage, uploadExerciseVideo, getAllExercises, getRecentWorkouts, getPersonalRecords, saveWorkoutSession, getCurrentUserId, getTodayCompletedRoutineIds } from '../../lib/api';
import { getTodayScheduledWorkouts } from '../../lib/planner';
import { Exercise, ScheduledWorkout } from '../../types/database';
import { ExerciseSelector } from './ExerciseSelector';
import { AdminExerciseList } from './AdminExerciseList';
import { WorkoutLogger } from '../workout/WorkoutLogger';
import { toast } from '../../utils/toast';
import { formatWeightDisplay } from '../../utils/unit';
import { RoutineLibrary } from '../routines/RoutineLibrary';
import '../../styles/theme.css';

export const Dashboard: React.FC<{ 
  resetKey?: number; 
  onNavigate?: (tab: string) => void;
  weightUnit: 'kg' | 'lb';
}> = ({ resetKey = 0, onNavigate, weightUnit }) => {
  const [userName, setUserName] = useState('Usuario');
  const [stats, setStats] = useState({ 
    totalSessions: 0,
    currentWeekSessions: 0, 
    totalVolume: 0, 
    currentWeekVolume: 0, 
    prevWeekVolume: 0,
    progressPercentage: 0,
    lastMonthSessions: 0,
    lastMonthVolume: 0,
    mostRecentWorkoutDate: null as string | null,
    mostRecentWorkoutVolume: 0,
    mostRecentWorkoutCategories: [] as string[]
  });
  const [recentPRs, setRecentPRs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');
  // Initialize from localStorage synchronously so button text is correct on first render
  const [hasActiveWorkout, setHasActiveWorkout] = useState(() => {
    try {
      const saved = localStorage.getItem('liftri_active_workout');
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (!parsed?.startTime) return false;
      // Only count if from today
      const startDate = new Date(parsed.startTime);
      const now = new Date();
      return startDate.toDateString() === now.toDateString();
    } catch {
      return false;
    }
  });
  const [todayWorkouts, setTodayWorkouts] = useState<ScheduledWorkout[]>([]);
  const [completedRoutineIds, setCompletedRoutineIds] = useState<string[]>([]);
  
  // Flow State Machine
  const [flowStep, setFlowStep] = useState<'dashboard' | 'exercises' | 'logger' | 'adminList'>('dashboard');

  const [loggerRoutineId, setLoggerRoutineId] = useState<string | undefined>(undefined);
  const [loggerRoutineName, setLoggerRoutineName] = useState<string | undefined>(undefined);
  const [loggerDayId, setLoggerDayId] = useState<string | undefined>(undefined);

  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  // Admin form state
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [exName, setExName] = useState('');
  const [exMuscle, setExMuscle] = useState('');
  const [exSubcategory, setExSubcategory] = useState('');
  const [exType, setExType] = useState('Repeticiones con peso');
  const [exEquipment, setExEquipment] = useState('Ninguno');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [savingEx, setSavingEx] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const BRAZO_SUBCATEGORIES = ['Bíceps', 'Tríceps', 'Hombro', 'Antebrazo'];
  const CATEGORIES = ['Pecho', 'Espalda', 'Brazo', 'Pierna', 'Abdomen', 'Glúteo'];

  useEffect(() => {
    if (resetKey > 0) {
      setFlowStep('dashboard');
      setShowAdminForm(false);
    }
  }, [resetKey]);

  useEffect(() => {
    const checkStartRequest = () => {
      const startFlag = localStorage.getItem('liftri_start_active_workout');
      if (startFlag === 'true') {
        const rId = localStorage.getItem('liftri_start_routine_id');
        const rName = localStorage.getItem('liftri_start_routine_name');
        const dId = localStorage.getItem('liftri_start_day_id');

        if (rId && dId) {
          setSelectedExercises([]);
          setLoggerRoutineId(rId);
          if (rName) setLoggerRoutineName(rName);
          setLoggerDayId(dId);
          setFlowStep('logger');
          
          // Clear flags so a regular page reload doesn't trigger this again
          setTimeout(() => {
            localStorage.removeItem('liftri_start_active_workout');
            localStorage.removeItem('liftri_start_routine_id');
            localStorage.removeItem('liftri_start_routine_name');
            localStorage.removeItem('liftri_start_day_id');
          }, 1000);
        }
      }
    };
    checkStartRequest();
  }, [resetKey]);

  useEffect(() => {
    const checkActiveWorkout = async () => {
      const savedStr = localStorage.getItem('liftri_active_workout');
      if (savedStr) {
        try {
          const savedState = JSON.parse(savedStr);
          if (savedState && savedState.startTime) {
            // Discard workout if it belongs to a different user
            const currentUserId = await getCurrentUserId();
            if (savedState.userId && savedState.userId !== currentUserId) {
              localStorage.removeItem('liftri_active_workout');
              setHasActiveWorkout(false);
              return;
            }

            const startDate = new Date(savedState.startTime);
            const now = new Date();
            // Check if it's from a previous day
            if (startDate.toDateString() !== now.toDateString()) {
              // Auto-save expired workout
              const completedSets = savedState.exercises?.flatMap((ex: any) => ex.sets).filter((s: any) => s.isCompleted) || [];
              if (completedSets.length > 0) {
                const prs = await getPersonalRecords();
                const newPRs = [];
                for (const ex of savedState.exercises) {
                  const exCompletedSets = ex.sets.filter((s: any) => s.isCompleted);
                  if (exCompletedSets.length === 0) continue;
                  const maxWeight = Math.max(...exCompletedSets.map((s: any) => parseFloat(s.weight) || 0));
                  if (maxWeight > 0 && maxWeight > (prs[ex.exerciseId] || 0)) {
                    newPRs.push({
                      exercise_id: ex.exerciseId,
                      max_weight: maxWeight
                    });
                  }
                }
                const durationMinutes = Math.max(1, Math.round((now.getTime() - savedState.startTime) / 60000));
                const cappedDuration = Math.min(120, durationMinutes); // Cap at 2 hours to avoid extreme durations

                const dataToSave = {
                  routineId: savedState.routineId,
                  duration: cappedDuration,
                  sets: completedSets.map((s: any) => {
                    const parentEx = savedState.exercises.find((e: any) => e.sets.some((xs: any) => xs.id === s.id));
                    return {
                      exercise_id: parentEx.exerciseId,
                      weight: parseFloat(s.weight),
                      reps: parseInt(s.reps, 10)
                    };
                  }),
                  newPRs
                };
                
                await saveWorkoutSession(dataToSave).catch(e => console.error('Failed to auto-save:', e));
              }
              // Clear it
              localStorage.removeItem('liftri_active_workout');
              setHasActiveWorkout(false);
            } else {
              setHasActiveWorkout(true);
            }
          }
        } catch (err) {
          console.error('Error parsing saved workout:', err);
          localStorage.removeItem('liftri_active_workout');
        }
      } else {
        setHasActiveWorkout(false);
      }
    };
    if (flowStep === 'dashboard') {
      checkActiveWorkout();
    }
  }, [flowStep, resetKey]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [profile, userStats, workouts, completedRoutines] = await Promise.all([
          getProfile(),
          getDashboardStats(),
          getRecentWorkouts(),
          getTodayCompletedRoutineIds(),
        ]);
        
        setCompletedRoutineIds(completedRoutines);
        
        const data = await getTodayScheduledWorkouts();
        setTodayWorkouts(data);

        if (profile?.name) {
          setUserName(profile.name);
        } else {
          // Fallback: read name from auth session metadata (set during signup)
          const { data: { session } } = await supabase.auth.getSession();
          const metaName = session?.user?.user_metadata?.name;
          if (metaName) {
            setUserName(metaName);
            // Persist it to profiles so next load works normally
            const uid = session?.user?.id;
            if (uid) {
              await supabase.from('profiles').upsert({ id: uid, name: metaName }, { onConflict: 'id' });
            }
          }
        }
        if (profile?.role) {
          setUserRole(profile.role);
        }
        setStats(userStats);

        if (workouts.length > 0) {
          // get the most recent date
          const mostRecentDate = workouts[0].date;
          // filter workouts from that date
          const recent = workouts.filter(w => w.date === mostRecentDate);
          setRecentPRs(recent);
        } else {
          setRecentPRs([]);
        }

      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [flowStep]); // Refetch when returning to dashboard


  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exName.trim() || !exMuscle.trim()) {
      toast.error('Nombre y grupo muscular son requeridos.');
      return;
    }

    setSavingEx(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        image_url = await uploadExerciseImage(imageFile);
      }
      let video_url: string | undefined;
      if (videoFile) {
        video_url = await uploadExerciseVideo(videoFile);
      }

      await createExercise({
        name: exName,
        muscle_group: exMuscle,
        subcategory: exSubcategory,
        exercise_type: exType,
        equipment: exEquipment,
        image_url,
        video_url
      });
      toast.success('Ejercicio creado exitosamente');
      
      // Reset form
      setExName('');
      setExMuscle('');
      setExSubcategory('');
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setShowAdminForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear ejercicio');
    } finally {
      setSavingEx(false);
    }
  };

  const handleStartFlow = async () => {
    setSelectedExercises([]);
    // Prevent iOS Safari scroll bug by resetting scroll
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Load global catalog on demand
    if (allExercises.length === 0) {
      const data = await getAllExercises();
      setAllExercises(data);
    }
    setFlowStep('exercises');
  };

  const handleStartTodayWorkout = (workout: ScheduledWorkout) => {
    if (workout?.routine?.id && workout.routine.routine_days?.[0]?.id) {
      setLoggerRoutineId(workout.routine.id);
      setLoggerRoutineName(workout.routine.name);
      setLoggerDayId(workout.routine.routine_days[0].id);
      setFlowStep('logger');
    }
  };

  const handleCompleteFlow = () => {
    if (selectedExercises.length === 0) {
      toast.error('Selecciona al menos un ejercicio');
      return;
    }
    setFlowStep('logger');
  };

  const handleFinishWorkout = () => {
    setFlowStep('dashboard');
    setLoggerRoutineId(undefined);
    setLoggerDayId(undefined);
    toast.success('¡Entrenamiento guardado con éxito!');
  };

  if (flowStep === 'exercises') {
    return createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', backgroundColor: 'var(--color-background)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
        <ExerciseSelector
          allExercises={allExercises}
          onStartWorkout={(exs) => {
            setSelectedExercises(exs);
            setFlowStep('logger');
          }}
          onBack={() => setFlowStep('dashboard')}
        />
      </div>,
      document.body
    );
  }

  if (flowStep === 'logger') {
    return (
      <WorkoutLogger 
        selectedExercises={selectedExercises.length > 0 ? selectedExercises : undefined}
        savedExercises={allExercises}
        routineId={loggerRoutineId}
        routineName={loggerRoutineName}
        dayId={loggerDayId}
        onFinish={handleFinishWorkout}
        weightUnit={weightUnit}
        onCancel={() => {
          localStorage.removeItem('liftri_active_workout');
          setHasActiveWorkout(false);
          setFlowStep('dashboard');
          setLoggerRoutineId(undefined);
          setLoggerRoutineName(undefined);
          setLoggerDayId(undefined);
        }}
      />
    );
  }

  if (flowStep === 'adminList') {
    return <AdminExerciseList onBack={() => setFlowStep('dashboard')} />;
  }


  return (
    <div className="dashboard-container page-wrapper">
      <div className="dashboard-header">
        <h2 className="greeting">Hola, {loading ? <Skeleton width={120} height="28px" style={{ display: 'inline-block' }} /> : userName}</h2>
      </div>

      {/* Stats Card */}
      <Card variant="highlight" className="stats-card">
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-value">{loading ? <Skeleton width={40} height="32px" /> : stats.currentWeekSessions}</span>
            <span className="stat-label">SESIONES ESTA SEMANA</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item" style={{ alignItems: 'flex-start' }}>
            <span className="stat-value">
              {loading ? (
                <Skeleton width={60} height="32px" />
              ) : (
                `${((stats.currentWeekVolume * (weightUnit === 'lb' ? 2.20462 : 1)) / 1000).toFixed(1)}k`
              )}{' '}
              {weightUnit === 'lb' ? 'Lb' : 'KG'}
            </span>
            <span className="stat-label" style={{ color: 'var(--color-text)' }}>This week</span>
            
            {!loading && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginTop: '6px',
                fontSize: '11px',
                color: 'var(--color-text-muted)'
              }}>
                <span>Last week: {((stats.prevWeekVolume * (weightUnit === 'lb' ? 2.20462 : 1)) / 1000).toFixed(1)}k {weightUnit === 'lb' ? 'Lb' : 'KG'}</span>
                <span style={{ 
                  color: stats.progressPercentage > 0 ? 'var(--color-primary)' : 'inherit',
                  backgroundColor: stats.progressPercentage > 0 ? 'rgba(204,255,0,0.1)' : 'transparent',
                  padding: stats.progressPercentage > 0 ? '2px 4px' : '0',
                  borderRadius: '4px',
                  fontWeight: stats.progressPercentage > 0 ? 'bold' : 'normal'
                }}>
                  {stats.progressPercentage > 0 ? '+' : ''}{stats.progressPercentage}%
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Today's Scheduled Workout Widget */}
      {!loading && todayWorkouts.length > 0 && !hasActiveWorkout && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '0' }}>
          {todayWorkouts.map(workout => {
            const isCompleted = completedRoutineIds.includes(workout.routine_id) || completedRoutineIds.includes(workout.name);
            return (
            <Card key={workout.id} style={{ padding: '16px', border: '1px solid rgba(204,255,0,0.35)', backgroundColor: 'rgba(204,255,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-primary)' }}>
                    📅 Entrenamiento de hoy
                  </p>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                    {workout.name}
                  </h4>
                </div>
                <Button
                  variant={isCompleted ? 'outline' : 'primary'}
                  onClick={() => !isCompleted && handleStartTodayWorkout(workout)}
                  style={{ 
                    padding: '10px 18px', 
                    fontSize: 13, 
                    fontWeight: 700, 
                    borderRadius: 12, 
                    flexShrink: 0,
                    opacity: isCompleted ? 0.7 : 1,
                    cursor: isCompleted ? 'default' : 'pointer'
                  }}
                >
                  {isCompleted ? 'Completado' : 'Iniciar →'}
                </Button>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {/* Primary CTA */}
      <div className="cta-container" style={{ margin: '16px 0 32px' }}>
        <Button 
          variant="primary" 
          onClick={() => {
            if (hasActiveWorkout) {
              setFlowStep('logger');
              return;
            }
            handleStartFlow();
          }} 
          style={{ width: '100%', padding: '20px', fontSize: '18px', fontWeight: 800, borderRadius: '16px' }}
        >
          {hasActiveWorkout ? 'Continuar entreno' : 'Empezar Entrenamiento'}
        </Button>
      </div>

      {/* Routine Library Section (Moved from Routines Tab) */}
      <div style={{ marginBottom: '32px' }}>
        <RoutineLibrary resetKey={resetKey} />
      </div>

      {/* Recent Activity */}
      <section className="dashboard-section">
        <h3 className="section-title">Recent Activity</h3>
        {loading ? (
          <Skeleton height="100px" />
        ) : stats.totalSessions === 0 ? (
          <Card variant="default" className="empty-state-card">
            <div className="empty-state-content">
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <p className="empty-state-text">No workouts logged yet.</p>
              <span className="empty-state-subtext">Your recent activity will appear here.</span>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stats.mostRecentWorkoutVolume > 0 && (
              <Card variant="highlight" style={{ padding: '20px', border: '1px solid rgba(204,255,0,0.3)', backgroundColor: 'rgba(204,255,0,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Último Entrenamiento ({stats.mostRecentWorkoutDate ? new Date(stats.mostRecentWorkoutDate + 'T12:00:00').toLocaleDateString() : 'Reciente'})
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {stats.mostRecentWorkoutCategories && stats.mostRecentWorkoutCategories.length > 0 ? (
                        stats.mostRecentWorkoutCategories.map((cat, i) => (
                          <span key={i} style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', textTransform: 'capitalize' }}>
                            • {cat.toLowerCase()}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Múltiples ejercicios</span>
                      )}
                    </div>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-text)', textAlign: 'right' }}>
                      {((stats.mostRecentWorkoutVolume * (weightUnit === 'lb' ? 2.20462 : 1)) / 1000).toFixed(1)}k <span style={{ fontSize: '16px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{weightUnit === 'lb' ? 'Lb' : 'KG'}</span>
                    </span>
                  </div>
                </div>
              </Card>
            )}

          </div>
        )}
      </section>


      {/* Motivational Quote */}
      <div className="quote-container">
        <blockquote className="motivational-quote">
          "The only bad workout is the one that didn't happen."
        </blockquote>
      </div>

      {/* Admin Section */}
      {userRole === 'admin' && (
        <section className="dashboard-section" style={{ marginTop: 'var(--spacing-xl)' }}>
          <h3 className="section-title" style={{ marginBottom: '12px' }}>Admin Area</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              variant="outline" 
              style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 600 }}
              onClick={() => setShowAdminForm(true)}
            >
              + New Exercise
            </Button>
            <Button 
              variant="outline" 
              style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 600, borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              onClick={() => setFlowStep('adminList')}
            >
              👁 Ver Ejercicios
            </Button>
          </div>
        </section>
      )}


      {/* Full Screen Modal for Creating Exercise */}
      {showAdminForm && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#f9fafb',
            color: '#111827',
            '--color-text': '#111827',
            '--color-text-muted': '#6b7280',
            '--color-background': '#ffffff',
            '--color-surface': '#ffffff',
            '--color-border': '#d1d5db',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          } as React.CSSProperties}>
            <button 
              onClick={() => setShowAdminForm(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
          <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700 }}>Crear ejercicio</h3>
            
            <form onSubmit={handleCreateExercise}>
              {/* Image Upload (optional) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>IMAGEN <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '2px dashed var(--color-border)', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--color-text-muted)" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); } }} style={{ display: 'none' }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13, width: '100%' }}>
                      {imageFile ? `✓ ${imageFile.name}` : 'Elegir imagen...'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Upload (optional) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>VIDEO <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                <input type="file" accept="video/*" ref={videoInputRef} onChange={(e) => { if (e.target.files?.[0]) setVideoFile(e.target.files[0]); }} style={{ display: 'none' }} />
                <button type="button" onClick={() => videoInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: videoFile ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left' }}>
                  {videoFile ? `✓ ${videoFile.name}` : '🎬 Subir video del ejercicio...'}
                </button>
                {videoFile && (
                  <button type="button" onClick={() => setVideoFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>✕ Quitar video</button>
                )}
              </div>

              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>NOMBRE DEL EJERCICIO <span style={{ color: '#ef4444' }}>*</span></label>
                <Input placeholder="Ej. Curl con mancuerna..." value={exName} onChange={(e) => setExName(e.target.value)} required />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>CATEGORÍA <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={exMuscle} onChange={e => { setExMuscle(e.target.value); setExSubcategory(''); }} style={{ width: '100%', padding: '12px', borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }} required>
                  <option value="" disabled>Seleccionar categoría</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Subcategory (only for Brazo) */}
              {exMuscle === 'Brazo' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>SUBCATEGORÍA</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {BRAZO_SUBCATEGORIES.map(sub => (
                      <button key={sub} type="button" onClick={() => setExSubcategory(exSubcategory === sub ? '' : sub)} style={{ padding: '6px 14px', borderRadius: 20, border: exSubcategory === sub ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', backgroundColor: exSubcategory === sub ? 'rgba(var(--color-primary-rgb,200,255,0),0.15)' : 'var(--color-background)', color: exSubcategory === sub ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontSize: 13, fontWeight: exSubcategory === sub ? 700 : 400 }}>{sub}</button>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" variant="primary" disabled={savingEx} style={{ width: '100%', padding: '14px', fontWeight: 700 }}>
                {savingEx ? 'Guardando...' : 'Guardar Ejercicio'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
