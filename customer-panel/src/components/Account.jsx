import { useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import PasswordInput from './PasswordInput.jsx';

const MIN_PASSWORD = 8;

function initials(name, email) {
  const base = (name || email || '?').trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/**
 * Vista con sesión iniciada: perfil, edición de nombre, cambio de contraseña
 * y cierre de sesión.
 */
export default function Account({ user, onProfileUpdate, onLogout }) {
  const toast = useToast();

  const [fullName, setFullName] = useState(user.full_name || '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim() === user.full_name) return;
    setSavingName(true);
    try {
      const updated = await api.updateName(fullName.trim());
      onProfileUpdate(updated);
      toast.ok('Nombre actualizado.');
    } catch (err) {
      toast.err(err.message || 'No se pudo actualizar el nombre.');
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < MIN_PASSWORD) {
      setPwError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setChangingPw(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.ok('Contraseña cambiada. Vuelve a iniciar sesión.');
      // Cambiar la contraseña invalida la sesión: cerramos para forzar re-login.
      onLogout();
    } catch (err) {
      setPwError(err.message || 'No se pudo cambiar la contraseña.');
      setChangingPw(false);
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <span className="brand-fish">🐟</span>
          <div className="brand-text">
            <strong>FishMarket</strong>
            <span>Cloud</span>
          </div>
        </div>
        <div className="navright">
          <span className="navuser">👤 {user.email}</span>
          <button className="btn-logout" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="content account">
        <div className="account-hero">
          <div className="avatar-lg">{initials(user.full_name, user.email)}</div>
          <div>
            <h1>Hola, {user.full_name || 'cliente'} 👋</h1>
            <p className="muted">Gestiona los datos de tu cuenta.</p>
          </div>
        </div>

        <div className="account-grid">
          {/* Datos de la cuenta */}
          <section className="card panel">
            <h2>Datos de la cuenta</h2>
            <dl className="detail-list">
              <div>
                <dt>Nombre</dt>
                <dd>{user.full_name || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>ID de cliente</dt>
                <dd>{user.business_user_id || '—'}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  <span className="badge">{user.role}</span>
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <span className={`badge status-${user.status}`}>
                    {user.status === 'active' ? 'Activa' : 'Deshabilitada'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Email verificado</dt>
                <dd>{user.email_verified ? 'Sí' : 'No'}</dd>
              </div>
            </dl>
          </section>

          {/* Editar nombre */}
          <section className="card panel">
            <h2>Editar perfil</h2>
            <form className="stack" onSubmit={saveName}>
              <label>
                Nombre completo
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <button
                className="primary"
                disabled={savingName || !fullName.trim() || fullName.trim() === user.full_name}
              >
                {savingName ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </section>

          {/* Cambiar contraseña */}
          <section className="card panel">
            <h2>Cambiar contraseña</h2>
            <form className="stack" onSubmit={changePassword}>
              <PasswordInput
                label="Contraseña actual"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                required
              />
              <PasswordInput
                label="Nueva contraseña"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                hint="Mínimo 8 caracteres."
                required
              />
              {pwError && (
                <div className="alert alert-err" role="alert">
                  {pwError}
                </div>
              )}
              <button className="primary" disabled={changingPw}>
                {changingPw ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
