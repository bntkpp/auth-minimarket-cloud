import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
  saveTokens,
  saveUser,
} from './session.js';
import { useToast } from './toast.jsx';
import { supabase } from './supabase.js';
import AuthScreen from './components/AuthScreen.jsx';
import Account from './components/Account.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const toast = useToast();

  const refreshTimer = useRef(null);
  const scheduleRefreshRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const forceLogout = useCallback(
    (message) => {
      clearTimer();
      clearSession();
      setUser(null);
      if (message) toast.err(message);
    },
    [clearTimer, toast],
  );

  // Programa la renovación automática del access token, como haría un sitio real:
  // el usuario nunca dispara el refresh a mano. Se reprograma sola en cada ciclo.
  const scheduleRefresh = useCallback(
    (expiresInSeconds) => {
      clearTimer();
      if (!expiresInSeconds) return;
      // Renueva 30 s antes de expirar (piso de 5 s para TTLs cortos usados en demos).
      const delayMs = Math.max((expiresInSeconds - 30) * 1000, 5000);
      refreshTimer.current = setTimeout(async () => {
        try {
          const rt = getRefreshToken();
          if (!rt) throw new Error('sin refresh token');
          const data = await api.refresh(rt);
          saveTokens(data);
          scheduleRefreshRef.current?.(data.expires_in);
        } catch {
          forceLogout('Tu sesión expiró. Vuelve a iniciar sesión.');
        }
      }, delayMs);
    },
    [clearTimer, forceLogout],
  );

  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  // Recuperación de contraseña: cuando el usuario vuelve desde el enlace del
  // correo, Supabase detecta el token en la URL y emite PASSWORD_RECOVERY.
  // Entramos en "modo recuperación" para pedir la nueva contraseña.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const completeRecovery = useCallback(() => {
    setRecovery(false);
    // Limpia el hash con los tokens que dejó el enlace del correo.
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Arranque: si hay una sesión guardada, la valida (o la renueva) y la restaura
  // sin pedirle nada al usuario.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getAccessToken()) {
        setBooting(false);
        return;
      }
      try {
        const v = await api.validate();
        const remaining = Math.floor((new Date(v.expires_at).getTime() - Date.now()) / 1000);
        if (remaining <= 0) throw new Error('token expirado');
        const profile = await api.me();
        if (cancelled) return;
        saveUser(profile);
        setUser(profile);
        scheduleRefresh(remaining);
      } catch {
        // Access token vencido/ inválido: intentar con el refresh token.
        try {
          const rt = getRefreshToken();
          if (!rt) throw new Error('sin refresh token');
          const data = await api.refresh(rt);
          saveTokens(data);
          const profile = await api.me();
          if (cancelled) return;
          saveUser(profile);
          setUser(profile);
          scheduleRefresh(data.expires_in);
        } catch {
          clearSession();
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [scheduleRefresh, clearTimer]);

  const handleAuthenticated = useCallback(
    (session) => {
      saveSession(session);
      setUser(session.user);
      scheduleRefresh(session.expires_in);
      toast.ok(`¡Hola, ${session.user?.full_name || 'bienvenido'}!`);
    },
    [scheduleRefresh, toast],
  );

  const handleProfileUpdate = useCallback((updated) => {
    saveUser(updated);
    setUser(updated);
  }, []);

  const handleLogout = useCallback(async () => {
    const rt = getRefreshToken();
    clearTimer();
    try {
      if (rt) await api.logout(rt);
    } catch {
      // Cerramos localmente aunque el logout remoto falle (token ya expirado, etc.).
    }
    clearSession();
    setUser(null);
    toast.ok('Cerraste sesión.');
  }, [clearTimer, toast]);

  // El modo recuperación tiene prioridad: el usuario llegó desde el enlace del
  // correo para fijar una nueva contraseña.
  if (recovery) {
    return <AuthScreen recovery onRecoveryComplete={completeRecovery} />;
  }
  if (booting) {
    return <div className="boot">Cargando…</div>;
  }
  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }
  return <Account user={user} onProfileUpdate={handleProfileUpdate} onLogout={handleLogout} />;
}
