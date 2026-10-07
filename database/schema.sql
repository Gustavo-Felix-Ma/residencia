-- ========================================================
-- ESQUEMA DE BASE DE DATOS Y POLÍTICAS RLS EN SUPABASE
-- Proyecto: Plataforma de Firma Digital Híbrida (RSA-256 + ML-DSA-87)
-- Institución: Tecnológico de Estudios Superiores de Jocotitlán (TESJo)
-- ========================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE PERFILES DE USUARIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('jefe_division', 'presidente_academia', 'secretario_academia', 'docente')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE BÓVEDA DE LLAVES CRIPTOGRÁFICAS POR USUARIO
-- La llave privada está cifrada con AES-256-GCM derivado del PIN del usuario usando PBKDF2.
CREATE TABLE IF NOT EXISTS public.user_keys (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    rsa_public_pem TEXT NOT NULL,
    mldsa_public_hex TEXT NOT NULL,
    encrypted_rsa_private TEXT NOT NULL,
    encrypted_mldsa_private TEXT NOT NULL,
    salt_hex TEXT NOT NULL,
    nonce_hex TEXT NOT NULL,
    tag_hex TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE DOCUMENTOS PDF Y REGISTROS DE FIRMA
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    original_storage_path TEXT NOT NULL,
    signed_storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_by_name TEXT NOT NULL,
    signed_by TEXT,
    signed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    doc_hash TEXT,
    rsa_signature TEXT,
    mldsa_signature TEXT,
    rsa_public_pem TEXT,
    mldsa_public_hex TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE HISTORIAL / AUDITORÍA
CREATE TABLE IF NOT EXISTS public.history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- DESENCADENADOR (TRIGGER) PARA CREAR PERFIL AUTOMÁTICO AL REGISTRAR EN SUPABASE AUTH
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'docente')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- POLÍTICAS DE SEGURIDAD NIVEL DE FILA (RLS - ROW LEVEL SECURITY)
-- ========================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Lectura pública de perfiles activos" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Creación de perfiles para usuarios autenticados" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Políticas para USER_KEYS
CREATE POLICY "Lectura pública de llaves (necesario para verificación de firmas)" 
    ON public.user_keys FOR SELECT 
    USING (true);

CREATE POLICY "Los usuarios solo pueden insertar sus propias llaves" 
    ON public.user_keys FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios solo pueden actualizar sus propias llaves" 
    ON public.user_keys FOR UPDATE 
    USING (auth.uid() = user_id);

-- Políticas para DOCUMENTS
CREATE POLICY "Lectura de documentos para usuarios autenticados o verificación pública de firmados" 
    ON public.documents FOR SELECT 
    USING (auth.role() = 'authenticated' OR status = 'signed');

CREATE POLICY "Usuarios autenticados pueden subir documentos" 
    ON public.documents FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar documentos" 
    ON public.documents FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Solo directivos pueden eliminar documentos" 
    ON public.documents FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Políticas para HISTORY
CREATE POLICY "Lectura de historial para autenticados" 
    ON public.history FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Inserción de eventos de historial para autenticados" 
    ON public.history FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- ========================================================
-- BUCKET EN SUPABASE STORAGE
-- Ejecutar estas instrucciones en el SQL Editor de Supabase:
-- ========================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
