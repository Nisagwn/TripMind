'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, MapPin, ArrowLeft, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'

type Photo = {
  id: string
  photoUrl: string
  placeName: string
  placeId: string
  userDisplayName: string
  createdAt: any
}

// Fetch photos function
async function fetchGalleryPhotos(): Promise<Photo[]> {
  // Check localStorage cache first
  const cacheKey = 'gallery_photos'
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    // Cache valid for 5 minutes
    if (Date.now() - timestamp < 5 * 60 * 1000) {
      console.log('📦 Using cached gallery data')
      return data
    }
  }

  const allPhotos: Photo[] = []

  // Fetch first 30 places only for performance (limit)
  const placesSnapshot = await getDocs(collection(db, 'places'))
  const placesToCheck = placesSnapshot.docs.slice(0, 30)
  
  // For each place, fetch comments with photos
  for (const placeDoc of placesToCheck) {
    const placeData = placeDoc.data()
    const commentsRef = collection(db, 'places', placeDoc.id, 'comments')
    const commentsSnapshot = await getDocs(commentsRef)
    
    commentsSnapshot.docs.forEach(commentDoc => {
      const comment = commentDoc.data()
      if (comment.photoUrl) {
        allPhotos.push({
          id: `${placeDoc.id}_${commentDoc.id}`,
          photoUrl: comment.photoUrl,
          placeName: placeData.name || 'İsimsiz Mekan',
          placeId: placeDoc.id,
          userDisplayName: comment.userDisplayName || 'Anonim',
          createdAt: comment.createdAt
        })
      }
    })
  }

  // Sort by date (newest first)
  allPhotos.sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0)
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0)
    return dateB.getTime() - dateA.getTime()
  })

  // Cache to localStorage
  localStorage.setItem(cacheKey, JSON.stringify({
    data: allPhotos,
    timestamp: Date.now()
  }))

  return allPhotos
}

// Skeleton Loader Component
function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl animate-pulse shadow-md"
        >
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-300" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GalleryPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [displayLimit, setDisplayLimit] = useState(20)

  // React Query for data fetching and caching
  const { data: allPhotos = [], isLoading } = useQuery({
    queryKey: ['gallery'],
    queryFn: fetchGalleryPhotos,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Memoize displayed photos to prevent unnecessary re-renders
  const displayedPhotos = useMemo(() => {
    return allPhotos.slice(0, displayLimit)
  }, [allPhotos, displayLimit])

  const hasMore = allPhotos.length > displayLimit

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-10 w-32 bg-gray-200 rounded-2xl mb-6"></div>
            <div className="h-12 w-96 bg-gray-200 rounded mb-4"></div>
            <div className="h-6 w-64 bg-gray-100 rounded"></div>
          </div>

          {/* Gallery Skeleton */}
          <GallerySkeleton />
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
          transition={{ duration: 0.6 }}
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
            <Camera className="w-10 h-10 text-teal-600" />
            <span>Fotoğraf Galerisi</span>
          </h1>
          <p className="text-xl font-inter text-gray-600">
            Kullanıcılarımız tarafından paylaşılan {allPhotos.length} fotoğraf
          </p>
        </motion.div>

        {/* Gallery Grid */}
        {allPhotos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-teal-100"
          >
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-poppins font-bold text-gray-900 mb-4">
              Henüz Fotoğraf Yok
            </h2>
            <p className="text-gray-600 font-inter mb-8">
              İlk fotoğrafı paylaşan siz olun!
            </p>
            <Link 
              href="/places" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium font-inter px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Mekanları Keşfet
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {displayedPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.5) }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative aspect-square rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border border-teal-100"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.placeName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-poppins font-bold text-sm mb-1 line-clamp-1">
                        {photo.placeName}
                      </h3>
                      <p className="text-xs font-inter opacity-90 line-clamp-1 flex items-center gap-1">
                        <span className="text-base">📸</span>
                        {photo.userDisplayName}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Load More Button */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="mt-8 flex justify-center"
              >
                <button
                  onClick={() => setDisplayLimit(prev => prev + 20)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium font-inter px-8 py-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg group"
                >
                  <span>Daha Fazla Göster ({allPhotos.length - displayLimit} fotoğraf)</span>
                  <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-300" />
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 group"
              aria-label="Kapat"
            >
              <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.placeName}
                className="w-full h-auto rounded-2xl shadow-2xl mb-4"
              />
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white border border-white/20">
                <h3 className="text-2xl font-poppins font-bold mb-2">
                  {selectedPhoto.placeName}
                </h3>
                <p className="text-sm font-inter mb-4 flex items-center gap-2">
                  <span className="text-xl">📸</span>
                  <span>Paylaşan: {selectedPhoto.userDisplayName}</span>
                </p>
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
      </AnimatePresence>
    </div>
  )
}
