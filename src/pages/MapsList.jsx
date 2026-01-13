import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { Map, Plus, Edit, Eye, CheckCircle, Clock, Trash2 } from 'lucide-react'

const MapsList = () => {
  const { userProfile, isSuperintendente } = useAuth()
  const [maps, setMaps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaps()
  }, [userProfile, isSuperintendente])

  const fetchMaps = async () => {
    try {
      let query = supabase.from('maps').select('*').order('created_at', { ascending: false })

      if (!isSuperintendente) {
        // Para dirigentes, mostrar apenas mapas atribuídos
        const { data: assignments } = await supabase
          .from('map_assignments')
          .select('map_id')
          .eq('dirigente_id', userProfile?.id)

        const mapIds = assignments?.map((a) => a.map_id) || []
        if (mapIds.length === 0) {
          setMaps([])
          setLoading(false)
          return
        }
        query = query.in('id', mapIds)
      }

      const { data, error } = await query

      if (error) throw error

      // Buscar informações de visitas para cada mapa
      const mapsWithStatus = await Promise.all(
        (data || []).map(async (map) => {
          if (isSuperintendente) {
            const { data: visits } = await supabase
              .from('map_visits')
              .select('id')
              .eq('map_id', map.id)
            return { ...map, type: map.type || 'congregacao', visited: (visits?.length || 0) > 0 }
          } else {
            const { data: visits } = await supabase
              .from('map_visits')
              .select('id')
              .eq('map_id', map.id)
              .eq('dirigente_id', userProfile?.id)
            return { ...map, type: map.type || 'congregacao', visited: (visits?.length || 0) > 0 }
          }
        })
      )

      setMaps(mapsWithStatus)
    } catch (error) {
      console.error('Error fetching maps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMap = async (mapId, mapName) => {
    if (!confirm(`Tem certeza que deseja excluir o mapa "${mapName}"?\n\nEsta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabase.from('maps').delete().eq('id', mapId)

      if (error) throw error

      // Recarregar lista de mapas
      fetchMaps()
    } catch (err) {
      console.error('Error deleting map:', err)
      alert('Erro ao excluir mapa. Verifique se você tem permissão.')
    }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mapas</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isSuperintendente
              ? 'Gerencie todos os mapas cadastrados'
              : 'Seus mapas atribuídos'}
          </p>
        </div>
        {isSuperintendente && (
          <Link
            to="/maps/create"
            className="mt-4 sm:mt-0 inline-flex items-center px-5 py-2.5 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5 mr-2" />
            Criar Mapa
          </Link>
        )}
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-12">
          <Map className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum mapa</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isSuperintendente
              ? 'Comece criando um novo mapa'
              : 'Você não possui mapas atribuídos'}
          </p>
          {isSuperintendente && (
            <div className="mt-6">
              <Link
                to="/maps/create"
                className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Plus className="h-5 w-5 mr-2" />
                Criar Mapa
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{map.name}</h3>
                  {map.visited ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      map.type === 'congregacao'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : map.type === 'grupo'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    {map.type === 'congregacao'
                      ? 'Congregação'
                      : map.type === 'grupo'
                      ? 'Grupo'
                      : 'Sub Mapa'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{map.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(map.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex space-x-2">
                    <Link
                      to={`/maps/${map.id}`}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Link>
                    {isSuperintendente && (
                      <>
                        <Link
                          to={`/maps/${map.id}/edit`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDeleteMap(map.id, map.name)}
                          className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MapsList

