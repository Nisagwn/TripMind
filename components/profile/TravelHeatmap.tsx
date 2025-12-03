'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Place {
  id: string
  placeName: string
  latitude: number
  longitude: number
  category?: string
  rating?: number
  timestamp?: any
}

interface TravelHeatmapProps {
  places: Place[]
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

// Custom marker icons based on category
const createCategoryIcon = (category?: string) => {
  const colors: { [key: string]: string } = {
    'Doğa': '#10b981', // green
    'Kafe': '#f97316', // orange
    'Müze': '#3b82f6', // blue
    'Tarihî': '#8b5cf6', // purple
    'Restoran': '#ef4444', // red
    'Park': '#22c55e', // green
    'Sahil': '#06b6d4', // cyan
    'Otel': '#f59e0b', // amber
  }

  const color = colors[category || ''] || '#6366f1' // default indigo

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
    </svg>
  `

  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

function MapBounds({ places }: { places: Place[] }) {
  const map = useMap()

  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(
        places.map(p => [p.latitude, p.longitude])
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
    }
  }, [places, map])

  return null
}

export default function TravelHeatmap({ places }: TravelHeatmapProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <p className="text-gray-600 font-inter">Harita yükleniyor...</p>
      </div>
    )
  }

  const defaultCenter: [number, number] = places.length > 0 
    ? [places[0].latitude, places[0].longitude]
    : [41.0082, 28.9784] // Istanbul default

  return (
    <MapContainer
      center={defaultCenter}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapBounds places={places} />

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={createCategoryIcon(place.category)}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-poppins font-bold text-gray-900 mb-1">
                {place.placeName}
              </h3>
              {place.category && (
                <p className="text-xs text-gray-600 mb-1">
                  🏷️ {place.category}
                </p>
              )}
              {place.rating && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-gray-600">⭐</span>
                  <span className="text-xs font-medium text-gray-900">
                    {place.rating.toFixed(1)}
                  </span>
                </div>
              )}
              {place.timestamp && (
                <p className="text-xs text-gray-500">
                  📅 {(() => {
                    try {
                      const date = place.timestamp.toDate ? place.timestamp.toDate() : new Date(place.timestamp)
                      return date.toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    } catch {
                      return 'Tarih bilinmiyor'
                    }
                  })()}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

