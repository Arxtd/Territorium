# Correção: Credenciais do Supabase

## ⚠️ Problema Identificado

Você está usando a chave **"publishable"**, mas o projeto precisa da chave **"anon"**.

A imagem do Supabase mostra as credenciais para **Next.js**, mas seu projeto usa **Vite/React**. Embora os nomes das variáveis estejam corretos no `.env` (VITE_), a chave que você está usando pode não ser a correta.

## 🔍 Como Obter a Chave Correta

### Opção 1: Usar a chave "anon" (Recomendado)

1. No painel do Supabase, vá em **Settings** > **API**
2. Procure pela seção **"Project API keys"**
3. Procure por **"anon public"** key (não "publishable")
4. Essa chave:
   - Começa com `eyJ...`
   - É uma string JWT longa
   - É a chave tradicional do Supabase

### Opção 2: Verificar se a chave publishable funciona

A chave "publishable" pode funcionar em versões mais novas do Supabase, mas vamos testar. Se não funcionar, use a chave "anon".

## 📝 Atualizar o arquivo .env

Abra o arquivo `.env` e atualize:

```env
VITE_SUPABASE_URL=https://mfvecicffpvedtegraot.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**Substitua `sua_chave_anon_aqui` pela chave "anon public" do Supabase.**

## ✅ Suas Credenciais Atuais

- ✅ URL: `https://mfvecicffpvedtegraot.supabase.co` (correta!)
- ❓ Key: `sb_publishable_-_MGIniVNBQCeVL1NvJLlw_dp4GPjNp` (pode precisar trocar pela "anon")

## 🔧 Passos para Corrigir

1. **Abra o painel do Supabase:**
   - Acesse: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Vá em Settings > API**

3. **Procure pela "anon public" key:**
   - Deve estar na seção "Project API keys"
   - Começa com `eyJhbGciOiJIUzI1NiIs...`
   - É diferente da "publishable key"

4. **Copie a chave "anon public"**

5. **Atualize o arquivo `.env`:**
   ```env
   VITE_SUPABASE_URL=https://mfvecicffpvedtegraot.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...  # Cole a chave anon aqui
   ```

6. **Reinicie o servidor:**
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

7. **Teste o login novamente**

## 🆘 Se Não Encontrar a Chave "anon"

Se você só vê a chave "publishable" no painel (versões muito novas do Supabase):

1. A chave publishable **pode funcionar**, mas pode ter limitações
2. Tente testar com a chave atual primeiro
3. Se não funcionar, procure em **Settings > API > Project API keys** por qualquer chave que comece com `eyJ...`

## 📸 Onde Encontrar no Supabase

No painel do Supabase:
- **Settings** (ícone de engrenagem no menu lateral)
- **API** (no submenu de Settings)
- **Project API keys** ou **API Settings**
- Procure por "anon public" ou "anon" key

A chave correta geralmente é a mais longa e começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`


