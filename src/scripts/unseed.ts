import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import type { User } from '@supabase/supabase-js';

/**
 * Limpieza (unseed) de datos de prueba en Supabase Auth.
 *
 * Elimina los usuarios que crean el seed y las pruebas:
 *   - juan@correo.cl / maria@correo.cl        (seed fijo)
 *   - test_<timestamp>@correo.cl              (smoke test "Registro 201")
 *   - demo@correo.cl                          (pruebas manuales)
 *
 * NUNCA borra usuarios que no encajen en esa lista/patrones, así que es seguro
 * aunque el proyecto Supabase tenga otras cuentas.
 *
 * Uso:
 *   npm run unseed                 → borra seed + usuarios efímeros de prueba
 *   npm run unseed -- --solo-semilla  → borra SOLO juan y maria
 */

const EMAILS_SEMILLA = ['juan@correo.cl', 'maria@correo.cl'];

// Usuarios efímeros que dejan las pruebas (además del seed fijo).
const PATRONES_PRUEBA: RegExp[] = [
  /^test_\d+@correo\.cl$/i, // "Registro (201)" del smoke test
  /^demo@correo\.cl$/i, // pruebas manuales (results/pruebas-backend.md)
];

function esObjetivo(email: string, soloSemilla: boolean): boolean {
  const e = email.toLowerCase();
  if (EMAILS_SEMILLA.includes(e)) return true;
  if (soloSemilla) return false;
  return PATRONES_PRUEBA.some((rx) => rx.test(e));
}

async function listarTodos(): Promise<User[]> {
  const todos: User[] = [];
  for (let page = 1; page <= 1000; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers falló: ${error.message}`);
    todos.push(...data.users);
    if (data.users.length < 1000) break; // era la última página
  }
  return todos;
}

async function main(): Promise<void> {
  const soloSemilla = process.argv.includes('--solo-semilla');
  const todos = await listarTodos();
  const objetivo = todos.filter((u) => u.email && esObjetivo(u.email, soloSemilla));

  if (objetivo.length === 0) {
    console.log('No hay usuarios de prueba que eliminar.');
    return;
  }

  console.log(`Se eliminarán ${objetivo.length} usuario(s):`);
  objetivo.forEach((u) => console.log(`  - ${u.email}`));

  for (const u of objetivo) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) console.error(`  ✗ ${u.email}: ${error.message}`);
    else console.log(`  ✓ eliminado: ${u.email}`);
  }
  console.log('Limpieza completada.');
}

main().catch((e) => {
  console.error('Unseed falló:', e instanceof Error ? e.message : e);
  process.exit(1);
});
