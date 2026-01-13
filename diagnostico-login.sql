-- Script de Diagnóstico para Problemas de Login
-- Execute este script no SQL Editor do Supabase para verificar a configuração

-- ============================================
-- 1. VERIFICAR USUÁRIOS NO AUTH
-- ============================================
-- Ver todos os usuários criados no sistema de autenticação
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- 2. VERIFICAR USUÁRIOS NA TABELA PUBLIC.USERS
-- ============================================
-- Ver todos os usuários na tabela users (deve haver correspondência com auth.users)
SELECT 
  id,
  name,
  email,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- ============================================
-- 3. VERIFICAR USUÁRIOS SEM CORRESPONDÊNCIA
-- ============================================
-- Verificar se há usuários em auth.users que não têm registro em public.users
SELECT 
  au.id,
  au.email,
  'Usuário existe no auth mas não na tabela users' as problema
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- ============================================
-- 4. VERIFICAR USUÁRIOS NÃO CONFIRMADOS
-- ============================================
-- Ver usuários que não confirmaram o email (pode causar problemas de login)
SELECT 
  id,
  email,
  email_confirmed_at,
  'Email não confirmado' as problema
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- ============================================
-- 5. VERIFICAR RLS (Row Level Security)
-- ============================================
-- Verificar se RLS está habilitado na tabela users
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================
-- 6. VERIFICAR POLÍTICAS RLS NA TABELA USERS
-- ============================================
-- Ver todas as políticas RLS na tabela users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================
-- 7. TESTE DE ACESSO (Execute como usuário autenticado)
-- ============================================
-- Para testar se um usuário específico consegue ver seu próprio perfil
-- Substitua 'USER_ID_AQUI' pelo ID do usuário que está tentando fazer login
-- 
-- IMPORTANTE: Execute esta query DEPOIS de fazer login no Supabase como o usuário
-- (ou use SET ROLE, mas isso é mais complexo)
--
-- SELECT * FROM public.users WHERE id = 'USER_ID_AQUI';

-- ============================================
-- SOLUÇÃO: CRIAR REGISTRO NA TABELA USERS
-- ============================================
-- Se você encontrou um usuário em auth.users sem registro em public.users,
-- execute o comando abaixo (substitua os valores):
--
-- INSERT INTO public.users (id, name, email, role)
-- VALUES (
--   'USER_ID_DO_AUTH',  -- ID do usuário em auth.users
--   'Nome do Usuário',
--   'email@exemplo.com',
--   'superintendente' -- ou 'dirigente'
-- );

-- ============================================
-- SOLUÇÃO: CONFIRMAR EMAIL MANUALMENTE
-- ============================================
-- Se o email não estiver confirmado, você pode confirmar manualmente:
-- (Execute no SQL Editor, substituindo o email)
--
-- UPDATE auth.users
-- SET email_confirmed_at = NOW()
-- WHERE email = 'email@exemplo.com';


