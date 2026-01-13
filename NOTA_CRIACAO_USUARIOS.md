# Nota: Criação de Usuários pelo Superintendente

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

## Limitações

- A exclusão de usuários remove apenas da tabela `users`, não do `auth.users`
- Para remover completamente, é necessário usar a interface do Supabase ou uma Edge Function
- Usuários criados podem receber email de confirmação se não estiver configurado para auto-confirmar







