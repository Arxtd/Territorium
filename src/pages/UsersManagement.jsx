import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, Plus, Trash2, Edit, X, Save, Key } from 'lucide-react'

const UsersManagement = () => {
  const { isSuperintendente } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPasswordReset, setShowPasswordReset] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'dirigente',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'dirigente',
  })
  const [passwordResetData, setPasswordResetData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (isSuperintendente) {
      fetchUsers()
    }
  }, [isSuperintendente])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name || !formData.email || !formData.password) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Erro ao criar usuário')
      }

      // Inserir na tabela users
      const { error: userError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
        },
      ])

      if (userError) {
        // Se falhar ao inserir na tabela, o usuário ficará no auth mas sem perfil
        // Será necessário limpar manualmente se necessário
        throw userError
      }

      setSuccess('Usuário criado com sucesso!')
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'dirigente',
      })
      setShowCreateForm(false)
      fetchUsers()
    } catch (err) {
      console.error('Error creating user:', err)
      setError(err.message || 'Erro ao criar usuário')
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user.id)
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    })
    setError('')
    setSuccess('')
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!editFormData.name || !editFormData.email) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    try {
      // Atualizar na tabela users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: editFormData.name,
          email: editFormData.email,
          role: editFormData.role,
        })
        .eq('id', editingUser)

      if (updateError) throw updateError

      // Atualizar email no auth (se mudou)
      const user = users.find((u) => u.id === editingUser)
      if (user && user.email !== editFormData.email) {
        // Nota: Para atualizar email no auth, seria necessário usar admin API
        // Por enquanto, apenas atualizamos na tabela users
        console.warn('Email atualizado na tabela users, mas não no auth. Use a API admin para atualizar o email no auth.')
      }

      setSuccess('Usuário atualizado com sucesso!')
      setEditingUser(null)
      setEditFormData({ name: '', email: '', role: 'dirigente' })
      fetchUsers()
    } catch (err) {
      console.error('Error updating user:', err)
      setError(err.message || 'Erro ao atualizar usuário')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!passwordResetData.newPassword || !passwordResetData.confirmPassword) {
      setError('Preencha todos os campos')
      return
    }

    if (passwordResetData.newPassword !== passwordResetData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (passwordResetData.newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      // Para redefinir senha de outro usuário, precisamos usar a API admin do Supabase
      // Isso requer uma Edge Function que use service_role key
      const session = await supabase.auth.getSession()
      const accessToken = session.data.session?.access_token

      if (!accessToken) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Configuração do Supabase não encontrada. Verifique o arquivo .env')
      }

      // Construir URL da Edge Function
      const functionUrl = `${supabaseUrl}/functions/v1/reset-user-password`
      
      console.log('Tentando chamar Edge Function:', functionUrl)

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: showPasswordReset,
          newPassword: passwordResetData.newPassword,
        }),
      })

      // Verificar se a função existe (404)
      if (response.status === 404) {
        throw new Error(
          'EDGE_FUNCTION_NOT_FOUND: A função reset-user-password não foi encontrada. ' +
          'Por favor, crie a Edge Function no Supabase seguindo o guia GUIA_REDEFINIR_SENHA.md'
        )
      }

      // Verificar outros erros HTTP
      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Se não conseguir parsear JSON, usar mensagem padrão
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setSuccess(result.message || 'Senha redefinida com sucesso!')
      setShowPasswordReset(null)
      setPasswordResetData({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      console.error('Error resetting password:', err)
      
      // Tratamento específico para diferentes tipos de erro
      if (err.message?.includes('EDGE_FUNCTION_NOT_FOUND') || 
          err.message?.includes('404') || 
          err.name === 'TypeError' && err.message?.includes('fetch')) {
        setError(
          '❌ Edge Function não encontrada!\n\n' +
          'A função reset-user-password precisa ser criada no Supabase.\n\n' +
          '📖 Siga as instruções em: GUIA_REDEFINIR_SENHA.md\n\n' +
          '💡 Alternativa: Use o painel do Supabase (Authentication > Users) para redefinir senhas manualmente.'
        )
      } else if (err.message?.includes('Não autorizado') || err.message?.includes('401')) {
        setError('Sessão expirada. Por favor, faça login novamente.')
      } else if (err.message?.includes('403') || err.message?.includes('superintendente')) {
        setError('Apenas superintendentes podem redefinir senhas.')
      } else {
        setError(err.message || 'Erro ao redefinir senha. Verifique o console para mais detalhes.')
      }
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?`)) {
      return
    }

    try {
      // Deletar da tabela users (o cascade pode deletar dados relacionados)
      const { error } = await supabase.from('users').delete().eq('id', userId)

      if (error) throw error

      setSuccess('Usuário excluído com sucesso!')
      fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err.message || 'Erro ao excluir usuário')
    }
  }

  if (!isSuperintendente) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gerenciar Usuários
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Crie e gerencie usuários do sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="mt-4 sm:mt-0 inline-flex items-center px-5 py-2.5 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" />
          Criar Usuário
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Criar Novo Usuário
            </h2>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'dirigente',
                })
                setError('')
              }}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nome *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Senha *
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Mínimo de 6 caracteres
              </p>
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Função *
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
              >
                <option value="dirigente">Dirigente</option>
                <option value="superintendente">Superintendente</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'dirigente',
                  })
                  setError('')
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Save className="h-4 w-4 mr-2" />
                Criar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Usuários Cadastrados
          </h2>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Nenhum usuário
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Comece criando um novo usuário
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Função
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Data de Criação
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'superintendente'
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              : 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                          }`}
                        >
                          {user.role === 'superintendente'
                            ? 'Superintendente'
                            : 'Dirigente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200"
                            title="Editar usuário"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowPasswordReset(user.id)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors duration-200"
                            title="Redefinir senha"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                            title="Excluir usuário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição de Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Editar Usuário
              </h2>
              <button
                onClick={() => {
                  setEditingUser(null)
                  setEditFormData({ name: '', email: '', role: 'dirigente' })
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nome *
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="edit-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email *
                </label>
                <input
                  type="email"
                  id="edit-email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="edit-role"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Função *
                </label>
                <select
                  id="edit-role"
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                >
                  <option value="dirigente">Dirigente</option>
                  <option value="superintendente">Superintendente</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null)
                    setEditFormData({ name: '', email: '', role: 'dirigente' })
                    setError('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Redefinição de Senha */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Redefinir Senha
              </h2>
              <button
                onClick={() => {
                  setShowPasswordReset(null)
                  setPasswordResetData({ newPassword: '', confirmPassword: '' })
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nova Senha *
                </label>
                <input
                  type="password"
                  id="new-password"
                  value={passwordResetData.newPassword}
                  onChange={(e) =>
                    setPasswordResetData({
                      ...passwordResetData,
                      newPassword: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                  minLength={6}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Mínimo de 6 caracteres
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirmar Nova Senha *
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={passwordResetData.confirmPassword}
                  onChange={(e) =>
                    setPasswordResetData({
                      ...passwordResetData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                  minLength={6}
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Atenção:</strong> A senha será redefinida sem necessidade de informar a senha anterior.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(null)
                    setPasswordResetData({ newPassword: '', confirmPassword: '' })
                    setError('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Redefinir Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersManagement

