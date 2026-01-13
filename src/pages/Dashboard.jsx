import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Map, Users, CheckCircle, Clock } from 'lucide-react'
import GlobalMapView from '../components/GlobalMapView'

const Dashboard = () => {
  const { userProfile, isSuperintendente } = useAuth()
  const [stats, setStats] = useState({
    totalMaps: 0,
    assignedMaps: 0,
    visitedMaps: 0,
    pendingMaps: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [userProfile, isSuperintendente])

  const fetchStats = async () => {
    try {
      if (isSuperintendente) {
        // Estatísticas para Superintendente
        const { data: maps, error: mapsError } = await supabase
          .from('maps')
          .select('id')

        if (mapsError) throw mapsError

        const { data: assignments, error: assignmentsError } = await supabase
          .from('map_assignments')
          .select('id, map_id')

        if (assignmentsError) throw assignmentsError

        const { data: visits, error: visitsError } = await supabase
          .from('map_visits')
          .select('id, map_id')

        if (visitsError) throw visitsError

        const visitedMapIds = new Set(visits?.map((v) => v.map_id) || [])
        const assignedMapIds = new Set(assignments?.map((a) => a.map_id) || [])
        const pendingMaps = maps?.filter(
          (m) => assignedMapIds.has(m.id) && !visitedMapIds.has(m.id)
        ).length || 0

        setStats({
          totalMaps: maps?.length || 0,
          assignedMaps: assignments?.length || 0,
          visitedMaps: visitedMapIds.size,
          pendingMaps,
        })
      } else {
        // Estatísticas para Dirigente
        const { data: assignments, error: assignmentsError } = await supabase
          .from('map_assignments')
          .select('map_id')
          .eq('dirigente_id', userProfile?.id)

        if (assignmentsError) throw assignmentsError

        const assignedMapIds = assignments?.map((a) => a.map_id) || []

        const { data: visits, error: visitsError } = await supabase
          .from('map_visits')
          .select('map_id')
          .eq('dirigente_id', userProfile?.id)

        if (visitsError) throw visitsError

        const visitedMapIds = new Set(visits?.map((v) => v.map_id) || [])
        const pendingMaps = assignedMapIds.filter(
          (id) => !visitedMapIds.has(id)
        ).length

        setStats({
          totalMaps: assignedMapIds.length,
          assignedMaps: assignedMapIds.length,
          visitedMaps: visitedMapIds.size,
          pendingMaps,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const statCards = [
    {
      title: isSuperintendente ? 'Total de Mapas' : 'Mapas Atribuídos',
      value: stats.totalMaps,
      icon: Map,
      color: 'bg-blue-500',
    },
    {
      title: 'Mapas Visitados',
      value: stats.visitedMaps,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Mapas Pendentes',
      value: stats.pendingMaps,
      icon: Clock,
      color: 'bg-yellow-500',
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bem-vindo, {userProfile?.name || 'Usuário'}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isSuperintendente
            ? 'Gerencie mapas e atribuições'
            : 'Visualize seus mapas atribuídos'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`${stat.color} p-3 rounded-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {stat.title}
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8">
        <GlobalMapView showTitle={true} height="500px" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link
          to="/maps"
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ver Mapas</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isSuperintendente
                ? 'Visualize e gerencie todos os mapas cadastrados'
                : 'Visualize seus mapas atribuídos'}
            </p>
          </div>
        </Link>

        <Link
          to="/global-map"
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mapa Geral Completo</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Visualize todos os mapas em um mapa maior e mais detalhado
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard

