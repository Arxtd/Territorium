-- Atualização de permissões para dirigentes
-- Permite que dirigentes visualizem o mapa geral e todos os mapas cadastrados
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- PASSO 1: Atualizar política de maps
-- ============================================

-- Remover a política antiga (se existir)
DROP POLICY IF EXISTS "Dirigentes can view assigned maps" ON public.maps;

-- Criar nova política que permite dirigentes verem todos os mapas
CREATE POLICY "Dirigentes can view all maps" ON public.maps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'dirigente'
    )
  );

-- ============================================
-- PASSO 2: Atualizar política de map_points
-- ============================================

-- Remover política antiga (se existir)
DROP POLICY IF EXISTS "Users can view points of accessible maps" ON public.map_points;

-- Criar nova política que permite dirigentes verem todos os pontos
CREATE POLICY "Users can view points of accessible maps" ON public.map_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maps
      WHERE maps.id = map_points.map_id
      AND (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'superintendente'
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'dirigente'
        )
      )
    )
  );

-- ============================================
-- PASSO 3: Atualizar política de map_polygons
-- ============================================

-- Remover política antiga (se existir)
DROP POLICY IF EXISTS "Users can view polygons of accessible maps" ON public.map_polygons;

-- Criar nova política que permite dirigentes verem todos os polígonos
CREATE POLICY "Users can view polygons of accessible maps" ON public.map_polygons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maps
      WHERE maps.id = map_polygons.map_id
      AND (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'superintendente'
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'dirigente'
        )
      )
    )
  );
