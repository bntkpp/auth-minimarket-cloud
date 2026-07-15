import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useToast } from '../toast.jsx';
import PasswordInput from './PasswordInput.jsx';

const MIN_PASSWORD = 8;

/**
 * Se muestra cuando el usuario vuelve desde el enlace del correo (modo
 * recuperación). En ese momento Supabase ya estableció una sesión temporal, así
 * que solo pedimos la nueva contraseña y la fijamos con updateUser.
 */
export default function ResetPasswordForm({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) {
      setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setLoading(true);
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password });
      if (sbError) throw sbError;
      // Cerramos la sesión temporal de recuperación para que inicie sesión limpio.
      await supabase.auth.signOut();
      toast.ok('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
      onDone();
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña.');
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <p className="lead">Elige tu nueva contraseña para completar la recuperación.</p>

      <PasswordInput
        label="Nueva contraseña"
        value={password}
        onChange={setPassword}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        hint="Mínimo 8 caracteres."
        required
      />

      {error && (
        <div className="alert alert-err" role="alert">
          {error}
        </div>
      )}

      <button className="primary block" disabled={loading}>
        {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>

      <button type="button" className="link" onClick={onDone}>
        Cancelar
      </button>
    </form>
  );
}
