import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
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
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react'

const Insights = () => {
  const { userProfile, isSuperintendente } = useAuth()
  const [stats, setStats] = useState({
    totalMaps: 0,
    visitedMaps: 0,
    pendingMaps: 0,
    totalVisits: 0,
    visitsByMap: [],
    visitsByDirigente: [],
    statusDistribution: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
  }, [userProfile, isSuperintendente])

  const fetchInsights = async () => {
    try {
      if (isSuperintendente) {
        // Insights para Superintendente
        const { data: maps } = await supabase.from('maps').select('id, name')

        const { data: visits } = await supabase
          .from('map_visits')
          .select('map_id, dirigente_id, visited_at')

        const { data: assignments } = await supabase
          .from('map_assignments')
          .select('map_id, dirigente_id')

        const { data: dirigentes } = await supabase
          .from('users')
          .select('id, name')
          .eq('role', 'dirigente')

        const visitedMapIds = new Set(visits?.map((v) => v.map_id) || [])
        const assignedMapIds = new Set(assignments?.map((a) => a.map_id) || [])

        // Visitas por mapa
        const visitsByMap = (maps || []).map((map) => {
          const mapVisits = visits?.filter((v) => v.map_id === map.id) || []
          return {
            name: map.name,
            visitas: mapVisits.length,
          }
        })

        // Visitas por dirigente
        const visitsByDirigente = (dirigentes || []).map((dirigente) => {
          const dirigenteVisits =
            visits?.filter((v) => v.dirigente_id === dirigente.id) || []
          return {
            name: dirigente.name || 'Sem nome',
            visitas: dirigenteVisits.length,
          }
        })

        // Distribuição de status
        const statusDistribution = [
          {
            name: 'Visitados',
            value: visitedMapIds.size,
          },
          {
            name: 'Pendentes',
            value: Array.from(assignedMapIds).filter(
              (id) => !visitedMapIds.has(id)
            ).length,
          },
        ]

        setStats({
          totalMaps: maps?.length || 0,
          visitedMaps: visitedMapIds.size,
          pendingMaps: Array.from(assignedMapIds).filter(
            (id) => !visitedMapIds.has(id)
          ).length,
          totalVisits: visits?.length || 0,
          visitsByMap,
          visitsByDirigente,
          statusDistribution,
        })
      } else {
        // Insights para Dirigente
        const { data: assignments } = await supabase
          .from('map_assignments')
          .select('map_id')
          .eq('dirigente_id', userProfile?.id)

        const assignedMapIds = assignments?.map((a) => a.map_id) || []

        const { data: maps } = await supabase
          .from('maps')
          .select('id, name')
          .in('id', assignedMapIds)

        const { data: visits } = await supabase
          .from('map_visits')
          .select('map_id, visited_at')
          .eq('dirigente_id', userProfile?.id)

        const visitedMapIds = new Set(visits?.map((v) => v.map_id) || [])

        // Visitas por mapa (apenas mapas atribuídos)
        const visitsByMap = (maps || []).map((map) => {
          const mapVisits = visits?.filter((v) => v.map_id === map.id) || []
          return {
            name: map.name,
            visitas: mapVisits.length,
          }
        })

        // Distribuição de status
        const statusDistribution = [
          {
            name: 'Visitados',
            value: visitedMapIds.size,
          },
          {
            name: 'Pendentes',
            value: assignedMapIds.filter((id) => !visitedMapIds.has(id)).length,
          },
        ]

        setStats({
          totalMaps: assignedMapIds.length,
          visitedMaps: visitedMapIds.size,
          pendingMaps: assignedMapIds.filter((id) => !visitedMapIds.has(id))
            .length,
          totalVisits: visits?.length || 0,
          visitsByMap,
          visitsByDirigente: [],
          statusDistribution,
        })
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Insights</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Análise e estatísticas dos mapas
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Mapas
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
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
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Mapas Visitados
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
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
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Mapas Pendentes
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
                    {stats.pendingMaps}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="bg-purple-500 p-3 rounded-md">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Visitas
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
                    {stats.totalVisits}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Distribuição de Status */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Distribuição de Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.statusDistribution}
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
                {stats.statusDistribution.map((entry, index) => (
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

        {/* Visitas por Mapa */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Visitas por Mapa
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.visitsByMap}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitas" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Visitas por Dirigente (apenas para Superintendente) */}
      {isSuperintendente && stats.visitsByDirigente.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Visitas por Dirigente
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.visitsByDirigente}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitas" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default Insights

