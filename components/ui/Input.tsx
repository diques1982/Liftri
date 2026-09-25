import React, { InputHTMLAttributes } from 'react';
import '../../styles/theme.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: 'default' | 'search';
}

export const Input: React.FC<InputProps> = ({ label, variant = 'default', className = '', ...props }) => {
  const isSearch = variant === 'search';
  const inputClass = `input-field ${isSearch ? 'input-search' : ''} ${className}`.trim();

  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input 
        className={inputClass} 
        {...props} 
        placeholder={isSearch && !props.placeholder ? "Search..." : props.placeholder}
      />
    </div>
  );
};
