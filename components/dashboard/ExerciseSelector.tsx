import React, { useState } from 'react';
import { Button } from '../ui';
import { Exercise } from '../../types/database';

// FUTURE: recientes | más usados | favoritos | trending | IA

interface ExerciseSelectorProps {
  allExercises: Exercise[];
  onStartWorkout: (exercises: Exercise[]) => void;
  onBack: () => void;
  startButtonLabel?: string;
}

const CATEGORIES = ['Pecho', 'Espalda', 'Brazo', 'Pierna', 'Abdomen', 'Glúteo'];
const BRAZO_SUBCATEGORIES = ['Todos', 'Bíceps', 'Tríceps', 'Hombro', 'Antebrazo'];
const PIERNA_SUBCATEGORIES = ['Todos', 'Cuádricep', 'Femoral', 'Pantorrilla'];

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  allExercises, onStartWorkout, onBack, startButtonLabel
}) => {
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('Todos');
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);
  const [activeImage, setActiveImage] = useState<{ title: string; url: string } | null>(null);

  const filtered = allExercises.filter(ex => {
    const catMatch = !filterCategory || ex.muscle_group === filterCategory;
    const queryMatch = !searchQuery || (ex.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const needsSubcat = filterCategory && (filterCategory.toLowerCase() === 'brazo' || filterCategory.toLowerCase() === 'pierna');
    const subcatMatch = !needsSubcat || subcategoryFilter === 'Todos' || (ex.subcategory && ex.subcategory.toLowerCase() === subcategoryFilter.toLowerCase());
    return catMatch && queryMatch && subcatMatch;
  });

  const isSelected = (ex: Exercise) => selected.some(s => s.id === ex.id);

  const toggleSelection = (ex: Exercise) => {
    setSelected(prev =>
      prev.some(s => s.id === ex.id)
        ? prev.filter(s => s.id !== ex.id)
        : [...prev, ex]
    );
  };

  const setCategory = (cat: string) => {
    setFilterCategory(cat === filterCategory ? '' : cat);
    setSubcategoryFilter('Todos');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: 8, display: 'flex' }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>Seleccionar Ejercicios</h3>
          {selected.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', backgroundColor: 'rgba(204,255,0,0.12)', padding: '4px 10px', borderRadius: 20 }}>
              {selected.length} selec.
            </span>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 10px 10px 36px',
              borderRadius: 10, border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)', color: 'var(--color-text)',
              fontSize: 14, outline: 'none', boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
          )}
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button onClick={() => setCategory('')} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: !filterCategory ? 700 : 400, border: !filterCategory ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', backgroundColor: !filterCategory ? 'rgba(204,255,0,0.12)' : 'transparent', color: !filterCategory ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>Todos</button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: filterCategory === cat ? 700 : 400, border: filterCategory === cat ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', backgroundColor: filterCategory === cat ? 'rgba(204,255,0,0.12)' : 'transparent', color: filterCategory === cat ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{cat}</button>
          ))}
        </div>

        {/* Subcategory chips */}
        {filterCategory && (filterCategory === 'Brazo' || filterCategory === 'Pierna') && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 6, scrollbarWidth: 'none' }}>
            {(filterCategory === 'Brazo' ? BRAZO_SUBCATEGORIES : PIERNA_SUBCATEGORIES).map(sub => (
              <button key={sub} onClick={() => setSubcategoryFilter(sub)} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: subcategoryFilter === sub ? 700 : 400, border: subcategoryFilter === sub ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', backgroundColor: subcategoryFilter === sub ? 'rgba(204,255,0,0.08)' : 'transparent', color: subcategoryFilter === sub ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{sub}</button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            No se encontraron ejercicios.
          </div>
        ) : filtered.map(ex => {
          const sel = isSelected(ex);
          return (
            <div
              key={ex.id}
              onClick={() => toggleSelection(ex)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                backgroundColor: sel ? 'rgba(204,255,0,0.06)' : 'var(--color-surface)',
                borderRadius: 12, padding: '10px 12px',
                border: sel ? '1.5px solid var(--color-primary)' : '1px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              {/* Thumbnail */}
              <div style={{ flexShrink: 0, width: 48, height: 48 }}>
                {ex.image_url ? (
                  <img
                    src={ex.image_url}
                    alt={ex.name}
                    loading="lazy"
                    onClick={e => { e.stopPropagation(); setActiveImage({ title: ex.name, url: ex.image_url! }); }}
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', backgroundColor: '#fff', cursor: 'zoom-in' }}
                  />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 10 }}>N/A</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    margin: 0, fontSize: 14, fontWeight: 600, display: 'block',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: ex.video_url ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: ex.video_url ? 'pointer' : 'default',
                    textDecoration: ex.video_url ? 'underline' : 'none',
                    textUnderlineOffset: '3px'
                  }}
                  onClick={e => { if (ex.video_url) { e.stopPropagation(); setActiveVideo({ title: ex.name, url: ex.video_url }); } }}
                >
                  {ex.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>
                  {ex.subcategory ? `${ex.muscle_group} · ${ex.subcategory}` : ex.muscle_group}
                </span>
              </div>

              {/* Checkbox */}
              <div style={{
                width: 28, height: 28, borderRadius: '6px', flexShrink: 0,
                backgroundColor: sel ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                border: sel ? '2px solid var(--color-primary)' : '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s'
              }}>
                {sel && (
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#000" strokeWidth="3" fill="none">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Button */}
      <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', flexShrink: 0 }}>
        <Button
          variant="primary"
          onClick={() => { if (selected.length > 0) onStartWorkout(selected); }}
          disabled={selected.length === 0}
          style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 800, borderRadius: 14, opacity: selected.length === 0 ? 0.4 : 1 }}
        >
          {selected.length === 0
            ? 'Selecciona al menos 1 ejercicio'
            : (startButtonLabel || `Empezar con ${selected.length} ejercicio${selected.length !== 1 ? 's' : ''} →`)}
        </Button>
      </div>

      {/* Video Modal */}
      {activeVideo && (
        <div onClick={() => setActiveVideo(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <h3 style={{ color: 'white', marginBottom: 20, textAlign: 'center', fontSize: 18 }}>{activeVideo.title}</h3>
          {activeVideo.url.includes('youtube.com') || activeVideo.url.includes('youtu.be') ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: 600, paddingTop: '56.25%', borderRadius: 16, overflow: 'hidden' }}>
              <iframe src={activeVideo.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
          ) : (
            <video src={activeVideo.url} autoPlay loop playsInline muted style={{ width: '100%', maxHeight: '60vh', borderRadius: 16, objectFit: 'contain', backgroundColor: '#fff' }} />
          )}
          <Button variant="outline" style={{ marginTop: 24 }} onClick={() => setActiveVideo(null)}>Cerrar</Button>
        </div>
      )}

      {/* Image Modal */}
      {activeImage && (
        <div onClick={() => setActiveImage(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.94)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <h3 style={{ color: 'white', marginBottom: 20, textAlign: 'center', fontSize: 18, fontWeight: 600 }}>{activeImage.title}</h3>
          <img src={activeImage.url} alt={activeImage.title} style={{ width: '100%', maxWidth: 500, maxHeight: '65vh', borderRadius: 16, objectFit: 'contain', backgroundColor: '#fff', padding: 12 }} />
          <Button variant="outline" style={{ marginTop: 24 }} onClick={() => setActiveImage(null)}>Cerrar</Button>
        </div>
      )}
    </div>
  );
};
