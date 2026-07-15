import { useState } from 'react';
import { api } from '../api.js';
import PasswordInput from './PasswordInput.jsx';

const MIN_PASSWORD = 8;

export default function RegisterForm({ onAuthenticated, goTo }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setLoading(true);
    try {
      const session = await api.register(email.trim(), password, fullName.trim());
      onAuthenticated(session);
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta.');
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <label>
        Nombre completo
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ada Lovelace"
          autoComplete="name"
          required
        />
      </label>

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
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        required
        hint={tooShort ? `Te faltan ${MIN_PASSWORD - password.length} caracteres.` : 'Usa al menos 8 caracteres.'}
      />

      {error && (
        <div className="alert alert-err" role="alert">
          {error}
        </div>
      )}

      <button className="primary block" disabled={loading}>
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>

      <p className="switch">
        ¿Ya tienes cuenta?{' '}
        <button type="button" className="link" onClick={() => goTo('login')}>
          Inicia sesión
        </button>
      </p>
    </form>
  );
}
