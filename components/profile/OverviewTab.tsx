'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Star, MessageSquare, Heart, Award, TrendingUp, Map as MapIcon } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { StatCardSkeleton } from '@/components/SkeletonLoader'

// Dynamically import map to avoid SSR issues
const TravelHeatmap = dynamic(() => import('./TravelHeatmap'), { ssr: false })

interface OverviewTabProps {
  userId: string
}

interface UserStats {
  totalVisited: number
  totalReviews: number
  averageRating: number
  totalFavorites: number
  visitedPlaces: any[]
  mostVisitedCity: string
  badges: string[]
}

// Helper function: Get visited places
async function getVisitedPlaces(uid: string): Promise<any[]> {
  try {
    console.log(`📊 [getVisitedPlaces] Fetching visited places for user: ${uid}`)
    const visitedRef = collection(db, 'users', uid, 'visitedPlaces')
    const visitedSnap = await getDocs(visitedRef)
    
    if (visitedSnap.empty) {
      console.log(`⚠️ [getVisitedPlaces] No visited places found for user: ${uid}`)
      return []
    }

    const visited = visitedSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        placeId: data.placeId || doc.id, // Support both placeId field and doc.id
        ...data
      }
    })

    console.log(`✅ [getVisitedPlaces] Found ${visited.length} visited places`)
    return visited
  } catch (error) {
    console.error(`❌ [getVisitedPlaces] Error fetching visited places for user ${uid}:`, error)
    return []
  }
}

// Helper function: Get favorites
async function getFavorites(uid: string): Promise<any[]> {
  try {
    console.log(`📊 [getFavorites] Fetching favorites for user: ${uid}`)
    const favoritesRef = collection(db, 'users', uid, 'favorites')
    const favoritesSnap = await getDocs(favoritesRef)
    
    if (favoritesSnap.empty) {
      console.log(`⚠️ [getFavorites] No favorites found for user: ${uid}`)
      return []
    }

    const favorites = favoritesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log(`✅ [getFavorites] Found ${favorites.length} favorites`)
    return favorites
  } catch (error) {
    console.error(`❌ [getFavorites] Error fetching favorites for user ${uid}:`, error)
    return []
  }
}

// Helper function: Get user comments from users/{uid}/comments
async function getUserComments(uid: string): Promise<any[]> {
  try {
    console.log(`📊 [getUserComments] Fetching comments for user: ${uid}`)
    
    // Get comments from users/{uid}/comments subcollection
    const commentsRef = collection(db, 'users', uid, 'comments')
    const commentsSnap = await getDocs(commentsRef)
    
    if (commentsSnap.empty) {
      console.log(`⚠️ [getUserComments] No comments found for user: ${uid}`)
      return []
    }

    const comments = commentsSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        placeId: data.placeId,
        ...data
      }
    })

    console.log(`✅ [getUserComments] Found ${comments.length} comments`)
    return comments
  } catch (error) {
    console.error(`❌ [getUserComments] Error fetching comments for user ${uid}:`, error)
    return []
  }
}


// Helper function: Get all places (for city/category data)
async function getAllPlaces(): Promise<any[]> {
  try {
    console.log(`📊 [getAllPlaces] Fetching all places`)
    const placesRef = collection(db, 'places')
    const placesSnap = await getDocs(placesRef)
    
    if (placesSnap.empty) {
      console.log(`⚠️ [getAllPlaces] No places found`)
      return []
    }

    const places = placesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log(`✅ [getAllPlaces] Found ${places.length} places`)
    return places
  } catch (error) {
    console.error(`❌ [getAllPlaces] Error fetching places:`, error)
    return []
  }
}

