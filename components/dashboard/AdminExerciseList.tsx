import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from '../ui';
import { 
  getAllExercises, 
  updateGlobalExercise, 
  deleteGlobalExercise, 
  uploadExerciseImage, 
  uploadExerciseVideo 
} from '../../lib/api';
import { Exercise } from '../../types/database';
import { toast } from '../../utils/toast';

interface AdminExerciseListProps {
  onBack: () => void;
}

const CATEGORIES = ['Pecho', 'Espalda', 'Brazo', 'Pierna', 'Abdomen', 'Glúteo'];
const BRAZO_SUBCATEGORIES = ['Bíceps', 'Tríceps', 'Hombro', 'Antebrazo'];
const PIERNA_SUBCATEGORIES = ['Cuádricep', 'Femoral', 'Pantorrilla'];

export const AdminExerciseList: React.FC<AdminExerciseListProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  
  // Edit State
  const [editingEx, setEditingEx] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [savingEx, setSavingEx] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Video Preview Modal
  const [videoModal, setVideoModal] = useState<{ name: string; url: string } | null>(null);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const data = await getAllExercises();
      setExercises(data);
    } catch (err: any) {
      toast.error('Error al cargar ejercicios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el ejercicio "${name}" del catálogo global?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteGlobalExercise(id);
      setExercises(prev => prev.filter(ex => ex.id !== id));
      toast.success(`"${name}" eliminado permanentemente.`);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el ejercicio.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEdit = (ex: Exercise) => {
    setEditingEx(ex);
    setEditName(ex.name);
    setEditMuscle(ex.muscle_group || '');
    setEditSubcategory(ex.subcategory || '');
    setEditImagePreview(ex.image_url || null);
    setEditImageFile(null);
    setEditVideoFile(null);
  };

  const handleUpdateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEx) return;

    if (!editName.trim() || !editMuscle.trim()) {
      toast.error('Nombre y categoría son obligatorios.');
      return;
    }

    setSavingEx(true);
    try {
      let image_url = editingEx.image_url;
      if (editImageFile) {
        image_url = await uploadExerciseImage(editImageFile);
      }

      let video_url = editingEx.video_url;
      if (editVideoFile) {
        video_url = await uploadExerciseVideo(editVideoFile);
      }

      const updated = await updateGlobalExercise(editingEx.id, {
        name: editName.trim(),
        muscle_group: editMuscle.trim(),
        subcategory: (editMuscle === 'Brazo' || editMuscle === 'Pierna') && editSubcategory ? editSubcategory : undefined,
        image_url,
        video_url,
      });

      setExercises(prev => prev.map(ex => ex.id === editingEx.id ? updated : ex));
      toast.success('Ejercicio actualizado exitosamente.');
      setEditingEx(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el ejercicio.');
    } finally {
      setSavingEx(false);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const catMatch = !filterCategory || ex.muscle_group === filterCategory;
    const queryMatch = !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && queryMatch;
  });

  return (
    <div style={{ padding: '16px', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={onBack} 
          style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, flex: 1 }}>Administrar Ejercicios</h2>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="Buscar ejercicio en catálogo..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Categories chips filter */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: '16px', scrollbarWidth: 'none' }}>
        <button 
          onClick={() => setFilterCategory('')} 
          style={{ 
            flexShrink: 0, padding: '6px 14px', borderRadius: 20, 
            border: !filterCategory ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', 
            backgroundColor: !filterCategory ? 'rgba(var(--color-primary-rgb,200,255,0),0.15)' : 'transparent', 
            color: !filterCategory ? 'var(--color-primary)' : 'var(--color-text-muted)', 
            cursor: 'pointer', fontSize: 13, fontWeight: !filterCategory ? 700 : 400 
          }}
        >
          Todos
        </button>
        {CATEGORIES.map(c => (
          <button 
            key={c} 
            onClick={() => setFilterCategory(filterCategory === c ? '' : c)} 
            style={{ 
              flexShrink: 0, padding: '6px 14px', borderRadius: 20, 
              border: filterCategory === c ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', 
              backgroundColor: filterCategory === c ? 'rgba(var(--color-primary-rgb,200,255,0),0.15)' : 'transparent', 
              color: filterCategory === c ? 'var(--color-primary)' : 'var(--color-text-muted)', 
              cursor: 'pointer', fontSize: 13, fontWeight: filterCategory === c ? 700 : 400 
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando catálogo...</div>
      ) : filteredExercises.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          No se encontraron ejercicios en la categoría seleccionada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredExercises.map(ex => (
            <div 
              key={ex.id} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: 12, 
                backgroundColor: 'var(--color-surface)', borderRadius: 12, 
                padding: 12, border: '1px solid var(--color-border)' 
              }}
            >
              {/* Media Thumbnail */}
              <div style={{ position: 'relative', flexShrink: 0, width: 48, height: 48 }}>
                {ex.image_url ? (
                  <img src={ex.image_url} alt={ex.name} loading="lazy" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', backgroundColor: '#fff' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 10 }}>N/A</div>
                )}
                {ex.video_url && (
                  <div 
                    onClick={() => setVideoModal({ name: ex.name, url: ex.video_url! })} 
                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 8 }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {ex.muscle_group}{ex.subcategory ? ` · ${ex.subcategory}` : ''}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button 
                  onClick={() => handleOpenEdit(ex)} 
                  style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, padding: 8, color: 'var(--color-text)', cursor: 'pointer', display: 'flex' }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button 
                  onClick={() => handleDelete(ex.id, ex.name)} 
                  disabled={deletingId === ex.id}
                  style={{ background: 'none', border: '1px solid rgba(255,80,80,0.4)', borderRadius: 8, padding: 8, color: '#ff5050', cursor: 'pointer', display: 'flex', opacity: deletingId === ex.id ? 0.5 : 1 }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL OVERLAY */}
      {editingEx && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#f9fafb',
            color: '#111827',
            '--color-text': '#111827',
            '--color-text-muted': '#6b7280',
            '--color-background': '#ffffff',
            '--color-surface': '#ffffff',
            '--color-border': '#d1d5db',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          } as React.CSSProperties}>
            <button 
              onClick={() => setEditingEx(null)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer'
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700 }}>Editar Ejercicio</h3>
            
            <form onSubmit={handleUpdateExercise}>
              {/* Image Upload (optional) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>IMAGEN <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '2px dashed var(--color-border)', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--color-text-muted)" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { setEditImageFile(e.target.files[0]); setEditImagePreview(URL.createObjectURL(e.target.files[0])); } }} style={{ display: 'none' }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13, width: '100%' }}>
                      {editImageFile ? `✓ ${editImageFile.name}` : 'Elegir nueva imagen...'}
                    </button>
                    {editingEx.image_url && !editImageFile && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginTop: 4 }}>Manteniendo imagen actual</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Video Upload (optional) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>VIDEO <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                <input type="file" accept="video/*" ref={videoInputRef} onChange={(e) => { if (e.target.files?.[0]) setEditVideoFile(e.target.files[0]); }} style={{ display: 'none' }} />
                <button type="button" onClick={() => videoInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: editVideoFile ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left' }}>
                  {editVideoFile ? `✓ ${editVideoFile.name}` : editingEx.video_url ? '🎬 Reemplazar video...' : '🎬 Subir video...'}
                </button>
                {editingEx.video_url && !editVideoFile && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginTop: 4 }}>Manteniendo video actual</span>
                )}
              </div>

              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>NOMBRE DEL EJERCICIO <span style={{ color: '#ef4444' }}>*</span></label>
                <Input placeholder="Ej. Curl con mancuerna..." value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>CATEGORÍA <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={editMuscle} onChange={e => { setEditMuscle(e.target.value); setEditSubcategory(''); }} style={{ width: '100%', padding: '12px', borderRadius: 8, backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none', fontSize: 14 }} required>
                  <option value="" disabled>Seleccionar categoría</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Subcategory (for Brazo and Pierna) */}
              {editMuscle === 'Brazo' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>SUBCATEGORÍA</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {BRAZO_SUBCATEGORIES.map(sub => (
                      <button key={sub} type="button" onClick={() => setEditSubcategory(editSubcategory === sub ? '' : sub)} style={{ padding: '6px 14px', borderRadius: 20, border: editSubcategory === sub ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', backgroundColor: editSubcategory === sub ? 'rgba(var(--color-primary-rgb,200,255,0),0.15)' : 'var(--color-background)', color: editSubcategory === sub ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontSize: 13, fontWeight: editSubcategory === sub ? 700 : 400 }}>{sub}</button>
                    ))}
                  </div>
                </div>
              )}
              {editMuscle === 'Pierna' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>SUBCATEGORÍA</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {PIERNA_SUBCATEGORIES.map(sub => (
                      <button key={sub} type="button" onClick={() => setEditSubcategory(editSubcategory === sub ? '' : sub)} style={{ padding: '6px 14px', borderRadius: 20, border: editSubcategory === sub ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', backgroundColor: editSubcategory === sub ? 'rgba(var(--color-primary-rgb,200,255,0),0.15)' : 'var(--color-background)', color: editSubcategory === sub ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontSize: 13, fontWeight: editSubcategory === sub ? 700 : 400 }}>{sub}</button>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" variant="primary" disabled={savingEx} style={{ width: '100%', padding: '14px', fontWeight: 700 }}>
                {savingEx ? 'Actualizando...' : 'Actualizar Ejercicio'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {videoModal && (
        <div onClick={() => setVideoModal(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <h3 style={{ color: 'white', marginBottom: 20, textAlign: 'center', fontSize: 18 }}>{videoModal.name}</h3>
          <video src={videoModal.url} autoPlay loop playsInline muted style={{ width: '100%', maxHeight: '60vh', borderRadius: 16, objectFit: 'contain', backgroundColor: '#fff' }} />
          <Button variant="outline" style={{ marginTop: 24 }} onClick={() => setVideoModal(null)}>Cerrar</Button>
        </div>
      )}
    </div>
  );
};
