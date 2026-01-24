# Nota: Criação de Usuários pelo Superintendente

## ⚠️ SOLUÇÃO RÁPIDA PARA O ERRO DE RLS

Se você está recebendo o erro **"new row violates row-level security policy for table 'users'"**, siga estes passos:

1. **Execute o script SQL no Supabase:**
   - Acesse o painel do Supabase
   - Vá em **SQL Editor**
   - Execute o arquivo `fix-rls-user-creation.sql` (ou copie e cole o conteúdo)
   - Isso criará a função `create_user_profile` que bypassa o RLS

2. **O código já foi atualizado** para usar essa função automaticamente.

3. **Desabilite a confirmação de email** (veja Passo 1 abaixo)

## Configuração Necessária no Supabase

Para que o Superintendente possa criar usuários diretamente pela aplicação, é necessário configurar o Supabase para **auto-confirmar** usuários criados via `signUp`.

### Passo 1: Desabilitar Confirmação de Email

1. Acesse o painel do Supabase
2. Vá em **Authentication** > **Settings**
3. Em **Email Auth**, desabilite a opção **"Enable email confirmations"**
   - Ou configure para auto-confirmar usuários criados via API

### Passo 2: Alternativa - Usar Edge Function (Recomendado para Produção)

Para produção, é recomendado criar uma Edge Function no Supabase que use a `service_role` key para criar usuários sem enviar email de confirmação.

**Exemplo de Edge Function:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { name, email, password, role } = await req.json()
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Criar usuário
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirmar
    user_metadata: { name }
  })

  if (authError) throw authError

  // Inserir na tabela users
  const { error: userError } = await supabaseAdmin
    .from('users')
    .insert([{
      id: authData.user.id,
      name,
      email,
      role
    }])

  if (userError) throw userError

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Passo 3: Configuração Atual (Desenvolvimento)

A implementação atual usa `supabase.auth.signUp()` que funciona, mas pode enviar email de confirmação dependendo das configurações do Supabase.

**Para desenvolvimento/testes:**
- Desabilite a confirmação de email no Supabase
- Ou configure para auto-confirmar usuários

## Funcionalidades Implementadas

✅ Criar novos usuários (nome, email, senha, role)
✅ Listar todos os usuários
✅ Excluir usuários
✅ Visualizar informações dos usuários
✅ Acesso restrito apenas para Superintendentes

## Problema de Row Level Security (RLS)

### Erro: "new row violates row-level security policy for table 'users'"

Após desabilitar a confirmação de email, você pode receber este erro ao criar usuários. Isso acontece porque:

1. A Edge Function usa `service_role` key para criar usuários
2. As políticas RLS verificam `auth.uid()` para determinar se o usuário é superintendente
3. Quando usando `service_role`, o `auth.uid()` não está definido no contexto da inserção

### Solução: Função SQL com SECURITY DEFINER

Foi criada uma função SQL que bypassa as políticas RLS usando `SECURITY DEFINER`:

**Execute o script `fix-rls-user-creation.sql` no SQL Editor do Supabase:**

```sql
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

GRANT EXECUTE ON FUNCTION public.create_user_profile TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
```

**O código da aplicação foi atualizado** para usar `supabase.rpc('create_user_profile', ...)` em vez de `insert()` direto na tabela.

**IMPORTANTE:** Você DEVE executar o script `fix-rls-user-creation.sql` no SQL Editor do Supabase antes de tentar criar usuários pela aplicação. Sem essa função, você continuará recebendo o erro de RLS.

## Limitações

- A exclusão de usuários remove apenas da tabela `users`, não do `auth.users`
- Para remover completamente, é necessário usar a interface do Supabase ou uma Edge Function
- Usuários criados podem receber email de confirmação se não estiver configurado para auto-confirmar










