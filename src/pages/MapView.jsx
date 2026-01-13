import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import MapEditor from '../components/MapEditor'
import { CheckCircle, Clock, ArrowLeft, MapPin, Edit, Users, History } from 'lucide-react'

const MapView = () => {
  const { id } = useParams()
  const { userProfile, isDirigente, isSuperintendente } = useAuth()
  const navigate = useNavigate()
  const [map, setMap] = useState(null)
  const [points, setPoints] = useState([])
  const [polygons, setPolygons] = useState([])
  const [loading, setLoading] = useState(true)
  const [visited, setVisited] = useState(false)
  const [visiting, setVisiting] = useState(false)
  const [visitsHistory, setVisitsHistory] = useState([])
  const [assignments, setAssignments] = useState([])

  useEffect(() => {
    fetchMap()
    checkVisit()
    fetchVisitsHistory()
    fetchAssignments()
  }, [id, userProfile])

  const fetchMap = async () => {
    try {
      const { data: mapData, error: mapError } = await supabase
        .from('maps')
        .select('*')
        .eq('id', id)
        .single()

      if (mapError) throw mapError
      setMap(mapData)

      // Buscar pontos
      const { data: mapPoints, error: pointsError } = await supabase
        .from('map_points')
        .select('*')
        .eq('map_id', id)

      if (pointsError) throw pointsError

      const formattedPoints = (mapPoints || []).map((p) => ({
        id: p.id,
        lat: p.latitude,
        lng: p.longitude,
      }))
      setPoints(formattedPoints)

      // Buscar polígonos
      const { data: mapPolygons, error: polygonsError } = await supabase
        .from('map_polygons')
        .select('*')
        .eq('map_id', id)

      if (polygonsError) throw polygonsError

      const formattedPolygons = (mapPolygons || []).map((p) => ({
        id: p.id,
        coordinates: p.coordinates,
      }))
      setPolygons(formattedPolygons)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching map:', err)
      setLoading(false)
    }
  }

  const checkVisit = async () => {
    if (!isDirigente || !userProfile) return

    try {
      const { data, error } = await supabase
        .from('map_visits')
        .select('id')
        .eq('map_id', id)
        .eq('dirigente_id', userProfile.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setVisited(!!data)
    } catch (err) {
      console.error('Error checking visit:', err)
    }
  }

  const handleMarkAsVisited = async () => {
    if (!isDirigente || !userProfile) return

    setVisiting(true)
    try {
      const { error } = await supabase.from('map_visits').insert([
        {
          map_id: id,
          dirigente_id: userProfile.id,
          visited_at: new Date().toISOString(),
        },
      ])

      if (error) throw error
      setVisited(true)
      fetchVisitsHistory() // Atualizar histórico após marcar como visitado
    } catch (err) {
      console.error('Error marking as visited:', err)
      alert('Erro ao marcar mapa como visitado')
    } finally {
      setVisiting(false)
    }
  }

  const fetchVisitsHistory = async () => {
    try {
      const { data: visits, error: visitsError } = await supabase
        .from('map_visits')
        .select('id, visited_at, dirigente_id')
        .eq('map_id', id)
        .order('visited_at', { ascending: false })

      if (visitsError) throw visitsError

      // Buscar informações dos dirigentes
      if (visits && visits.length > 0) {
        const dirigenteIds = [...new Set(visits.map(v => v.dirigente_id))]
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', dirigenteIds)

        if (usersError) throw usersError

        // Combinar visitas com dados dos usuários
        const visitsWithUsers = visits.map(visit => ({
          ...visit,
          user: users?.find(u => u.id === visit.dirigente_id) || null
        }))

        setVisitsHistory(visitsWithUsers)
      } else {
        setVisitsHistory([])
      }
    } catch (err) {
      console.error('Error fetching visits history:', err)
      setVisitsHistory([])
    }
  }

  const fetchAssignments = async () => {
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('map_assignments')
        .select('id, assigned_at, dirigente_id')
        .eq('map_id', id)
        .order('assigned_at', { ascending: false })

      if (assignmentsError) throw assignmentsError

      // Buscar informações dos dirigentes
      if (assignmentsData && assignmentsData.length > 0) {
        const dirigenteIds = [...new Set(assignmentsData.map(a => a.dirigente_id))]
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', dirigenteIds)

        if (usersError) throw usersError

        // Combinar atribuições com dados dos usuários
        const assignmentsWithUsers = assignmentsData.map(assignment => ({
          ...assignment,
          user: users?.find(u => u.id === assignment.dirigente_id) || null
        }))

        setAssignments(assignmentsWithUsers)
      } else {
        setAssignments([])
      }
    } catch (err) {
      console.error('Error fetching assignments:', err)
      setAssignments([])
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!map) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Mapa não encontrado</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/maps')}
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Mapas
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{map.name}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{map.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            {isSuperintendente && (
              <Link
                to={`/maps/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Edit className="h-5 w-5 mr-2" />
                Editar Mapa
              </Link>
            )}
            {isDirigente && (
              <div>
                {visited ? (
                  <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Visitado
                  </div>
                ) : (
                  <button
                    onClick={handleMarkAsVisited}
                    disabled={visiting}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    <MapPin className="h-5 w-5 mr-2" />
                    {visiting ? 'Marcando...' : 'Marcar como Visitado'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Visualização do Mapa</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {points.length} ponto(s) • {polygons.length} polígono(s)
            </div>
          </div>
        </div>
        <MapEditor
          initialPoints={points}
          initialPolygons={polygons}
          mode="view"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Atribuições */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 mr-2 text-primary-600" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Dirigentes Atribuídos</h2>
          </div>
          {assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {assignment.user?.name || assignment.user?.email || 'Usuário não encontrado'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Atribuído em {formatDate(assignment.assigned_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhum dirigente atribuído a este mapa
            </p>
          )}
        </div>

        {/* Histórico de Visitas */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <History className="h-5 w-5 mr-2 text-primary-600" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Histórico de Visitas</h2>
          </div>
          {visitsHistory.length > 0 ? (
            <div className="space-y-3">
              {visitsHistory.map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {visit.user?.name || visit.user?.email || 'Usuário não encontrado'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                      Visitado em {formatDate(visit.visited_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhuma visita registrada para este mapa
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapView

