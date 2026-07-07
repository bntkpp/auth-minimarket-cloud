import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import type { User } from '@supabase/supabase-js';

/**
 * Seed (siembra) de usuarios de prueba en Supabase Auth.
 *
 * La colección Postman (carpeta "Auth") asume que existen dos usuarios fijos:
 *   - juan@correo.cl  (customer) → login cliente y caso "email duplicado (409)"
 *   - maria@correo.cl (admin)    → login admin
 *
 * Este script los crea (o los actualiza si ya existen) de forma idempotente,
 * para que el smoke test tenga siempre los datos que espera. Solo necesita
 * SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (ver src/config/supabase.ts).
 *
 * Uso:  npm run seed
 */

type Role = 'customer' | 'admin';

interface UsuarioSemilla {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  business_user_id: string;
}

const SEMILLA: UsuarioSemilla[] = [
  {
    email: 'juan@correo.cl',
    password: 'MiClave123',
    full_name: 'Juan Perez',
    role: 'customer',
    business_user_id: 'USR-01',
  },
  {
    email: 'maria@correo.cl',
    password: 'AdminClave123',
    full_name: 'Maria Admin',
    role: 'admin',
    business_user_id: 'USR-02',
  },
];

// Busca un usuario por email recorriendo TODAS las páginas de Supabase Auth.
// (listUsers pagina; con perPage alto y este bucle no se nos escapa aunque
// se hayan acumulado muchos usuarios de pruebas anteriores.)
async function buscarPorEmail(email: string): Promise<User | null> {
  const objetivo = email.toLowerCase();
  for (let page = 1; page <= 1000; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers falló: ${error.message}`);
    const encontrado = data.users.find((u) => u.email?.toLowerCase() === objetivo);
    if (encontrado) return encontrado;
    if (data.users.length < 1000) break; // era la última página
  }
  return null;
}

async function sembrar(u: UsuarioSemilla): Promise<void> {
  const user_metadata = {
    full_name: u.full_name,
    role: u.role,
    status: 'active',
    business_user_id: u.business_user_id,
  };

  const existente = await buscarPorEmail(u.email);

  if (existente) {
    // Ya existe: reafirmamos password, metadata y email confirmado para que
    // las credenciales del smoke test siempre coincidan.
    const { error } = await supabase.auth.admin.updateUserById(existente.id, {
      password: u.password,
      email_confirm: true,
      user_metadata,
    });
    if (error) throw new Error(`No se pudo actualizar ${u.email}: ${error.message}`);
    console.log(`= actualizado: ${u.email} (${u.role})`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true, // sin verificación de correo en este mock
    user_metadata,
  });
  if (error) throw new Error(`No se pudo crear ${u.email}: ${error.message}`);
  console.log(`+ creado: ${u.email} (${u.role})`);
}

async function main(): Promise<void> {
  console.log('Sembrando usuarios de prueba en Supabase Auth...');
  for (const u of SEMILLA) {
    await sembrar(u);
  }
  console.log('Seed completado.');
}

main().catch((e) => {
  console.error('Seed falló:', e instanceof Error ? e.message : e);
  process.exit(1);
});
