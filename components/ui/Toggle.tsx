import React from 'react';
import '../../styles/theme.css';

export interface ToggleProps {
  label?: string;
  isActive: boolean;
  onToggle: () => void;
}

export const Toggle: React.FC<ToggleProps> = ({ label, isActive, onToggle }) => {
  return (
    <div className="toggle-wrapper" onClick={onToggle} role="switch" aria-checked={isActive}>
      <div className={`toggle-switch ${isActive ? 'active' : ''}`}>
        <div className="toggle-knob" />
      </div>
      {label && <span className="input-label" style={{ color: 'var(--color-text)' }}>{label}</span>}
    </div>
  );
};
