-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Already exists from previous step, handling checks carefully)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user',
  status text default 'inactive',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  signature_url text
);
alter table public.profiles enable row level security;

-- Policies for Profiles (Drop first to avoid "already exists" error)
drop policy if exists "Public read profiles" on profiles;
create policy "Public read profiles" on profiles for select using (true);

  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (
  auth.uid() = id
);

-- Trigger to handle new user creation
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- TEAR DOWN (DROP) OLD TABLES TO ENSURE NEW SCHEMA (Column Renames) APPLIES
-- WARNING: This deletes data in these tables.
-- -----------------------------------------------------------------------------
drop table if exists public.test_results cascade;
drop table if exists public.visit_photos cascade;
drop table if exists public.visits cascade;
drop table if exists public.equipment_tests cascade;
drop table if exists public.location_equipments cascade;
drop table if exists public.test_definitions cascade;
drop table if exists public.equipment_tests cascade; -- duplicate check
drop table if exists public.equipments cascade;
drop table if exists public.locations cascade;
drop table if exists public.clients cascade;

-- -----------------------------------------------------------------------------
-- 2. CLIENTS
-- -----------------------------------------------------------------------------
create table public.clients (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    cnpj text,
    address text,
    city_state text,
    contact_name text,
    email text,
    logo_url text, 
    is_sample boolean default false, 
    created_by_id uuid references auth.users(id), 
    created_by text, 
    created_date timestamp with time zone default timezone('utc'::text, now()) not null, 
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null 
);
alter table public.clients enable row level security;
drop policy if exists "Enable all access for authenticated users" on clients;
create policy "Enable all access for authenticated users" on clients for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 3. LOCATIONS
-- -----------------------------------------------------------------------------
create table public.locations (
    id uuid default uuid_generate_v4() primary key,
    client_id uuid references public.clients(id) on delete cascade not null,
    name text not null,
    description text,
    is_sample boolean default false, 
    created_by_id uuid references auth.users(id), 
    created_by text, 
    created_date timestamp with time zone default timezone('utc'::text, now()) not null, 
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null 
);
alter table public.locations enable row level security;
drop policy if exists "Enable all access for authenticated users" on locations;
create policy "Enable all access for authenticated users" on locations for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 4. EQUIPMENTS (Catalog)
-- -----------------------------------------------------------------------------
create table public.equipments (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    is_sample boolean default false, 
    created_by_id uuid references auth.users(id), 
    created_by text, 
    created_date timestamp with time zone default timezone('utc'::text, now()) not null, 
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null 
);
alter table public.equipments enable row level security;
drop policy if exists "Enable all access for authenticated users" on equipments;
create policy "Enable all access for authenticated users" on equipments for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 5. TEST DEFINITIONS (Catalog)
-- -----------------------------------------------------------------------------
create table public.test_definitions (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    unit text,
    min_value numeric,
    max_value numeric,
    observation text, 
    is_sample boolean default false,
    created_by_id uuid references auth.users(id),
    created_by text,
    created_date timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null,
    tolerance_percent numeric default 10 
);
alter table public.test_definitions enable row level security;
drop policy if exists "Enable all access for authenticated users" on test_definitions;
create policy "Enable all access for authenticated users" on test_definitions for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 6. LOCATION EQUIPMENTS (Linking table)
-- -----------------------------------------------------------------------------
create table public.location_equipments (
    id uuid default uuid_generate_v4() primary key,
    location_id uuid references public.locations(id) on delete cascade not null,
    equipment_id uuid references public.equipments(id) on delete cascade not null,
    created_date timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.location_equipments enable row level security;
drop policy if exists "Enable all access for authenticated users" on location_equipments;
create policy "Enable all access for authenticated users" on location_equipments for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 7. EQUIPMENT TESTS
-- -----------------------------------------------------------------------------
create table public.equipment_tests (
    id uuid default uuid_generate_v4() primary key,
    equipment_id uuid references public.equipments(id) on delete cascade not null,
    test_definition_id uuid references public.test_definitions(id) on delete cascade not null,
    created_date timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by_id uuid references auth.users(id),
    created_by text,
    is_sample boolean default false
);
alter table public.equipment_tests enable row level security;
drop policy if exists "Enable all access for authenticated users" on equipment_tests;
create policy "Enable all access for authenticated users" on equipment_tests for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 8. VISITS
-- -----------------------------------------------------------------------------
create table public.visits (
    id uuid default uuid_generate_v4() primary key,
    client_id uuid references public.clients(id) on delete cascade not null,
    location_id uuid references public.locations(id) on delete cascade,
    technician_email text,
    visit_date timestamp with time zone not null,
    status text default 'scheduled',
    observations text,
    ai_generated_analysis text,
    client_signature_url text,
    client_signature_name text,
    is_sample boolean default false,
    created_by_id uuid references auth.users(id),
    created_by text,
    created_date timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.visits enable row level security;
drop policy if exists "Enable all access for authenticated users" on visits;
create policy "Enable all access for authenticated users" on visits for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 9. VISIT PHOTOS
-- -----------------------------------------------------------------------------
create table public.visit_photos (
    id uuid default uuid_generate_v4() primary key,
    visit_id uuid references public.visits(id) on delete cascade not null,
    photo_url text not null,
    description text,
    is_sample boolean default false,
    created_by_id uuid references auth.users(id),
    created_by text,
    created_date timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.visit_photos enable row level security;
drop policy if exists "Enable all access for authenticated users" on visit_photos;
create policy "Enable all access for authenticated users" on visit_photos for all using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 10. TEST RESULTS
-- -----------------------------------------------------------------------------
create table public.test_results (
    id uuid default uuid_generate_v4() primary key,
    visit_id uuid references public.visits(id) on delete cascade not null,
    equipment_id uuid references public.location_equipments(id) on delete cascade, 
    test_definition_id uuid references public.test_definitions(id) on delete cascade not null,
    measured_value numeric,
    status_light text, 
    is_sample boolean default false,
    created_by_id uuid references auth.users(id),
    created_by text,
    created_date timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_date timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.test_results enable row level security;
drop policy if exists "Enable all access for authenticated users" on test_results;
create policy "Enable all access for authenticated users" on test_results for all using (auth.role() = 'authenticated');
