import React, { useEffect, useState } from 'react';
import '../../styles/theme.css';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const newToast: ToastMessage = {
        id: Date.now(),
        message: e.detail.message,
        type: e.detail.type,
      };
      
      setToasts(prev => [...prev, newToast]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 3000);
    };

    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <span className="toast-icon">✓</span>}
          {toast.type === 'error' && <span className="toast-icon">✕</span>}
          {toast.type === 'info' && <span className="toast-icon">ℹ</span>}
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
