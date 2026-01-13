# Instruções: Redefinição de Senha de Usuários

## Problema de Segurança Corrigido

Anteriormente, dirigentes podiam editar usuários e redefinir senhas sem restrições adequadas. Isso foi corrigido com as seguintes mudanças:

### 1. Políticas de Banco de Dados Atualizadas

O arquivo `add-user-management-policies.sql` foi atualizado para:
- Remover a política que permitia usuários atualizarem livremente seu próprio perfil
- Criar uma nova política que permite apenas atualizar nome e email do próprio perfil
- **Impedir que dirigentes alterem o campo `role`** (apenas superintendentes podem fazer isso)
- Garantir que apenas superintendentes possam atualizar outros usuários

### 2. Funcionalidade de Edição de Usuários

A página de gerenciamento de usuários (`src/pages/UsersManagement.jsx`) agora inclui:
- Botão de editar para cada usuário (apenas visível para superintendentes)
- Modal para editar nome, email e função do usuário
- Validação de permissões no frontend e backend (via RLS)

### 3. Redefinição de Senha

A redefinição de senha requer uma **Edge Function** no Supabase porque:
- Redefinir senha de outro usuário requer a API admin do Supabase
- A `service_role` key não pode ser exposta no frontend por segurança
- A Edge Function valida que apenas superintendentes podem redefinir senhas

## Como Configurar a Edge Function

📖 **Para um guia passo a passo mais detalhado, consulte [GUIA_REDEFINIR_SENHA.md](./GUIA_REDEFINIR_SENHA.md)**

### Passo 1: Criar a Edge Function no Supabase

1. Acesse o painel do Supabase
2. Vá em **Edge Functions** no menu lateral
3. Clique em **Create a new function**
4. Nomeie como: `reset-user-password`
5. Copie o conteúdo do arquivo `supabase/functions/reset-user-password/index.ts` ou use o código do guia

### Passo 2: Configurar Variáveis de Ambiente

A Edge Function precisa das seguintes variáveis de ambiente (já configuradas automaticamente no Supabase):
- `SUPABASE_URL` - URL do seu projeto Supabase
- `SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de service role (já disponível no Supabase)

### Passo 3: Deploy da Função

1. No editor da Edge Function, clique em **Deploy**
2. Aguarde o deploy ser concluído

### Passo 4: Testar a Funcionalidade

1. Faça login como superintendente
2. Vá em **Gerenciar Usuários**
3. Clique no ícone de chave (🔑) ao lado de um usuário
4. Preencha a nova senha e confirmação
5. Clique em **Redefinir Senha**

## Alternativa: Usar Painel do Supabase

Se você não quiser criar a Edge Function agora, pode redefinir senhas diretamente no painel do Supabase:

1. Acesse **Authentication** > **Users**
2. Encontre o usuário
3. Clique nos três pontos (...) ao lado do usuário
4. Selecione **Reset Password**
5. Defina a nova senha

## Segurança Implementada

✅ **Apenas superintendentes** podem:
- Editar outros usuários
- Redefinir senhas de outros usuários
- Alterar a função (role) de usuários

✅ **Dirigentes** podem apenas:
- Atualizar seu próprio nome e email
- **NÃO podem** alterar sua própria função
- **NÃO podem** editar outros usuários
- **NÃO podem** redefinir senhas

## Atualizar Políticas no Banco de Dados

Execute o script SQL atualizado no Supabase:

```sql
-- Execute o conteúdo de add-user-management-policies.sql no SQL Editor do Supabase
```

Isso irá:
1. Remover a política antiga que permitia atualização livre do perfil
2. Criar uma nova política restritiva
3. Garantir que apenas superintendentes possam alterar roles

