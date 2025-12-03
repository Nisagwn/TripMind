'use client'

export const revalidate = 60

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Star, MapPin, Filter, Heart, MessageCircle, X } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/hooks/useFavorites'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy, getDocs, limit as fsLimit, startAfter } from 'firebase/firestore'
const DynamicPlaceCard = dynamic(() => import('@/components/PlaceCard'))

// Category localization map - Comprehensive mapping for Google Places types
const categoryLabels: Record<string, string> = {
  // English to Turkish
  "restaurant": "Restoran",
  "cafe": "Kafe",
  "hotel": "Otel",
  "lodging": "Konaklama",
  "museum": "Müze",
  "park": "Park",
  "beach": "Plaj",
  "bar": "Bar",
  "night_club": "Gece Kulübü",
  "tourist_attraction": "Turistik Yer",
  "shopping_mall": "Alışveriş Merkezi",
  "store": "Mağaza",
  "shopping": "Alışveriş",
  "point_of_interest": "İlgi Çekici Nokta",
  "establishment": "İşletme",
  "food": "Yemek",
  "natural_feature": "Doğal Güzellik",
  "aquarium": "Akvaryum",
  "art_gallery": "Sanat Galerisi",
  "bakery": "Fırın",
  "clothing_store": "Giyim Mağazası",
  "jewelry_store": "Kuyumcu",
  "spa": "SPA",
  "gym": "Spor Salonu",
  "library": "Kütüphane",
  "movie_theater": "Sinema",
  "mosque": "Cami",
  "church": "Kilise",
  "synagogue": "Sinagog",
  "stadium": "Stadyum",
  "zoo": "Hayvanat Bahçesi",
  "amusement_park": "Lunapark",
  "bowling_alley": "Bowling",
  "casino": "Kumarhane",
  // Turkish mappings (keep existing)
  "Restoran": "Restoran",
  "Kafe": "Kafe",
  "Otel": "Otel",
  "Müze": "Müze",
  "Park": "Park",
  "Sahil": "Sahil",
  "Plaj": "Plaj",
  "Tarihî": "Tarihi",
  "Doğa": "Doğa",
  "Bar": "Bar",
  "Tümü": "Tümü"
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>(['Tümü'])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [sortBy, setSortBy] = useState('rating')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const { user } = useAuth()
  const { isFavorite, addToFavorites, removeFromFavorites, getFavoriteId } = useFavorites()
  const lastDocRef = useRef<any | null>(null)
  const hasMoreRef = useRef<boolean>(true)

  // Fetch places from Firestore with pagination
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true)
        const q = query(collection(db, 'places'), fsLimit(20))
        const snapshot = await getDocs(q)
        const placesData = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || '',
            imageUrl: data.imageUrl || data.image || '/default-place.jpg',
            rating: data.rating || 0,
            category: data.category || '',
            priceLevel: data.priceLevel || data.price || '',
            address: data.address || '',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            description: data.description || '',
            photos: data.photos || [],
            userRatingCount: data.userRatingCount || 0
          }
        })
        setPlaces(placesData)
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null
        hasMoreRef.current = snapshot.docs.length === 20

        // Extract unique categories dynamically from loaded batch
        const uniqueCategories = Array.from(new Set(placesData.map(p => p.category).filter(Boolean))).sort()
        setCategories(['Tümü', ...uniqueCategories])
      } catch (error) {
        console.error('Error fetching places:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaces()
  }, [])

  // Fetch all categories and their total counts once (static until refresh)
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const q = query(collection(db, 'places'))
        const snapshot = await getDocs(q)
        const counts: Record<string, number> = {}
        snapshot.docs.forEach(doc => {
          const cat = (doc.data().category || '').trim()
          const key = cat || 'Diğer'
          counts[key] = (counts[key] || 0) + 1
        })
        setCategoryCounts(counts)
        const uniqueCategories = Object.keys(counts).filter(Boolean).sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
        setCategories(['Tümü', ...uniqueCategories])
      } catch (e) {
        console.error('fetchCategoryCounts', e)
      }
    }
    fetchCategoryCounts()
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMore || !lastDocRef.current) return
    setLoadingMore(true)
    try {
      const q = query(collection(db, 'places'), startAfter(lastDocRef.current), fsLimit(20))
      const snapshot = await getDocs(q)
      const more = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || '',
          imageUrl: data.imageUrl || data.image || '/default-place.jpg',
          rating: data.rating || 0,
          category: data.category || '',
          priceLevel: data.priceLevel || data.price || '',
          address: data.address || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          description: data.description || '',
          photos: data.photos || [],
          userRatingCount: data.userRatingCount || 0
        }
      })
      setPlaces(prev => [...prev, ...more])
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || lastDocRef.current
      hasMoreRef.current = snapshot.docs.length === 20
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore])

  const filteredPlaces = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return places.filter(place => {
      const matchesSearch = place.name && place.name.toLowerCase().includes(term)
    const matchesCategory = selectedCategory === 'Tümü' || place.category === selectedCategory
    return matchesSearch && matchesCategory
  })
  }, [places, searchTerm, selectedCategory])

  // Get count for each category (from full DB snapshot)
  const getCategoryCount = (category: string) => {
    if (category === 'Tümü') {
      return Object.values(categoryCounts).reduce((a, b) => a + b, 0)
    }
    return categoryCounts[category] || 0
  }

  // Get localized category label
  const getCategoryLabel = (category: string) => {
    return categoryLabels[category] || category
  }

  // Get top 7 most used categories (excluding "Tümü")
  const categoriesWithCounts = useMemo(() => (
    categories
    .filter(cat => cat !== 'Tümü')
    .map(cat => ({ name: cat, count: getCategoryCount(cat) }))
    .sort((a, b) => b.count - a.count)
  ), [categories, categoryCounts])
  
  const topCategories = categoriesWithCounts.slice(0, 7).map(c => c.name)
  const otherCategories = categoriesWithCounts.slice(7).map(c => c.name)
  
  // Displayed categories based on showAll state
  const displayedCategories = ['Tümü', ...topCategories, ...(showAllCategories ? otherCategories : [])]

  const sortedPlaces = useMemo(() => [...filteredPlaces].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
    if (sortBy === 'price') return (a.priceLevel === '$0' ? -1 : ((a.priceLevel || '').localeCompare(b.priceLevel || '')))
    return (a.name || '').localeCompare(b.name || '')
  }), [filteredPlaces, sortBy])

  // Group places by rating
  const popularPlaces = useMemo(() => sortedPlaces.filter(p => (p.rating || 0) >= 4.5), [sortedPlaces])
  const otherPlaces = useMemo(() => sortedPlaces.filter(p => (p.rating || 0) < 4.5), [sortedPlaces])

  const handleToggleFavorite = useCallback(async (place: any) => {
    if (!user) return

    if (isFavorite(place.id)) {
      const favoriteId = getFavoriteId(place.id)
      if (favoriteId) {
        await removeFromFavorites(favoriteId)
      }
    } else {
      await addToFavorites(place.id, place)
    }
  }, [user, isFavorite, getFavoriteId, removeFromFavorites, addToFavorites])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
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
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-poppins font-bold text-teal-900 mb-4">
            Harika Yerleri Keşfedin
          </h1>
          <p className="text-xl font-inter text-gray-600 max-w-3xl mx-auto">
            Binlerce muhteşem mekanı keşfedin ve favorilerinize ekleyin
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-col items-center gap-6">
            {/* Search Bar - Centered */}
            <div className="relative w-full max-w-2xl">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-teal-50 to-cyan-50">
                <Search className="w-5 h-5 text-teal-600" />
              </div>
              <input
                type="text"
                placeholder="Mekan ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-12 py-4 rounded-full shadow-md border border-gray-200 focus:ring-2 focus:ring-teal-400 focus:outline-none focus:border-teal-400 text-gray-700 bg-white transition-all duration-300 font-inter text-base placeholder:text-gray-400"
              />
              {/* Clear search button */}
                {searchTerm && (
                <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    <X className="w-5 h-5" />
                </button>
                )}
            </div>

            {/* Category Filter and Sort - Centered */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              {/* Category Tags */}
              <div className="flex gap-2 flex-wrap justify-center max-w-5xl">
                {categories.length > 0 ? (
                  <>
                    {displayedCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-5 py-2.5 rounded-full text-sm font-medium shadow-sm cursor-pointer transition-all duration-200 transform hover:scale-105 font-inter flex items-center gap-2 ${
                          selectedCategory === category
                            ? 'bg-teal-500 text-white shadow-md scale-105'
                            : 'bg-white text-gray-700 hover:bg-teal-100 border border-gray-200'
                        }`}
                      >
                        <span>{`${getCategoryLabel(category)} (${getCategoryCount(category)})`}</span>
                      </button>
                    ))}
                    {otherCategories.length > 0 && (
                      <button
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className="px-5 py-2.5 rounded-full text-sm font-medium shadow-sm cursor-pointer transition-all duration-200 transform hover:scale-105 font-inter flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600"
                      >
                        <span>{showAllCategories ? 'Kapat' : 'Tümü'}</span>
                        <span className="transition-transform" style={{ transform: `rotate(${showAllCategories ? 180 : 0}deg)` }}>▼</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500 font-inter">Kategoriler yükleniyor...</div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
                <Filter className="w-4 h-4 text-teal-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pr-2 focus:outline-none text-sm font-inter text-gray-700 bg-transparent cursor-pointer"
                >
                  <option value="rating">Puana Göre</option>
                  <option value="price">Fiyata Göre</option>
                  <option value="name">İsme Göre</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filter Summary */}
          {(selectedCategory !== 'Tümü' || searchTerm) && (
          <div
              className="mb-6 bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-md border border-teal-100 flex items-center gap-3"
            >
              <Filter className="w-5 h-5 text-teal-600" />
              <p className="text-sm font-inter text-gray-700 flex-1">
                {searchTerm && selectedCategory !== 'Tümü' ? (
                  <>
                    <span className="font-semibold text-teal-900">"{searchTerm}"</span> araması için{' '}
                    <span className="font-semibold text-teal-900">{getCategoryLabel(selectedCategory)}</span> kategorisinde{' '}
                    <span className="font-bold text-teal-600">{filteredPlaces.length}</span> sonuç bulundu
                  </>
                ) : searchTerm ? (
                  <>
                    <span className="font-semibold text-teal-900">"{searchTerm}"</span> araması için{' '}
                    <span className="font-bold text-teal-600">{filteredPlaces.length}</span> sonuç bulundu
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-teal-900">{getCategoryLabel(selectedCategory)}</span> kategorisinde{' '}
                    <span className="font-bold text-teal-600">{filteredPlaces.length}</span> mekan gösteriliyor
                  </>
                )}
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('Tümü')
                  setSearchTerm('')
                }}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline transition-colors"
              >
                Filtreyi Temizle
              </button>
          </div>
          )}

        {/* Popular Places Section */}
          {popularPlaces.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-3">
                <span>Popüler Mekanlar</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {popularPlaces.map((place, index) => (
                <DynamicPlaceCard key={place.id} place={place} index={index} isPopular={true} />
                ))}
            </div>
          </section>
          )}

        {/* All Places Section */}
        <section>
          <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-3">
              <span>{popularPlaces.length > 0 ? 'Tüm Mekanlar' : 'Mekanlar'}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherPlaces.map((place, index) => (
              <DynamicPlaceCard key={place.id} place={place} index={index} isPopular={false} />
              ))}
              {otherPlaces.length === 0 && popularPlaces.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-teal-100">
                  <p className="text-xl font-poppins font-bold text-gray-700 mb-2">Bu kategoriye ait mekan bulunamadı</p>
                  <p className="text-sm text-gray-500 font-inter">Farklı bir kategori deneyin veya arama yapın</p>
              </div>
              )}
          </div>
          {hasMoreRef.current && (
            <div className="flex justify-center mt-8">
              <button onClick={loadMore} disabled={loadingMore} className="px-6 py-3 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-60">
                {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </section>


      </div>
    </div>
  )
}

function PlaceCard({ place, index, isPopular = false }: { place: any; index: number; isPopular?: boolean }) {
  const [commentCount, setCommentCount] = useState(0)
  const { user } = useAuth()
  const { isFavorite, addToFavorites, removeFromFavorites, getFavoriteId } = useFavorites()
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    const commentsRef = collection(db, 'places', String(place.id), 'comments')
    const q = query(commentsRef, orderBy('createdAt', 'desc'))
    
    let unsubscribe: (() => void) | null = null
    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
      const comments = snapshot.docs.map(doc => doc.data())
      setCommentCount(comments.length)
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

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || isToggling) return

    setIsToggling(true)
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
          coordinates: {
            lat: place.latitude,
            lng: place.longitude
          }
        })
      }
    } finally {
      setIsToggling(false)
    }
  }

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
          <img 
            src={place.imageUrl || '/default-place.jpg'} 
            alt={place.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
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
          {/* Favorite Heart Icon */}
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
            <div className="text-xs text-teal-600 font-inter mb-2 bg-teal-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
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

          {place.description && (
            <p className="text-sm font-inter text-gray-600 line-clamp-2 mb-3">{place.description}</p>
          )}

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


