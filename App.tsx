import React, { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/auth/Auth';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/ui/Toast';
import { Button, Card } from './components/ui';

// Lazy loading the main screens for performance/code-splitting
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const Routines = lazy(() => import('./components/routines/Routines').then(m => ({ default: m.Routines })));
const UserExerciseLibrary = lazy(() => import('./components/dashboard/UserExerciseLibrary').then(m => ({ default: m.UserExerciseLibrary })));

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [dashboardResetKey, setDashboardResetKey] = useState(0);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>(() => {
    return (localStorage.getItem('liftri_weight_unit') as 'kg' | 'lb') || 'kg';
  });
  const [restTimerEnabled, setRestTimerEnabled] = useState<boolean>(() => {
    return localStorage.getItem('liftri_rest_timer_enabled') !== 'false';
  });
  const [restTimerDuration, setRestTimerDuration] = useState<number>(() => {
    return Number(localStorage.getItem('liftri_rest_timer_duration')) || 90;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100dvh', 
        width: '100vw',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#0F1113', 
        color: 'var(--color-text)' 
      }}>
        <img 
          src="/app-icon.png" 
          alt="Liftri Splash" 
          style={{ 
            height: '80px', 
            width: '80px', 
            objectFit: 'contain', 
            marginBottom: '24px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(204, 255, 0, 0.15)'
          }} 
        />
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', letterSpacing: '1px' }}>INICIANDO...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <Auth onSuccess={() => setCurrentTab('dashboard')} />
        <ToastContainer />
      </>
    );
  }

  const handleLogoClick = () => {
    if (currentTab === 'dashboard') {
      setDashboardResetKey(prev => prev + 1);
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === 'dashboard' && currentTab === 'dashboard') {
      setDashboardResetKey(prev => prev + 1);
    }
    setCurrentTab(tabId);
  };

  const renderScreen = () => {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-primary)' }}>Cargando...</div>}>
        {(() => {
          switch (currentTab) {
            case 'dashboard':
              return <Dashboard resetKey={dashboardResetKey} onNavigate={handleTabChange} weightUnit={weightUnit} />;
            case 'routines':
              return <Routines weightUnit={weightUnit} onNavigate={handleTabChange} />;
            case 'exercises':
              return <UserExerciseLibrary />;
            case 'settings':
              return (
                <div className="page-wrapper" style={{ padding: 'var(--spacing-md)' }}>
                  <div className="page-header" style={{ marginBottom: '32px' }}>
                    <h2 className="page-title">Ajustes</h2>
                    <p className="page-subtitle">Personaliza tu experiencia en Liftri</p>
                  </div>

                  <Card style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'white' }}>Unidades</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>Elige cómo registrar y ver tus pesos</p>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        backgroundColor: 'var(--color-background)', 
                        padding: '4px', 
                        borderRadius: '12px', 
                        gap: '4px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <button 
                          onClick={() => {
                            setWeightUnit('kg');
                            localStorage.setItem('liftri_weight_unit', 'kg');
                          }}
                          style={{ 
                            padding: '8px 16px', 
                            borderRadius: '8px', 
                            border: 'none', 
                            backgroundColor: weightUnit === 'kg' ? 'var(--color-primary)' : 'transparent', 
                            color: weightUnit === 'kg' ? '#000' : 'var(--color-text-muted)', 
                            cursor: 'pointer', 
                            fontWeight: 700, 
                            fontSize: '14px',
                            transition: 'all 0.2s'
                          }}
                        >
                          Kg
                        </button>
                        <button 
                          onClick={() => {
                            setWeightUnit('lb');
                            localStorage.setItem('liftri_weight_unit', 'lb');
                          }}
                          style={{ 
                            padding: '8px 16px', 
                            borderRadius: '8px', 
                            border: 'none', 
                            backgroundColor: weightUnit === 'lb' ? 'var(--color-primary)' : 'transparent', 
                            color: weightUnit === 'lb' ? '#000' : 'var(--color-text-muted)', 
                            cursor: 'pointer', 
                            fontWeight: 700, 
                            fontSize: '14px',
                            transition: 'all 0.2s'
                          }}
                        >
                          Lbs
                        </button>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Rest Timer Card */}
                  <Card style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Toggle row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'white' }}>Timer de descanso</h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>Activar timer automático al completar set</p>
                        </div>
                        
                        {/* Custom Premium Toggle Switch */}
                        <div 
                          onClick={() => {
                            const val = !restTimerEnabled;
                            setRestTimerEnabled(val);
                            localStorage.setItem('liftri_rest_timer_enabled', String(val));
                          }}
                          style={{
                            width: '50px',
                            height: '26px',
                            borderRadius: '13px',
                            backgroundColor: restTimerEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            border: restTimerEnabled ? 'none' : '1px solid var(--color-border)'
                          }}
                        >
                          <div 
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: restTimerEnabled ? '#000' : 'var(--color-text-muted)',
                              position: 'absolute',
                              top: '3px',
                              left: restTimerEnabled ? '28px' : '3px',
                              transition: 'left 0.2s, background-color 0.2s'
                            }}
                          />
                        </div>
                      </div>

                      {/* Duration selector row (Pills) */}
                      <div style={{ 
                        opacity: restTimerEnabled ? 1 : 0.4, 
                        pointerEvents: restTimerEnabled ? 'auto' : 'none',
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Duración del descanso
                        </span>
                        
                        <div style={{
                          display: 'flex',
                          backgroundColor: 'var(--color-background)',
                          padding: '4px',
                          borderRadius: '12px',
                          gap: '4px',
                          border: '1px solid var(--color-border)'
                        }}>
                          {[60, 90, 120].map(dur => (
                            <button
                              key={dur}
                              onClick={() => {
                                setRestTimerDuration(dur);
                                localStorage.setItem('liftri_rest_timer_duration', String(dur));
                              }}
                              style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: restTimerDuration === dur ? 'var(--color-primary)' : 'transparent',
                                color: restTimerDuration === dur ? '#000' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                textAlign: 'center'
                              }}
                            >
                              {dur}s {dur === 90 ? '(Rec.)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Button 
                    variant="outline" 
                    onClick={() => supabase.auth.signOut()}
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      borderRadius: '12px', 
                      borderColor: '#ef4444', 
                      color: '#ef4444', 
                      fontWeight: 700, 
                      fontSize: '15px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              );
            default:
              return <Dashboard resetKey={dashboardResetKey} weightUnit={weightUnit} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <AppLayout 
      activeTab={currentTab} 
      onTabChange={handleTabChange}
      onLogoClick={handleLogoClick}
    >
      {renderScreen()}
    </AppLayout>
  );
}

export default App;

