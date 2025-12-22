'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Route, Calendar, MapPin, Eye, Trash2, Loader2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Dynamically import RouteMap to avoid SSR issues
const RouteMap = dynamic(() => import('@/components/map/RouteMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-teal-50 rounded-xl flex items-center justify-center">
      <p className="text-teal-600 font-inter">Harita yükleniyor...</p>
    </div>
  )
})

interface Place {
  id: string
  name: string
  lat: number
  lng: number
  order: number
}

interface Route {
  id: string
  routeName: string
  days: number
  places: Place[]
  createdAt: any
}

interface RoutesTabProps {
  userId: string
}

export default function RoutesTab({ userId }: RoutesTabProps) {
  const { user } = useAuth()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const modalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchRoutes = async () => {
      try {
        const routesRef = collection(db, 'users', userId, 'routes')
        const q = query(routesRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        const routesData: Route[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Route[]

        setRoutes(routesData)
      } catch (error: any) {
        console.error('Error fetching routes:', error)
        toast.error('Rotalar yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchRoutes()
  }, [userId])

  // Listen to fullscreen change to update local state
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(document.fullscreenElement === modalRef.current)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleDelete = async (routeId: string) => {
    if (!user || user.uid !== userId) {
      toast.error('Bu rotayı silme yetkiniz yok')
      return
    }

    if (!confirm('Bu rotayı silmek istediğinize emin misiniz?')) {
      return
    }

    setDeletingId(routeId)

    try {
      await deleteDoc(doc(db, 'users', userId, 'routes', routeId))
      setRoutes(prev => prev.filter(r => r.id !== routeId))
      toast.success('Rota başarıyla silindi')
    } catch (error: any) {
      console.error('Error deleting route:', error)
      toast.error('Rota silinirken bir hata oluştu')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Tarih bilinmiyor'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return 'Tarih bilinmiyor'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/90 rounded-2xl p-6 shadow-md border border-teal-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-12 border border-teal-100 text-center"
      >
        <Route className="w-16 h-16 text-teal-300 mx-auto mb-4" />
        <h3 className="text-xl font-poppins font-bold text-teal-900 mb-2">
          Henüz Rota Oluşturulmadı
        </h3>
        <p className="text-gray-600 font-inter mb-6">
          AI destekli rota oluşturma özelliğini kullanarak ilk rotanızı oluşturun
        </p>
        <a
          href="/routes/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-inter font-medium"
        >
          <Route className="w-5 h-5" />
          Rota Oluştur
        </a>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route, index) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-teal-100 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Route className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-poppins font-bold text-teal-900 line-clamp-2">
                    {route.routeName}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span className="font-inter">{route.days} gün</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span className="font-inter">{route.places?.length || 0} mekan</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-inter">
                  {formatDate(route.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setSelectedRoute(route); setMapExpanded(true); setShowMap(true) }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:shadow-md transition-all duration-300 font-inter font-medium text-sm"
              >
                <Eye className="w-4 h-4" />
                Haritada Gör
              </button>
              {user && user.uid === userId && (
                <button
                  onClick={() => handleDelete(route.id)}
                  disabled={deletingId === route.id}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === route.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {selectedRoute && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRoute(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Modal */}
              <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 sm:inset-8 md:inset-16 lg:inset-32 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              ref={modalRef}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-poppins font-bold mb-1">
                    {selectedRoute.routeName}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-teal-100">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{selectedRoute.days} gün</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedRoute.places?.length || 0} mekan</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      // ensure map is shown
                      setShowMap(true)
                      setMapExpanded(true)
                      // toggle fullscreen on modal container
                      try {
                        if (document.fullscreenElement === modalRef.current) {
                          await document.exitFullscreen()
                        } else if (modalRef.current) {
                          // request fullscreen on the modal element
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-ignore
                          await modalRef.current.requestFullscreen()
                        }
                      } catch (e) {
                        console.error('Fullscreen toggle failed', e)
                      }
                    }}
                    className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm flex items-center gap-2"
                    aria-label="Tam Ekran"
                    title="Tam Ekran"
                  >
                    {/* simple fullscreen SVG icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setSelectedRoute(null); setMapExpanded(false); setShowMap(false) }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                    aria-label="Kapat"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 p-6 overflow-auto min-h-[400px]">
                {selectedRoute.places && selectedRoute.places.length > 0 ? (
                  <div className="h-full min-h-[400px]">
                    {showMap ? (
                      <RouteMap places={selectedRoute.places} height={isFullscreen ? '100vh' : (mapExpanded ? '80vh' : '400px')} expanded={isFullscreen || mapExpanded} />
                    ) : (
                      <div className="w-full h-[400px] bg-teal-50 rounded-xl flex items-center justify-center">
                        <p className="text-teal-600 font-inter">Haritada görüntülemek için 'Tam Ekran' e tıklayın</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-teal-50 rounded-xl">
                    <p className="text-teal-600 font-inter">Bu rotada mekan bulunmuyor</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

