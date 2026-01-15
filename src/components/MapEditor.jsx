import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Trash2, X } from 'lucide-react'

// Componente para Google Maps Tile Layer
const GoogleTileLayer = ({ apiKey }) => {
  const map = useMap()

  useEffect(() => {
    if (!apiKey) {
      console.warn('Google Maps API Key não configurada. Usando OpenStreetMap como fallback.')
      return
    }

    // Criar tile layer do Google Maps
    // lyrs=m = mapa padrão, lyrs=s = satélite, lyrs=y = híbrido
    const googleLayer = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${apiKey}`,
      {
        attribution: '© Google Maps',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        tileSize: 256,
      }
    )

    googleLayer.addTo(map)

    return () => {
      if (map.hasLayer(googleLayer)) {
        map.removeLayer(googleLayer)
      }
    }
  }, [map, apiKey])

  return null
}

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Criar ícone customizado para handles de vértices (quadrados brancos)
const createVertexHandleIcon = () => {
  return L.divIcon({
    className: 'vertex-handle',
    html: '<div style="width: 12px; height: 12px; background: white; border: 2px solid #3b82f6; border-radius: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: move;"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// Ícone para handle no meio da aresta (para adicionar vértice)
const createMidpointHandleIcon = () => {
  return L.divIcon({
    className: 'midpoint-handle',
    html: '<div style="width: 10px; height: 10px; background: #3b82f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

const MapClickHandler = ({ onMapClick, mode, editingPolygon, isDrawingPolygon, isDragging }) => {
  const map = useMap()
  
  useEffect(() => {
    const handleClick = (e) => {
      // Não adicionar vértice se estiver arrastando
      if (isDragging.current) {
        return
      }

      // Se estiver editando um polígono, adicionar vértice na posição clicada
      if (editingPolygon && (mode === 'edit' || mode === 'polygon')) {
        onMapClick(e.latlng, 'add-vertex')
        return
      }
      
      if (mode === 'point' || mode === 'polygon') {
        onMapClick(e.latlng)
      }
    }
    
    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [map, mode, onMapClick, editingPolygon, isDrawingPolygon, isDragging])
  
  return null
}

const MapEditor = ({ initialPoints = [], initialPolygons = [], onPointsChange, onPolygonsChange, mode = 'view' }) => {
  const [points, setPoints] = useState(initialPoints)
  const [polygons, setPolygons] = useState(initialPolygons)
  const [currentPolygon, setCurrentPolygon] = useState([])
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
  const [editingPoint, setEditingPoint] = useState(null)
  const [editingPolygon, setEditingPolygon] = useState(null)
  const isDragging = useRef(false)

  useEffect(() => {
    setPoints(initialPoints)
  }, [initialPoints])

  useEffect(() => {
    setPolygons(initialPolygons)
  }, [initialPolygons])

  // Calcular centro inicial apenas uma vez
  const getInitialCenter = () => {
    if (points.length > 0 && points[0]?.lat && points[0]?.lng) {
      return [points[0].lat, points[0].lng]
    }
    if (polygons.length > 0 && polygons[0]?.coordinates && polygons[0].coordinates.length > 0) {
      return [polygons[0].coordinates[0][0], polygons[0].coordinates[0][1]]
    }
    return [-2.9048, -41.7767] // Parnaíba, Piauí
  }

  const initialCenter = getInitialCenter()
  const initialZoom = points.length > 0 || (polygons.length > 0 && polygons[0]?.coordinates?.length > 0) ? 13 : 12

  const updatePolygon = (id, newCoordinates) => {
    const updatedPolygons = polygons.map((p) =>
      p.id === id ? { ...p, coordinates: newCoordinates } : p
    )
    setPolygons(updatedPolygons)
    onPolygonsChange?.(updatedPolygons)
  }

  const handleMapClick = (latlng, action = 'normal') => {
    if (action === 'add-vertex' && editingPolygon) {
      // Adicionar vértice ao polígono sendo editado
      const polygon = polygons.find(p => p.id === editingPolygon)
      if (polygon) {
        const newCoordinates = [...polygon.coordinates, [latlng.lat, latlng.lng]]
        updatePolygon(editingPolygon, newCoordinates)
      }
      return
    }

    // No modo edit, não adicionar novos pontos/polígonos
    if (mode === 'edit') {
      return
    }

    if (mode === 'point' && !editingPoint && !editingPolygon) {
      const newPoint = {
        id: Date.now(),
        lat: latlng.lat,
        lng: latlng.lng,
      }
      const updatedPoints = [...points, newPoint]
      setPoints(updatedPoints)
      onPointsChange?.(updatedPoints)
    } else if (mode === 'polygon' && !editingPolygon) {
      if (!isDrawingPolygon) {
        setIsDrawingPolygon(true)
        setCurrentPolygon([latlng])
      } else {
        const updatedPolygon = [...currentPolygon, latlng]
        setCurrentPolygon(updatedPolygon)
      }
    }
  }

  const finishPolygon = () => {
    if (currentPolygon.length >= 3) {
      const newPolygon = {
        id: Date.now(),
        coordinates: currentPolygon.map((p) => [p.lat, p.lng]),
      }
      const updatedPolygons = [...polygons, newPolygon]
      setPolygons(updatedPolygons)
      onPolygonsChange?.(updatedPolygons)
    }
    setCurrentPolygon([])
    setIsDrawingPolygon(false)
  }

  const removePoint = (id) => {
    const updatedPoints = points.filter((p) => p.id !== id)
    setPoints(updatedPoints)
    onPointsChange?.(updatedPoints)
    setEditingPoint(null)
  }

  const removePolygon = (id) => {
    const updatedPolygons = polygons.filter((p) => p.id !== id)
    setPolygons(updatedPolygons)
    onPolygonsChange?.(updatedPolygons)
    setEditingPolygon(null)
  }

  const removePolygonVertex = (polygonId, vertexIndex) => {
    const polygon = polygons.find(p => p.id === polygonId)
    if (polygon && polygon.coordinates.length > 3) {
      const newCoordinates = polygon.coordinates.filter((_, index) => index !== vertexIndex)
      updatePolygon(polygonId, newCoordinates)
    }
  }

  const addVertexAtMidpoint = (polygonId, vertexIndex) => {
    const polygon = polygons.find(p => p.id === polygonId)
    if (polygon && polygon.coordinates.length > vertexIndex) {
      const current = polygon.coordinates[vertexIndex]
      const next = polygon.coordinates[(vertexIndex + 1) % polygon.coordinates.length]
      const midpoint = [
        (current[0] + next[0]) / 2,
        (current[1] + next[1]) / 2
      ]
      const newCoordinates = [...polygon.coordinates]
      newCoordinates.splice(vertexIndex + 1, 0, midpoint)
      updatePolygon(polygonId, newCoordinates)
    }
  }

  const updatePoint = (id, newLat, newLng) => {
    const updatedPoints = points.map((p) =>
      p.id === id ? { ...p, lat: newLat, lng: newLng } : p
    )
    setPoints(updatedPoints)
    onPointsChange?.(updatedPoints)
  }

  const updatePolygonVertex = (polygonId, vertexIndex, newLat, newLng) => {
    const polygon = polygons.find(p => p.id === polygonId)
    if (polygon) {
      const newCoordinates = [...polygon.coordinates]
      newCoordinates[vertexIndex] = [newLat, newLng]
      updatePolygon(polygonId, newCoordinates)
    }
  }

  // Calcular pontos médios para adicionar handles
  const getMidpoints = (coordinates) => {
    const midpoints = []
    for (let i = 0; i < coordinates.length; i++) {
      const current = coordinates[i]
      const next = coordinates[(i + 1) % coordinates.length]
      midpoints.push([
        (current[0] + next[0]) / 2,
        (current[1] + next[1]) / 2
      ])
    }
    return midpoints
  }

  return (
    <div className="relative">
      <style>{`
        .vertex-handle {
          background: transparent !important;
          border: none !important;
        }
        .midpoint-handle {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '500px', width: '100%' }}
        whenCreated={() => {}}
      >
        {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
          <GoogleTileLayer apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <MapClickHandler 
          onMapClick={handleMapClick} 
          mode={mode} 
          editingPolygon={editingPolygon}
          isDrawingPolygon={isDrawingPolygon}
          isDragging={isDragging}
        />
        
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            draggable={(mode === 'edit' || mode === 'point') && !editingPoint && !editingPolygon}
            eventHandlers={{
              dragstart: () => {
                isDragging.current = true
              },
              dragend: (e) => {
                isDragging.current = false
                if ((mode === 'edit' || mode === 'point') && !editingPolygon) {
                  const newPos = e.target.getLatLng()
                  updatePoint(point.id, newPos.lat, newPos.lng)
                }
              },
              click: (e) => {
                if ((mode === 'edit' || mode === 'point') && !editingPolygon) {
                  e.originalEvent.stopPropagation()
                  setEditingPoint(point.id)
                }
              },
            }}
          >
            {editingPoint === point.id && (mode === 'edit' || mode === 'point') && !editingPolygon && (
              <Popup>
                <div className="p-2">
                  <p className="text-sm font-medium mb-2">Editar Ponto</p>
                  <button
                    onClick={() => removePoint(point.id)}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Arraste o marcador para mover
                  </p>
                </div>
              </Popup>
            )}
          </Marker>
        ))}

        {polygons.map((polygon) => {
          const isEditing = editingPolygon === polygon.id
          const coordinates = polygon.coordinates.map((coord) => [coord[0], coord[1]])
          const midpoints = isEditing ? getMidpoints(coordinates) : []
          
          return (
            <div key={polygon.id}>
              <Polygon
                positions={coordinates}
                pathOptions={{
                  color: isEditing ? '#3b82f6' : '#2563eb',
                  fillColor: isEditing ? '#60a5fa' : '#3b82f6',
                  fillOpacity: isEditing ? 0.35 : 0.3,
                  weight: isEditing ? 2.5 : 2,
                  dashArray: isEditing ? '10, 5' : undefined,
                }}
                eventHandlers={{
                  click: (e) => {
                    if ((mode === 'edit' || mode === 'polygon') && !isDrawingPolygon && !isDragging.current) {
                      setEditingPolygon(isEditing ? null : polygon.id)
                      setEditingPoint(null)
                    }
                  },
                }}
              >
                {isEditing && (mode === 'edit' || mode === 'polygon') && (
                  <Popup>
                    <div className="p-2">
                      <p className="text-sm font-medium mb-2">Editar Polígono</p>
                      <button
                        onClick={() => {
                          setEditingPolygon(null)
                        }}
                        className="w-full mb-2 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
                      >
                        Finalizar Edição
                      </button>
                      <button
                        onClick={() => removePolygon(polygon.id)}
                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Polígono
                      </button>
                    </div>
                  </Popup>
                )}
              </Polygon>
              
              {/* Handles nos vértices (quadrados brancos) */}
              {isEditing && (mode === 'edit' || mode === 'polygon') && coordinates.map((coord, index) => (
                <Marker
                  key={`vertex-${polygon.id}-${index}`}
                  position={coord}
                  icon={createVertexHandleIcon()}
                  draggable={true}
                  zIndexOffset={1000}
                  eventHandlers={{
                    dragstart: () => {
                      isDragging.current = true
                    },
                    dragend: (e) => {
                      isDragging.current = false
                      const newPos = e.target.getLatLng()
                      updatePolygonVertex(polygon.id, index, newPos.lat, newPos.lng)
                    },
                    click: (e) => {
                      e.originalEvent.stopPropagation()
                    },
                  }}
                >
                  <Popup autoClose={false} closeOnClick={false}>
                    <div className="p-2">
                      <p className="text-sm font-medium mb-2">Vértice {index + 1}</p>
                      {coordinates.length > 3 && (
                        <button
                          onClick={() => removePolygonVertex(polygon.id, index)}
                          className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remover Vértice
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Arraste para mover
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Handles nos pontos médios (círculos azuis) para adicionar vértices */}
              {isEditing && (mode === 'edit' || mode === 'polygon') && midpoints.map((midpoint, index) => (
                <Marker
                  key={`midpoint-${polygon.id}-${index}`}
                  position={midpoint}
                  icon={createMidpointHandleIcon()}
                  zIndexOffset={999}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent.stopPropagation()
                      addVertexAtMidpoint(polygon.id, index)
                    },
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <p className="text-xs text-gray-600">Clique para adicionar vértice</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </div>
          )
        })}

        {isDrawingPolygon && currentPolygon.length > 0 && (
          <Polygon
            positions={currentPolygon}
            pathOptions={{
              color: '#f59e0b',
              fillColor: '#fbbf24',
              fillOpacity: 0.3,
              weight: 2,
            }}
          />
        )}
      </MapContainer>

      {isDrawingPolygon && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-[1000] border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Clique no mapa para adicionar pontos ao polígono
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {currentPolygon.length} ponto(s) adicionado(s)
          </p>
          <div className="flex space-x-2">
            <button
              onClick={finishPolygon}
              disabled={currentPolygon.length < 3}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalizar
            </button>
            <button
              onClick={() => {
                setCurrentPolygon([])
                setIsDrawingPolygon(false)
              }}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editingPolygon && (mode === 'edit' || mode === 'polygon') && (
        <div className="absolute top-4 right-4 bg-gray-800 dark:bg-gray-900 text-white p-4 rounded-lg shadow-lg z-[1000] border border-gray-700 max-w-xs">
          <p className="text-sm font-medium mb-2">Editando Polígono</p>
          <p className="text-xs text-gray-300 mb-1">
            • Arraste os handles brancos para mover vértices
          </p>
          <p className="text-xs text-gray-300 mb-1">
            • Clique nos círculos azuis para adicionar vértices
          </p>
          <p className="text-xs text-gray-300 mb-1">
            • Clique nos vértices para remover
          </p>
          <p className="text-xs text-gray-300 mb-3">
            • Clique no mapa para adicionar vértice na posição
          </p>
          <button
            onClick={() => setEditingPolygon(null)}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
          >
            Finalizar Edição
          </button>
        </div>
      )}

      {mode === 'edit' && (points.length > 0 || polygons.length > 0) && !editingPolygon && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg z-[1000] border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            <strong>Modo Edição:</strong>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            • Clique em pontos para editar/excluir
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            • Arraste pontos para movê-los
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            • Clique em polígonos para editar vértices
          </p>
        </div>
      )}
    </div>
  )
}

export default MapEditor
