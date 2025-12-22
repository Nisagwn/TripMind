'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Place {
  id: string
  name: string
  lat: number
  lng: number
  order: number
  // Optional day field; visualization will fallback to day 1 when missing
  day?: number
}

interface RouteMapProps {
  places: Place[]
  height?: string
  expanded?: boolean
}

declare global {
  interface Window {
    google: any
    initMap: () => void
    googleMapsLoading?: boolean
    googleMapsLoaded?: boolean
  }
}

export default function RouteMap({ places, height = '500px', expanded }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [availableDays, setAvailableDays] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlaysRef = useRef<{ markers: any[]; polyline: any | null }>({ markers: [], polyline: null })

  // Helper to clear overlays and render a single day's markers and polyline
  function renderDayOnMap(mapInstance: any, groups: { [day: number]: any[] }, COLORS: string[], dayToRender: number, bounds: any) {
    // Clear previous overlays
    try {
      const ov = overlaysRef.current
      ov.markers.forEach((m) => m.setMap(null))
      if (ov.polyline) {
        ov.polyline.setMap(null)
      }
    } catch (e) {
      // ignore
    }
    overlaysRef.current = { markers: [], polyline: null }

    const pts = (groups[dayToRender] || [])
      .map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng), name: p.name, order: p.order }))
      .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

    if (pts.length === 0) return

    const color = COLORS[(dayToRender - 1) % COLORS.length]

    // markers numbered 1..N within the day
    pts.forEach((pt: any, idx: number) => {
      const markerIcon = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      }

      const marker = new window.google.maps.Marker({
        position: { lat: pt.lat, lng: pt.lng },
        map: mapInstance,
        icon: markerIcon,
        title: pt.name,
        label: { text: String(idx + 1), color: '#FFFFFF', fontSize: '12px' },
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="padding:8px;font-family:'Inter',sans-serif;"><strong>${pt.name}</strong><div style="font-size:12px;color:#64748B;margin-top:4px">Gün ${dayToRender}</div></div>`,
      })

      marker.addListener('click', () => infoWindow.open(mapInstance, marker))
      overlaysRef.current.markers.push(marker)
      bounds.extend({ lat: pt.lat, lng: pt.lng })
    })

    if (pts.length > 1) {
      const path = pts.map((p: any) => ({ lat: p.lat, lng: p.lng }))
      const polyline = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 4,
      })
      polyline.setMap(mapInstance)
      overlaysRef.current.polyline = polyline
    }

    // Fit to day bounds
    if (pts.length > 1) {
      mapInstance.fitBounds(bounds, { padding: 50 })
    } else {
      mapInstance.setCenter({ lat: pts[0].lat, lng: pts[0].lng })
      mapInstance.setZoom(14)
    }
  }

  useEffect(() => {
    if (!mapRef.current || places.length === 0) {
      setLoading(false)
      return
    }

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

    // Check if script is already loading
    if (window.googleMapsLoading) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval)
          initializeMap()
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval)
          initializeMap()
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }

    // Load Google Maps script
    window.googleMapsLoading = true
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
    script.async = true
    script.defer = true
    script.onload = () => {
      window.googleMapsLoading = false
      window.googleMapsLoaded = true
      initializeMap()
    }
    script.onerror = () => {
      window.googleMapsLoading = false
      setError('Google Maps yüklenemedi')
      setLoading(false)
    }
    document.head.appendChild(script)

    function initializeMap() {
      if (!mapRef.current || !window.google) return

      try {
        // Sort places by order and sanitize coordinates (use only `lat` and `lng` fields)
        const sortedPlaces = [...places]
          .sort((a, b) => a.order - b.order)
          .map((p) => ({
            ...p,
            lat: Number(p.lat),
            lng: Number(p.lng),
          }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

        // Calculate center using first valid point
        const center = {
          lat: sortedPlaces[0]?.lat ?? 36.8969,
          lng: sortedPlaces[0]?.lng ?? 30.7133,
        }

        // Create map (disable default UI controls to hide zoom buttons etc.)
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          disableDefaultUI: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }],
            },
          ],
        })

        // store map instance early so we can attach metadata
        mapInstanceRef.current = mapInstance

        // Group places by day and render colored markers + polylines per day
        const bounds = new window.google.maps.LatLngBounds()

        const COLORS = ['#8B5CF6', '#22C55E', '#3B82F6', '#F97316'] // purple, green, blue, orange

        // Determine days: prefer provided `day` values; if all resolve to day=1, distribute across 4 days
        const totalDays = 4

        // check whether any place has an explicit numeric day
        const daysFromData = sortedPlaces.map((p) => (Number.isFinite(Number(p.day)) ? Number(p.day) : 1))
        const maxDayFromData = daysFromData.length > 0 ? Math.max(...daysFromData) : 1

        let placesWithDay: typeof sortedPlaces = []

        if (maxDayFromData === 1) {
          // distribute into totalDays based on order
          const perDay = Math.ceil(sortedPlaces.length / totalDays) || 1
          placesWithDay = sortedPlaces.map((p, index) => ({ ...p, day: Math.floor(index / perDay) + 1 }))
        } else {
          // respect provided day values, defaulting missing to 1
          placesWithDay = sortedPlaces.map((p) => ({ ...p, day: Number.isFinite(Number(p.day)) ? Number(p.day) : 1 }))
        }

        // Build groups: { dayNumber: [{...place}] }
        const groups: { [day: number]: any[] } = {}
        placesWithDay.forEach((place) => {
          const dayNum = Number.isFinite(Number(place.day)) ? Number(place.day) : 1
          if (!groups[dayNum]) groups[dayNum] = []
          groups[dayNum].push(place)
        })

        // Determine available days from groups and set state
        const days = Object.keys(groups).map((k) => Number(k)).sort((a, b) => a - b)
        setAvailableDays(days)

        // store groups on the mapInstanceRef for later rendering on day change
        mapInstanceRef.current._routeGroups = groups
        mapInstanceRef.current._colors = COLORS

        // ensure selectedDay is valid (set to first available if current not present)
        if (!days.includes(selectedDay)) {
          const first = days[0] ?? 1
          setSelectedDay(first)
        }

        // render the initially selected day
        renderDayOnMap(mapInstance, groups, COLORS, selectedDay, bounds)

        // Fit bounds to show all markers
        const totalPts = Object.values(groups).flat().length
        if (totalPts > 1) {
          mapInstance.fitBounds(bounds, { padding: 50 })
        } else {
          mapInstance.setZoom(14)
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Map initialization error:', err)
        setError('Harita oluşturulamadı')
        setLoading(false)
      }
    }

    // Helper to clear overlays and render a single day's markers and polyline
    function renderDayOnMap(mapInstance: any, groups: { [day: number]: any[] }, COLORS: string[], dayToRender: number, bounds: any) {
      // Clear previous overlays
      try {
        const ov = overlaysRef.current
        ov.markers.forEach((m) => m.setMap(null))
        if (ov.polyline) {
          ov.polyline.setMap(null)
        }
      } catch (e) {
        // ignore
      }
      overlaysRef.current = { markers: [], polyline: null }

      const pts = (groups[dayToRender] || [])
        .map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng), name: p.name, order: p.order }))
        .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

      if (pts.length === 0) return

      const color = COLORS[(dayToRender - 1) % COLORS.length]

      // markers numbered 1..N within the day
      pts.forEach((pt: any, idx: number) => {
        const markerIcon = {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        }

        const marker = new window.google.maps.Marker({
          position: { lat: pt.lat, lng: pt.lng },
          map: mapInstance,
          icon: markerIcon,
          title: pt.name,
          label: { text: String(idx + 1), color: '#FFFFFF', fontSize: '12px' },
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding:8px;font-family:'Inter',sans-serif;"><strong>${pt.name}</strong><div style="font-size:12px;color:#64748B;margin-top:4px">Gün ${dayToRender}</div></div>`,
        })

        marker.addListener('click', () => infoWindow.open(mapInstance, marker))
        overlaysRef.current.markers.push(marker)
        bounds.extend({ lat: pt.lat, lng: pt.lng })
      })

      if (pts.length > 1) {
        const path = pts.map((p: any) => ({ lat: p.lat, lng: p.lng }))
        const polyline = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 4,
        })
        polyline.setMap(mapInstance)
        overlaysRef.current.polyline = polyline
      }

      // Fit to day bounds
      if (pts.length > 1) {
        mapInstance.fitBounds(bounds, { padding: 50 })
      } else {
        mapInstance.setCenter({ lat: pts[0].lat, lng: pts[0].lng })
        mapInstance.setZoom(14)
      }
    }

    return () => {
      // Cleanup if needed
    }
  }, [places])

  // Re-render overlays when selectedDay changes (map already initialized)
  useEffect(() => {
    const mapInstance = mapInstanceRef.current
    if (!mapInstance) return
    const groups = mapInstance._routeGroups || {}
    const COLORS = mapInstance._colors || ['#8B5CF6', '#22C55E', '#3B82F6', '#F97316']
    const bounds = new window.google.maps.LatLngBounds()
    renderDayOnMap(mapInstance, groups, COLORS, selectedDay, bounds)
  }, [selectedDay])

  // When the container height changes, trigger map resize and re-render overlays
  useEffect(() => {
    const mapInstance = mapInstanceRef.current
    if (!mapInstance || !window.google || !window.google.maps) return

    // trigger resize and re-render selected day overlays after layout
    try {
      window.google.maps.event.trigger(mapInstance, 'resize')
    } catch (e) {}

    const groups = mapInstance._routeGroups || {}
    const COLORS = mapInstance._colors || ['#8B5CF6', '#22C55E', '#3B82F6', '#F97316']
    const bounds = new window.google.maps.LatLngBounds()
    // small delay for layout
    setTimeout(() => renderDayOnMap(mapInstance, groups, COLORS, selectedDay, bounds), 150)
  }, [height])

  // If the map is mounted with `expanded` true, trigger immediate resize and re-render overlays
  useEffect(() => {
    if (!expanded) return
    const mapInstance = mapInstanceRef.current
    if (!mapInstance || !window.google || !window.google.maps) return

    // trigger resize and re-render selected day overlays after a short delay
    try { window.google.maps.event.trigger(mapInstance, 'resize') } catch (e) {}
    const groups = mapInstance._routeGroups || {}
    const COLORS = mapInstance._colors || ['#8B5CF6', '#22C55E', '#3B82F6', '#F97316']
    const bounds = new window.google.maps.LatLngBounds()
    setTimeout(() => renderDayOnMap(mapInstance, groups, COLORS, selectedDay, bounds), 100)
  }, [expanded])

  if (error) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-inter">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-teal-200 shadow-md">
      {/* Day selector UI */}
      {availableDays.length > 0 && (
        <div className="flex gap-2 mb-3">
          {availableDays.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${selectedDay === d ? 'bg-teal-600 text-white' : 'bg-white text-teal-700 border-teal-100'}`}
            >
              Gün {d}
            </button>
          ))}
        </div>
      )}
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

