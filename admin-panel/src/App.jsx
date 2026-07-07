import { useState, useEffect } from 'react';
import { api, getToken, setToken } from './api.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar, si hay token guardado, verifica que siga siendo un admin válido.
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const profile = await api.me();
          if (profile.role === 'admin') setMe(profile);
          else setToken(null);
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  function handleLogout() {
    setToken(null);
    setMe(null);
  }

  if (loading) {
    return <div className="center muted">Cargando…</div>;
  }
  if (!me) {
    return <Login onLogin={setMe} />;
  }
  return <Dashboard me={me} onLogout={handleLogout} />;
}
