import { useState } from 'react';
import { api } from '../api.js';

/**
 * Modal para crear o editar un usuario.
 * - Crear: POST /auth/register (nace como customer); si se elige admin, se
 *   ajusta el rol con PATCH /users/:id/role.
 * - Editar: PATCH /users/:id (nombre) + PATCH /users/:id/role si cambió el rol.
 */
export default function UserModal({ mode, user, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'customer');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateName(user.user_id, fullName);
        if (role !== user.role) await api.changeRole(user.user_id, role);
      } else {
        const res = await api.createUser({ email, password, full_name: fullName });
        if (role === 'admin') await api.changeRole(res.user.user_id, 'admin');
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isEdit}
          />
        </label>

        <label>
          Nombre completo
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>

        {!isEdit && (
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <small className="muted">Mínimo 8 caracteres.</small>
          </label>
        )}

        <label>
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="customer">customer</option>
            <option value="admin">admin</option>
          </select>
        </label>

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
