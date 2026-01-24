-- Schema do banco de dados para Territorium

-- Tabela de usuários (estendendo auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('superintendente', 'dirigente')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mapas
CREATE TABLE IF NOT EXISTS public.maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pontos nos mapas
CREATE TABLE IF NOT EXISTS public.map_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de polígonos nos mapas
CREATE TABLE IF NOT EXISTS public.map_polygons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE NOT NULL,
  coordinates JSONB NOT NULL, -- Array de arrays [[lat, lng], [lat, lng], ...]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de atribuições de mapas aos dirigentes
CREATE TABLE IF NOT EXISTS public.map_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE NOT NULL,
  dirigente_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(map_id, dirigente_id)
);

-- Tabela de visitas aos mapas pelos dirigentes
CREATE TABLE IF NOT EXISTS public.map_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE NOT NULL,
  dirigente_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(map_id, dirigente_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_maps_created_by ON public.maps(created_by);
CREATE INDEX IF NOT EXISTS idx_map_points_map_id ON public.map_points(map_id);
CREATE INDEX IF NOT EXISTS idx_map_polygons_map_id ON public.map_polygons(map_id);
CREATE INDEX IF NOT EXISTS idx_map_assignments_map_id ON public.map_assignments(map_id);
CREATE INDEX IF NOT EXISTS idx_map_assignments_dirigente_id ON public.map_assignments(dirigente_id);
CREATE INDEX IF NOT EXISTS idx_map_visits_map_id ON public.map_visits(map_id);
CREATE INDEX IF NOT EXISTS idx_map_visits_dirigente_id ON public.map_visits(dirigente_id);

-- RLS (Row Level Security) Policies

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_polygons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_visits ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para maps
CREATE POLICY "Superintendentes can view all maps" ON public.maps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

CREATE POLICY "Dirigentes can view all maps" ON public.maps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'dirigente'
    )
  );

CREATE POLICY "Superintendentes can create maps" ON public.maps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

CREATE POLICY "Superintendentes can update maps" ON public.maps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

CREATE POLICY "Superintendentes can delete maps" ON public.maps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

-- Políticas para map_points
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

CREATE POLICY "Superintendentes can manage points" ON public.map_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

-- Políticas para map_polygons
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

CREATE POLICY "Superintendentes can manage polygons" ON public.map_polygons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

-- Políticas para map_assignments
CREATE POLICY "Superintendentes can view all assignments" ON public.map_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

CREATE POLICY "Dirigentes can view own assignments" ON public.map_assignments
  FOR SELECT USING (dirigente_id = auth.uid());

CREATE POLICY "Superintendentes can manage assignments" ON public.map_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

-- Políticas para map_visits
CREATE POLICY "Superintendentes can view all visits" ON public.map_visits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

CREATE POLICY "Dirigentes can view own visits" ON public.map_visits
  FOR SELECT USING (dirigente_id = auth.uid());

CREATE POLICY "Dirigentes can create own visits" ON public.map_visits
  FOR INSERT WITH CHECK (dirigente_id = auth.uid());

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maps_updated_at BEFORE UPDATE ON public.maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();








