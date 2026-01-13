-- Adicionar campo de tipo aos mapas
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna type à tabela maps
ALTER TABLE public.maps
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('congregacao', 'grupo', 'submapa')) DEFAULT 'congregacao';

-- Atualizar mapas existentes para ter tipo padrão
UPDATE public.maps
SET type = 'congregacao'
WHERE type IS NULL;

-- Criar índice para melhor performance em consultas por tipo
CREATE INDEX IF NOT EXISTS idx_maps_type ON public.maps(type);







