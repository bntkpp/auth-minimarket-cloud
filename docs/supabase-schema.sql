-- ===========================================================================
-- Identity Service (G2) - Esquema de datos en Supabase / PostgreSQL
-- ---------------------------------------------------------------------------
-- Supabase Auth ya gestiona la tabla `auth.users` (credenciales, email,
-- email_confirmed_at, tokens). G2 sólo añade el PERFIL DE NEGOCIO en
-- `public.profiles`, en relación 1:1 con `auth.users.id`.
-- ===========================================================================

-- Tipos enumerados (alineados con los enums Role y Status del contrato).
do $$ begin
  create type public.user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;

-- Secuencia para generar el business_user_id legible (USR-01, USR-02, ...).
create sequence if not exists public.business_user_seq start 1;

-- Tabla de perfiles (1:1 con auth.users).
create table if not exists public.profiles (
  -- UUID nativo de Supabase Auth (claim `sub` del JWT). Clave e identidad interna.
  user_id          uuid primary key references auth.users (id) on delete cascade,

  -- Identificador de negocio legible que usan G4 (Carro), G5 (Pedidos) y G9
  -- (Notificaciones). G2 es dueño y mantiene la relación 1:1.
  business_user_id text unique
                   default ('USR-' || lpad(nextval('public.business_user_seq')::text, 2, '0')),

  email            text not null unique,
  full_name        text not null,
  role             public.user_role   not null default 'customer',
  status           public.user_status not null default 'active',
  email_verified   boolean            not null default false,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Índices de apoyo para los filtros de GET /users (role, status).
create index if not exists profiles_role_idx   on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

-- Mantiene updated_at al día en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea automáticamente el perfil al registrarse un usuario en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, email, full_name, email_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    (new.email_confirmed_at is not null)
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (recomendado). El backend usa la service_role key (que
-- omite RLS), pero estas políticas protegen si se accede con la anon key.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Cada usuario puede ver y editar su propio perfil.
create policy "own profile - select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "own profile - update" on public.profiles
  for update using (auth.uid() = user_id);

-- Los admin pueden ver todos los perfiles.
create policy "admin - select all" on public.profiles
  for select using (
    exists (select 1 from public.profiles p
            where p.user_id = auth.uid() and p.role = 'admin')
  );
