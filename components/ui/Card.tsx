import React, { HTMLAttributes } from 'react';
import '../../styles/theme.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'stats' | 'highlight' | 'list';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ variant = 'default', children, className = '', ...props }) => {
  const baseClass = 'card';
  const variantClass = variant !== 'default' ? `card-${variant}` : '';
  const combinedClass = `${baseClass} ${variantClass} ${className}`.trim();

  return (
    <div className={combinedClass} {...props}>
      {children}
    </div>
  );
};
