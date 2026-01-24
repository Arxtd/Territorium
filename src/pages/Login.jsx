import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Map, Sun, Moon } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      console.error('Erro no login:', err)
      const errorMessage = err.message || 'Erro ao fazer login'
      setError(errorMessage)
      
      // Se o erro original contém informações adicionais, logar no console
      if (err.originalError) {
        console.error('Erro original:', err.originalError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-black dark:via-black dark:to-black py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 dark:bg-primary-900/30 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300 dark:bg-primary-800/30 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>
      
      <div className="relative max-w-md w-full space-y-8 bg-white/80 dark:bg-dark-surface/90 backdrop-blur-xl p-10 rounded-2xl shadow-2xl transition-all duration-300 border border-white/20 dark:border-dark-border/50">
        <button
          onClick={toggleTheme}
                  className="absolute top-5 right-5 p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-dark-surface/80 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95 hover:text-primary-600 dark:hover:text-primary-400"
          aria-label="Alternar tema"
        >
          {isDark ? (
            <Sun className="h-5 w-5 transition-transform duration-200" />
          ) : (
            <Moon className="h-5 w-5 transition-transform duration-200" />
          )}
        </button>
        <div>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-2xl blur-lg opacity-50"></div>
              <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 p-5 rounded-2xl transition-transform duration-300 hover:scale-110 hover:rotate-3 shadow-xl">
                <Map className="h-16 w-16 text-white drop-shadow-lg transition-transform duration-300" />
              </div>
            </div>
          </div>
          <h2 className="text-center text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent">
            Territorium
          </h2>
          <p className="mt-3 text-center text-base text-gray-600 dark:text-gray-400 font-medium">
            Gerenciamento de Territórios
          </p>
        </div>
        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50/90 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg shadow-sm backdrop-blur-sm">
              <div className="font-semibold mb-1">Erro ao fazer login</div>
              <div className="text-sm whitespace-pre-line">{error}</div>
              {error.includes('arquivo .env') && (
                <div className="mt-2 text-xs">
                  💡 <strong>Dica:</strong> Crie um arquivo <code className="bg-red-100 dark:bg-red-900 px-1 rounded">.env</code> na raiz do projeto com suas credenciais do Supabase
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 hover:from-primary-600 hover:via-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-primary-500/50 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
              {/* Shimmer effect */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
              
              <span className="relative flex items-center">
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">Entrar</span>
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login

