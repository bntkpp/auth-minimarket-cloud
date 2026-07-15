import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * Notificaciones tipo "toast" reutilizables por cualquier componente.
 * Uso: const toast = useToast();  toast.ok('Listo');  toast.err('Falló');
 */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((message, type = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  // Memoizado para que su identidad sea estable entre renders (evita reejecutar
  // efectos de componentes que dependen del toast).
  const value = useMemo(
    () => ({
      ok: (m) => show(m, 'ok'),
      err: (m) => show(m, 'err'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return ctx;
}
