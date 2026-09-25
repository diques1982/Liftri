import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = true
}) => {
  const modalContent = (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '360px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text)' }}>
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <Button 
            variant="outline" 
            onClick={onCancel} 
            style={{ flex: 1, padding: '12px', fontSize: '14px', borderRadius: '12px', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {cancelText}
          </Button>
          <Button 
            variant={isDestructive ? 'outline' : 'primary'} 
            onClick={onConfirm} 
            style={{ 
              flex: 1, 
              padding: '12px', 
              fontSize: '14px', 
              fontWeight: 700, 
              borderRadius: '12px',
              backgroundColor: isDestructive ? '#ef4444' : 'var(--color-primary)',
              borderColor: isDestructive ? '#ef4444' : 'var(--color-primary)',
              color: isDestructive ? '#fff' : '#000'
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
};
