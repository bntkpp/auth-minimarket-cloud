import { useState } from 'react';
import { api } from '../api.js';
import PasswordInput from './PasswordInput.jsx';

export default function LoginForm({ onAuthenticated, goTo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await api.login(email.trim(), password);
      onAuthenticated(session);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
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

      <PasswordInput
        label="Contraseña"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />

      <button type="button" className="link link-right" onClick={() => goTo('forgot')}>
        ¿Olvidaste tu contraseña?
      </button>

      {error && (
        <div className="alert alert-err" role="alert">
          {error}
        </div>
      )}

      <button className="primary block" disabled={loading}>
        {loading ? 'Ingresando…' : 'Iniciar sesión'}
      </button>

      <p className="switch">
        ¿No tienes cuenta?{' '}
        <button type="button" className="link" onClick={() => goTo('register')}>
          Crear una
        </button>
      </p>
    </form>
  );
}
