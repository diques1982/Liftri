import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Input, Card } from '../ui';
import { toast } from '../../utils/toast';
import { saveCompleteRoutine, searchRapidApiExercises, syncExerciseFromApi, RapidApiExercise, RoutineSaveData } from '../../lib/api';
import { Routine } from '../../types/database';
import '../../styles/theme.css';

interface CreateRoutineWizardProps {
  onComplete: (optimisticRoutine: Routine) => void;
  onCancel: () => void;
}

interface WizardExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
}

interface WizardDay {
  id: string;
  name: string;
  exercises: WizardExercise[];
}

export const CreateRoutineWizard: React.FC<CreateRoutineWizardProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [routineName, setRoutineName] = useState('');
  const [days, setDays] = useState<WizardDay[]>([]);
  const [newDayName, setNewDayName] = useState('');
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  
  // Exercises Data
  const [apiExercises, setApiExercises] = useState<RapidApiExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEx, setLoadingEx] = useState(false);
  const [syncingEx, setSyncingEx] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search for RapidAPI
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (!searchQuery.trim()) {
      setApiExercises([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingEx(true);
      try {
        const results = await searchRapidApiExercises(searchQuery);
        setApiExercises(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEx(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleAddDay = () => {
    if (newDayName.trim()) {
      setDays([...days, { id: Date.now().toString(), name: newDayName.trim(), exercises: [] }]);
      setNewDayName('');
    }
  };

  const handleAddExerciseToDay = async (apiEx: RapidApiExercise) => {
    if (!selectedDayId) return;
    
    setSyncingEx(apiEx.exerciseId);
    try {
      // Upsert to Supabase
      const localEx = await syncExerciseFromApi(apiEx);
      
      setDays(days.map(d => {
        if (d.id === selectedDayId) {
          return {
            ...d,
            exercises: [...d.exercises, { id: Date.now().toString(), exerciseId: localEx.id, exerciseName: localEx.name, sets: 3, reps: 10 }]
          };
        }
        return d;
      }));
      setSearchQuery('');
      setApiExercises([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync exercise');
    } finally {
      setSyncingEx(null);
    }
  };

  const handleUpdateExercise = (dayId: string, exId: string, field: 'sets' | 'reps', value: number) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        return {
          ...d,
          exercises: d.exercises.map(ex => ex.id === exId ? { ...ex, [field]: value } : ex)
        };
      }
      return d;
    }));
  };

  const handleSave = async () => {
    // 1. Validate
    const totalExercises = days.reduce((acc, d) => acc + d.exercises.length, 0);
    if (totalExercises === 0) {
      toast.error('You must add at least one exercise to save the routine.');
      return;
    }

    const hasInvalidSetsOrReps = days.some(d => d.exercises.some(ex => ex.sets < 1 || ex.reps < 1 || isNaN(ex.sets) || isNaN(ex.reps)));
    if (hasInvalidSetsOrReps) {
      toast.error('All exercises must have at least 1 set and 1 rep.');
      return;
    }

    setSaving(true);
    const dataToSave: RoutineSaveData = {
      name: routineName,
      days: days.map(d => ({
        name: d.name,
        exercises: d.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps
        }))
      }))
    };

    try {
      await saveCompleteRoutine(dataToSave);
      toast.success('Routine created successfully!');
      
      // Complete with optimistic data so Routines.tsx can update immediately
      onComplete({
        id: Date.now().toString(),
        name: routineName,
        user_id: 'temp',
        created_at: new Date().toISOString()
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to save routine. Please try again.');
      setSaving(false); // Only unset saving if it fails, otherwise let it unmount
    }
  };

  const filteredAndGroupedExercises = useMemo(() => {
    if (!apiExercises.length) return {};
    
    // Group by body part
    const groups: Record<string, RapidApiExercise[]> = {};
    apiExercises.forEach(ex => {
      const groupName = ex.muscleGroup || 'Other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(ex);
    });

    return groups;
  }, [apiExercises]);

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <Button variant="outline" onClick={onCancel} style={{ padding: '8px', border: 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--color-text)' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </Button>
        <span style={{ fontWeight: 600 }}>Step {step} of 4</span>
        <div style={{ width: 40 }}></div> {/* Spacer */}
      </div>

      <div className="wizard-content">
        {step === 1 && (
          <div className="wizard-step">
            <h2 className="step-title">Name your routine</h2>
            <Input 
              autoFocus
              placeholder="e.g. Push Pull Legs" 
              value={routineName} 
              onChange={e => setRoutineName(e.target.value)} 
            />
            <Button 
              variant="primary" 
              onClick={() => setStep(2)} 
              disabled={!routineName.trim()}
              style={{ marginTop: 'auto' }}
            >
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step">
            <h2 className="step-title">Add training days</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Input 
                placeholder="Day name (e.g. Push)" 
                value={newDayName} 
                onChange={e => setNewDayName(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && handleAddDay()}
              />
              <Button variant="secondary" onClick={handleAddDay}>Add</Button>
            </div>
            
            <div className="days-list">
              {days.map(d => (
                <Card key={d.id} variant="list" className="day-item">
                  <span style={{ fontWeight: 600 }}>{d.name}</span>
                  <button className="delete-btn" onClick={() => setDays(days.filter(day => day.id !== d.id))}>×</button>
                </Card>
              ))}
            </div>

            <div className="wizard-actions">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(3)} disabled={days.length === 0}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <h2 className="step-title">Add exercises</h2>
            <div className="day-tabs">
              {days.map(d => (
                <button 
                  key={d.id} 
                  className={`day-tab ${selectedDayId === d.id ? 'active' : ''}`}
                  onClick={() => setSelectedDayId(d.id)}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {selectedDayId && (
              <>
                <Input 
                  variant="search" 
                  placeholder="Search database..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                
                <div className="exercise-search-results">
                  {loadingEx ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Searching AscendAPI...</p>
                    ) : apiExercises.length === 0 && searchQuery.trim() ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No match found in API.</p>
                    ) : (
                      Object.entries(filteredAndGroupedExercises).map(([group, exercises]) => (
                        <div key={group} className="exercise-group">
                          <h5 className="group-label">{group}</h5>
                          {exercises.map(ex => (
                            <div key={ex.exerciseId} className="search-result-item" onClick={() => handleAddExerciseToDay(ex)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: syncingEx === ex.exerciseId ? 0.5 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {ex.imageUrl ? (
                                  <img src={ex.imageUrl} alt={ex.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', backgroundColor: '#fff' }} />
                                ) : (
                                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--color-background)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 10 }}>
                                    N/A
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 500 }}>{ex.name} {ex.equipment && ex.equipment !== 'Ninguno' ? `(${ex.equipment})` : ''}</span>
                                  {ex.muscleGroup && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{ex.muscleGroup}</span>}
                                </div>
                              </div>
                              <span style={{ color: 'var(--color-primary)', fontSize: 20, fontWeight: 'bold' }}>
                                {syncingEx === ex.exerciseId ? '...' : '+'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                </div>

                <div className="selected-exercises">
                  <h4 style={{ margin: '16px 0 8px 0', fontSize: 14 }}>Selected for {days.find(d => d.id === selectedDayId)?.name}</h4>
                  {days.find(d => d.id === selectedDayId)?.exercises.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Search and tap + to add exercises.</p>
                  )}
                  {days.find(d => d.id === selectedDayId)?.exercises.map((ex, idx) => (
                    <Card key={ex.id} variant="list" style={{ padding: '8px 12px', marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{idx + 1}. {ex.exerciseName}</span>
                    </Card>
                  ))}
                </div>
              </>
            )}

            <div className="wizard-actions">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  const dayHasExercise = days.some(d => d.exercises.length > 0);
                  if (!dayHasExercise) {
                    toast.error('Add at least one exercise to proceed.');
                    return;
                  }
                  setStep(4);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step">
            <h2 className="step-title">Sets & Reps</h2>
            <div className="sets-reps-container">
              {days.map(d => (
                <div key={d.id} className="review-day-group">
                  <h3 className="review-day-title">{d.name}</h3>
                  {d.exercises.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No exercises added.</p>}
                  {d.exercises.map(ex => (
                    <Card key={ex.id} className="set-rep-row">
                      <span className="set-rep-name">{ex.exerciseName}</span>
                      <div className="set-rep-inputs">
                        <div className="input-mini">
                          <label>Sets</label>
                          <input type="number" min="1" value={ex.sets} onChange={e => handleUpdateExercise(d.id, ex.id, 'sets', parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="input-mini">
                          <label>Reps</label>
                          <input type="number" min="1" value={ex.reps} onChange={e => handleUpdateExercise(d.id, ex.id, 'reps', parseInt(e.target.value) || 1)} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>

            <div className="wizard-actions">
              <Button variant="outline" onClick={() => setStep(3)} disabled={saving}>Back</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Routine'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
