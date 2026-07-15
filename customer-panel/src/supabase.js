/**
 * Cliente de Supabase usado EXCLUSIVAMENTE para el flujo nativo de recuperación
 * de contraseña (enviar el correo con el enlace y fijar la nueva contraseña
 * cuando el usuario vuelve desde ese enlace).
 *
 * El resto de la app (login, registro, perfil) sigue hablando solo con la API de
 * G2. La recuperación por correo es, por naturaleza, un flujo de cliente contra
 * Supabase Auth, así que aquí se usa el SDK directamente, con la clave `anon`
 * (pública, pensada para el navegador).
 *
 * Si no hay variables configuradas, `supabase` es null y el portal muestra un
 * aviso en vez de romperse.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isRecoveryConfigured = Boolean(url && anonKey);

export const supabase = isRecoveryConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Flujo implícito: los tokens de recuperación viajan en el hash de la URL
        // del enlace del correo. Funciona aunque el usuario abra el correo en
        // otro dispositivo. `detectSessionInUrl` procesa ese hash al cargar.
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: false,
      },
    })
  : null;
