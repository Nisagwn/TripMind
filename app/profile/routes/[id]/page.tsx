'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Route } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRoutes, Route as RouteType } from '@/hooks/useRoutes'
import { LoadScript, GoogleMap, Marker, Polyline } from "@react-google-maps/api";


const mapContainerStyle = {
  width: '100%',
  height: '400px'
}

export default function RouteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { getRoute } = useRoutes()
  const [route, setRoute] = useState<RouteType | null>(null)
  const [loading, setLoading] = useState(true)
  const routeId = params?.id as string

  useEffect(() => {
    if (!user || !routeId) {
      if (!authLoading) router.push('/auth/signin')
      return
    }

    const loadRoute = async () => {
      try {
        const routeData = await getRoute(routeId)
        setRoute(routeData)
      } catch (error) {
        console.error('Error loading route:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRoute()
  }, [user, routeId, authLoading, router, getRoute])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-inter">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user || !route) {
    return null
  }

  const formatDate = (date: Date | any) => {
    if (!date) return 'Tarih yok'
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return 'Tarih yok'
    }
  }

  // Build day groups for visualization. Prefer `itinerary` if present.
  const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f97316'] // purple, green, blue, orange

  const buildDayGroups = () => {
    // If detailed itinerary exists (saved by planner), use it
    if ((route as any).itinerary && Array.isArray((route as any).itinerary) && (route as any).itinerary.length > 0) {
      return (route as any).itinerary.map((day: any, idx: number) => {
        const positions = (day.activities || [])
          .map((act: any) => ({
            ...act,
            lat: Number(act?.lat ?? act?.latitude),
            lng: Number(act?.lng ?? act?.longitude)
          }))
          .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

        return { dayIndex: idx + 1, positions }
      }).filter((g: any) => g.positions.length > 0)
    }

    // If places have explicit day/dayIndex property, group by that
    const placesWithDay = route.places.filter((p: any) => p?.day !== undefined || p?.dayIndex !== undefined)
    if (placesWithDay.length > 0) {
      const groups: { [k: string]: any[] } = {}
      placesWithDay.forEach((p: any) => {
        const dayKey = p?.day ?? p?.dayIndex ?? 1
        const lat = Number(p?.lat ?? p?.latitude)
        const lng = Number(p?.lng ?? p?.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        if (!groups[dayKey]) groups[dayKey] = []
        groups[dayKey].push({ ...p, lat, lng })
      })
      return Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map((k) => ({ dayIndex: Number(k), positions: groups[k] }))
    }

    // Fallback: distribute places across `route.days` evenly
    const allPlaces = route.places
      .map((p: any) => ({ ...p, lat: Number(p?.lat ?? p?.latitude), lng: Number(p?.lng ?? p?.longitude) }))
      .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

    const daysCount = route.days || 1
    if (daysCount <= 1) {
      return allPlaces.length > 0 ? [{ dayIndex: 1, positions: allPlaces }] : []
    }

    const perDay = Math.ceil(allPlaces.length / daysCount) || allPlaces.length
    const groups = [] as any[]
    for (let i = 0; i < daysCount; i++) {
      const slice = allPlaces.slice(i * perDay, (i + 1) * perDay)
      if (slice.length > 0) groups.push({ dayIndex: i + 1, positions: slice })
    }
    return groups
  }

  const dayGroups = buildDayGroups()

  const center = dayGroups.length > 0 && dayGroups[0].positions.length > 0
    ? { lat: dayGroups[0].positions[0].lat, lng: dayGroups[0].positions[0].lng }
    : { lat: 36.884, lng: 30.705 }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <Link
            href="/profile/routes"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-inter font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Rotalara Dön
          </Link>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-teal-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
                <Route className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-poppins font-bold text-teal-900 mb-2">
                  {route.name}
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{route.days} gün</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{route.places.length} mekan</span>
                  </div>
                  <span className="text-sm">{formatDate(route.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Map */}
        {route.places.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-teal-100 mb-8"
          >
            <h2 className="text-xl font-poppins font-bold text-teal-900 mb-4">
              Harita Görünümü
            </h2>
            <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={10}
              >
                {dayGroups.map((group: any, gi: number) => {
                  const color = COLORS[(group.dayIndex - 1) % COLORS.length]
                  const path = group.positions.map((p: any) => ({ lat: p.lat, lng: p.lng }))
                  return (
                    <React.Fragment key={gi}>
                      {group.positions.map((place: any, idx: number) => (
                        <Marker
                          key={`${gi}-${idx}`}
                          position={{ lat: place.lat, lng: place.lng }}
                          icon={{
                            path: window.google?.maps?.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: color,
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 2,
                          }}
                        />
                      ))}

                      {path.length > 1 && (
                        <Polyline
                          path={path}
                          options={{ strokeColor: color, strokeOpacity: 0.9, strokeWeight: 4 }}
                        />
                      )}
                    </React.Fragment>
                  )
                })}
              </GoogleMap>
            </LoadScript>
          </motion.div>
        )}

        {/* Places List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-teal-100"
        >
          <h2 className="text-xl font-poppins font-bold text-teal-900 mb-6">
            Rota Mekanları
          </h2>
          <div className="space-y-4">
            {route.places
              .sort((a, b) => a.order - b.order)
              .map((place, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-teal-50 rounded-xl border border-teal-100"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full flex items-center justify-center font-bold">
                    {place.order}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-poppins font-bold text-teal-900 mb-1">
                      {place.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {place.lat.toFixed(6)}, {place.lng.toFixed(6)}
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

