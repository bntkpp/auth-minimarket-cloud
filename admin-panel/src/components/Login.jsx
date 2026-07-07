import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.user.role !== 'admin') {
        setError('Esta cuenta no es admin. Necesitas un usuario con rol admin para entrar.');
        setLoading(false);
        return;
      }
      setToken(res.access_token);
      onLogin(res.user);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
      setLoading(false);
    }
  }

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>Panel de Administración</h1>
        <p className="subtitle">Identidad y Usuarios · Grupo 2</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@correo.cl"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="primary" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="hint">
          Conecta con <code>{api.baseUrl}</code>
          <br />
          (la primera petición puede tardar ~30 s si el servicio estaba dormido)
        </p>
      </form>
    </div>
  );
}
