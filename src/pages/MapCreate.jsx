import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import MapEditor from '../components/MapEditor'
import { Save, X } from 'lucide-react'

const MapCreate = () => {
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

  const handleSave = async () => {
    if (!name.trim()) {
      setError('O nome do mapa é obrigatório')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Criar o mapa
      const { data: map, error: mapError } = await supabase
        .from('maps')
        .insert([
          {
            name,
            description,
            type,
            created_by: userProfile?.id,
          },
        ])
        .select()
        .single()

      if (mapError) throw mapError

      // Adicionar pontos
      if (points.length > 0) {
        const pointsData = points.map((point) => ({
          map_id: map.id,
          latitude: point.lat,
          longitude: point.lng,
        }))

        const { error: pointsError } = await supabase
          .from('map_points')
          .insert(pointsData)

        if (pointsError) throw pointsError
      }

      // Adicionar polígonos
      if (polygons.length > 0) {
        const polygonsData = polygons.map((polygon) => ({
          map_id: map.id,
          coordinates: polygon.coordinates,
        }))

        const { error: polygonsError } = await supabase
          .from('map_polygons')
          .insert(polygonsData)

        if (polygonsError) throw polygonsError
      }

      navigate('/maps')
    } catch (err) {
      console.error('Error creating map:', err)
      setError(err.message || 'Erro ao criar mapa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Criar Novo Mapa</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Adicione pontos e polígonos ao mapa
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
              placeholder="Digite o nome do mapa"
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
              placeholder="Digite uma descrição para o mapa"
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
                className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-md text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:hover:scale-100"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Mapa'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapCreate

