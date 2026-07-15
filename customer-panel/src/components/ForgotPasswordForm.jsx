import { useState } from 'react';
import { supabase, isRecoveryConfigured } from '../supabase.js';

export default function ForgotPasswordForm({ goTo }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Supabase envía el correo con un enlace que vuelve al portal. Al volver,
      // App detecta el evento PASSWORD_RECOVERY y muestra el formulario de nueva
      // contraseña. Por seguridad, Supabase responde igual exista o no el email.
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (sbError) throw sbError;
      setSent(true);
    } catch (err) {
      setError(err.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  }

  if (!isRecoveryConfigured) {
    return (
      <div className="auth-form">
        <div className="alert alert-err" role="alert">
          La recuperación de contraseña no está configurada. Falta definir
          <code> VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        </div>
        <button type="button" className="link" onClick={() => goTo('login')}>
          ← Volver a iniciar sesión
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="auth-form">
        <div className="alert alert-ok" role="status">
          Si <b>{email}</b> corresponde a una cuenta, te enviamos un correo con un
          enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y la
          carpeta de spam).
        </div>
        <button type="button" className="link" onClick={() => goTo('login')}>
          ← Volver a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <p className="lead">
        Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.cl"
          autoComplete="email"
          required
        />
      </label>

      {error && (
        <div className="alert alert-err" role="alert">
          {error}
        </div>
      )}

      <button className="primary block" disabled={loading}>
        {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>

      <button type="button" className="link" onClick={() => goTo('login')}>
        ← Volver a iniciar sesión
      </button>
    </form>
  );
}
