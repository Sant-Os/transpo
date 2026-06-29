-- ============================================================
-- SCRIPT DE ESTRUCTURA Y MIGRACIÓN LIMPIA DE BASE DE DATOS
-- PROYECTO: SISTEMA MÓVIL DE GESTIÓN SINDICAL DE TRANSPORTE
-- ============================================================

-- 1. ELIMINAR TABLAS EXISTENTES PARA REINICIAR (En orden inverso de dependencias)
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.finances CASCADE;
DROP TABLE IF EXISTS public.parcels CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.segments CASCADE;
DROP TABLE IF EXISTS public.routes CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.corporate_accounts CASCADE;
DROP TABLE IF EXISTS public.cash_registers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.offices CASCADE;

-- 2. CREACIÓN DE ESTRUCTURAS RELACIONALES DE LA BASE DE DATOS

-- ============================================================
-- 1. OFICINAS
-- ============================================================
CREATE TABLE public.offices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USUARIOS (Custom Auth por Tabla)
-- ============================================================
CREATE TABLE public.users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  ci TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SECRETARY', 'DRIVER', 'SOCIO')),
  office_id BIGINT REFERENCES public.offices(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. VEHÍCULOS
-- ============================================================
CREATE TABLE public.vehicles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  model TEXT,
  year INTEGER,
  capacity INTEGER NOT NULL DEFAULT 18,
  owner_id BIGINT REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. RUTAS
-- ============================================================
CREATE TABLE public.routes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TRAMOS O SEGMENTOS (Rutas Intermedias)
-- ============================================================
CREATE TABLE public.segments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_id BIGINT NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  distance_km NUMERIC(6, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. VIAJES (Despachos Programados)
-- ============================================================
CREATE TABLE public.trips (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_id BIGINT NOT NULL REFERENCES public.routes(id),
  vehicle_id BIGINT NOT NULL REFERENCES public.vehicles(id),
  driver_id BIGINT NOT NULL REFERENCES public.users(id),
  office_id BIGINT REFERENCES public.offices(id),
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  departure_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'BOARDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. BOLETOS
-- ============================================================
CREATE TABLE public.tickets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_ci TEXT NOT NULL,
  origin_segment_id BIGINT REFERENCES public.segments(id),
  dest_segment_id BIGINT REFERENCES public.segments(id),
  price_paid NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'CANCELLED')),
  sold_by BIGINT REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. ENCOMIENDAS (Parcels)
-- ============================================================
CREATE TABLE public.parcels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_ci TEXT,
  sender_phone TEXT,
  receiver_name TEXT NOT NULL,
  receiver_ci TEXT,
  receiver_phone TEXT,
  description TEXT NOT NULL,
  weight_kg NUMERIC(6, 2) DEFAULT 0,
  price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED')),
  qr_code TEXT UNIQUE,
  registered_by BIGINT REFERENCES public.users(id),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. MOVIMIENTOS FINANCIEROS (Gastos y Utilidades)
-- ============================================================
CREATE TABLE public.finances (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id BIGINT REFERENCES public.trips(id) ON DELETE SET NULL,
  vehicle_id BIGINT REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES public.users(id),
  concept TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  finance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. ALERTAS E INCIDENTES
-- ============================================================
CREATE TABLE public.alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id BIGINT REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id BIGINT REFERENCES public.users(id),
  vehicle_id BIGINT REFERENCES public.vehicles(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('ROAD_BLOCK', 'MECHANICAL_FAIL', 'ACCIDENT', 'WEATHER_DELAY', 'SOS')),
  description TEXT,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MANAGING', 'RESOLVED')),
  resolved_by BIGINT REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. EVENTOS (Auditoría Sincronizada / Event Sourcing)
-- ============================================================
CREATE TABLE public.events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id BIGINT REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id BIGINT REFERENCES public.users(id),
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. MENSAJES (Chat Interno - Simulación MongoDB)
-- ============================================================
CREATE TABLE public.messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('GENERAL', 'OPERATIONS')),
  sender_id BIGINT REFERENCES public.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. CUENTAS CORPORATIVAS (Convenios de empresas)
-- ============================================================
CREATE TABLE public.corporate_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. CAJAS DIARIAS (Apertura y Cierre de Caja)
-- ============================================================
CREATE TABLE public.cash_registers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  opened_by BIGINT REFERENCES public.users(id),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  initial_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED'))
);

-- ============================================================
-- DESHABILITAR RLS PARA SIMPLIFICAR ACCESOS DE API ANON
-- ============================================================
ALTER TABLE public.offices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers     ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura permisivas globales para el prototipo
CREATE POLICY "Allow all for anon" ON public.offices  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.users    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.vehicles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.routes   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.segments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.trips    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.tickets  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.parcels  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.finances FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.alerts   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.events   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.corporate_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.cash_registers     FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- DATOS INICIALES ESTRICTOS (Únicamente Oficinas, Admin y Catálogos Base)
-- ============================================================

-- 1. Registrar Oficinas Base
INSERT INTO public.offices (name, city, address, phone) VALUES
  ('Oficina Central Uyuni', 'Uyuni', 'Av. Ferroviaria #123', '2-693-1234'),
  ('Oficina San Cristóbal', 'San Cristóbal', 'Calle Principal s/n', '2-693-5678');

-- 2. Registrar ÚNICO Administrador Inicial (admin / admin)
INSERT INTO public.users (username, password, full_name, ci, phone, role, office_id) VALUES
  ('admin', 'admin', 'Administrador Sindicato', '12345678', '71234567', 'ADMIN', 1);

-- 3. Registrar Cuentas Corporativas Iniciales para Convenios
INSERT INTO public.corporate_accounts (company_name) VALUES
  ('Minera San Cristóbal'),
  ('Empresa Metalúrgica Uyuni'),
  ('Cooperativa Turística Potosí');

-- 4. Registrar Ruta Base e Ida Completa con Extensión Culpina
INSERT INTO public.routes (name, origin, destination, estimated_minutes) VALUES
  ('Uyuni - San Cristóbal (Ida)', 'Uyuni', 'San Cristóbal', 180);

INSERT INTO public.segments (route_id, origin, destination, order_index, price, distance_km) VALUES
  (1, 'Uyuni', 'Ramaditas', 1, 10.00, 45),
  (1, 'Ramaditas', 'Vila Vila', 2, 20.00, 60),
  (1, 'Vila Vila', 'San Cristóbal', 3, 35.00, 75),
  (1, 'San Cristóbal', 'Culpina', 4, 45.00, 110);

-- ============================================================
-- HABILITAR TIEMPO REAL (Supabase Realtime / WebSockets)
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.alerts;

-- ============================================================
-- FIN DEL SCRIPT LIMPIO DE PRODUCCIÓN
-- ============================================================
