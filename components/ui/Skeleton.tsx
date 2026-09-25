import React from 'react';
import '../../styles/theme.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = 'var(--radius-sm)', 
  className = '',
  style 
}) => {
  return (
    <div 
      className={`skeleton-loader ${className}`} 
      style={{ width, height, borderRadius, ...style }}
    />
  );
};
