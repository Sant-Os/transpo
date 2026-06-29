CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- SCRIPT DE ESTRUCTURA Y MIGRACIÓN LIMPIA DE BASE DE DATOS
-- PROYECTO: SISTEMA MÓVIL DE GESTIÓN SINDICAL DE TRANSPORTE
-- IDIOMA: 100% ESPAÑOL
-- ============================================================

-- 1. ELIMINAR TABLAS EXISTENTES PARA REINICIAR DESDE CERO
DROP TABLE IF EXISTS public.eventos CASCADE;
DROP TABLE IF EXISTS public.alertas CASCADE;
DROP TABLE IF EXISTS public.finanzas CASCADE;
DROP TABLE IF EXISTS public.encomiendas CASCADE;
DROP TABLE IF EXISTS public.boletos CASCADE;
DROP TABLE IF EXISTS public.viajes CASCADE;
DROP TABLE IF EXISTS public.tramos CASCADE;
DROP TABLE IF EXISTS public.rutas CASCADE;
DROP TABLE IF EXISTS public.vehiculos CASCADE;
DROP TABLE IF EXISTS public.mensajes CASCADE;
DROP TABLE IF EXISTS public.cuentas_corporativas CASCADE;
DROP TABLE IF EXISTS public.cajas_diarias CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.oficinas CASCADE;

-- ============================================================
-- 1. OFICINAS
-- ============================================================
CREATE TABLE public.oficinas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USUARIOS (Autenticación personalizada en tabla propia)
-- ============================================================
CREATE TABLE public.usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_usuario TEXT NOT NULL UNIQUE,
  contrasena TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  ci TEXT,
  telefono TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'SECRETARIA', 'CHOFER', 'SOCIO')),
  oficina_id BIGINT REFERENCES public.oficinas(id),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. VEHÍCULOS
-- ============================================================
CREATE TABLE public.vehiculos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT,
  gestion INTEGER,
  capacidad INTEGER NOT NULL DEFAULT 18,
  propietario_id BIGINT REFERENCES public.usuarios(id),
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'MANTENIMIENTO', 'INACTIVO')),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. RUTAS (Tarifario y Precios)
-- ============================================================
CREATE TABLE public.rutas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  precio INTEGER NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TRAMOS O SEGMENTOS (Rutas Intermedias)
-- ============================================================
CREATE TABLE public.tramos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ruta_id BIGINT NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  indice_orden INTEGER NOT NULL,
  precio NUMERIC(10, 2) NOT NULL,
  distancia_km NUMERIC(6, 2),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. VIAJES (Despachos Programados)
-- ============================================================
CREATE TABLE public.viajes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ruta_id BIGINT NOT NULL REFERENCES public.rutas(id),
  vehiculo_id BIGINT NOT NULL REFERENCES public.vehiculos(id),
  chofer_id BIGINT NOT NULL REFERENCES public.usuarios(id),
  oficina_id BIGINT REFERENCES public.oficinas(id),
  fecha_viaje DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_salida TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PROGRAMADO' CHECK (estado IN ('PROGRAMADO', 'ABORDANDO', 'EN_RUTA', 'COMPLETADO', 'CANCELADO')),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. BOLETOS
