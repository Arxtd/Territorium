-- Script auxiliar para criar usuários de teste
-- IMPORTANTE: Primeiro você precisa criar os usuários no Authentication > Users
-- Depois copie os User IDs e substitua nos valores abaixo

-- ============================================
-- INSTRUÇÕES:
-- ============================================
-- 1. Vá em Authentication > Users no Supabase
-- 2. Clique em "Add user" > "Create new user"
-- 3. Crie o primeiro usuário (ex: superintendente@teste.com)
-- 4. Copie o User ID que aparece
-- 5. Substitua 'USER_ID_SUPERINTENDENTE' abaixo pelo ID copiado
-- 6. Repita para criar um segundo usuário (dirigente)
-- 7. Execute este script no SQL Editor

-- ============================================
-- CRIAR SUPERINTENDENTE
-- ============================================
-- Substitua 'USER_ID_SUPERINTENDENTE' pelo ID real do usuário
INSERT INTO public.users (id, name, email, role)
VALUES (
  'USER_ID_SUPERINTENDENTE',  -- ⚠️ SUBSTITUA AQUI
  'Superintendente Teste',
  'superintendente@teste.com',
  'superintendente'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- ============================================
-- CRIAR DIRIGENTE
-- ============================================
-- Substitua 'USER_ID_DIRIGENTE' pelo ID real do usuário
INSERT INTO public.users (id, name, email, role)
VALUES (
  'USER_ID_DIRIGENTE',  -- ⚠️ SUBSTITUA AQUI
  'Dirigente Teste',
  'dirigente@teste.com',
  'dirigente'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- ============================================
-- VERIFICAR SE OS USUÁRIOS FORAM CRIADOS
-- ============================================
SELECT id, name, email, role, created_at
FROM public.users
ORDER BY created_at DESC;







