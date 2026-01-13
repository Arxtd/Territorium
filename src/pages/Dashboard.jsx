import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { Map, Users, CheckCircle, Clock, Search, X } from 'lucide-react'
import GlobalMapView from '../components/GlobalMapView'

const Dashboard = () => {
  const { userProfile, isSuperintendente } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalMaps: 0,
    assignedMaps: 0,
    visitedMaps: 0,
    pendingMaps: 0,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [allMaps, setAllMaps] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchAllMaps()
  }, [userProfile, isSuperintendente])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allMaps.filter((map) =>
        map.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setSearchResults(filtered.slice(0, 5)) // Limitar a 5 resultados
      setShowResults(true)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }, [searchQuery, allMaps])

  const fetchAllMaps = async () => {
    try {
      let query = supabase.from('maps').select('id, name, description, type').order('name', { ascending: true })

      if (!isSuperintendente) {
        const { data: assignments } = await supabase
          .from('map_assignments')
          .select('map_id')
          .eq('dirigente_id', userProfile?.id)

        const mapIds = assignments?.map((a) => a.map_id) || []
        if (mapIds.length === 0) {
          setAllMaps([])
          return
        }
        query = query.in('id', mapIds)
      }

      const { data, error } = await query
      if (error) throw error
      setAllMaps(data || [])
    } catch (error) {
      console.error('Error fetching maps:', error)
    }
  }

  const handleMapClick = (mapId) => {
    setSearchQuery('')
    setShowResults(false)
    navigate(`/maps/${mapId}`)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchResults.length > 0) {
      handleMapClick(searchResults[0].id)
    }
  }

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

      {/* Barra de Pesquisa */}
      <div className="mb-8 relative max-w-2xl mx-auto">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className={`relative flex items-center bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 transition-all duration-200 ${
            searchFocused 
              ? 'border-primary-500 shadow-xl shadow-primary-500/20' 
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}>
            <div className="pl-6 pr-4">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                // Delay para permitir clique nos resultados
                setTimeout(() => setSearchFocused(false), 200)
              }}
              placeholder="Pesquisar mapas por nome..."
              className="flex-1 py-4 px-2 bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setShowResults(false)
                }}
                className="pr-4 pl-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>

        {/* Dropdown de Resultados */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="py-2">
              {searchResults.map((map) => (
                <button
                  key={map.id}
                  onClick={() => handleMapClick(map.id)}
                  className="w-full text-left px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <Map className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors duration-150 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-150 truncate">
                          {map.name}
                        </p>
                        {map.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {map.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      map.type === 'congregacao'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        : map.type === 'grupo'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {map.type === 'congregacao' ? 'Congregação' : map.type === 'grupo' ? 'Grupo' : 'Sub Mapa'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showResults && searchQuery && searchResults.length === 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">Nenhum mapa encontrado</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Tente pesquisar com outros termos
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`${stat.color} p-3 rounded-md transition-transform duration-300 hover:scale-110 hover:rotate-3`}>
                    <Icon className="h-6 w-6 text-white transition-transform duration-300" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate transition-colors duration-200">
                        {stat.title}
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
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
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
        >
          <div className="p-5">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              Ver Mapas
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
              {isSuperintendente
                ? 'Visualize e gerencie todos os mapas cadastrados'
                : 'Visualize seus mapas atribuídos'}
            </p>
          </div>
        </Link>

        <Link
          to="/global-map"
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
        >
          <div className="p-5">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              Mapa Geral Completo
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
              Visualize todos os mapas em um mapa maior e mais detalhado
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard

