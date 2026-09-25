import React, { useState, useEffect } from 'react';
import { getAllExercises } from '../../lib/api';
import { Exercise } from '../../types/database';
import { Button } from '../ui';

const CATEGORIES = ['Pecho', 'Espalda', 'Brazo', 'Pierna', 'Abdomen', 'Glúteo'];
const BRAZO_SUBCATEGORIES = ['Bíceps', 'Tríceps', 'Hombro', 'Antebrazo'];
const PIERNA_SUBCATEGORIES = ['Cuádricep', 'Femoral', 'Pantorrilla'];

// FUTURE: recientes | más usados | favoritos | trending | IA recommendations

export const UserExerciseLibrary: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('Todos');
  const [displayLimit, setDisplayLimit] = useState(20);

  // Modals
  const [videoModal, setVideoModal] = useState<{ name: string; url: string } | null>(null);
  const [imageModal, setImageModal] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    getAllExercises().then(data => {
      setExercises(data);
      setLoading(false);
    });
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setDisplayLimit(20);
  };

  const handleSubcategorySelect = (sub: string) => {
    setSubcategoryFilter(sub);
    setDisplayLimit(20);
  };

  const filtered = exercises.filter(ex => {
    const catMatch = !filterCategory || ex.muscle_group === filterCategory;
    const queryMatch = !searchQuery || (ex.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const needsSubcat = filterCategory && (filterCategory.toLowerCase() === 'brazo' || filterCategory.toLowerCase() === 'pierna');
    const subcatMatch = !needsSubcat || subcategoryFilter === 'Todos' || (ex.subcategory && ex.subcategory.toLowerCase() === subcategoryFilter.toLowerCase());
    return catMatch && queryMatch && subcatMatch;
  });

  const setCategory = (cat: string) => {
    setFilterCategory(cat === filterCategory ? '' : cat);
    setSubcategoryFilter('Todos');
    setDisplayLimit(20);
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>Ejercicios</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
          {loading ? '...' : `${exercises.length} ejercicios en el catálogo`}
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={searchQuery}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
            >×</button>
          )}
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCategory('')}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: !filterCategory ? 700 : 400,
              border: !filterCategory ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              backgroundColor: !filterCategory ? 'rgba(204,255,0,0.12)' : 'transparent',
              color: !filterCategory ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >Todos</button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: filterCategory === cat ? 700 : 400,
                border: filterCategory === cat ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: filterCategory === cat ? 'rgba(204,255,0,0.12)' : 'transparent',
                color: filterCategory === cat ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Subcategory chips */}
        {filterCategory && (filterCategory === 'Brazo' || filterCategory === 'Pierna') && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {['Todos', ...(filterCategory === 'Brazo' ? BRAZO_SUBCATEGORIES : PIERNA_SUBCATEGORIES)].map(sub => (
              <button
                key={sub}
                onClick={() => setSubcategoryFilter(sub)}
                style={{
                  flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: subcategoryFilter === sub ? 700 : 400,
                  border: subcategoryFilter === sub ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: subcategoryFilter === sub ? 'rgba(204,255,0,0.08)' : 'transparent',
                  color: subcategoryFilter === sub ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >{sub}</button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && (searchQuery || filterCategory) && (
        <div style={{ padding: '4px 16px 8px', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
        </div>
      )}

      {/* Exercise list */}
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 72, borderRadius: 12, backgroundColor: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, margin: '0 0 8px' }}>
              {searchQuery ? `No hay ejercicios para "${searchQuery}"` : `No hay ejercicios en ${filterCategory}`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setFilterCategory(''); setSubcategoryFilter('Todos'); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Ver todos →
            </button>
          </div>
        ) : (
          filtered.slice(0, displayLimit).map(ex => (
            <div
              key={ex.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '10px 12px',
                border: '1px solid transparent',
              }}
            >
              {/* Thumbnail */}
              <div style={{ flexShrink: 0, width: 52, height: 52 }}>
                {ex.image_url ? (
                  <img
                    src={ex.image_url}
                    alt={ex.name}
                    loading="lazy"
                    onClick={() => setImageModal({ name: ex.name, url: ex.image_url! })}
                    style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', backgroundColor: '#fff', cursor: 'zoom-in' }}
                  />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 10 }}>N/A</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600, fontSize: 14,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: ex.video_url ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: ex.video_url ? 'pointer' : 'default',
                    textDecoration: ex.video_url ? 'underline' : 'none',
                    textUnderlineOffset: '3px'
                  }}
                  onClick={() => ex.video_url && setVideoModal({ name: ex.name, url: ex.video_url })}
                >
                  {ex.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {ex.muscle_group}{ex.subcategory ? ` · ${ex.subcategory}` : ''}{ex.equipment && ex.equipment !== 'Ninguno' ? ` · ${ex.equipment}` : ''}
                </div>
              </div>

              {/* Video indicator */}
              {ex.video_url && (
                <button
                  onClick={() => setVideoModal({ name: ex.name, url: ex.video_url! })}
                  style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}
                  title="Ver video"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </button>
              )}
            </div>
          ))
        )}

        {!loading && filtered.length > displayLimit && (
          <button
            onClick={() => setDisplayLimit(prev => prev + 20)}
            style={{
              padding: '12px',
              marginTop: '8px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Ver más ejercicios ({filtered.length - displayLimit} restantes)
          </button>
        )}
      </div>

      {/* Video Modal */}
      {videoModal && (
        <div
          onClick={() => setVideoModal(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <h3 style={{ color: 'white', marginBottom: 20, textAlign: 'center', fontSize: 18, fontWeight: 600 }}>{videoModal.name}</h3>
          {videoModal.url.includes('youtube.com') || videoModal.url.includes('youtu.be') ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: 600, paddingTop: '56.25%', borderRadius: 16, overflow: 'hidden' }}>
              <iframe
                src={videoModal.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
              />
            </div>
          ) : (
            <video src={videoModal.url} autoPlay loop playsInline muted style={{ width: '100%', maxHeight: '60vh', borderRadius: 16, objectFit: 'contain', backgroundColor: '#fff' }} />
          )}
          <Button variant="outline" style={{ marginTop: 24 }} onClick={() => setVideoModal(null)}>Cerrar</Button>
        </div>
      )}

      {/* Image Modal */}
      {imageModal && (
        <div
          onClick={() => setImageModal(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.94)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <h3 style={{ color: 'white', marginBottom: 20, textAlign: 'center', fontSize: 18, fontWeight: 600 }}>{imageModal.name}</h3>
          <img src={imageModal.url} alt={imageModal.name} style={{ width: '100%', maxWidth: 500, maxHeight: '65vh', borderRadius: 16, objectFit: 'contain', backgroundColor: '#fff', padding: 12 }} />
          <Button variant="outline" style={{ marginTop: 24 }} onClick={() => setImageModal(null)}>Cerrar</Button>
        </div>
      )}
    </div>
  );
};
