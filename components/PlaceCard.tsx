'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin, MessageCircle, Heart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/hooks/useFavorites'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'

export default function PlaceCard({ place, index, isPopular = false }: { place: any; index: number; isPopular?: boolean }) {
  const [commentCount, setCommentCount] = useState(0)
  const { user } = useAuth()
  const { isFavorite, addToFavorites, removeFromFavorites, getFavoriteId } = useFavorites()
  const [isToggling, setIsToggling] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const commentsRef = collection(db, 'places', String(place.id), 'comments')
    const q = query(commentsRef, orderBy('createdAt', 'desc'))
    let unsubscribe: (() => void) | null = null
    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            setCommentCount(snapshot.docs.length)
          } catch (error) {
            console.error('Error processing comment count snapshot:', error)
          }
        },
        (error) => {
          console.error('Comment count snapshot error:', error)
        }
      )
    } catch (error) {
      console.error('Error setting up comment count listener:', error)
    }
    return () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          console.error('Error unsubscribing from comment count:', error)
        }
      }
    }
  }, [place.id])

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || isToggling) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setIsToggling(true)
    debounceRef.current = setTimeout(async () => {
      try {
        if (isFavorite(place.id)) {
          const favoriteId = getFavoriteId(place.id)
          if (favoriteId) {
            await removeFromFavorites(favoriteId)
          }
        } else {
          await addToFavorites(place.id, {
            id: place.id,
            name: place.name,
            image: place.imageUrl,
            category: place.category,
            price: place.priceLevel,
            rating: place.rating,
            address: place.address,
            coordinates: { lat: place.latitude, lng: place.longitude }
          })
        }
      } finally {
        setIsToggling(false)
      }
    }, 500)
  }, [user, isToggling, isFavorite, place, getFavoriteId, removeFromFavorites, addToFavorites])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
    ))
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md overflow-hidden group hover:shadow-xl transition-all duration-300 border border-teal-100"
    >
      <Link href={`/places/${place.id}`}>
        <div className="relative h-56 overflow-hidden">
          <Image
            src={place.imageUrl || '/default-place.jpg'}
            alt={place.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {place.category && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-3 py-1 rounded-full shadow-lg">
              <span className="text-xs font-semibold font-inter">{place.category}</span>
            </div>
          )}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-xs font-medium font-inter">{commentCount}</span>
          </div>
          {user && (
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleFavorite}
              className="absolute bottom-3 right-3 p-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-10"
              disabled={isToggling}
            >
              {isFavorite(place.id) ? (
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              ) : (
                <Heart className="w-5 h-5 text-gray-400 hover:text-rose-500 transition-colors" />
              )}
            </motion.button>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-xl font-poppins font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors duration-300 line-clamp-1">
            {place.name}
          </h3>

          {place.address && (
            <div className="flex items-center text-gray-600 mb-3">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0 text-teal-500" />
              <span className="text-sm font-inter line-clamp-1">{place.address}</span>
            </div>
          )}

          {(place.latitude && place.longitude) && (
            <div className="text-xs text-teal-600 font-inter mb-2 bg-teal-50 px-2 py-1 rounded-lg inline-block">
              📍 {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center bg-amber-50 px-3 py-1 rounded-full">
              {renderStars(place.rating || 0)}
              <span className="text-sm font-semibold font-inter text-gray-900 ml-2">{place.rating?.toFixed(1) || '0.0'}</span>
            </div>
            {place.priceLevel && (
              <div className="text-sm text-gray-600 font-inter">
                · {place.priceLevel}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-teal-100">
            <div className="flex items-center text-teal-600">
              <MessageCircle className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium font-inter">{commentCount} yorum</span>
            </div>
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600 font-semibold text-sm font-inter group-hover:translate-x-1 transition-transform duration-300">
              Detaya Git →
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}


