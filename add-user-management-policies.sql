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

-- Política para Superintendentes atualizarem qualquer usuário
CREATE POLICY "Superintendentes can update any user" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'superintendente'
    )
  );







