import React, { useState } from 'react';
import { Button } from '../ui';

interface MuscleSelectorProps {
  onContinue: (selectedMuscles: string[]) => void;
  onBack?: () => void;
}

const MUSCLE_GROUPS = [
  { id: 'Pecho', label: 'Pecho', image: 'https://images.unsplash.com/photo-1616279969856-759f316a5ac1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'Espalda', label: 'Espalda', image: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'Pierna', label: 'Pierna', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', subcategories: '(Cuádricep - Femoral - Pantorrilla)' },
  { id: 'Brazo', label: 'Brazo', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', subcategories: '(Bíceps - Tríceps - Hombro)' },
  { id: 'Abdomen', label: 'Abdomen', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'Glúteo', label: 'Glúteo', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
];

export const MuscleSelector: React.FC<MuscleSelectorProps> = ({ onContinue, onBack }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ padding: '16px', paddingBottom: 0, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--color-text)', padding: '0 0 16px 0', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            ← Volver
          </button>
        )}
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', lineHeight: 1.2 }}>
          ¿Qué vas a trabajar<br />hoy?
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.4 }}>
          Selecciona uno o más grupos musculares para comenzar tu sesión.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '32px' }}>
        {MUSCLE_GROUPS.map((group) => {
          const isSelected = selected.includes(group.id);
          return (
            <div 
              key={group.id}
              onClick={() => toggleSelection(group.id)}
              style={{
                position: 'relative',
                height: '90px',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {/* Background Image */}
              <img 
                src={group.image} 
                alt={group.label}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.6
                }}
              />
              
              {/* Gradient Overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%)'
              }} />

              {/* Content */}
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                right: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>
                    {group.label}
                  </span>
                  {(group as any).subcategories && (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', fontWeight: 500 }}>
                      {(group as any).subcategories}
                    </span>
                  )}
                </div>

                {/* Selection Circle */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.5)',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isSelected && (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <div style={{
        position: 'sticky',
        bottom: 0,
        padding: '8px 0',
        marginTop: 'auto',
        background: 'linear-gradient(to top, var(--color-background) 80%, transparent)',
        zIndex: 10
      }}>
        <Button 
          variant="primary" 
          onClick={() => onContinue(selected)}
          disabled={selected.length === 0}
          style={{ width: '100%', padding: '18px', fontSize: '16px', fontWeight: 700, borderRadius: '12px' }}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};
