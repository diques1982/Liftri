import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui';
import { toast } from '../../utils/toast';
import '../../styles/theme.css';

export interface AuthProps {
  onSuccess?: () => void;
}

type AuthView = 'login' | 'signup' | 'forgot_password';

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(() => parseInt(localStorage.getItem('liftri_failed_attempts') || '0', 10));
  const [blockedUntil, setBlockedUntil] = useState(() => parseInt(localStorage.getItem('liftri_blocked_until') || '0', 10));

  useEffect(() => {
    if (blockedUntil > 0 && blockedUntil <= Date.now()) {
      localStorage.removeItem('liftri_failed_attempts');
      localStorage.removeItem('liftri_blocked_until');
      setFailedAttempts(0);
      setBlockedUntil(0);
    }
  }, [blockedUntil]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'login') {
        if (blockedUntil > Date.now()) {
          toast.error('Acceso bloqueado por demasiados intentos. Restablece tu contraseña o intenta más tarde.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          localStorage.setItem('liftri_failed_attempts', String(newAttempts));
          
          if (newAttempts >= 4) {
            const blockTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
            setBlockedUntil(blockTime);
            localStorage.setItem('liftri_blocked_until', String(blockTime));
            toast.error('Demasiados intentos. Acceso bloqueado por 24h. Restablece tu contraseña para desbloquear.');
          } else {
            const msg = error.message?.toLowerCase() || '';
            if (msg.includes('invalid login credentials') || msg.includes('user not found') || msg.includes('invalid credentials')) {
              setShowNotFound(true);
              toast.error(`Credenciales incorrectas. Te quedan ${4 - newAttempts} intentos.`);
            } else {
              toast.error(error.message || 'Error al iniciar sesión.');
            }
          }
          return;
        }

        localStorage.removeItem('liftri_failed_attempts');
        localStorage.removeItem('liftri_blocked_until');
        if (onSuccess) onSuccess();
      } else if (view === 'signup') {
        if (!name.trim()) {
          toast.error('Por favor ingresa tu nombre.');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          toast.error('La contraseña debe tener al menos 8 caracteres.');
          setLoading(false);
          return;
        }
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (!hasLetter || !hasNumber) {
          toast.error('La contraseña debe contener letras y números (ej: Gym2024).');
          setLoading(false);
          return;
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } }
        });
        if (error) {
          const msg = error.message?.toLowerCase() || '';
          if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('already exists')) {
            toast.error(`El correo ${email} ya tiene una cuenta registrada. Inicia sesión.`);
            setView('login');
            setPassword('');
          } else {
            throw error;
          }
          return;
        }
        // Supabase sometimes returns a user with empty identities when the email already exists (email confirmation mode)
        if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
          toast.error(`El correo ${email} ya tiene una cuenta registrada. Inicia sesión.`);
          setView('login');
          setPassword('');
          return;
        }
        // Also update the profiles table directly in case trigger doesn't pick up metadata
        if (signUpData.user) {
          await supabase.from('profiles').upsert({ id: signUpData.user.id, name: name.trim() }).select();
        }
        setShowSignupSuccess(true);
      } else if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        localStorage.removeItem('liftri_failed_attempts');
        localStorage.removeItem('liftri_blocked_until');
        setFailedAttempts(0);
        setBlockedUntil(0);
        toast.success('Enlace de recuperación enviado al correo.');
        setView('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--spacing-xl) var(--spacing-lg)',
      color: 'var(--color-text)',
      fontFamily: '"Inter", sans-serif'
    }}>
      {/* Header / Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
        <img src="/logo-horizontal.png" alt="Liftri Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {view === 'login' ? 'BIENVENIDO DE NUEVO' : view === 'signup' ? 'ÚNETE A LA ÉLITE' : 'RECUPERA TU CUENTA'}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>
          {view === 'login' ? 'DOMINA TU SESIÓN' : view === 'signup' ? 'COMIENZA TU TRANSFORMACIÓN' : 'RESTABLECE TU ACCESO'}
        </p>
      </div>

      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Name Input (only on signup) */}
        {view === 'signup' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', letterSpacing: '1px' }}>
              NOMBRE
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <input
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '16px 16px 16px 48px',
                  color: 'var(--color-text)',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
              />
            </div>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', letterSpacing: '1px' }}>
            EMAIL
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <input 
              type="email" 
              placeholder="atleta@liftri.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '16px 16px 16px 48px',
                color: 'var(--color-text)',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
            />
          </div>
        </div>

        {/* Password Input (Hidden on forgot_password) */}
        {view !== 'forgot_password' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', letterSpacing: '1px' }}>
              CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '16px 16px 16px 48px',
                  color: 'var(--color-text)',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
              />
            </div>
            {view === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button 
                  type="button"
                  onClick={() => setView('forgot_password')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  ¿OLVIDASTE TU CONTRASEÑA?
                </button>
              </div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: 'var(--color-primary)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginTop: '8px',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'PROCESANDO...' : view === 'login' ? 'INICIAR SESIÓN' : view === 'signup' ? 'REGISTRARSE' : 'ENVIAR ENLACE'}
          {!loading && view !== 'forgot_password' && (
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          )}
        </button>
      </form>

      {/* Footer Toggle */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <p style={{ fontSize: '14px', margin: 0 }}>
          {view === 'login' ? '¿No tienes una cuenta? ' : view === 'signup' ? '¿Ya tienes una cuenta? ' : '¿Recuperaste tu cuenta? '}
          <button 
            type="button"
            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
            style={{ 
              background: 'none', border: 'none', color: 'var(--color-primary)', 
              fontWeight: 600, fontSize: '14px', cursor: 'pointer', padding: 0 
            }}
          >
            {view === 'login' ? 'Regístrate gratis' : 'Inicia Sesión'}
          </button>
        </p>
        <p style={{ fontSize: '10px', color: '#666', marginTop: '16px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          © 2026 LIFTRI. HIGH-PERFORMANCE LOGIC.
        </p>
      </div>

      {/* Success Modal */}
      {showSignupSuccess && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            padding: '32px 24px',
            textAlign: 'center',
            border: '1px solid var(--color-border)',
            boxShadow: '0 10px 40px rgba(204, 255, 0, 0.1)'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: 'rgba(204,255,0,0.1)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px auto'
            }}>
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            
            <h3 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: 800, textTransform: 'uppercase' }}>
              ¡Registro Exitoso!
            </h3>
            
            <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', lineHeight: 1.5, marginBottom: '32px' }}>
              Tu cuenta ha sido creada. Por favor, <strong>valida tu correo electrónico</strong> para confirmar tu cuenta y acceder a la plataforma.
            </p>
            
            <Button 
              variant="primary" 
              style={{ width: '100%', padding: '16px 0', fontSize: '16px', fontWeight: 700 }}
              onClick={() => {
                setShowSignupSuccess(false);
                setView('login');
              }}
            >
              ACEPTAR
            </Button>
          </div>
        </div>
      )}

      {/* Not Found Modal */}
      {showNotFound && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            padding: '32px 24px',
            textAlign: 'center',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>

            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: 800 }}>
              Usuario o contraseña incorrecta
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '28px' }}>
              No encontramos una cuenta con el correo <strong style={{ color: 'var(--color-text)' }}>{email}</strong> o la contraseña no es correcta.<br /><br />
              ¿Quieres crear una cuenta nueva?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button
                variant="primary"
                style={{ width: '100%', padding: '14px 0', fontSize: '15px', fontWeight: 700 }}
                onClick={() => {
                  setShowNotFound(false);
                  setView('signup');
                  setPassword('');
                }}
              >
                REGISTRARME
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowNotFound(false);
                  setEmail('');
                  setPassword('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', cursor: 'pointer', padding: '8px' }}
              >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
