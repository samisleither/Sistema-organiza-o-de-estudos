-- ==============================================================================
-- ATLAS - SCHEMA DE BANCO DE DADOS (PostgreSQL / Supabase)
-- Suporte completo aos Requisitos Funcionais RF01 a RF14 e RNF01 a RNF06
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE dificuldade_materia AS ENUM ('facil', 'medio', 'dificil');
CREATE TYPE status_topico AS ENUM ('pendente', 'em_progresso', 'concluido');
CREATE TYPE status_sessao AS ENUM ('pendente', 'feita', 'nao_feita');
CREATE TYPE status_revisao AS ENUM ('pendente', 'concluida');
CREATE TYPE tipo_usuario AS ENUM ('estudante', 'administrador');

-- 3. TABELA: usuarios
-- Integra com Supabase Auth (auth.users), armazenando dados de perfil e plano
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    tipo tipo_usuario DEFAULT 'estudante' NOT NULL,
    data_prova DATE,
    horas_por_dia JSONB DEFAULT '{"seg": 2, "ter": 2, "qua": 2, "qui": 2, "sex": 2, "sab": 4, "dom": 0}'::jsonb NOT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABELA: materias (RF04, RF13)
CREATE TABLE IF NOT EXISTS public.materias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    dificuldade dificuldade_materia NOT NULL DEFAULT 'medio',
    cor_identificadora TEXT DEFAULT '#3B82F6', -- Hexadecimal para personalização visual
    criado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABELA: topicos (RF05, RF13)
CREATE TABLE IF NOT EXISTS public.topicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ordem INT DEFAULT 0 NOT NULL,
    status status_topico DEFAULT 'pendente' NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABELA: sessao_estudo (RF07, RF08, RF09, RF10, RF12)
CREATE TABLE IF NOT EXISTS public.sessao_estudo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    topico_id UUID NOT NULL REFERENCES public.topicos(id) ON DELETE CASCADE,
    data_planejada DATE NOT NULL,
    data_realizada TIMESTAMPTZ,
    status status_sessao DEFAULT 'pendente' NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. TABELA: revisao (RF11)
CREATE TABLE IF NOT EXISTS public.revisao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    topico_id UUID NOT NULL REFERENCES public.topicos(id) ON DELETE CASCADE,
    intervalo_dias INT NOT NULL CHECK (intervalo_dias IN (1, 3, 7, 15)),
    data_agendada DATE NOT NULL,
    data_conclusao TIMESTAMPTZ,
    status status_revisao DEFAULT 'pendente' NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    atualizado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE (Para consultas instantâneas < 1s, RNF04)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_materias_usuario ON public.materias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_topicos_materia ON public.topicos(materia_id);
CREATE INDEX IF NOT EXISTS idx_topicos_usuario ON public.topicos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessao_estudo_data ON public.sessao_estudo(usuario_id, data_planejada, status);
CREATE INDEX IF NOT EXISTS idx_revisao_data ON public.revisao(usuario_id, data_agendada, status);

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (Row Level Security - RLS) (RNF03)
-- Cada usuário só acessa e altera seus próprios dados
-- ==============================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao_estudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisao ENABLE ROW LEVEL SECURITY;

-- Regras para 'usuarios'
CREATE POLICY "Usuário pode visualizar seu próprio perfil"
    ON public.usuarios FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuário pode atualizar seu próprio perfil"
    ON public.usuarios FOR UPDATE
    USING (auth.uid() = id);

-- Regras para 'materias'
CREATE POLICY "Usuário acessa apenas suas matérias"
    ON public.materias FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Regras para 'topicos'
CREATE POLICY "Usuário acessa apenas seus tópicos"
    ON public.topicos FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Regras para 'sessao_estudo'
CREATE POLICY "Usuário acessa apenas suas sessões"
    ON public.sessao_estudo FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Regras para 'revisao'
CREATE POLICY "Usuário acessa apenas suas revisões"
    ON public.revisao FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- ==============================================================================
-- TRIGGERS E AUTOMAÇÃO
-- ==============================================================================

-- Trigger para criar perfil de usuário automaticamente após cadastro no Auth (RF01)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, nome, email, tipo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
        NEW.email,
        'estudante'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para agendamento automático de revisões espaçadas 1, 3, 7 e 15 dias (RF11)
CREATE OR REPLACE FUNCTION public.handle_sessao_concluida()
RETURNS TRIGGER AS $$
DECLARE
    data_base DATE;
BEGIN
    -- Dispara apenas quando a sessão é marcada como 'feita'
    IF NEW.status = 'feita' AND (OLD.status IS NULL OR OLD.status != 'feita') THEN
        data_base := CURRENT_DATE;
        
        -- Atualiza data de realização se ainda não estiver preenchida
        IF NEW.data_realizada IS NULL THEN
            NEW.data_realizada := NOW();
        END IF;

        -- Atualiza o tópico relacionado para 'concluido'
        UPDATE public.topicos 
        SET status = 'concluido', atualizado_em = NOW()
        WHERE id = NEW.topico_id;

        -- Insere as 4 revisões espaçadas (D+1, D+3, D+7, D+15)
        INSERT INTO public.revisao (usuario_id, topico_id, intervalo_dias, data_agendada, status)
        VALUES
            (NEW.usuario_id, NEW.topico_id, 1,  data_base + INTERVAL '1 day',  'pendente'),
            (NEW.usuario_id, NEW.topico_id, 3,  data_base + INTERVAL '3 days', 'pendente'),
            (NEW.usuario_id, NEW.topico_id, 7,  data_base + INTERVAL '7 days', 'pendente'),
            (NEW.usuario_id, NEW.topico_id, 15, data_base + INTERVAL '15 days', 'pendente');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sessao_estudo_concluida
    BEFORE UPDATE ON public.sessao_estudo
    FOR EACH ROW EXECUTE FUNCTION public.handle_sessao_concluida();
