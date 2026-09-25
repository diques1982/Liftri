import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui';

interface ScheduleModalProps {
  onSave: (scheduleType: 'today' | 'recurring', recurrenceDays: number[], specificDate?: string) => void;
  onClose: () => void;
}

const DAYS = [
  { num: 1, label: 'Lunes' },
  { num: 2, label: 'Martes' },
  { num: 3, label: 'Miércoles' },
  { num: 4, label: 'Jueves' },
  { num: 5, label: 'Viernes' },
  { num: 6, label: 'Sábado' },
  { num: 7, label: 'Domingo' },
];

const getNext7Days = () => {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    
    const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    days.push({
      dateStr: localDateStr,
      label: i === 1 
        ? `Mañana (${capitalizedDayName})` 
        : `${capitalizedDayName}, ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
    });
  }
  return days;
};

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ onSave, onClose }) => {
  const [scheduleType, setScheduleType] = useState<'today' | 'recurring' | 'specific'>('today');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [next7Days, setNext7Days] = useState<{dateStr: string, label: string}[]>([]);

  useEffect(() => {
    const days = getNext7Days();
    setNext7Days(days);
    setSpecificDate(days[0].dateStr); // Default to tomorrow
  }, []);

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (scheduleType === 'recurring' && recurrenceDays.length === 0) return;
    if (scheduleType === 'specific' && !specificDate) return;
    setSaving(true);
    try {
      const dbType = scheduleType === 'specific' ? 'today' : scheduleType;
      const finalSpecificDate = scheduleType === 'specific' ? specificDate : undefined;
      await onSave(dbType, recurrenceDays, finalSpecificDate);
    } finally {
      setSaving(false);
    }
  };

  const canSave = (scheduleType === 'today') || 
                  (scheduleType === 'specific' && specificDate) || 
                  (scheduleType === 'recurring' && recurrenceDays.length > 0);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999, // Super high zIndex
        }}
      />

      {/* Modal Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        backgroundColor: 'var(--color-surface)',
        borderRadius: '24px 24px 0 0',
        zIndex: 10000, // Super high zIndex
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        maxHeight: '90dvh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 20px 10px', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 4,
            borderRadius: 2,
            backgroundColor: 'var(--color-border)',
            margin: '-8px auto 20px',
          }} />
          <h3 style={{ margin: '0', fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
            Programar rutina
          </h3>
        </div>

        {/* Scrollable Content */}
        <div style={{
          padding: '10px 20px',
          overflowY: 'auto',
          flex: 1,
          overscrollBehavior: 'contain',
        }}>
          {/* Schedule Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>
              ¿Cuándo?
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Hoy */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderRadius: 12,
                border: `2px solid ${scheduleType === 'today' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: scheduleType === 'today' ? 'rgba(204,255,0,0.06)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                <input
                  type="radio"
                  name="scheduleType"
                  value="today"
                  checked={scheduleType === 'today'}
                  onChange={() => setScheduleType('today')}
                  style={{ accentColor: 'var(--color-primary)', width: 18, height: 18 }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>Hoy</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Aparece en el Dashboard de hoy</p>
                </div>
              </label>

              {/* Día específico */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderRadius: 12,
                border: `2px solid ${scheduleType === 'specific' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: scheduleType === 'specific' ? 'rgba(204,255,0,0.06)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                <input
                  type="radio"
                  name="scheduleType"
                  value="specific"
                  checked={scheduleType === 'specific'}
                  onChange={() => setScheduleType('specific')}
                  style={{ accentColor: 'var(--color-primary)', width: 18, height: 18 }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>Día específico</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Para un solo día en el futuro</p>
                </div>
              </label>

              {/* Recurrente */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderRadius: 12,
                border: `2px solid ${scheduleType === 'recurring' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: scheduleType === 'recurring' ? 'rgba(204,255,0,0.06)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                <input
                  type="radio"
                  name="scheduleType"
                  value="recurring"
                  checked={scheduleType === 'recurring'}
                  onChange={() => setScheduleType('recurring')}
                  style={{ accentColor: 'var(--color-primary)', width: 18, height: 18 }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>Recurrente</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Repite en días específicos cada semana</p>
                </div>
              </label>
            </div>
          </div>

          {/* Specific Date Selector (only if specific) */}
          {scheduleType === 'specific' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>
                Elegir fecha
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {next7Days.map(day => {
                  const isSelected = specificDate === day.dateStr;
                  return (
                    <label
                      key={day.dateStr}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: isSelected ? 'rgba(204,255,0,0.06)' : 'var(--color-background)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="radio"
                        name="specificDate"
                        value={day.dateStr}
                        checked={isSelected}
                        onChange={() => setSpecificDate(day.dateStr)}
                        style={{ accentColor: 'var(--color-primary)', width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 15, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                        {day.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day Selector (only if recurring) */}
          {scheduleType === 'recurring' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12 }}>
                Días de la semana
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DAYS.map(day => {
                  const isSelected = recurrenceDays.includes(day.num);
                  return (
                    <label
                      key={day.num}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: isSelected ? 'rgba(204,255,0,0.06)' : 'var(--color-background)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDay(day.num)}
                        style={{ accentColor: 'var(--color-primary)', width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 15, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                        {day.label}
                      </span>
                      {isSelected && (
                        <span style={{ marginLeft: 'auto', fontSize: 16 }}>✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {recurrenceDays.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 8 }}>
                  Selecciona al menos un día
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px 40px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <Button
            variant="primary"
            onClick={handleSave}
            style={{ width: '100%', padding: '18px', fontSize: '16px', fontWeight: 800, borderRadius: '16px', opacity: canSave ? 1 : 0.5 }}
            disabled={!canSave || saving}
          >
            {saving ? 'Guardando...' : '✓ Guardar rutina'}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            style={{ width: '100%', padding: '16px', fontSize: '15px', fontWeight: 700, borderRadius: '16px', color: 'var(--color-text)' }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
};
