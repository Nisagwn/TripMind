'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Place {
  id: string
  name: string
  lat: number
  lng: number
  order: number
}

interface RouteMapProps {
  places: Place[]
  height?: string
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export default function RouteMap({ places, height = '500px' }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key bulunamadı')
      setLoading(false)
      return
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap()
      return
    }

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
    script.async = true
    script.defer = true
    script.onload = initializeMap
    script.onerror = () => {
      setError('Google Maps yüklenemedi')
      setLoading(false)
    }
    document.head.appendChild(script)

    function initializeMap() {
      if (!mapRef.current || !window.google) return

      try {
        // Sort places by order
        const sortedPlaces = [...places].sort((a, b) => a.order - b.order)

        // Calculate center
        const center = {
          lat: sortedPlaces[0]?.lat || 36.8969,
          lng: sortedPlaces[0]?.lng || 30.7133,
        }

        // Create map
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }],
            },
          ],
        })

        // Create markers
        const markers: any[] = []
        const bounds = new window.google.maps.LatLngBounds()

        sortedPlaces.forEach((place, index) => {
          const position = { lat: place.lat, lng: place.lng }

          // First place gets blue marker, others get teal
          const markerColor = index === 0 ? '#3B82F6' : '#00BFA6'
          const markerIcon = {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: markerColor,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }

          const marker = new window.google.maps.Marker({
            position,
            map: mapInstance,
            icon: markerIcon,
            title: place.name,
            label: {
              text: String(place.order),
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 'bold',
            },
          })

          // Info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; font-family: 'Inter', sans-serif;">
                <h3 style="font-weight: bold; margin-bottom: 4px; color: #0F766E;">${place.name}</h3>
                <p style="color: #64748B; font-size: 12px;">Sıra: ${place.order}</p>
              </div>
            `,
          })

          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker)
          })

          markers.push(marker)
          bounds.extend(position)
        })

        // Draw polyline
        if (sortedPlaces.length > 1) {
          const path = sortedPlaces.map((place) => ({
            lat: place.lat,
            lng: place.lng,
          }))

          const polyline = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#00BFA6',
            strokeOpacity: 0.8,
            strokeWeight: 4,
          })

          polyline.setMap(mapInstance)
        }

        // Fit bounds to show all markers
        if (sortedPlaces.length > 1) {
          mapInstance.fitBounds(bounds, { padding: 50 })
        } else {
          mapInstance.setZoom(14)
        }

        setMap(mapInstance)
        setLoading(false)
      } catch (err: any) {
        console.error('Map initialization error:', err)
        setError('Harita oluşturulamadı')
        setLoading(false)
      }
    }

    return () => {
      // Cleanup if needed
    }
  }, [places])

  if (error) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-inter">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-teal-200 shadow-md">
      {loading && (
        <div className="absolute inset-0 bg-teal-50 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-2" />
            <p className="text-teal-700 font-inter text-sm">Harita yükleniyor...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ height, width: '100%' }} />
    </div>
  )
}

