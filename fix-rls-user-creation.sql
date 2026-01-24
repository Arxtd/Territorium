-- Fix para permitir criação de usuários via Edge Function
-- Esta função bypassa RLS usando SECURITY DEFINER

-- Função para inserir usuário na tabela users (bypassa RLS)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (p_id, p_name, p_email, p_role)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Garantir que a função tenha as permissões necessárias
GRANT EXECUTE ON FUNCTION public.create_user_profile TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;


