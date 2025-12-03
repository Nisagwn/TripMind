'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Route, Calendar, MapPin, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRoutes } from '@/hooks/useRoutes'
import toast from 'react-hot-toast'

export default function RoutesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { routes, loading: routesLoading, deleteRoute } = useRoutes()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (authLoading || routesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-inter">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/signin')
    return null
  }

  const handleDelete = async (routeId: string) => {
    if (!confirm('Bu rotayı silmek istediğinize emin misiniz?')) return

    setDeletingId(routeId)
    try {
      await deleteRoute(routeId)
      toast.success('Rota silindi')
    } catch (error) {
      console.error('Error deleting route:', error)
      toast.error('Rota silinemedi')
    } finally {
      setDeletingId(null)
    }
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
            href="/profile"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-inter font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Profile Dön
          </Link>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-teal-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
                <Route className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-poppins font-bold text-teal-900">
                  Rotalarım
                </h1>
                <p className="text-gray-600 font-inter mt-1">
                  Kaydettiğiniz tüm rotalar
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Routes List */}
        {routes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-12 border border-teal-100 text-center"
          >
            <Route className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-poppins font-bold text-gray-700 mb-2">
              Henüz rota yok
            </h3>
            <p className="text-gray-500 font-inter mb-6">
              AI asistanı ile sohbet ederek rota oluşturabilir ve burada kaydedebilirsiniz.
            </p>
            <button
              onClick={() => router.push('/chat?from=routes')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <Route className="w-5 h-5" />
              Rota Oluştur
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-teal-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-poppins font-bold text-teal-900 mb-2">
                        {route.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{route.days} gün</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{route.places.length} mekan</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(route.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Link
                      href={`/profile/routes/${route.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Görüntüle</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(route.id)}
                      disabled={deletingId === route.id}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

