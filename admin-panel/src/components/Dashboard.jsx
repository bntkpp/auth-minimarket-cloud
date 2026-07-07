import { useState, useEffect, useMemo } from 'react';
import { api } from '../api.js';
import UserModal from './UserModal.jsx';

const PAGE_SIZE = 8;

const CHIPS = [
  { key: 'todos', label: 'Todos', match: () => true },
  { key: 'activos', label: 'Activos', match: (u) => u.status === 'active' },
  { key: 'deshabilitados', label: 'Deshabilitados', match: (u) => u.status === 'disabled' },
  { key: 'admins', label: 'Admins', match: (u) => u.role === 'admin' },
  { key: 'clientes', label: 'Clientes', match: (u) => u.role === 'customer' },
];

function initials(name, email) {
  const base = (name || email || '?').trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return {
    date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())} hrs.`,
  };
}

export default function Dashboard({ me, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('todos');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.listUsers({ page: 1, limit: 100 });
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function run(fn) {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const counts = useMemo(() => {
    const c = {};
    for (const chipDef of CHIPS) c[chipDef.key] = users.filter(chipDef.match).length;
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const chipDef = CHIPS.find((x) => x.key === chip) || CHIPS[0];
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (!chipDef.match(u)) return false;
      if (!q) return true;
      return (
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.business_user_id?.toLowerCase().includes(q)
      );
    });
  }, [users, chip, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [chip, search]);

  return (
    <div className="app">
      {/* Barra superior */}
      <header className="navbar">
        <div className="brand">
          <span className="brand-fish">🐟</span>
          <div className="brand-text">
            <strong>FishMarket</strong>
            <span>Cloud</span>
          </div>
          <span className="brand-tag">Admin</span>
        </div>

        <div className="navsearch">
          <span className="navsearch-icon">🔍</span>
          <input
            placeholder="Buscar por email, nombre o ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="navright">
          <span className="navuser">👤 {me.email}</span>
          <button className="btn-logout" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <main className="content">
        <div className="page-head">
          <div>
            <h1>Gestión de usuarios</h1>
            <p className="muted">Administra las cuentas del marketplace.</p>
          </div>
          <button className="btn-new" onClick={() => setModal({ mode: 'create' })}>
            + Nuevo usuario
          </button>
        </div>

        {/* Chips de filtro con contadores */}
        <div className="chips">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              className={`chip ${chip === c.key ? 'chip-active' : ''}`}
              onClick={() => setChip(c.key)}
            >
              {c.label} <span className="chip-count">({counts[c.key] ?? 0})</span>
            </button>
          ))}
        </div>

        {error && <div className="error banner">{error}</div>}

        {/* Tabla */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Registro</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Verificado</th>
                <th className="ta-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="6" className="empty">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty">
                    No hay usuarios que coincidan.
                  </td>
                </tr>
              )}
              {!loading &&
                pageRows.map((u) => {
                  const dt = fmtDate(u.created_at);
                  return (
                    <tr key={u.user_id}>
                      <td>
                        <div className="user-cell">
                          <div className={`avatar ${u.role === 'admin' ? 'avatar-admin' : ''}`}>
                            {initials(u.full_name, u.email)}
                          </div>
                          <div className="user-info">
                            <span className="user-name">{u.full_name || u.business_user_id}</span>
                            <span className="user-sub">
                              {u.business_user_id ? `${u.business_user_id} · ` : ''}
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <span>{dt.date}</span>
                          <span className="muted small">{dt.time}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge role-${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`badge status-${u.status}`}>
                          <i className="dot" /> {u.status === 'active' ? 'Activo' : 'Deshabilitado'}
                        </span>
                      </td>
                      <td>
                        {u.email_verified ? (
                          <span className="verified">✓</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn-detail" onClick={() => setModal({ mode: 'edit', user: u })}>
                            Editar
                          </button>
                          {u.status === 'active' ? (
                            <button
                              className="icon-btn"
                              title="Deshabilitar"
                              onClick={() => run(() => api.changeStatus(u.user_id, 'disabled'))}
                            >
                              ⏸
                            </button>
                          ) : (
                            <button
                              className="icon-btn"
                              title="Activar"
                              onClick={() => run(() => api.changeStatus(u.user_id, 'active'))}
                            >
                              ▶
                            </button>
                          )}
                          <button
                            className="icon-btn danger"
                            title="Eliminar"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar a ${u.email}? Es permanente.`)) {
                                run(() => api.deleteUser(u.user_id));
                              }
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="pager">
          <button className="pager-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
            ← Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`pager-num ${n === safePage ? 'active' : ''}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="pager-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            Siguiente →
          </button>
        </div>
        <p className="pager-info muted">
          Mostrando {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} a{' '}
          {Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} usuarios
        </p>
      </main>

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
