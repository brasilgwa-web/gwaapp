-- ================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - STAGING
-- Execute este script no SQL Editor do Supabase Staging
-- ================================================

-- 1. HABILITAR EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CRIAR SEQUENCES
CREATE SEQUENCE IF NOT EXISTS clients_display_order_seq;
CREATE SEQUENCE IF NOT EXISTS locations_display_order_seq;
CREATE SEQUENCE IF NOT EXISTS observation_templates_display_order_seq;

-- ================================================
-- 3. TABELAS SEM DEPENDÊNCIAS (Base)
-- ================================================

CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ai_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  unit text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  min_stock numeric DEFAULT 0,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE TABLE public.analysis_groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analysis_groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.report_sequences (
  year_month text NOT NULL,
  current_count integer DEFAULT 0,
  CONSTRAINT report_sequences_pkey PRIMARY KEY (year_month)
);

CREATE TABLE public.report_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  initial_report_number integer DEFAULT 1,
  current_report_number integer DEFAULT 1,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  highest_emitted_number integer DEFAULT 0,
  footer_text text,
  email_subject_default text DEFAULT 'Relatório de Visita Técnica - {client_name} - {date}'::text,
  email_body_default text,
  cover_enabled boolean DEFAULT true,
  cover_title text DEFAULT 'Relatório de Ensaio Analítico'::text,
  cover_subtitle text DEFAULT 'Prezado Cliente'::text,
  cover_text text DEFAULT 'Segue relatórios de ensaios analíticos para controle de processo referente aos serviços contratados.'::text,
  cover_footer_text text DEFAULT 'Atendimento ao Cliente - Para esclarecimentos de suas dúvidas: Fones: (011) 9.8348.9922 (011) 9.8331.7957 - E-mail: atendimento@wgabrasil.com.br'::text,
  cover_signature_name text DEFAULT 'Adriano Carlos Gava'::text,
  cover_signature_role text DEFAULT 'Gestor - Laboratório de Aguas e Processos de Tratamento'::text,
  cover_background_color text DEFAULT '#1e40af'::text,
  cover_content text,
  cover_style_config jsonb,
  cover_image_url text,
  logo2_url text,
  CONSTRAINT report_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.observation_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  display_order integer NOT NULL DEFAULT nextval('observation_templates_display_order_seq'::regclass),
  CONSTRAINT observation_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE public.technical_responsibles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  crq text NOT NULL,
  signature_url text,
  active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT technical_responsibles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.equipments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  is_sample boolean DEFAULT false,
  created_by_id uuid,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  display_order integer,
  CONSTRAINT equipments_pkey PRIMARY KEY (id),
  CONSTRAINT equipments_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);

CREATE TABLE public.test_definitions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  unit text,
  min_value numeric,
  max_value numeric,
  observation text,
  is_sample boolean DEFAULT false,
  created_by_id uuid,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  tolerance_percent numeric DEFAULT 10,
  dilution_factor numeric DEFAULT 1,
  ld text,
  lq text,
  method_uncertainty text,
  methodology text,
  display_order integer,
  CONSTRAINT test_definitions_pkey PRIMARY KEY (id),
  CONSTRAINT test_definitions_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);

-- ================================================
-- 4. TABELAS COM DEPENDÊNCIAS DE NÍVEL 1
-- ================================================

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  role text DEFAULT 'user'::text,
  status text DEFAULT 'inactive'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  signature_url text,
  role_id uuid,
  is_deleted boolean DEFAULT false,
  crq text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);

CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_id uuid,
  route_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  cnpj text,
  address text,
  city_state text,
  contact_name text,
  email text,
  logo_url text,
  is_sample boolean DEFAULT false,
  created_by_id uuid,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  google_drive_folder_id text,
  client_code text,
  default_discharges_drainages text,
  phone character varying,
  display_order integer NOT NULL DEFAULT nextval('clients_display_order_seq'::regclass),
  state text,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);

CREATE TABLE public.equipment_tests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  equipment_id uuid NOT NULL,
  test_definition_id uuid NOT NULL,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by_id uuid,
  created_by text,
  is_sample boolean DEFAULT false,
  min_value numeric,
  max_value numeric,
  unit text,
  CONSTRAINT equipment_tests_pkey PRIMARY KEY (id),
  CONSTRAINT equipment_tests_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipments(id),
  CONSTRAINT equipment_tests_test_definition_id_fkey FOREIGN KEY (test_definition_id) REFERENCES public.test_definitions(id),
  CONSTRAINT equipment_tests_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);

CREATE TABLE public.analysis_group_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid,
  test_definition_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analysis_group_items_pkey PRIMARY KEY (id),
  CONSTRAINT analysis_group_items_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.analysis_groups(id),
  CONSTRAINT analysis_group_items_test_definition_id_fkey FOREIGN KEY (test_definition_id) REFERENCES public.test_definitions(id)
);

CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  level text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  details jsonb,
  user_id uuid,
  CONSTRAINT system_logs_pkey PRIMARY KEY (id),
  CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ================================================
-- 5. TABELAS COM DEPENDÊNCIAS DE NÍVEL 2
-- ================================================

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_sample boolean DEFAULT false,
  created_by_id uuid,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  default_discharges_drainages text,
  display_order integer NOT NULL DEFAULT nextval('locations_display_order_seq'::regclass),
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT locations_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);

