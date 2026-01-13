import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import MapEditor from '../components/MapEditor'
import { Save, X, Users } from 'lucide-react'

const MapEdit = () => {
  const { id } = useParams()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('congregacao')
  const [points, setPoints] = useState([])
  const [polygons, setPolygons] = useState([])
  const [mode, setMode] = useState('view')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dirigentes, setDirigentes] = useState([])
  const [assignedDirigentes, setAssignedDirigentes] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)

  useEffect(() => {
    fetchMap()
    fetchDirigentes()
    fetchAssignments()
  }, [id])

  const fetchMap = async () => {
    try {
      const { data: map, error: mapError } = await supabase
        .from('maps')
        .select('*')
        .eq('id', id)
        .single()

      if (mapError) throw mapError

      setName(map.name)
      setDescription(map.description || '')
      setType(map.type || 'congregacao')

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
    } catch (err) {
      console.error('Error fetching map:', err)
      setError('Erro ao carregar mapa')
    }
  }

  const fetchDirigentes = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'dirigente')

      if (error) throw error
      setDirigentes(data || [])
    } catch (err) {
      console.error('Error fetching dirigentes:', err)
    }
  }

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('map_assignments')
        .select('dirigente_id')
        .eq('map_id', id)

      if (error) throw error
      setAssignedDirigentes((data || []).map((a) => a.dirigente_id))
    } catch (err) {
      console.error('Error fetching assignments:', err)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('O nome do mapa é obrigatório')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Atualizar o mapa
      const { error: mapError } = await supabase
        .from('maps')
        .update({ name, description, type })
        .eq('id', id)

      if (mapError) throw mapError

      // Remover pontos e polígonos antigos
      await supabase.from('map_points').delete().eq('map_id', id)
      await supabase.from('map_polygons').delete().eq('map_id', id)

      // Adicionar novos pontos
      if (points.length > 0) {
        const pointsData = points.map((point) => ({
          map_id: id,
          latitude: point.lat,
          longitude: point.lng,
        }))

        const { error: pointsError } = await supabase
          .from('map_points')
          .insert(pointsData)

        if (pointsError) throw pointsError
      }

      // Adicionar novos polígonos
      if (polygons.length > 0) {
        const polygonsData = polygons.map((polygon) => ({
          map_id: id,
          coordinates: polygon.coordinates,
        }))

        const { error: polygonsError } = await supabase
          .from('map_polygons')
          .insert(polygonsData)

        if (polygonsError) throw polygonsError
      }

      navigate('/maps')
    } catch (err) {
      console.error('Error updating map:', err)
      setError(err.message || 'Erro ao atualizar mapa')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignDirigentes = async (selectedIds) => {
    try {
      // Remover atribuições antigas
      await supabase.from('map_assignments').delete().eq('map_id', id)

      // Adicionar novas atribuições
      if (selectedIds.length > 0) {
        const assignments = selectedIds.map((dirigenteId) => ({
          map_id: id,
          dirigente_id: dirigenteId,
        }))

        const { error } = await supabase
          .from('map_assignments')
          .insert(assignments)

        if (error) throw error
      }

      setAssignedDirigentes(selectedIds)
      setShowAssignModal(false)
    } catch (err) {
      console.error('Error assigning dirigentes:', err)
      setError('Erro ao atribuir dirigentes')
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Editar Mapa</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Edite as informações e elementos do mapa
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome do Mapa *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo de Mapa *
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
            >
              <option value="congregacao">Mapa Geral da Congregação</option>
              <option value="grupo">Mapa de Grupo</option>
              <option value="submapa">Sub Mapa</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Atribuir a Dirigentes
              </label>
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Atribuições
              </button>
            </div>
            {assignedDirigentes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {dirigentes
                  .filter((d) => assignedDirigentes.includes(d.id))
                  .map((dirigente) => (
                    <span
                      key={dirigente.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                    >
                      {dirigente.name || dirigente.email}
                    </span>
                  ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Nenhum dirigente atribuído</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Modo de Edição
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMode('view')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  mode === 'view'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Visualizar
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  mode === 'edit'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Editar
              </button>
              <button
                onClick={() => setMode('point')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  mode === 'point'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Adicionar Ponto
              </button>
              <button
                onClick={() => setMode('polygon')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  mode === 'polygon'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Adicionar Polígono
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {mode === 'edit' && 'Clique em pontos ou polígonos para editar, arraste para mover e clique para remover'}
              {mode === 'point' && 'Clique no mapa para adicionar pontos'}
              {mode === 'polygon' && 'Clique no mapa para adicionar vértices do polígono'}
              {mode === 'view' && 'Visualize o mapa sem edições'}
            </p>
          </div>

          <div>
            <MapEditor
              initialPoints={points}
              initialPolygons={polygons}
              onPointsChange={setPoints}
              onPolygonsChange={setPolygons}
              mode={mode}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {points.length} ponto(s) • {polygons.length} polígono(s)
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/maps')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAssignModal && (
        <AssignDirigentesModal
          dirigentes={dirigentes}
          assignedIds={assignedDirigentes}
          onClose={() => setShowAssignModal(false)}
          onSave={handleAssignDirigentes}
        />
      )}
    </div>
  )
}

const AssignDirigentesModal = ({ dirigentes, assignedIds, onClose, onSave }) => {
  const [selectedIds, setSelectedIds] = useState(assignedIds)

  const toggleDirigente = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Atribuir Dirigentes
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {dirigentes.map((dirigente) => (
              <label
                key={dirigente.id}
                className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(dirigente.id)}
                  onChange={() => toggleDirigente(dirigente.id)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  {dirigente.name || dirigente.email}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(selectedIds)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapEdit

