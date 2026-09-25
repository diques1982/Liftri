import React, { ButtonHTMLAttributes } from 'react';
import '../../styles/theme.css'; // Make sure this is imported at your app root, or locally

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const combinedClass = `${baseClass} ${variantClass} ${className}`.trim();

  return (
    <button className={combinedClass} {...props}>
      {children}
    </button>
  );
};