CREATE TABLE public.client_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  product_id uuid,
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT client_products_pkey PRIMARY KEY (id),
  CONSTRAINT client_products_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ================================================
-- 6. TABELAS COM DEPENDÊNCIAS DE NÍVEL 3
-- ================================================

CREATE TABLE public.location_equipments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  location_id uuid NOT NULL,
  equipment_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  default_analysis_group_id uuid,
  CONSTRAINT location_equipments_pkey PRIMARY KEY (id),
  CONSTRAINT location_equipments_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT location_equipments_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipments(id),
  CONSTRAINT location_equipments_default_analysis_group_id_fkey FOREIGN KEY (default_analysis_group_id) REFERENCES public.analysis_groups(id)
);

CREATE TABLE public.dosage_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  location_id uuid,
  product_id uuid,
  current_stock_qty numeric,
  dosage_target text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dosage_plans_pkey PRIMARY KEY (id),
  CONSTRAINT dosage_plans_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT dosage_plans_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.visits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  location_id uuid,
  technician_email text,
  visit_date timestamp with time zone NOT NULL,
  status text DEFAULT 'scheduled'::text,
  observations text,
  ai_generated_analysis text,
  client_signature_url text,
  client_signature_name text,
  is_sample boolean DEFAULT false,
  created_by_id uuid,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  service_start_time timestamp with time zone,
  service_end_time timestamp with time zone,
  discharges_drainages text,
  report_number text,
  general_observations text,
  stock_deducted_at timestamp with time zone,
  arrival_time text,
  departure_time text,
  client_absent boolean DEFAULT false,
  technical_responsible_id uuid,
  CONSTRAINT visits_pkey PRIMARY KEY (id),
  CONSTRAINT visits_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT visits_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT visits_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id),
  CONSTRAINT visits_technical_responsible_id_fkey FOREIGN KEY (technical_responsible_id) REFERENCES public.technical_responsibles(id)
);

-- ================================================
-- 7. TABELAS COM DEPENDÊNCIAS DE NÍVEL 4
-- ================================================

CREATE TABLE public.equipment_dosage_params (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  location_equipment_id uuid,
  product_id uuid,
  recommended_dosage numeric,
  dosage_unit text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  complementary_info text,
  CONSTRAINT equipment_dosage_params_pkey PRIMARY KEY (id),
  CONSTRAINT equipment_dosage_params_location_equipment_id_fkey FOREIGN KEY (location_equipment_id) REFERENCES public.location_equipments(id),
  CONSTRAINT equipment_dosage_params_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.test_results (
  visit_id uuid NOT NULL,
  equipment_id uuid NOT NULL,
  test_definition_id uuid NOT NULL,
  measured_value numeric,
  status_light text,
  created_by_id uuid,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT test_results_pkey PRIMARY KEY (visit_id, equipment_id, test_definition_id),
  CONSTRAINT test_results_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id),
  CONSTRAINT test_results_test_definition_id_fkey FOREIGN KEY (test_definition_id) REFERENCES public.test_definitions(id),
  CONSTRAINT test_results_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id),
  CONSTRAINT test_results_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.location_equipments(id)
);

CREATE TABLE public.visit_dosages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  visit_id uuid,
  location_equipment_id uuid,
  product_id uuid,
  current_stock numeric,
  dosage_applied numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT visit_dosages_pkey PRIMARY KEY (id),
  CONSTRAINT visit_dosages_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id),
  CONSTRAINT visit_dosages_location_equipment_id_fkey FOREIGN KEY (location_equipment_id) REFERENCES public.location_equipments(id),
  CONSTRAINT visit_dosages_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.visit_equipment_samples (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  visit_id uuid,
  location_equipment_id uuid,
  collection_time time without time zone,
  complementary_info text,
  analysis_group_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT visit_equipment_samples_pkey PRIMARY KEY (id),
  CONSTRAINT visit_equipment_samples_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id),
  CONSTRAINT visit_equipment_samples_location_equipment_id_fkey FOREIGN KEY (location_equipment_id) REFERENCES public.location_equipments(id),
  CONSTRAINT visit_equipment_samples_analysis_group_id_fkey FOREIGN KEY (analysis_group_id) REFERENCES public.analysis_groups(id)
);

CREATE TABLE public.visit_photos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  visit_id uuid NOT NULL,
  photo_url text NOT NULL,
  description text,
  is_sample boolean DEFAULT false,
  created_by_id uuid,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT visit_photos_pkey PRIMARY KEY (id),
  CONSTRAINT visit_photos_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id),
  CONSTRAINT visit_photos_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);

-- ================================================
-- 8. INSERIR DADOS INICIAIS
-- ================================================

-- Inserir roles básicas
INSERT INTO public.roles (name, description, is_system) VALUES
('admin', 'Administrador do sistema', true),
('user', 'Usuário padrão', true),
('tecnico', 'Técnico de campo', false);

-- Inserir configurações de relatório padrão
INSERT INTO public.report_settings (id) VALUES (uuid_generate_v4());

-- ================================================
-- FIM DO SCRIPT
-- ================================================
