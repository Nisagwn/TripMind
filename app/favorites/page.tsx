'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, MapPin, Star, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/contexts/AuthContext'

export default function FavoritesPage() {
  const { favorites, loading, removeFromFavorites, isFavorite } = useFavorites()
  const { user } = useAuth()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemoveFavorite = async (favoriteId: string) => {
    setRemovingId(favoriteId)
    try {
      await removeFromFavorites(favoriteId)
    } catch (error) {
      console.error('Error removing favorite:', error)
    } finally {
      setRemovingId(null)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-poppins font-bold text-gray-900 mb-4">
              Favorilerinizi Görmek İçin Giriş Yapın
            </h2>
            <p className="text-gray-600 mb-8">
              Beğendiğiniz yerleri favorilere ekleyin ve kolayca erişin
            </p>
            <Link href="/auth/signin" className="btn-primary">
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Favoriler yükleniyor...</p>
          </div>
        </div>
      </div>
    )
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
            href="/places" 
            className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-inter font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Mekanlara Dön
          </Link>
          <h1 className="text-4xl md:text-5xl font-poppins font-bold text-teal-900 mb-4 flex items-center gap-3">
            <Heart className="w-10 h-10 text-rose-500 fill-rose-500" />
            <span>Favorilerim</span>
          </h1>
          <p className="text-xl font-inter text-gray-600">
            Beğendiğiniz {favorites.length} mekan burada saklanır
          </p>
        </motion.div>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-teal-100"
          >
            <Heart className="w-16 h-16 text-rose-300 mx-auto mb-4" />
            <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-4">
              Henüz Favori Yeriniz Yok
            </h2>
            <p className="text-gray-600 font-inter mb-8">
              Beğendiğiniz yerleri kalp ikonuna tıklayarak favorilere ekleyebilirsiniz
            </p>
            <Link 
              href="/places" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium font-inter px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Yerleri Keşfet
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {favorites.map((favorite, index) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md overflow-hidden group hover:shadow-xl transition-all duration-300 border border-teal-100 relative"
              >
                <Link href={`/places/${favorite.placeData.id}`}>
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={favorite.placeData.image}
                      alt={favorite.placeData.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {favorite.placeData.category && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-3 py-1 rounded-full shadow-lg">
                        <span className="text-xs font-semibold font-inter">{favorite.placeData.category}</span>
                      </div>
                    )}
                    {favorite.placeData.price && (
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full shadow-lg">
                        <span className="text-xs font-medium font-inter">{favorite.placeData.price}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-xl font-poppins font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors duration-300 line-clamp-1">
                      {favorite.placeData.name}
                    </h3>
                    
                    {favorite.placeData.address && (
                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0 text-teal-500" />
                        <span className="text-sm font-inter line-clamp-1">{favorite.placeData.address}</span>
                      </div>
                    )}
                    
                    {(favorite.placeData.coordinates?.lat != null && favorite.placeData.coordinates?.lng != null) && (
                      <div className="text-xs text-teal-600 font-inter mb-2 bg-teal-50 px-2 py-1 rounded-lg inline-block">
                        📍 {favorite.placeData.coordinates.lat.toFixed(4)}, {favorite.placeData.coordinates.lng.toFixed(4)}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center bg-amber-50 px-3 py-1 rounded-full">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.round(favorite.placeData.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                        ))}
                        <span className="text-sm font-semibold font-inter text-gray-900 ml-2">{favorite.placeData.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-teal-100">
                      <div className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600 font-semibold text-sm font-inter group-hover:translate-x-1 transition-transform duration-300">
                        Detaya Git →
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Remove Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.preventDefault()
                    handleRemoveFavorite(favorite.id)
                  }}
                  disabled={removingId === favorite.id}
                  className="absolute bottom-3 right-3 p-2.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 z-10"
                >
                  {removingId === favorite.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Heart className="w-4 h-4 fill-current" />
                  )}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
