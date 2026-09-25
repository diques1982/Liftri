import React, { useState, useEffect, useRef } from 'react';

interface RestTimerProps {
  duration: number; // in seconds (used only if no target stored in localStorage)
  onClose: () => void;
}

const TARGET_KEY = 'liftri_rest_timer_target';

export const RestTimer: React.FC<RestTimerProps> = ({ duration, onClose }) => {
  // Derive initial timeLeft from stored target timestamp
  const getRemaining = () => {
    const stored = localStorage.getItem(TARGET_KEY);
    if (stored) {
      const target = parseInt(stored, 10);
      const remaining = Math.ceil((target - Date.now()) / 1000);
      return Math.max(0, remaining);
    }
    return duration;
  };

  const [timeLeft, setTimeLeft] = useState<number>(getRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = () => {
    const remaining = getRemaining();
    setTimeLeft(remaining);

    if (remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if ('vibrate' in navigator) {
        try { navigator.vibrate([200, 100, 200]); } catch (e) { /* ignored */ }
      }
    }
  };

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    tick(); // Immediate sync on start/resume
    intervalRef.current = setInterval(tick, 500); // 500ms for sub-second accuracy
  };

  useEffect(() => {
    startInterval();

    // Re-sync when tab becomes visible again (unlock / switch back from another app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        startInterval();
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isFinished = timeLeft <= 0;

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: 'rgba(15, 17, 19, 0.9)',
        border: '1.5px solid var(--color-primary)',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: isFinished 
          ? '0 0 25px rgba(204, 255, 0, 0.4)' 
          : '0 4px 12px rgba(204, 255, 0, 0.08)',
        zIndex: 10,
        boxSizing: 'border-box',
        transition: 'all 0.3s ease-in-out',
        animation: 'fadeIn 0.3s ease-out',
        marginBottom: '0'
      }}
    >
      {/* Rest Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: isFinished ? 'var(--color-primary)' : 'rgba(204, 255, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isFinished ? '#000' : 'var(--color-primary)',
            transition: 'all 0.3s'
          }}
        >
          {isFinished ? (
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          )}
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isFinished ? 'Descanso finalizado' : 'Descansando'}
          </p>
          <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 700, color: isFinished ? 'var(--color-primary)' : '#FFF' }}>
            {isFinished ? '¡A darle!' : 'Siguiente set'}
          </h4>
        </div>
      </div>

      {/* Countdown and Close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span 
          style={{ 
            fontSize: '24px', 
            fontWeight: 800, 
            color: isFinished ? 'var(--color-primary)' : '#FFF', 
            fontFamily: 'monospace',
            letterSpacing: '0.5px'
          }}
        >
          {formatTime(timeLeft)}
        </span>

        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'var(--color-text-muted)',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          title="Cerrar temporizador"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      {/* Inline styles for fadeIn animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};
