import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Trash2, X, Map, Satellite } from 'lucide-react'

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

// Componente para ajustar o mapa aos bounds do mapa geral
const FitBoundsToGlobalMap = ({ globalMap }) => {
  const map = useMap()

  useEffect(() => {
    if (!globalMap) return

    const allCoordinates = []

    // Adicionar coordenadas dos polígonos do mapa geral
    if (globalMap.polygons && globalMap.polygons.length > 0) {
      globalMap.polygons.forEach((polygon) => {
        if (polygon.coordinates && Array.isArray(polygon.coordinates)) {
          polygon.coordinates.forEach((coord) => {
            if (Array.isArray(coord) && coord.length >= 2) {
              allCoordinates.push([coord[0], coord[1]])
            }
          })
        }
      })
    }

    // Adicionar coordenadas dos pontos do mapa geral (se não houver polígonos)
    if (allCoordinates.length === 0 && globalMap.points && globalMap.points.length > 0) {
      globalMap.points.forEach((point) => {
        allCoordinates.push([point.latitude, point.longitude])
      })
    }

    if (allCoordinates.length > 0) {
      // Criar bounds a partir de todas as coordenadas
      const bounds = L.latLngBounds(allCoordinates)
      
      // Ajustar o mapa para mostrar todos os bounds com padding
      map.fitBounds(bounds, {
        padding: [50, 50], // Padding de 50px em todas as direções
        maxZoom: 18, // Limitar o zoom máximo
      })
    }
  }, [map, globalMap])

  return null
}

