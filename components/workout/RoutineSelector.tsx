import React, { useEffect, useState } from 'react';
import { Card, Button, Skeleton } from '../ui';
import { getUserRoutines, getRoutineDaysWithExercises } from '../../lib/api';
import { Routine } from '../../types/database';

interface RoutineSelectorProps {
  onSelectRoutineDay: (routineId: string, dayId: string) => void;
  onCancel: () => void;
}

export const RoutineSelector: React.FC<RoutineSelectorProps> = ({ onSelectRoutineDay, onCancel }) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [days, setDays] = useState<any[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);

  useEffect(() => {
    const fetchRoutines = async () => {
      setLoading(true);
      const data = await getUserRoutines();
      setRoutines(data);
      setLoading(false);
    };
    fetchRoutines();
  }, []);

  const handleRoutineClick = async (routine: Routine) => {
    setSelectedRoutine(routine);
    setLoadingDays(true);
    const routineDays = await getRoutineDaysWithExercises(routine.id);
    setDays(routineDays);
    setLoadingDays(false);

    // Auto-select if only 1 day
    if (routineDays.length === 1) {
      onSelectRoutineDay(routine.id, routineDays[0].id);
    }
  };

  return (
    <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Start Workout</h2>
        <Button variant="outline" onClick={onCancel} style={{ padding: '4px 12px' }}>Close</Button>
      </div>

      {!selectedRoutine ? (
        <>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Select a routine to start:</p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height="60px" />
              <Skeleton height="60px" />
            </div>
          ) : routines.length === 0 ? (
            <Card variant="default">
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No routines found. Go to Routines to create one!</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {routines.map(r => (
                <Card 
                  key={r.id} 
                  variant="list" 
                  onClick={() => handleRoutineClick(r)}
                  style={{ cursor: 'pointer', borderColor: 'var(--color-primary)' }}
                >
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <span style={{ color: 'var(--color-primary)' }}>➔</span>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Routine: <strong style={{ color: 'var(--color-text)' }}>{selectedRoutine.name}</strong>
          </p>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Which day are you training?</p>
          
          {loadingDays ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height="60px" />
              <Skeleton height="60px" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {days.map(d => (
                <Card 
                  key={d.id} 
                  variant="list" 
                  onClick={() => onSelectRoutineDay(selectedRoutine.id, d.id)}
                  style={{ cursor: 'pointer', background: 'var(--color-surface-light)' }}
                >
                  <span style={{ fontWeight: 600 }}>{d.day_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {d.routine_exercises?.length || 0} exercises
                  </span>
                </Card>
              ))}
              <Button variant="outline" onClick={() => setSelectedRoutine(null)} style={{ marginTop: 16 }}>
                Back to routines
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