-- ============================================================
CREATE TABLE public.boletos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viaje_id BIGINT NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
  numero_asiento INTEGER NOT NULL,
  nombre_pasajero TEXT NOT NULL,
  ci_pasajero TEXT NOT NULL,
  ruta_destino_id BIGINT REFERENCES public.rutas(id),
  precio_pagado NUMERIC(10, 2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'OCUPADO' CHECK (estado IN ('RESERVADO', 'OCUPADO', 'CANCELADO')),
  vendido_por BIGINT REFERENCES public.usuarios(id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX unico_asiento_activo ON public.boletos (viaje_id, numero_asiento) WHERE estado IN ('OCUPADO', 'RESERVADO');

-- ============================================================
-- 8. ENCOMIENDAS
-- ============================================================
CREATE TABLE public.encomiendas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viaje_id BIGINT NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
  nombre_remitente TEXT NOT NULL,
  ci_remitente TEXT,
  telefono_remitente TEXT,
  nombre_destinatario TEXT NOT NULL,
  ci_destinatario TEXT,
  telefono_destinatario TEXT,
  descripcion TEXT NOT NULL,
  peso_kg NUMERIC(6, 2) DEFAULT 0,
  precio NUMERIC(10, 2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_RUTA', 'ENTREGADO', 'DEVUELTO')),
  codigo_qr TEXT UNIQUE,
  registrado_por BIGINT REFERENCES public.usuarios(id),
  entregado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. MOVIMIENTOS FINANCIEROS (Gastos e Ingresos)
-- ============================================================
CREATE TABLE public.finanzas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viaje_id BIGINT REFERENCES public.viajes(id) ON DELETE SET NULL,
  vehiculo_id BIGINT REFERENCES public.vehiculos(id) ON DELETE SET NULL,
  usuario_id BIGINT REFERENCES public.usuarios(id),
  concepto TEXT NOT NULL,
  monto NUMERIC(10, 2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO')),
  fecha_finanza DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. ALERTAS E INCIDENTES
-- ============================================================
CREATE TABLE public.alertas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viaje_id BIGINT REFERENCES public.viajes(id) ON DELETE CASCADE,
  chofer_id BIGINT REFERENCES public.usuarios(id),
  vehiculo_id BIGINT REFERENCES public.vehiculos(id),
  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN ('BLOQUEO', 'FALLA_MECANICA', 'ACCIDENTE', 'RETRASO_CLIMA', 'SOS')),
  descripcion TEXT,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  estado TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'EN_PROCESO', 'RESUELTO')),
  resuelto_por BIGINT REFERENCES public.usuarios(id),
  resuelto_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. EVENTOS (Auditoría Sincronizada)
-- ============================================================
CREATE TABLE public.eventos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viaje_id BIGINT REFERENCES public.viajes(id) ON DELETE CASCADE,
  chofer_id BIGINT REFERENCES public.usuarios(id),
  tipo_evento TEXT NOT NULL,
  datos JSONB DEFAULT '{}',
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. MENSAJES (Chat Interno)
-- ============================================================
CREATE TABLE public.mensajes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  canal TEXT NOT NULL CHECK (canal IN ('GENERAL', 'OPERACIONES')),
  remitente_id BIGINT REFERENCES public.usuarios(id),
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. CUENTAS CORPORATIVAS
-- ============================================================
CREATE TABLE public.cuentas_corporativas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_empresa TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. CAJAS DIARIAS
-- ============================================================
CREATE TABLE public.cajas_diarias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  abierta_por BIGINT REFERENCES public.usuarios(id),
  abierta_en TIMESTAMPTZ DEFAULT NOW(),
  cerrada_en TIMESTAMPTZ,
  monto_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monto_final NUMERIC(10, 2) DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'CERRADO'))
);

-- ============================================================
-- 15. FUNCIÓN DE AUTENTICACIÓN SEGURA (Verificación con Bcrypt)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verificar_usuario(p_nombre_usuario TEXT, p_contrasena TEXT)
RETURNS SETOF public.usuarios AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.usuarios
  WHERE nombre_usuario = p_nombre_usuario
    AND contrasena = crypt(p_contrasena, contrasena)
    AND activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. TRIGGER PARA ENCRIPTAR AUTOMÁTICAMENTE LA CONTRASEÑA CON BCRYPT
