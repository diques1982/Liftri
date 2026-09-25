import React from 'react';
import '../../styles/theme.css';

export interface HeaderProps {
  onLogoClick?: () => void;
  onProfileClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogoClick, onProfileClick }) => {
  return (
    <header className="app-header">
      <div className="logo-container" onClick={onLogoClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <img src="/logo-horizontal.png" alt="Liftri Logo" style={{ height: '44px', width: 'auto', objectFit: 'contain' }} />
      </div>
      <div className="avatar-container" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
        {/* Placeholder avatar */}
        <div className="avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>
    </header>
  );
};

