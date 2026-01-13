# Guia de Configuração - Territorium

## Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (https://supabase.com)

## Passo 1: Configurar Supabase

📖 **Para um guia detalhado passo a passo, consulte [GUIA_SUPABASE.md](./GUIA_SUPABASE.md)**

Resumo rápido:
1. Crie um novo projeto no Supabase (https://supabase.com)
2. Acesse o SQL Editor no painel do Supabase
3. Execute o script `supabase-schema.sql` para criar todas as tabelas e políticas
4. Vá em Settings > API e copie:
   - Project URL
   - anon/public key

## Passo 2: Configurar Variáveis de Ambiente

1. Crie um arquivo `.env` na raiz do projeto
2. Adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

## Passo 3: Instalar Dependências

```bash
npm install
```

## Passo 4: Criar Usuários Iniciais

Após executar o schema SQL, você precisará criar usuários através do Supabase Auth:

1. Vá em Authentication > Users no painel do Supabase
2. Clique em "Add user" > "Create new user"
3. Preencha email e senha, marque "Auto Confirm User"
4. **Copie o User ID** que aparece
5. Execute o SQL abaixo (substitua os valores):

```sql
INSERT INTO public.users (id, name, email, role)
VALUES (
  'USER_ID_COPIADO_AQUI',  -- Cole o User ID aqui
  'Nome do Usuário',
  'email@exemplo.com',
  'superintendente' -- ou 'dirigente'
);
```

**⚠️ IMPORTANTE:** O `id` deve ser **exatamente o mesmo** do usuário em `auth.users`.

📖 **Veja o [GUIA_SUPABASE.md](./GUIA_SUPABASE.md) para instruções detalhadas com screenshots.**

## Passo 5: Executar a Aplicação

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## Estrutura de Permissões

### Superintendente de Serviço
- Pode criar, editar e excluir mapas
- Pode atribuir mapas aos dirigentes
- Pode visualizar todos os mapas e estatísticas
- Acesso completo ao sistema

### Dirigente
- Pode visualizar apenas mapas atribuídos a ele
- Pode marcar mapas como visitados
- Pode visualizar seus próprios insights
- Acesso limitado às funcionalidades

## Funcionalidades

1. **Dashboard**: Visão geral com estatísticas
2. **Lista de Mapas**: Visualização de todos os mapas (filtrados por permissão)
3. **Criar/Editar Mapa**: Adicionar pontos e polígonos aos mapas
4. **Visualizar Mapa**: Ver detalhes de um mapa específico
5. **Mapa Geral**: Visualizar todos os mapas em um único mapa interativo
6. **Insights**: Gráficos e estatísticas sobre mapas e visitas

## Troubleshooting

### Erro de autenticação
- Verifique se as variáveis de ambiente estão corretas
- Certifique-se de que o RLS está habilitado e as políticas estão corretas

### Mapas não aparecem
- Verifique se o usuário tem a role correta na tabela `users`
- Para dirigentes, verifique se há atribuições na tabela `map_assignments`

### Erro ao salvar mapas
- Verifique as permissões RLS
- Certifique-se de que o usuário tem role 'superintendente'

