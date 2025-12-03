'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Route } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRoutes, Route as RouteType } from '@/hooks/useRoutes'
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";


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

  const center = route.places.length > 0
    ? {
        lat: route.places[0].lat,
        lng: route.places[0].lng
      }
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
                {route.places.map((place, index) => (
                  <Marker
                    key={index}
                    position={{ lat: place.lat, lng: place.lng }}
                    label={(index + 1).toString()}
                  />
                ))}
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

