# Guia: Como Configurar a Redefinição de Senha

## Problema: Erro "failed to fetch"

Se você está recebendo o erro "failed to fetch" ao tentar redefinir uma senha, isso significa que a **Edge Function não foi criada** no Supabase ainda.

## Solução Rápida: Criar a Edge Function

### Opção 1: Usar o Painel do Supabase (Mais Fácil)

1. Acesse o painel do Supabase
2. Vá em **Edge Functions** no menu lateral
3. Clique em **Create a new function**
4. Nomeie como: `reset-user-password`
5. Cole o código abaixo:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const token = authHeader.replace('Bearer ', '')
    
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'superintendente') {
      return new Response(
        JSON.stringify({ error: 'Apenas superintendentes podem redefinir senhas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, newPassword } = await req.json()

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'userId e newPassword são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error('Error resetting password:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'Erro ao redefinir senha' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Senha redefinida com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

6. Clique em **Deploy**
7. Aguarde o deploy ser concluído

### Opção 2: Usar CLI do Supabase (Avançado)

Se você tem o Supabase CLI instalado:

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Deploy da função
supabase functions deploy reset-user-password
```

## Solução Alternativa: Redefinir Senha Manualmente

Se você não quiser criar a Edge Function agora, pode redefinir senhas diretamente no painel do Supabase:

1. Acesse **Authentication** > **Users** no Supabase
2. Encontre o usuário na lista
3. Clique nos três pontos (...) ao lado do usuário
4. Selecione **Reset Password**
5. Defina a nova senha

## Verificar se a Função Está Funcionando

Após criar a Edge Function:

1. Faça login como superintendente
2. Vá em **Gerenciar Usuários**
3. Clique no ícone de chave (🔑) ao lado de um usuário
4. Preencha a nova senha
5. Se ainda der erro, verifique:
   - Se a função foi deployada corretamente
   - Se o nome da função está correto: `reset-user-password`
   - Se a URL do Supabase está correta no arquivo `.env`

## Nada Precisa Ser Rodado no Banco

**Importante:** Não há nada que precise ser executado no banco de dados para a redefinição de senha funcionar. A Edge Function é uma função serverless separada que usa a API admin do Supabase.

O que você precisa fazer é apenas **criar e fazer deploy da Edge Function** no painel do Supabase.