// Fetch function
async function fetchUserStats(userId: string): Promise<UserStats> {
  // Check localStorage first
  const cacheKey = `profile_overview_${userId}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    // Cache valid for 5 minutes
    if (Date.now() - timestamp < 5 * 60 * 1000) {
      console.log('📦 Using cached overview data')
      return data
    }
  }

  console.log(`🚀 [fetchUserStats] Starting stats fetch for user: ${userId}`)

  // Fetch all data using helper functions
  const [visitedPlaces, favorites, userComments, allPlaces] = await Promise.all([
    getVisitedPlaces(userId),
    getFavorites(userId),
    getUserComments(userId),
    getAllPlaces()
  ])

  // Create a map of placeId -> place data for quick lookup
  const placesMap = new Map(allPlaces.map(place => [String(place.id), place]))

  // Filter visited places: only include places where user has commented
  const visitedPlacesWithComments: any[] = []
  const visitedPlaceIds = new Set(userComments.map(c => String(c.placeId)).filter(Boolean))
  
  visitedPlaces.forEach((visitedPlace: any) => {
    const placeId = String(visitedPlace.placeId || visitedPlace.id)
    if (visitedPlaceIds.has(placeId)) {
      // Enrich with place data if available
      const placeData = placesMap.get(placeId)
      visitedPlacesWithComments.push({
        ...visitedPlace,
        ...(placeData && {
          name: placeData.name || visitedPlace.placeName,
          lat: placeData.latitude || visitedPlace.latitude || 0,
          lng: placeData.longitude || visitedPlace.longitude || 0,
          city: placeData.city || visitedPlace.city || 'Bilinmeyen'
        })
      })
    }
  })

  // Calculate stats
  const totalVisited = visitedPlaces.length
  const totalReviews = userComments.length
  const totalFavorites = favorites.length

  // Calculate average rating from user comments
  const ratings = userComments
    .map(comment => comment.rating)
    .filter((rating): rating is number => typeof rating === 'number' && rating > 0)
  
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : 0

  // Find most visited city from visitedPlaces
  const cityCounts: { [key: string]: number } = {}
  visitedPlaces.forEach((place: any) => {
    const city = place.city || 'Bilinmeyen'
    cityCounts[city] = (cityCounts[city] || 0) + 1
  })
  const mostVisitedCity = Object.keys(cityCounts).length > 0
    ? Object.keys(cityCounts).reduce((a, b) => cityCounts[a] > cityCounts[b] ? a : b)
    : 'Henüz yok'

  // Determine badges
  const userBadges: string[] = []
  if (totalVisited >= 10) userBadges.push('Aktif Gezgin')
  if (totalReviews >= 5) userBadges.push('Yorum Uzmanı')
  if (averageRating >= 4.5 && ratings.length >= 3) userBadges.push('Seçici Tatçı')
  if (totalFavorites >= 5) userBadges.push('Favori Koleksiyoncusu')
  
  // Category-based badges from visited places
  const categoryCount: { [key: string]: number } = {}
  visitedPlaces.forEach((place: any) => {
    if (place.category) {
      categoryCount[place.category] = (categoryCount[place.category] || 0) + 1
    }
  })
  Object.keys(categoryCount).forEach(category => {
    if (categoryCount[category] >= 3) {
      userBadges.push(`${category} Keşfi Uzmanı`)
    }
  })

  const stats: UserStats = {
    totalVisited,
    totalReviews,
    averageRating,
    totalFavorites,
    visitedPlaces: visitedPlacesWithComments, // Only places with user comments
    mostVisitedCity,
    badges: userBadges,
  }

  console.log(`✅ [fetchUserStats] Stats calculated:`, {
    totalVisited,
    totalReviews,
    averageRating: averageRating.toFixed(2),
    totalFavorites,
    mostVisitedCity,
    badgesCount: userBadges.length
  })

  // Cache to localStorage
  localStorage.setItem(cacheKey, JSON.stringify({
    data: stats,
    timestamp: Date.now()
  }))

  return stats
}

export default function OverviewTab({ userId }: OverviewTabProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['userStats', userId],
    queryFn: () => fetchUserStats(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-2xl p-6 shadow-md animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      label: 'Ziyaret Edilen Yer',
      value: stats.totalVisited,
      icon: MapPin,
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-900',
    },
    {
      label: 'Toplam Yorum',
      value: stats.totalReviews,
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-900',
    },
    {
      label: 'Ortalama Puan',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-900',
    },
    {
      label: 'Favori Mekan',
      value: stats.totalFavorites,
      icon: Heart,
      color: 'from-rose-500 to-red-500',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-900',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`${stat.bgColor} rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-poppins font-bold mb-1 text-gray-900">{stat.value}</h3>
              <p className={`text-sm font-inter font-medium ${stat.textColor}`}>{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 shadow-md border border-blue-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <MapIcon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-poppins font-bold text-blue-900">En Çok Ziyaret</h3>
          </div>
          <p className="text-2xl font-poppins font-bold text-blue-900">{stats.mostVisitedCity}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-md border border-orange-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-poppins font-bold text-amber-900">Ortalama Puan</h3>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-poppins font-bold text-amber-900">{stats.averageRating.toFixed(1)}</p>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(stats.averageRating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-md border border-purple-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-poppins font-bold text-purple-900">Toplam Aktivite</h3>
          </div>
          <p className="text-2xl font-poppins font-bold text-purple-900">
            {stats.totalVisited + stats.totalReviews + stats.totalFavorites}
          </p>
        </motion.div>
      </div>

      {/* Badges */}
      {stats.badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-teal-100"
        >
          <h3 className="text-xl font-poppins font-bold text-teal-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-teal-600" />
            Rozetlerim
          </h3>
          <div className="flex flex-wrap gap-3">
            {stats.badges.map((badge, index) => (
              <motion.div
                key={badge}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                className="bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-2 rounded-full border-2 border-amber-300 shadow-md"
              >
                <span className="text-sm font-inter font-bold text-amber-900">🏆 {badge}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Travel Heatmap */}
      {stats.visitedPlaces.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-teal-100"
        >
          <h3 className="text-xl font-poppins font-bold text-teal-900 mb-4 flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-teal-600" />
            Gezi Haritam
          </h3>
          <div className="h-[500px] rounded-xl overflow-hidden">
            <TravelHeatmap places={stats.visitedPlaces} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
