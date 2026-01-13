import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação mais detalhada das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO: Variáveis de ambiente do Supabase não configuradas!')
  console.error('Verifique se o arquivo .env existe na raiz do projeto e contém:')
  console.error('  VITE_SUPABASE_URL=https://seu-projeto.supabase.co')
  console.error('  VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui')
  throw new Error('Missing Supabase environment variables. Verifique o arquivo .env')
}

// Validar formato da URL
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.error('❌ ERRO: URL do Supabase deve começar com http:// ou https://')
  console.error('URL atual:', supabaseUrl)
  throw new Error('Invalid Supabase URL format')
}

// Validar se a URL termina com .supabase.co ou similar
if (!supabaseUrl.includes('supabase')) {
  console.warn('⚠️ AVISO: URL do Supabase pode estar incorreta:', supabaseUrl)
}

console.log('✅ Supabase configurado com sucesso')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey.substring(0, 30) + '... (tamanho: ' + supabaseAnonKey.length + ' caracteres)')

// Verificar tipo de chave
if (supabaseAnonKey.startsWith('sb_publishable_')) {
  console.warn('⚠️  AVISO: Você está usando uma chave PUBLISHABLE')
  console.warn('   A chave publishable pode não funcionar com todas as operações')
  console.warn('   Se tiver problemas, use a chave ANON (começa com eyJ...)')
  console.warn('   No Supabase: Settings > API > anon public key')
} else if (supabaseAnonKey.startsWith('eyJ')) {
  console.log('✅ Formato da chave: ANON (correto)')
} else {
  console.warn('⚠️  AVISO: Formato de chave não reconhecido')
  console.warn('   Esperado: eyJ... (anon) ou sb_publishable_... (publishable)')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Teste de conexão automático (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🧪 Testando conexão com Supabase...')
  
  // Teste simples: tentar obter a sessão
  supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ ERRO no teste de conexão:', error.message)
        if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
          console.error('💡 SOLUÇÃO: A chave API está incorreta ou inválida')
          console.error('   No Supabase: Settings > API > anon public key')
          console.error('   A chave deve começar com eyJ...')
        }
      } else {
        console.log('✅ Conexão com Supabase OK!')
      }
    })
    .catch((err) => {
      console.error('❌ ERRO ao testar conexão:', err.message)
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        console.error('💡 SOLUÇÃO: Erro de rede')
        console.error('   Verifique se a URL está correta:', supabaseUrl)
        console.error('   Verifique sua conexão com a internet')
      }
    })
}






