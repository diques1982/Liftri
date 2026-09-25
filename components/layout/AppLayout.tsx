import React, { useState } from 'react';
import { Header } from './Header';
import { BottomNav, NavItem } from '../ui/BottomNav';
import { ToastContainer } from '../ui/Toast';
import '../../styles/theme.css';

export interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onLogoClick?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  activeTab = 'dashboard',
  onTabChange,
  onLogoClick
}) => {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', isActive: currentTab === 'dashboard' },
    { id: 'exercises', label: 'Exercises', icon: 'exercises', isActive: currentTab === 'exercises' },
    { id: 'routines', label: 'Calendar', icon: 'planner', isActive: currentTab === 'routines' },
  ];

  const handleNavigate = (id: string) => {
    setCurrentTab(id);
    if (onTabChange) {
      onTabChange(id);
    }
  };

  const handleProfileClick = () => {
    handleNavigate('settings');
  };

  return (
    <div className="app-layout">
      <Header onLogoClick={onLogoClick} onProfileClick={handleProfileClick} />
      <ToastContainer />
      <main className="main-content">
        {children}
      </main>
      <BottomNav items={navItems} onNavigate={handleNavigate} />
    </div>
  );
};