CREATE OR REPLACE FUNCTION public.hashear_contrasena_usuario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contrasena IS NOT NULL AND NEW.contrasena NOT LIKE '$2a$%' AND NEW.contrasena NOT LIKE '$2b$%' AND NEW.contrasena NOT LIKE '$2y$%' THEN
    NEW.contrasena := crypt(NEW.contrasena, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER disparador_hashear_contrasena_usuario
BEFORE INSERT OR UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.hashear_contrasena_usuario();

-- ============================================================
-- DESHABILITAR RLS PARA SIMPLIFICAR ACCESOS DE API ANON
-- ============================================================
ALTER TABLE public.oficinas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tramos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viajes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encomiendas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_corporativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas_diarias     ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura permisivas globales para el prototipo
CREATE POLICY "Allow all for anon" ON public.oficinas  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.usuarios    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.vehiculos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.rutas   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.tramos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.viajes    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.boletos  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.encomiendas  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.finanzas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.alertas   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.eventos   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.mensajes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.cuentas_corporativas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.cajas_diarias     FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- DATOS INICIALES ESTRICTOS (Únicamente Oficinas, Admin y Catálogos Base)
-- ============================================================

-- 1. Registrar Oficinas Base
INSERT INTO public.oficinas (nombre, ciudad, direccion, telefono) VALUES
  ('Oficina Central Uyuni', 'Uyuni', 'Av. Ferroviaria #123', '2-693-1234'),
  ('Oficina San Cristóbal', 'San Cristóbal', 'Calle Principal s/n', '2-693-5678');

-- 2. Registrar ÚNICO Administrador Inicial (admin / admin encriptado de antemano)
INSERT INTO public.usuarios (nombre_usuario, contrasena, nombre_completo, ci, telefono, rol, oficina_id) VALUES
  ('admin', crypt('admin', gen_salt('bf')), 'Administrador Sindicato', '12345678', '71234567', 'ADMINISTRADOR', 1);

-- 3. Registrar Cuentas Corporativas Iniciales
INSERT INTO public.cuentas_corporativas (nombre_empresa) VALUES
  ('Minera San Cristóbal'),
  ('Empresa Metalúrgica Uyuni'),
  ('Cooperativa Turística Potosí');

-- 4. Registrar Tarifas y Precios Predefinidos de Rutas e Intermedios
INSERT INTO public.rutas (nombre, origen, destino, precio) VALUES
  ('Uyuni - Ramaditas', 'Uyuni', 'Ramaditas', 10),
  ('Uyuni - Vila Vila', 'Uyuni', 'Vila Vila', 20),
  ('Uyuni - San Cristóbal', 'Uyuni', 'San Cristóbal', 35),
  ('Uyuni - Culpina', 'Uyuni', 'Culpina', 45),
  ('Uyuni - Otro', 'Uyuni', 'Otro', 100),
  ('San Cristóbal - Vila Vila', 'San Cristóbal', 'Vila Vila', 15),
  ('San Cristóbal - Ramaditas', 'San Cristóbal', 'Ramaditas', 25),
  ('San Cristóbal - Uyuni', 'San Cristóbal', 'Uyuni', 35),
  ('San Cristóbal - Otro', 'San Cristóbal', 'Otro', 100),
  ('Vila Vila - Uyuni', 'Vila Vila', 'Uyuni', 20),
  ('Vila Vila - San Cristóbal', 'Vila Vila', 'San Cristóbal', 15),
  ('Ramaditas - Uyuni', 'Ramaditas', 'Uyuni', 10),
  ('Ramaditas - San Cristóbal', 'Ramaditas', 'San Cristóbal', 25);

-- 5. Registrar Tramos Base (Para compatibilidad estructural)
INSERT INTO public.tramos (ruta_id, origen, destino, indice_orden, precio, distancia_km) VALUES
  (3, 'Uyuni', 'San Cristóbal', 1, 35.00, 135);

-- ============================================================
-- HABILITAR TIEMPO REAL (Supabase Realtime)
-- ============================================================
alter publication supabase_realtime add table public.mensajes;
alter publication supabase_realtime add table public.boletos;
alter publication supabase_realtime add table public.viajes;
alter publication supabase_realtime add table public.alertas;

-- ============================================================
-- CONCEDER PERMISOS A ROLES DE SUPABASE (Evita permission denied)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

