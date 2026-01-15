import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User, Mail, Calendar, Map, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const Profile = () => {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState({
    totalMaps: 0,
    visitedMaps: 0,
    pendingMaps: 0,
    totalVisits: 0,
    visitsByMonth: [],
    recentVisits: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile) {
      fetchProfileData()
    }
  }, [userProfile])

  const fetchProfileData = async () => {
    try {
      // Buscar mapas atribuídos
      const { data: assignments } = await supabase
        .from('map_assignments')
        .select('map_id')
        .eq('dirigente_id', userProfile?.id)

      const assignedMapIds = assignments?.map((a) => a.map_id) || []

      // Buscar visitas
      const { data: visits } = await supabase
        .from('map_visits')
        .select('map_id, visited_at')
        .eq('dirigente_id', userProfile?.id)
        .order('visited_at', { ascending: false })

      const visitedMapIds = new Set(visits?.map((v) => v.map_id) || [])
      const pendingMaps = assignedMapIds.filter((id) => !visitedMapIds.has(id)).length

      // Visitas por mês
      const visitsByMonthMap = new Map()
      visits?.forEach((visit) => {
        const date = new Date(visit.visited_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        
        if (!visitsByMonthMap.has(monthKey)) {
          visitsByMonthMap.set(monthKey, { month: monthLabel, visitas: 0 })
        }
        visitsByMonthMap.get(monthKey).visitas++
      })

      const visitsByMonth = Array.from(visitsByMonthMap.values())

      // Visitas recentes (últimas 5)
      const recentVisitsData = await Promise.all(
        (visits?.slice(0, 5) || []).map(async (visit) => {
          const { data: map } = await supabase
            .from('maps')
            .select('name')
            .eq('id', visit.map_id)
            .single()

          return {
            mapName: map?.name || 'Mapa desconhecido',
            visitedAt: visit.visited_at,
          }
        })
      )

      setStats({
        totalMaps: assignedMapIds.length,
        visitedMaps: visitedMapIds.size,
        pendingMaps,
        totalVisits: visits?.length || 0,
        visitsByMonth,
        recentVisits: recentVisitsData,
      })
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  const statusDistribution = [
    { name: 'Visitados', value: stats.visitedMaps },
    { name: 'Pendentes', value: stats.pendingMaps },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Informações pessoais e estatísticas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Usuário */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary-100 dark:bg-primary-900 p-4 rounded-full">
                <User className="h-12 w-12 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Nome
                </label>
                <div className="mt-1 flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userProfile?.name || 'Não informado'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Email
                </label>
                <div className="mt-1 flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900 dark:text-white">
                    {userProfile?.email}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Função
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                      userProfile?.role === 'superintendente'
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                        : 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                    }`}
                  >
                    {userProfile?.role === 'superintendente'
                      ? 'Superintendente'
                      : 'Dirigente'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Membro desde
                </label>
                <div className="mt-1 flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900 dark:text-white">
                    {userProfile?.created_at
                      ? new Date(userProfile.created_at).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Não disponível'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas e Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="bg-blue-500 p-3 rounded-md">
                    <Map className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Mapas Atribuídos
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.totalMaps}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="bg-green-500 p-3 rounded-md">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Mapas Visitados
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.visitedMaps}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="bg-yellow-500 p-3 rounded-md">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Pendentes
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.pendingMaps}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de Status */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Status dos Mapas
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Visitas por Mês */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Visitas por Mês
              </h2>
              {stats.visitsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.visitsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="visitas" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhuma visita registrada ainda
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Visitas Recentes */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Visitas Recentes
              </h2>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            {stats.recentVisits.length > 0 ? (
              <div className="space-y-3">
                {stats.recentVisits.map((visit, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="bg-primary-100 dark:bg-primary-900 p-2 rounded-md mr-3">
                        <Map className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {visit.mapName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(visit.visitedAt).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma visita registrada ainda
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile








