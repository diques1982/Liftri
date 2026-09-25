import React, { useState } from 'react';
import { Button } from '../ui';
import '../../styles/theme.css';

interface UnitPreferences {
  weight: 'kg' | 'lbs';
  distance: 'km' | 'miles';
  measurements: 'cm' | 'inches';
}

export const UnitSelection: React.FC = () => {
  const [preferences, setPreferences] = useState<UnitPreferences>({
    weight: 'kg',
    distance: 'km',
    measurements: 'cm'
  });

  const handleSelect = (category: keyof UnitPreferences, value: string) => {
    setPreferences(prev => ({ ...prev, [category]: value }));
  };

  const handleContinue = () => {
    console.log('Selected units:', preferences);
    // Proceed to next step
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <h1 className="onboarding-title">Choose your units</h1>
        <p className="onboarding-subtitle">You can always change this later in settings.</p>
      </div>

      <div className="unit-options-container">
        {/* Weight Selection */}
        <div className="unit-option-group">
          <label className="unit-label">Weight</label>
          <div className="segmented-control">
            <button
              className={`segment-btn ${preferences.weight === 'kg' ? 'active' : ''}`}
              onClick={() => handleSelect('weight', 'kg')}
            >
              Kilograms (kg)
            </button>
            <button
              className={`segment-btn ${preferences.weight === 'lbs' ? 'active' : ''}`}
              onClick={() => handleSelect('weight', 'lbs')}
            >
              Pounds (lbs)
            </button>
          </div>
        </div>

        {/* Distance Selection */}
        <div className="unit-option-group">
          <label className="unit-label">Distance</label>
          <div className="segmented-control">
            <button
              className={`segment-btn ${preferences.distance === 'km' ? 'active' : ''}`}
              onClick={() => handleSelect('distance', 'km')}
            >
              Kilometers (km)
            </button>
            <button
              className={`segment-btn ${preferences.distance === 'miles' ? 'active' : ''}`}
              onClick={() => handleSelect('distance', 'miles')}
            >
              Miles (mi)
            </button>
          </div>
        </div>

        {/* Measurements Selection */}
        <div className="unit-option-group">
          <label className="unit-label">Measurements</label>
          <div className="segmented-control">
            <button
              className={`segment-btn ${preferences.measurements === 'cm' ? 'active' : ''}`}
              onClick={() => handleSelect('measurements', 'cm')}
            >
              Centimeters (cm)
            </button>
            <button
              className={`segment-btn ${preferences.measurements === 'inches' ? 'active' : ''}`}
              onClick={() => handleSelect('measurements', 'inches')}
            >
              Inches (in)
            </button>
          </div>
        </div>
      </div>

      <div className="onboarding-footer">
        <Button variant="primary" className="continue-btn" onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
};
