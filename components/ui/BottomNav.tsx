import React from 'react';
import '../../styles/theme.css';

// Placeholder icons, could be replaced with lucide-react or custom SVGs later
const HomeIcon = () => (
  <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const DumbbellIcon = () => (
  <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 6.5l11 11" />
    <path d="M21 21l-1-1" />
    <path d="M3 3l1 1" />
    <path d="M18 22l4-4" />
    <path d="M2 6l4-4" />
    <path d="M3 10l7-7" />
    <path d="M14 21l7-7" />
  </svg>
);

const UserIcon = () => (
  <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ListIcon = () => (
  <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const CalendarIcon = () => (
  <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const HistoryIcon = () => (
  <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"></path>
    <polyline points="12 7 12 12 16 14"></polyline>
  </svg>
);

export interface NavItem {
  id: string;
  label: string;
  icon: 'home' | 'workout' | 'profile' | 'exercises' | 'planner' | 'history';
  isActive?: boolean;
}

export interface BottomNavProps {
  items: NavItem[];
  onNavigate: (id: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ items, onNavigate }) => {
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'home': return <HomeIcon />;
      case 'workout': return <DumbbellIcon />;
      case 'profile': return <UserIcon />;
      case 'exercises': return <ListIcon />;
      case 'planner': return <CalendarIcon />;
      case 'history': return <HistoryIcon />;
      default: return <HomeIcon />;
    }
  };

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-item ${item.isActive ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          {renderIcon(item.icon)}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
