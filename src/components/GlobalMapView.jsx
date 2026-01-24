import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { Layers, Map, Satellite } from 'lucide-react'

// Componente para Google Maps Tile Layer
const GoogleTileLayer = ({ apiKey, mapType = 'roadmap' }) => {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!apiKey) {
      console.warn('Google Maps API Key não configurada. Usando OpenStreetMap como fallback.')
      return
    }

    // Remover layer anterior se existir
    if (layerRef.current && map.hasLayer(layerRef.current)) {
      map.removeLayer(layerRef.current)
    }

    // Definir tipo de mapa baseado no parâmetro
    // lyrs=m = mapa padrão, lyrs=y = híbrido (satélite com ruas)
    let lyrs = 'm'
    if (mapType === 'satellite') {
      lyrs = 'y' // Híbrido (satélite com ruas)
    }

    // Criar tile layer do Google Maps
    const googleLayer = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}&key=${apiKey}`,
      {
        attribution: '© Google Maps',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        tileSize: 256,
      }
    )

    googleLayer.addTo(map)
    layerRef.current = googleLayer

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [map, apiKey, mapType])

  return null
}

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Criar ícone customizado para pontos com cores suaves e clean
const createCustomPointIcon = (color) => {
  return L.divIcon({
    className: 'custom-point-icon',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.08);
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

// Componente para ajustar o mapa aos bounds do mapa da congregação
const FitBoundsToCongregacao = ({ congregacaoMap }) => {
  const map = useMap()

  useEffect(() => {
    if (!congregacaoMap) return

    const allCoordinates = []

    // Adicionar coordenadas dos pontos
    congregacaoMap.points.forEach((point) => {
      allCoordinates.push([point.latitude, point.longitude])
    })

    // Adicionar coordenadas dos polígonos
    congregacaoMap.polygons.forEach((polygon) => {
      if (polygon.coordinates && Array.isArray(polygon.coordinates)) {
        polygon.coordinates.forEach((coord) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            allCoordinates.push([coord[0], coord[1]])
          }
        })
      }
    })

    if (allCoordinates.length > 0) {
      // Criar bounds a partir de todas as coordenadas
      const bounds = L.latLngBounds(allCoordinates)
      
      // Ajustar o mapa para mostrar todos os bounds com padding
      map.fitBounds(bounds, {
        padding: [50, 50], // Padding de 50px em todas as direções
        maxZoom: 18, // Limitar o zoom máximo
      })
    }
  }, [map, congregacaoMap])

  return null
}


const GlobalMapView = ({ showTitle = true, showLegend = true, height = '500px' }) => {
  const { userProfile, isSuperintendente } = useAuth()
  const [maps, setMaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [mapType, setMapType] = useState('roadmap') // roadmap, satellite
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
      // Dirigentes agora podem visualizar todos os mapas cadastrados
      const { data: mapsData, error: mapsError } = await supabase
        .from('maps')
        .select('id, name, description, type')

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
        return '#93c5fd' // Azul suave (sky-300)
      case 'grupo':
        return '#86efac' // Verde suave (green-300)
      case 'submapa':
        return '#fcd34d' // Amarelo suave (yellow-300)
      default:
        return '#cbd5e1' // Cinza suave (slate-300)
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

  // Buscar mapa da congregação
  const congregacaoMap = maps.find((map) => map.type === 'congregacao')
  const congregacaoPoints = congregacaoMap?.points || []
  
  // Calcular centro baseado no mapa da congregação (prioridade)
  let center = [-2.9048, -41.7767] // Parnaíba, Piauí como padrão
  let initialZoom = 13
  
  if (congregacaoPoints.length > 0) {
    // Se houver mapa da congregação, usar o primeiro ponto dele
    center = [congregacaoPoints[0].latitude, congregacaoPoints[0].longitude]
    // Zoom inicial será ajustado pelo FitBoundsToCongregacao
    initialZoom = 12
  } else {
    // Fallback: usar o primeiro ponto dos mapas visíveis
    const allPoints = visibleMaps.flatMap((map) => map.points)
    if (allPoints.length > 0) {
      center = [allPoints[0].latitude, allPoints[0].longitude]
    }
  }

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
        {/* Controles de Camadas - Oculto em telas pequenas */}
        <div className="hidden md:block absolute top-4 right-4 z-[1000] bg-white/90 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center mb-3">
            <Layers className="h-5 w-5 text-gray-600 dark:text-gray-300 mr-2" />
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
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                />
                <div className="ml-3 flex items-center">
                  <div
                    className="w-3 h-3 rounded mr-2"
                    style={{ backgroundColor: getTypeColor(type) }}
                  ></div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {getTypeLabel(type)} ({mapsByType[type]?.length || 0})
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Controles de Visualização do Mapa - Apenas ícones */}
        {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-1.5">
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => setMapType('roadmap')}
                  className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                    mapType === 'roadmap'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Mapa"
                >
                  <Map className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`flex items-center justify-center p-2 rounded-md transition-colors ${
                    mapType === 'satellite'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Satélite"
                >
                  <Satellite className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

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
              zoom={initialZoom}
              style={{ height: '100%', width: '100%' }}
            >
              {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                <GoogleTileLayer 
                  apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} 
                  mapType={mapType}
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}
              {congregacaoMap && <FitBoundsToCongregacao congregacaoMap={congregacaoMap} />}
              {visibleMaps.map((map) => {
                const color = getTypeColor(map.type)

                return (
                  <div key={map.id}>
                    {map.points.map((point) => (
                      <Marker
                        key={point.id}
                        position={[point.latitude, point.longitude]}
                        icon={createCustomPointIcon(color)}
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

      {maps.length > 0 && showLegend && (
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
