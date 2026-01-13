import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MapContainer, TileLayer, Marker, Polygon, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { Layers } from 'lucide-react'

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const GlobalMapView = ({ showTitle = true, height = '500px' }) => {
  const { userProfile, isSuperintendente } = useAuth()
  const [maps, setMaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleLayers, setVisibleLayers] = useState({
    congregacao: true,
    grupo: true,
    submapa: true,
  })

  useEffect(() => {
    fetchAllMaps()
  }, [userProfile, isSuperintendente])

  const fetchAllMaps = async () => {
    try {
      let query = supabase.from('maps').select('id, name, description, type')

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

      const { data: mapsData, error: mapsError } = await query

      if (mapsError) throw mapsError

      // Buscar pontos e polígonos para cada mapa
      const mapsWithData = await Promise.all(
        (mapsData || []).map(async (map) => {
          const { data: points } = await supabase
            .from('map_points')
            .select('*')
            .eq('map_id', map.id)

          const { data: polygons } = await supabase
            .from('map_polygons')
            .select('*')
            .eq('map_id', map.id)

          return {
            ...map,
            type: map.type || 'congregacao',
            points: points || [],
            polygons: polygons || [],
          }
        })
      )

      setMaps(mapsWithData)
    } catch (error) {
      console.error('Error fetching maps:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleLayer = (type) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'congregacao':
        return '#3b82f6' // Azul
      case 'grupo':
        return '#10b981' // Verde
      case 'submapa':
        return '#f59e0b' // Amarelo/Laranja
      default:
        return '#6b7280' // Cinza
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'congregacao':
        return 'Congregação'
      case 'grupo':
        return 'Grupo'
      case 'submapa':
        return 'Sub Mapa'
      default:
        return 'Desconhecido'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  // Filtrar mapas visíveis
  const visibleMaps = maps.filter((map) => visibleLayers[map.type])

  // Calcular centro baseado nos pontos
  const allPoints = visibleMaps.flatMap((map) => map.points)
  const center =
    allPoints.length > 0
      ? [allPoints[0].latitude, allPoints[0].longitude]
      : [-2.9048, -41.7767] // Parnaíba, Piauí como padrão

  // Agrupar mapas por tipo
  const mapsByType = {
    congregacao: maps.filter((m) => m.type === 'congregacao'),
    grupo: maps.filter((m) => m.type === 'grupo'),
    submapa: maps.filter((m) => m.type === 'submapa'),
  }

  return (
    <div>
      {showTitle && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa Geral</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Visualize todos os mapas em um único mapa interativo
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden relative">
        {/* Controles de Camadas */}
        <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-3">
            <Layers className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Camadas</h3>
          </div>
          <div className="space-y-2">
            {['congregacao', 'grupo', 'submapa'].map((type) => (
              <label
                key={type}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleLayers[type]}
                  onChange={() => toggleLayer(type)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="ml-3 flex items-center">
                  <div
                    className="w-3 h-3 rounded mr-2"
                    style={{ backgroundColor: getTypeColor(type) }}
                  ></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {getTypeLabel(type)} ({mapsByType[type]?.length || 0})
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ height, width: '100%' }}>
          {visibleMaps.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {maps.length === 0
                    ? 'Nenhum mapa disponível'
                    : 'Nenhuma camada visível. Ative pelo menos uma camada.'}
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {visibleMaps.map((map) => {
                const color = getTypeColor(map.type)

                return (
                  <div key={map.id}>
                    {map.points.map((point) => (
                      <Marker
                        key={point.id}
                        position={[point.latitude, point.longitude]}
                      >
                        <Popup>
                          <div>
                            <h3 className="font-semibold">{map.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {getTypeLabel(map.type)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{map.description}</p>
                            <Link
                              to={`/maps/${map.id}`}
                              className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 mt-2 inline-block"
                            >
                              Ver detalhes →
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {map.polygons.map((polygon) => (
                      <Polygon
                        key={polygon.id}
                        positions={polygon.coordinates.map((coord) => [
                          coord[0],
                          coord[1],
                        ])}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.2,
                        }}
                      >
                        <Popup>
                          <div>
                            <h3 className="font-semibold">{map.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {getTypeLabel(map.type)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{map.description}</p>
                            <Link
                              to={`/maps/${map.id}`}
                              className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 mt-2 inline-block"
                            >
                              Ver detalhes →
                            </Link>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}
                  </div>
                )
              })}
            </MapContainer>
          )}
        </div>
      </div>

      {maps.length > 0 && showTitle && (
        <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Legenda</h3>
          <div className="space-y-4">
            {['congregacao', 'grupo', 'submapa'].map((type) => {
              const typeMaps = mapsByType[type]
              if (typeMaps.length === 0) return null

              return (
                <div key={type}>
                  <div className="flex items-center mb-2">
                    <div
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: getTypeColor(type) }}
                    ></div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {getTypeLabel(type)} ({typeMaps.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                    {typeMaps.map((map) => (
                      <Link
                        key={map.id}
                        to={`/maps/${map.id}`}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {map.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalMapView
