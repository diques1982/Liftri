import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button } from '../ui';
import { ExerciseSelector } from '../dashboard/ExerciseSelector';
import { updateRoutine, getAllExercises, RoutineSaveData } from '../../lib/api';
import { Exercise } from '../../types/database';
import { toast } from '../../utils/toast';

interface RoutineEditorProps {
  routineId: string;
  initialName: string;
  initialExercises: any[]; // The flattened list of exercises from getRoutineDetails
  onClose: () => void;
  onSave: () => void;
}

interface EditorExercise {
  id: string; // temporary id for react keys
  exerciseId: string;
  name: string;
  muscle_group: string;
  subcategory?: string;
  sets: number;
  reps: number;
}

export const RoutineEditor: React.FC<RoutineEditorProps> = ({ routineId, initialName, initialExercises, onClose, onSave }) => {
  const [name, setName] = useState(initialName || '');
  const [exercises, setExercises] = useState<EditorExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [savedExercises, setSavedExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Flatten initial exercises into our simple editor format
    const exList: EditorExercise[] = [];
    initialExercises.forEach((day: any) => {
      day.routine_exercises?.forEach((re: any) => {
        exList.push({
          id: re.id || Date.now().toString() + Math.random(),
          exerciseId: re.exercise_id,
          name: re.exercises?.name || 'Unknown',
          muscle_group: re.exercises?.muscle_group || 'General',
          subcategory: re.exercises?.subcategory,
          sets: re.sets || 3,
          reps: re.reps || 10
        });
      });
    });
    setExercises(exList);

    // Load global catalog for the selector
    getAllExercises().then(setSavedExercises);
  }, [initialExercises]);

  const handleAddExercise = (ex: Exercise) => {
    setExercises(prev => [...prev, {
      id: Date.now().toString(),
      exerciseId: ex.id,
      name: ex.name,
      muscle_group: ex.muscle_group || 'General',
      subcategory: ex.subcategory,
      sets: 3,
      reps: 10
    }]);
    setShowExerciseSelector(false);
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
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

  const updateExercise = (id: string, field: 'sets' | 'reps', value: number) => {
    setExercises(prev => prev.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value };
      }
      return e;
    }));
  };

  const handleSave = async () => {
    if (exercises.length === 0) {
      toast.error('La rutina debe tener al menos un ejercicio.');
      return;
    }

    setSaving(true);
    let finalName = name.trim();
    if (!finalName) {
      // Auto-generate name based on muscle groups
      const muscles = new Set(exercises.map(e => e.muscle_group));
      finalName = `Rutina de ${Array.from(muscles).join(', ')}`;
    }

    const dataToSave: RoutineSaveData = {
      name: finalName,
      days: [{
        name: 'Día 1', // We keep it single-day for now as requested by mobile-first simplicity
        exercises: exercises.map(e => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps
        }))
      }]
    };

    try {
      await updateRoutine(routineId, dataToSave);
      toast.success('Rutina actualizada');
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
      setSaving(false);
    }
  };

  if (showExerciseSelector) {
    return createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', backgroundColor: 'var(--color-background)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
        <ExerciseSelector
          allExercises={savedExercises}
          onStartWorkout={(exercises) => {
            if (exercises.length > 0) handleAddExercise(exercises[0]);
          }}
          onBack={() => setShowExerciseSelector(false)}
          startButtonLabel="Añadir Seleccionado"
        />
      </div>,
      document.body
    );
  }

  return (
    <div className="page-wrapper" style={{ padding: '16px', paddingBottom: '100px', backgroundColor: 'var(--color-background)', minHeight: '100vh', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Button variant="outline" onClick={onClose} style={{ padding: '8px 12px', border: 'none', background: 'var(--color-surface)', borderRadius: '12px' }}>
          ✕ Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={saving}
          style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 700 }}
        >
          {saving ? 'Guardando...' : 'Guardar ✓'}
        </Button>
      </div>

      {/* Name Input */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Nombre de la Rutina
        </label>
        <input 
          type="text" 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Push Day (Dejar en blanco para auto-generar)"
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '16px',
            fontWeight: 600
          }}
        />
      </div>

      {/* Exercises List */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Ejercicios</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {exercises.map((ex, index) => (
          <Card key={ex.id} style={{ padding: '16px', backgroundColor: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>{ex.name}</h4>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-background)', padding: '2px 8px', borderRadius: '8px' }}>
                  {ex.muscle_group}
                </span>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleRemoveExercise(ex.id)}
                style={{ padding: '4px', border: 'none', color: 'var(--color-error)' }}
              >
                ✕
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Sets</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', borderRadius: '12px', padding: '4px' }}>
                  <Button variant="outline" onClick={() => updateExercise(ex.id, 'sets', Math.max(1, ex.sets - 1))} style={{ padding: '8px 12px', border: 'none' }}>-</Button>
                  <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>{ex.sets}</div>
                  <Button variant="outline" onClick={() => updateExercise(ex.id, 'sets', ex.sets + 1)} style={{ padding: '8px 12px', border: 'none' }}>+</Button>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Reps</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-background)', borderRadius: '12px', padding: '4px' }}>
                  <Button variant="outline" onClick={() => updateExercise(ex.id, 'reps', Math.max(1, ex.reps - 1))} style={{ padding: '8px 12px', border: 'none' }}>-</Button>
                  <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>{ex.reps}</div>
                  <Button variant="outline" onClick={() => updateExercise(ex.id, 'reps', ex.reps + 1)} style={{ padding: '8px 12px', border: 'none' }}>+</Button>
                </div>
              </div>
            </div>

            {/* Reorder controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '8px' }}>
              <Button 
                variant="outline" 
                onClick={() => moveExerciseUp(index)} 
                disabled={index === 0}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >↑ Subir</Button>
              <Button 
                variant="outline" 
                onClick={() => moveExerciseDown(index)} 
                disabled={index === exercises.length - 1}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >↓ Bajar</Button>
            </div>
          </Card>
        ))}

        <Button 
          variant="outline" 
          onClick={() => setShowExerciseSelector(true)}
          style={{ padding: '16px', borderStyle: 'dashed', borderWidth: 2, borderRadius: '16px', fontWeight: 700, color: 'var(--color-primary)' }}
        >
          + Añadir Ejercicio
        </Button>
      </div>
    </div>
  );
};
