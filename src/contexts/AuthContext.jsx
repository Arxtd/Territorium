import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Ouvir mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        // Se o usuário não existe na tabela users, isso é um problema crítico
        if (error.code === 'PGRST116') {
          console.error('⚠️ USUÁRIO NÃO ENCONTRADO NA TABELA USERS!')
          console.error('O usuário foi autenticado, mas não existe registro na tabela public.users')
          console.error('Execute o script SQL para criar o registro na tabela users')
        }
        throw error
      }
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Não impedir o login se o perfil não for encontrado, mas logar o erro
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Erro no login:', error)
        
        // Melhorar mensagens de erro para o usuário
        let errorMessage = 'Erro ao fazer login'
        
        // Erros de rede/conexão
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') ||
            error.message?.includes('fetch')) {
          errorMessage = 'Erro de conexão com o servidor. Verifique:\n' +
            '1. Se o arquivo .env está configurado corretamente\n' +
            '2. Se a URL do Supabase está correta\n' +
            '3. Se há problemas de rede/firewall\n' +
            '4. Se o servidor Supabase está online'
          console.error('❌ ERRO DE REDE/CONEXÃO')
          console.error('Verifique se VITE_SUPABASE_URL está correto no arquivo .env')
        } else if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos'
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor, confirme seu email antes de fazer login'
        } else if (error.message?.includes('User not found')) {
          errorMessage = 'Usuário não encontrado'
        } else {
          errorMessage = error.message || 'Erro ao fazer login'
        }
        
        const detailedError = new Error(errorMessage)
        detailedError.originalError = error
        throw detailedError
      }
      
      // Após login bem-sucedido, buscar o perfil do usuário
      if (data?.user) {
        await fetchUserProfile(data.user.id)
      }
      
      return data
    } catch (err) {
      // Capturar erros de rede que não são tratados pelo Supabase
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        const networkError = new Error(
          'Erro de conexão com o servidor. Verifique:\n' +
          '1. Se o arquivo .env existe e está configurado corretamente\n' +
          '2. Se a URL do Supabase está correta (deve começar com https://)\n' +
          '3. Se você reiniciou o servidor após criar/editar o .env\n' +
          '4. Se há problemas de rede ou firewall'
        )
        networkError.originalError = err
        throw networkError
      }
      throw err
    }
  }

  const signOut = async () => {
    try {
      // Limpar estado local primeiro
      setUser(null)
      setUserProfile(null)
      
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Erro ao fazer logout:', error)
        throw error
      }
    } catch (error) {
      console.error('Erro no processo de logout:', error)
      // Mesmo com erro, limpar o estado local
      setUser(null)
      setUserProfile(null)
      throw error
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    isSuperintendente: userProfile?.role === 'superintendente',
    isDirigente: userProfile?.role === 'dirigente',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}






