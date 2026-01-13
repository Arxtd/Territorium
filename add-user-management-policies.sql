-- Políticas adicionais para gerenciamento de usuários
-- Execute este script no SQL Editor do Supabase após executar o supabase-schema.sql

-- Política para Superintendentes criarem usuários
CREATE POLICY "Superintendentes can create users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

-- Política para Superintendentes excluírem usuários
CREATE POLICY "Superintendentes can delete users" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

-- IMPORTANTE: Execute este script APÓS o supabase-schema.sql
-- Este script atualiza as políticas de segurança para usuários

-- Remover política antiga que permite usuários atualizarem livremente seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Política para Superintendentes atualizarem qualquer usuário
-- Esta política permite que superintendentes atualizem qualquer campo de qualquer usuário
CREATE POLICY "Superintendentes can update any user" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );

-- Nova política: Usuários podem atualizar apenas nome e email do próprio perfil
-- Mas NÃO podem alterar o campo 'role'
-- Esta política usa uma função para garantir que o role não seja alterado pelo próprio usuário
CREATE OR REPLACE FUNCTION check_role_not_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário está atualizando a si mesmo e não é superintendente
  IF NEW.id = auth.uid() AND OLD.role != NEW.role THEN
    -- Verificar se é superintendente
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    ) THEN
      RAISE EXCEPTION 'Usuários não podem alterar sua própria função (role)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para verificar mudança de role
DROP TRIGGER IF EXISTS check_role_change ON public.users;
CREATE TRIGGER check_role_change
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION check_role_not_changed();

-- Política que permite usuários atualizarem seu próprio perfil (nome e email)
-- O trigger acima garante que o role não seja alterado
CREATE POLICY "Users can update own profile limited" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);







