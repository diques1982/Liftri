import React, { useState } from 'react';
import { RoutineSelector } from './RoutineSelector';
import { WorkoutLogger } from './WorkoutLogger';

export const WorkoutFlow: React.FC = () => {
  const [activeStep, setActiveStep] = useState<'select' | 'log'>('select');
  const [selectedData, setSelectedData] = useState<{ routineId: string; dayId: string } | null>(null);

  const handleStartWorkout = (routineId: string, dayId: string) => {
    setSelectedData({ routineId, dayId });
    setActiveStep('log');
  };

  const handleCancel = () => {
    setActiveStep('select');
    setSelectedData(null);
  };

  const handleFinish = () => {
    setActiveStep('select');
    setSelectedData(null);
    alert('Workout saved successfully! Returning to dashboard/selector.');
    // In a real app, you would route to Dashboard here.
  };

  if (activeStep === 'select') {
    return <RoutineSelector onSelectRoutineDay={handleStartWorkout} onCancel={() => console.log('Close selector')} />;
  }

  if (activeStep === 'log' && selectedData) {
    const weightUnit = (localStorage.getItem('liftri_weight_unit') as 'kg' | 'lb') || 'kg';
    return <WorkoutLogger 
      routineId={selectedData.routineId} 
      dayId={selectedData.dayId} 
      onCancel={handleCancel}
      onFinish={handleFinish}
      weightUnit={weightUnit}
    />;
  }

  return null;
};