const MapEditor = ({ initialPoints = [], initialPolygons = [], onPointsChange, onPolygonsChange, mode = 'view', globalMap = null }) => {
  const [points, setPoints] = useState(initialPoints)
  const [polygons, setPolygons] = useState(initialPolygons)
  const [currentPolygon, setCurrentPolygon] = useState([])
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
  const [editingPoint, setEditingPoint] = useState(null)
  const [editingPolygon, setEditingPolygon] = useState(null)
  const [mapType, setMapType] = useState('roadmap') // roadmap, satellite
  const [lastEditedVertexIndex, setLastEditedVertexIndex] = useState(null) // Índice do último vértice editado do polígono em edição
  const [lastEditedCurrentPolygonIndex, setLastEditedCurrentPolygonIndex] = useState(null) // Índice do último vértice editado do polígono em criação
  const [actionHistory, setActionHistory] = useState([]) // Histórico de ações para desfazer
  const isDragging = useRef(false)

  useEffect(() => {
    setPoints(initialPoints)
  }, [initialPoints])

  useEffect(() => {
    setPolygons(initialPolygons)
  }, [initialPolygons])

  // Adicionar ação ao histórico
  const addToHistory = useCallback((action) => {
    setActionHistory((prev) => [...prev, action])
  }, [])

  // Desfazer última ação
  const undoLastAction = useCallback(() => {
    setActionHistory((prev) => {
      if (prev.length === 0) return prev

      const lastAction = prev[prev.length - 1]
      const newHistory = prev.slice(0, -1)

      if (lastAction.type === 'add-point') {
        // Remover último ponto adicionado
        setPoints((currentPoints) => {
          const updatedPoints = currentPoints.filter((p) => p.id !== lastAction.pointId)
          onPointsChange?.(updatedPoints)
          return updatedPoints
        })
      } else if (lastAction.type === 'add-polygon-vertex' && editingPolygon) {
        // Remover último vértice adicionado ao polígono em edição
        setPolygons((currentPolygons) => {
          const polygon = currentPolygons.find((p) => p.id === editingPolygon)
          if (polygon && polygon.coordinates.length > 3) {
            const newCoordinates = polygon.coordinates.slice(0, -1)
            const updatedPolygons = currentPolygons.map((p) =>
              p.id === editingPolygon ? { ...p, coordinates: newCoordinates } : p
            )
            onPolygonsChange?.(updatedPolygons)
            setLastEditedVertexIndex(
              newCoordinates.length > 0 ? newCoordinates.length - 1 : null
            )
            return updatedPolygons
          }
          return currentPolygons
        })
      } else if (lastAction.type === 'add-current-polygon-vertex') {
        // Remover último vértice do polígono em criação
        setCurrentPolygon((current) => {
          if (current.length > 0) {
            const updatedPolygon = current.slice(0, -1)
            setLastEditedCurrentPolygonIndex(
              updatedPolygon.length > 0 ? updatedPolygon.length - 1 : null
            )
            return updatedPolygon
          }
          return current
        })
      }

      return newHistory
    })
  }, [editingPolygon, onPointsChange, onPolygonsChange])

  // Deletar vértice/ponto selecionado
  const deleteSelected = useCallback(() => {
    if (editingPoint !== null) {
      removePoint(editingPoint)
      setEditingPoint(null)
    } else if (editingPolygon !== null && lastEditedVertexIndex !== null) {
      const polygon = polygons.find((p) => p.id === editingPolygon)
      if (polygon && polygon.coordinates.length > 3) {
        removePolygonVertex(editingPolygon, lastEditedVertexIndex)
        setLastEditedVertexIndex(null)
      }
    } else if (isDrawingPolygon && lastEditedCurrentPolygonIndex !== null) {
      removeCurrentPolygonVertex(lastEditedCurrentPolygonIndex)
    }
  }, [editingPoint, editingPolygon, lastEditedVertexIndex, isDrawingPolygon, lastEditedCurrentPolygonIndex, polygons])

  // Cancelar criação de polígono
  const cancelPolygonCreation = useCallback(() => {
    if (isDrawingPolygon) {
      setCurrentPolygon([])
      setIsDrawingPolygon(false)
      setLastEditedCurrentPolygonIndex(null)
      setActionHistory([]) // Limpar histórico ao cancelar
    }
  }, [isDrawingPolygon])

  // Event listeners para atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+C ou Cmd+C para cancelar criação de polígono
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        // Só cancelar se não estiver em um campo de input
        const target = e.target
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable &&
          isDrawingPolygon
        ) {
          e.preventDefault()
          cancelPolygonCreation()
          return
        }
      }

      // Ctrl+Z ou Cmd+Z para desfazer
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoLastAction()
        return
      }

      // Backspace ou Delete para deletar selecionado
      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.metaKey) {
        // Só deletar se não estiver em um campo de input
        const target = e.target
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          e.preventDefault()
          deleteSelected()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undoLastAction, deleteSelected, cancelPolygonCreation, isDrawingPolygon])

  // Calcular centro inicial baseado no mapa geral (prioridade) ou nos pontos/polígonos do mapa atual
  const getInitialCenter = () => {
    // Prioridade 1: Mapa geral (congregacao)
    if (globalMap) {
      // Se houver polígonos no mapa geral, calcular centro a partir deles
      if (globalMap.polygons && globalMap.polygons.length > 0) {
        const allCoords = []
        globalMap.polygons.forEach((polygon) => {
          if (polygon.coordinates && Array.isArray(polygon.coordinates)) {
            polygon.coordinates.forEach((coord) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                allCoords.push([coord[0], coord[1]])
              }
            })
          }
        })
        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords)
          return bounds.getCenter()
        }
      }
      // Se houver pontos no mapa geral, usar o primeiro
      if (globalMap.points && globalMap.points.length > 0) {
        return [globalMap.points[0].latitude, globalMap.points[0].longitude]
      }
    }
    
    // Prioridade 2: Pontos do mapa atual
    if (points.length > 0 && points[0]?.lat && points[0]?.lng) {
      return [points[0].lat, points[0].lng]
    }
    
    // Prioridade 3: Polígonos do mapa atual
    if (polygons.length > 0 && polygons[0]?.coordinates && polygons[0].coordinates.length > 0) {
      return [polygons[0].coordinates[0][0], polygons[0].coordinates[0][1]]
    }
    
    // Fallback: Parnaíba, Piauí
    return [-2.9048, -41.7767]
  }

  const initialCenter = getInitialCenter()
  
  // Calcular zoom inicial baseado no mapa geral se disponível
  const getInitialZoom = () => {
    if (globalMap && globalMap.polygons && globalMap.polygons.length > 0) {
      return 12 // Zoom ajustado para mostrar o mapa geral
    }
    if (points.length > 0 || (polygons.length > 0 && polygons[0]?.coordinates?.length > 0)) {
      return 13
    }
    return 12
  }
  
  const initialZoom = getInitialZoom()

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
        const insertIndex = lastEditedVertexIndex !== null 
          ? lastEditedVertexIndex + 1 
          : polygon.coordinates.length
        
        const newCoordinates = [...polygon.coordinates]
        newCoordinates.splice(insertIndex, 0, [latlng.lat, latlng.lng])
        updatePolygon(editingPolygon, newCoordinates)
        
        // Atualizar o índice do último vértice editado para o novo vértice
        setLastEditedVertexIndex(insertIndex)
        // Adicionar ao histórico
        addToHistory({ type: 'add-polygon-vertex', polygonId: editingPolygon })
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
      // Adicionar ao histórico
      addToHistory({ type: 'add-point', pointId: newPoint.id })
    } else if (mode === 'polygon' && !editingPolygon) {
      if (!isDrawingPolygon) {
        setIsDrawingPolygon(true)
        setCurrentPolygon([latlng])
        setLastEditedCurrentPolygonIndex(0) // Primeiro vértice é o último editado
      } else {
        // Inserir após o último vértice editado, ou no final se não houver
        const insertIndex = lastEditedCurrentPolygonIndex !== null 
          ? lastEditedCurrentPolygonIndex + 1 
          : currentPolygon.length
        
        const updatedPolygon = [...currentPolygon]
        updatedPolygon.splice(insertIndex, 0, latlng)
        setCurrentPolygon(updatedPolygon)
        setLastEditedCurrentPolygonIndex(insertIndex) // Novo vértice é o último editado
        // Adicionar ao histórico
        addToHistory({ type: 'add-current-polygon-vertex' })
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
    setLastEditedCurrentPolygonIndex(null) // Resetar ao finalizar
  }

  // Atualizar vértice do polígono em criação
  const updateCurrentPolygonVertex = (index, newLat, newLng) => {
    const updatedPolygon = [...currentPolygon]
    updatedPolygon[index] = { lat: newLat, lng: newLng }
    setCurrentPolygon(updatedPolygon)
    setLastEditedCurrentPolygonIndex(index) // Atualizar o índice do último vértice editado
  }

  // Remover vértice do polígono em criação
  const removeCurrentPolygonVertex = (index) => {
    if (currentPolygon.length > 3) {
      const updatedPolygon = currentPolygon.filter((_, i) => i !== index)
      setCurrentPolygon(updatedPolygon)
    }
  }

  // Adicionar vértice no ponto médio do polígono em criação
  const addCurrentPolygonVertexAtMidpoint = (index) => {
    const current = currentPolygon[index]
    const next = currentPolygon[(index + 1) % currentPolygon.length]
    const midpoint = {
      lat: (current.lat + next.lat) / 2,
      lng: (current.lng + next.lng) / 2
    }
    const updatedPolygon = [...currentPolygon]
    const insertIndex = index + 1
    updatedPolygon.splice(insertIndex, 0, midpoint)
    setCurrentPolygon(updatedPolygon)
    setLastEditedCurrentPolygonIndex(insertIndex) // Novo vértice é o último editado
  }

  // Calcular pontos médios para o polígono em criação
  const getCurrentPolygonMidpoints = () => {
    const midpoints = []
    for (let i = 0; i < currentPolygon.length; i++) {
      const current = currentPolygon[i]
      const next = currentPolygon[(i + 1) % currentPolygon.length]
      midpoints.push({
        lat: (current.lat + next.lat) / 2,
        lng: (current.lng + next.lng) / 2
      })
    }
    return midpoints
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
      const insertIndex = vertexIndex + 1
      newCoordinates.splice(insertIndex, 0, midpoint)
      updatePolygon(polygonId, newCoordinates)
      
      // Atualizar o índice do último vértice editado para o novo vértice
      if (polygonId === editingPolygon) {
        setLastEditedVertexIndex(insertIndex)
      }
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
      
      // Atualizar o índice do último vértice editado
      if (polygonId === editingPolygon) {
        setLastEditedVertexIndex(vertexIndex)
      }
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

      {/* Controles de Visualização do Mapa */}
      {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 px-2">
              Visualização
            </div>
            <div className="flex flex-col space-y-1">
                <button
                  onClick={() => setMapType('roadmap')}
                  className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    mapType === 'roadmap'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Map className="h-4 w-4 mr-2" />
                  Mapa
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    mapType === 'satellite'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Satellite className="h-4 w-4 mr-2" />
                  Satélite
                </button>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '500px', width: '100%' }}
        whenCreated={() => {}}
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
        <MapClickHandler 
          onMapClick={handleMapClick} 
          mode={mode} 
          editingPolygon={editingPolygon}
          isDrawingPolygon={isDrawingPolygon}
          isDragging={isDragging}
        />
        
        {/* Ajustar bounds ao mapa geral se disponível */}
        {globalMap && <FitBoundsToGlobalMap globalMap={globalMap} />}
        
        {/* Renderizar contorno do mapa geral em vermelho */}
        {globalMap && globalMap.polygons && globalMap.polygons.map((polygon) => (
          <Polygon
            key={`global-${polygon.id}`}
            positions={polygon.coordinates.map((coord) => [coord[0], coord[1]])}
            pathOptions={{
              color: '#ef4444', // Vermelho
              fillColor: 'transparent', // Sem preenchimento
              fillOpacity: 0,
              weight: 2.5,
              opacity: 1,
            }}
            interactive={false} // Não interativo, apenas visualização
          />
        ))}
        
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
                      const newEditingState = isEditing ? null : polygon.id
                      setEditingPolygon(newEditingState)
                      setEditingPoint(null)
                      // Resetar o índice do último vértice editado quando iniciar/parar edição
                      setLastEditedVertexIndex(newEditingState ? null : null)
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
                    // Selecionar este vértice para poder deletar com Backspace/Delete
                    setLastEditedVertexIndex(index)
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
          <>
            <Polygon
              positions={currentPolygon.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#fbbf24',
                fillOpacity: 0.3,
                weight: 2.5,
                dashArray: '10, 5',
              }}
            />
            
            {/* Handles nos vértices do polígono em criação */}
            {currentPolygon.map((vertex, index) => (
              <Marker
                key={`current-vertex-${index}`}
                position={[vertex.lat, vertex.lng]}
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
                    updateCurrentPolygonVertex(index, newPos.lat, newPos.lng)
                  },
                  click: (e) => {
                    e.originalEvent.stopPropagation()
                    // Selecionar este vértice para poder deletar com Backspace/Delete
                    setLastEditedCurrentPolygonIndex(index)
                  },
                }}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Vértice {index + 1}</p>
                    {currentPolygon.length > 3 && (
                      <button
                        onClick={() => removeCurrentPolygonVertex(index)}
                        className="w-full mb-2 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
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

            {/* Handles nos pontos médios para adicionar vértices */}
            {currentPolygon.length >= 2 && getCurrentPolygonMidpoints().map((midpoint, index) => (
              <Marker
                key={`current-midpoint-${index}`}
                position={[midpoint.lat, midpoint.lng]}
                icon={createMidpointHandleIcon()}
                zIndexOffset={999}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent.stopPropagation()
                    addCurrentPolygonVertexAtMidpoint(index)
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
          </>
        )}
      </MapContainer>

      {isDrawingPolygon && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-[1000] border border-gray-200 dark:border-gray-700 max-w-xs">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Criando Polígono
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            • Clique no mapa para adicionar vértices
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            • Arraste os handles brancos para mover vértices
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            • Clique nos círculos azuis para adicionar vértices
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            • Clique nos vértices para remover
          </p>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 mb-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Atalhos:</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              • <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+Z</kbd> Desfazer último vértice
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              • <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+C</kbd> Cancelar criação
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              • <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Backspace</kbd> ou <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Delete</kbd> Apagar vértice selecionado
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
            {currentPolygon.length} vértice(s) adicionado(s)
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
                setLastEditedCurrentPolygonIndex(null) // Resetar ao cancelar
              }}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editingPolygon && (mode === 'edit' || mode === 'polygon') && (
        <div className="absolute top-4 right-4 bg-gray-800 dark:bg-dark-surface text-white p-4 rounded-lg shadow-lg z-[1000] border border-gray-700 dark:border-dark-border max-w-xs">
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
          <p className="text-xs text-gray-300 mb-1">
            • Clique no mapa para adicionar vértice na posição
          </p>
          <div className="border-t border-gray-600 pt-2 mt-2 mb-3">
            <p className="text-xs font-semibold text-gray-200 mb-1">Atalhos:</p>
            <p className="text-xs text-gray-300">
              • <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Ctrl+Z</kbd> Desfazer último vértice
            </p>
            <p className="text-xs text-gray-300">
              • <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Backspace</kbd> ou <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Delete</kbd> Apagar vértice selecionado
            </p>
          </div>
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
