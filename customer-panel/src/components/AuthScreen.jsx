import { useState } from 'react';
import { api } from '../api.js';
import LoginForm from './LoginForm.jsx';
import RegisterForm from './RegisterForm.jsx';
import ForgotPasswordForm from './ForgotPasswordForm.jsx';
import ResetPasswordForm from './ResetPasswordForm.jsx';

const TITLES = {
  login: 'Inicia sesión',
  register: 'Crea tu cuenta',
  forgot: 'Recuperar contraseña',
  reset: 'Nueva contraseña',
};

/**
 * Pantalla de acceso (sin sesión). Orquesta login, registro y "olvidé mi
 * contraseña". El paso de "nueva contraseña" (reset) NO se navega a mano: se
 * activa solo cuando el usuario vuelve desde el enlace del correo, y en ese caso
 * App renderiza esta pantalla con `recovery` en true.
 */
export default function AuthScreen({ onAuthenticated, recovery = false, onRecoveryComplete }) {
  const [view, setView] = useState(recovery ? 'reset' : 'login');

  function goTo(next) {
    setView(next);
  }

  const showTabs = !recovery && (view === 'login' || view === 'register');

  return (
    <div className="auth-screen">
      <main className="auth-card">
        <header className="auth-brand">
          <span className="brand-fish">🐟</span>
          <div className="brand-text">
            <strong>FishMarket</strong>
            <span>Cloud</span>
          </div>
        </header>

        <h1 className="auth-title">{TITLES[recovery ? 'reset' : view]}</h1>

        {showTabs && (
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={view === 'login'}
              className={`auth-tab ${view === 'login' ? 'active' : ''}`}
              onClick={() => goTo('login')}
            >
              Iniciar sesión
            </button>
            <button
              role="tab"
              aria-selected={view === 'register'}
              className={`auth-tab ${view === 'register' ? 'active' : ''}`}
              onClick={() => goTo('register')}
            >
              Registrarse
            </button>
          </div>
        )}

        {recovery ? (
          <ResetPasswordForm onDone={onRecoveryComplete} />
        ) : (
          <>
            {view === 'login' && <LoginForm onAuthenticated={onAuthenticated} goTo={goTo} />}
            {view === 'register' && <RegisterForm onAuthenticated={onAuthenticated} goTo={goTo} />}
            {view === 'forgot' && <ForgotPasswordForm goTo={goTo} />}
          </>
        )}
      </main>

      <p className="auth-foot">
        Conecta con <code>{api.baseUrl}</code>
        <br />
        La primera petición puede tardar ~30 s si el servicio estaba en reposo.
      </p>
    </div>
  );
}
