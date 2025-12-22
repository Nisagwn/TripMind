'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Camera, MapPin, Star, Trash2, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GridSkeleton } from '@/components/SkeletonLoader'
import { getUserFavorites, getUserComments, toggleFavorite } from '@/lib/userData'

interface FavoritesGalleryTabProps {
  userId: string
}

// Fetch favorites with place details from subcollection
async function fetchFavorites(userId: string) {
  const favoritesList = await getUserFavorites(userId)

  if (favoritesList.length === 0) {
    return []
  }

  // Fetch place details for each favorite
  const placesRef = collection(db, 'places')
  const placesSnap = await getDocs(placesRef)
  const placesMap = new Map(placesSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]))

  // Map favorite IDs to place data
  const favorites = favoritesList
    .map(favorite => {
      const place = placesMap.get(favorite.placeId)
      if (!place) return null
      return {
        placeId: favorite.placeId,
        placeData: {
          id: place.id,
          name: place.name,
          image: place.imageUrl || place.image,
          category: place.category,
          address: place.address,
          rating: place.rating
        }
      }
    })
    .filter(Boolean) as any[]

  return favorites
}

// Fetch user photos from comments subcollection
async function fetchUserPhotos(userId: string) {
  const comments = await getUserComments(userId)

  // Filter comments with photos
  const photosWithPlaces = await Promise.all(
    comments
      .filter((comment) => comment.photoUrl)
      .map(async (comment) => {
        try {
          const placeRef = doc(db, 'places', comment.placeId)
          const placeSnap = await getDoc(placeRef)
          if (placeSnap.exists()) {
            return {
              id: comment.id,
              photoUrl: comment.photoUrl,
              placeName: comment.placeName || placeSnap.data().name,
              placeId: comment.placeId,
              createdAt: comment.createdAt,
            }
          }
        } catch (error) {
          console.error('Error fetching place:', error)
        }
        return null
      })
  )

  return photosWithPlaces.filter(Boolean) as any[]
}

export default function FavoritesGalleryTab({ userId }: FavoritesGalleryTabProps) {
  const [activeView, setActiveView] = useState<'favorites' | 'gallery'>('favorites')
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [favoritesLimit, setFavoritesLimit] = useState(9)
  const [photosLimit, setPhotosLimit] = useState(12)
  const queryClient = useQueryClient()

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => fetchFavorites(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['userPhotos', userId],
    queryFn: () => fetchUserPhotos(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const handleRemoveFavorite = async (placeId: string) => {
    setRemovingId(placeId)
    try {
      await toggleFavorite(userId, placeId)
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] })
    } catch (error) {
      console.error('Error removing favorite:', error)
    } finally {
      setRemovingId(null)
    }
  }

  const displayedFavorites = favorites.slice(0, favoritesLimit)
  const displayedPhotos = photos.slice(0, photosLimit)

  return (
    <div className="space-y-6">
      {/* Toggle Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => setActiveView('favorites')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium font-inter transition-all duration-300 ${
            activeView === 'favorites'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-rose-50 hover:text-rose-700 shadow-md'
          }`}
        >
          <Heart className="w-5 h-5" />
          Favorilerim ({favorites.length})
        </button>
        <button
          onClick={() => setActiveView('gallery')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium font-inter transition-all duration-300 ${
            activeView === 'gallery'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
              : 'bg-white/80 text-gray-600 hover:bg-teal-50 hover:text-teal-700 shadow-md'
          }`}
        >
          <Camera className="w-5 h-5" />
          Galerim ({photos.length})
        </button>
      </div>

      {/* Favorites View */}
      {activeView === 'favorites' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {favoritesLoading ? (
            <GridSkeleton count={6} type="card" />
          ) : favorites.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-lg border border-teal-100">
              <Heart className="w-16 h-16 text-rose-300 mx-auto mb-4" />
              <h3 className="text-xl font-poppins font-bold text-gray-900 mb-2">
                Henüz Favori Yeriniz Yok
              </h3>
              <p className="text-gray-600 font-inter">
                Beğendiğiniz yerleri kalp ikonuna tıklayarak favorilere ekleyebilirsiniz
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedFavorites.map((favorite: any, index: number) => (
                  <motion.div
                    key={favorite.placeId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={{ y: -8 }}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md overflow-hidden group hover:shadow-xl transition-all duration-300 border border-teal-100 relative"
                  >
                    <Link href={`/places/${favorite.placeId}`}>
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={favorite.placeData.image}
                          alt={favorite.placeData.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {favorite.placeData.category && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-3 py-1 rounded-full shadow-lg">
                            <span className="text-xs font-semibold font-inter">
                              {favorite.placeData.category}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-poppins font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors line-clamp-1">
                          {favorite.placeData.name}
                        </h3>

                        {favorite.placeData.address && (
                          <div className="flex items-center text-gray-600 mb-3">
                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0 text-teal-500" />
                            <span className="text-sm font-inter line-clamp-1">
                              {favorite.placeData.address}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-amber-50 px-3 py-1 rounded-full">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.round(favorite.placeData.rating || 0)
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-xs font-semibold font-inter text-gray-900 ml-2">
                              {favorite.placeData.rating?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.preventDefault()
                        handleRemoveFavorite(favorite.placeId)
                      }}
                      disabled={removingId === favorite.placeId}
                      className="absolute bottom-3 right-3 p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all duration-300 shadow-lg disabled:opacity-50 z-10"
                    >
                      {removingId === favorite.placeId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </motion.button>
                  </motion.div>
                ))}
              </div>

              {/* Load More Button */}
              {favorites.length > favoritesLimit && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setFavoritesLimit(prev => prev + 9)}
                  className="mx-auto mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg font-inter font-medium"
                >
                  Daha Fazla Göster
                  <ChevronDown className="w-5 h-5" />
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Gallery View */}
      {activeView === 'gallery' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {photosLoading ? (
            <GridSkeleton count={12} type="photo" />
          ) : photos.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-lg border border-teal-100">
              <Camera className="w-16 h-16 text-teal-300 mx-auto mb-4" />
              <h3 className="text-xl font-poppins font-bold text-gray-900 mb-2">
                Henüz Fotoğraf Paylaşmadınız
              </h3>
              <p className="text-gray-600 font-inter">
                Yorum yaparken fotoğraf ekleyerek galerinizi oluşturabilirsiniz
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {displayedPhotos.map((photo: any, index: number) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.02 }}
                    whileHover={{ scale: 1.05 }}
                    className="relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.photoUrl}
                      alt={photo.placeName}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-2 left-2 right-2 text-white">
                        <p className="text-xs font-inter font-medium line-clamp-1">
                          {photo.placeName}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Load More Button */}
              {photos.length > photosLimit && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setPhotosLimit(prev => prev + 12)}
                  className="mx-auto mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg font-inter font-medium"
                >
                  Daha Fazla Göster
                  <ChevronDown className="w-5 h-5" />
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors duration-300"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.placeName}
              className="w-full h-auto rounded-2xl shadow-2xl mb-4"
            />
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <h3 className="text-2xl font-poppins font-bold mb-2">
                {selectedPhoto.placeName}
              </h3>
              <Link
                href={`/places/${selectedPhoto.placeId}`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium font-inter px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <MapPin className="w-4 h-4" />
                Mekana Git
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
