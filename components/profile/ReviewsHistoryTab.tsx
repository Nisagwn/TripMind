'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Star, Edit, Trash2, MapPin, Calendar, X, Check, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ReviewSkeleton, GridSkeleton } from '@/components/SkeletonLoader'
import { getUserComments, getUserHistory, removeComment, updateComment, UserComment } from '@/lib/userData'

interface ReviewsHistoryTabProps {
  userId: string
  userName: string
}

type FilterType = 'all' | 'highest' | 'photos' | 'recent'

interface ReviewsData {
  reviews: any[]
  visitedPlaces: any[]
}

// Fetch reviews and history from subcollections
async function fetchReviewsAndHistory(userId: string): Promise<ReviewsData> {
  const comments = await getUserComments(userId)
  const historyIds = await getUserHistory(userId)

  // Fetch place details for comments
  const placesRef = collection(db, 'places')
  const placesSnap = await getDocs(placesRef)
  const placesMap = new Map(placesSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]))

  // Map comments to reviews with place details
  const reviews = await Promise.all(
    comments.map(async (comment: UserComment) => {
      const place = placesMap.get(comment.placeId)
      if (!place) return null

      return {
        id: comment.id, // Use comment document ID
        placeId: comment.placeId,
        placeName: comment.placeName || place.name,
        placeImage: place.imageUrl || place.image,
        comment: comment.text || comment.comment || '', // Support both 'text' and 'comment' for backward compatibility
        rating: comment.rating || 0,
        photoUrl: comment.photoUrl,
        createdAt: comment.createdAt,
        // Store comment ID for update/delete
        _commentId: comment.id
      }
    })
  )

  // Filter out nulls and sort by date (newest first)
  const userReviews = reviews
    .filter(Boolean)
    .sort((a: any, b: any) => {
      // Handle both Timestamp and Date objects
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0))
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0))
      return dateB.getTime() - dateA.getTime() // Newest first
    }) as any[]

  // Fetch visited places from history subcollection
  const visitedPlaces = await Promise.all(
    historyIds.map(async (placeId: string) => {
      try {
        const placeRef = doc(db, 'places', placeId)
        const placeSnap = await getDoc(placeRef)
        if (placeSnap.exists()) {
          const placeData = placeSnap.data()
          // Find comment for this place to get photoUrl and rating
          const placeComment = comments.find((c: UserComment) => c.placeId === placeId)
          
          return {
            placeId,
            placeName: placeData.name,
            photoUrl: placeComment?.photoUrl || placeData.imageUrl || placeData.image,
            rating: placeComment?.rating || placeData.rating || 0,
            city: placeData.city || placeData.address?.split(',')[0] || 'Bilinmeyen',
            timestamp: placeComment?.createdAt || null
          }
        }
      } catch (error) {
        console.error('Error fetching place:', error)
      }
      return null
    })
  )

  const visited = visitedPlaces
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0)
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0)
      return dateB.getTime() - dateA.getTime()
    }) as any[]

  return { reviews: userReviews, visitedPlaces: visited }
}

export default function ReviewsHistoryTab({ userId, userName }: ReviewsHistoryTabProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingReview, setEditingReview] = useState<any | null>(null)
  const [editedText, setEditedText] = useState('')
  const [editedRating, setEditedRating] = useState(5)
  const [reviewsLimit, setReviewsLimit] = useState(10)
  const [visitedLimit, setVisitedLimit] = useState(9)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reviewsHistory', userId],
    queryFn: () => fetchReviewsAndHistory(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const reviews = data?.reviews || []
  const visitedPlaces = data?.visitedPlaces || []

  const filteredReviews = reviews.filter(review => {
    if (filter === 'highest') return review.rating >= 4
    if (filter === 'photos') return review.photoUrl
    if (filter === 'recent') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const reviewDate = review.createdAt?.toDate ? review.createdAt.toDate() : new Date(0)
      return reviewDate > weekAgo
    }
    return true
  })

  const displayedReviews = filteredReviews.slice(0, reviewsLimit)
  const displayedVisitedPlaces = visitedPlaces.slice(0, visitedLimit)

  const handleEditReview = async () => {
    if (!editingReview || !editedText.trim() || !editingReview._commentId) return

    const loadingToast = toast.loading('Güncelleniyor...')

    try {
      await updateComment(userId, editingReview._commentId, editedText.trim(), editedRating)

      // Also update in places/{placeId}/comments if it exists
      try {
        const commentsRef = collection(db, 'places', editingReview.placeId, 'comments')
        const commentsSnap = await getDocs(commentsRef)
        const userCommentDoc = commentsSnap.docs.find(
          doc => doc.data().userId === userId && doc.data().comment === editingReview.comment
        )
        if (userCommentDoc) {
          const commentRef = doc(db, 'places', editingReview.placeId, 'comments', userCommentDoc.id)
          await updateDoc(commentRef, {
            comment: editedText.trim(),
            rating: editedRating,
          })
        }
      } catch (error) {
        console.error('Error updating comment in places:', error)
      }

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['reviewsHistory', userId] })

      toast.success('Yorum güncellendi! ✅', { id: loadingToast })
      setEditingReview(null)
      setEditedText('')
      setEditedRating(5)
    } catch (error) {
      console.error('Error updating review:', error)
      toast.error('Bir hata oluştu ❌', { id: loadingToast })
    }
  }

  const handleDeleteReview = async (review: any) => {
    if (!window.confirm('Yorumu silmek istediğine emin misin?')) return

    const loadingToast = toast.loading('Siliniyor...')

    try {
      if (review._commentId) {
        await removeComment(userId, review._commentId)
      }

      // Also delete from places/{placeId}/comments if it exists
      try {
        const commentsRef = collection(db, 'places', review.placeId, 'comments')
        const commentsSnap = await getDocs(commentsRef)
        const userCommentDoc = commentsSnap.docs.find(
          doc => doc.data().userId === userId && doc.data().comment === review.comment
        )
        if (userCommentDoc) {
          const commentRef = doc(db, 'places', review.placeId, 'comments', userCommentDoc.id)
          await deleteDoc(commentRef)
        }
      } catch (error) {
        console.error('Error deleting comment from places:', error)
      }

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['reviewsHistory', userId] })

      toast.success('Yorum silindi ✅', { id: loadingToast })
    } catch (error) {
      console.error('Error deleting review:', error)
      toast.error('Bir hata oluştu ❌', { id: loadingToast })
    }
  }

  const openEditModal = (review: any) => {
    setEditingReview(review)
    setEditedText(review.comment)
    setEditedRating(review.rating || 5)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-2xl p-6 shadow-md animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>

        {/* Reviews Skeleton */}
        <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-teal-100">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <GridSkeleton count={5} type="review" />
        </div>
      </div>
    )
  }

  // Calculate stats
  const mostVisitedCity = visitedPlaces.length > 0
    ? visitedPlaces.reduce((acc: { [key: string]: number }, place) => {
        const city = place.city || 'Bilinmeyen'
        acc[city] = (acc[city] || 0) + 1
        return acc
      }, {})
    : {}
  
  const topCity = Object.keys(mostVisitedCity).length > 0
    ? Object.keys(mostVisitedCity).reduce((a, b) => mostVisitedCity[a] > mostVisitedCity[b] ? a : b)
    : 'Henüz yok'

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0

  const lastReviewDate = reviews.length > 0 && reviews[0].createdAt
    ? (() => {
        try {
          const date = reviews[0].createdAt.toDate ? reviews[0].createdAt.toDate() : new Date(reviews[0].createdAt)
          return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
        } catch {
          return 'Bilinmiyor'
        }
      })()
    : 'Henüz yorum yok'

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 shadow-md border border-blue-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-poppins font-bold text-blue-900">En Çok Ziyaret</h3>
          </div>
          <p className="text-xl font-poppins font-bold text-blue-900">{topCity}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-md border border-orange-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-poppins font-bold text-amber-900">Ortalama Puan</h3>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-poppins font-bold text-amber-900">{avgRating.toFixed(1)}</p>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(avgRating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-md border border-purple-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-poppins font-bold text-purple-900">Son Yorum</h3>
          </div>
          <p className="text-sm font-poppins font-bold text-purple-900">{lastReviewDate}</p>
        </motion.div>
      </div>

      {/* Reviews Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-teal-100">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h3 className="text-xl font-poppins font-bold text-teal-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-600" />
            Yorumlarım ({reviews.length})
          </h3>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all' as FilterType, label: 'Tümü' },
              { id: 'highest' as FilterType, label: 'Yüksek Puanlı' },
              { id: 'photos' as FilterType, label: 'Fotoğraflı' },
              { id: 'recent' as FilterType, label: 'Son 7 Gün' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium font-inter transition-all duration-300 ${
                  filter === f.id
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="font-inter">Henüz yorum yapmadınız</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayedReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex gap-4">
                    <Link href={`/places/${review.placeId}`}>
                      <img
                        src={review.placeImage || '/default-place.jpg'}
                        alt={review.placeName}
                        loading="lazy"
                        className="w-20 h-20 rounded-lg object-cover shadow-md hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link
                            href={`/places/${review.placeId}`}
                            className="text-lg font-poppins font-bold text-teal-900 hover:text-teal-600 transition-colors"
                          >
                            {review.placeName}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600 font-inter">
                              {review.createdAt ? (() => {
                                try {
                                  const date = review.createdAt.toDate ? review.createdAt.toDate() : new Date(review.createdAt)
                                  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
                                } catch {
                                  return ''
                                }
                              })() : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditModal(review)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteReview(review)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>

                      <p className="text-gray-700 font-inter mb-3 leading-relaxed">{review.comment}</p>

                      {review.photoUrl && (
                        <img
                          src={review.photoUrl}
                          alt="Review"
                          loading="lazy"
                          className="w-full max-w-md rounded-lg shadow-md"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Load More Reviews */}
            {filteredReviews.length > reviewsLimit && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setReviewsLimit(prev => prev + 10)}
                className="mx-auto mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg font-inter font-medium"
              >
                Daha Fazla Göster
                <ChevronDown className="w-5 h-5" />
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Visited Places History */}
      {visitedPlaces.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-teal-100">
          <h3 className="text-xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-teal-600" />
            Ziyaret Geçmişim ({visitedPlaces.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedVisitedPlaces.map((place, index) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.03 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 hover:shadow-md transition-all duration-300"
              >
                <Link href={`/places/${place.placeId}`} className="block">
                  {place.photoUrl && (
                    <img
                      src={place.photoUrl}
                      alt={place.placeName}
                      loading="lazy"
                      className="w-full h-32 object-cover rounded-lg mb-3 shadow-sm"
                    />
                  )}
                  <h4 className="font-poppins font-bold text-purple-900 mb-2 line-clamp-1">
                    {place.placeName}
                  </h4>
                  {place.city && (
                    <p className="text-sm text-purple-700 font-inter mb-2">📍 {place.city}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < (place.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {place.timestamp && (
                      <span className="text-xs text-purple-600 font-inter">
                        {(() => {
                          try {
                            const date = place.timestamp.toDate ? place.timestamp.toDate() : new Date(place.timestamp)
                            return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
                          } catch {
                            return ''
                          }
                        })()}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Load More Visited Places */}
          {visitedPlaces.length > visitedLimit && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setVisitedLimit(prev => prev + 9)}
              className="mx-auto mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg font-inter font-medium"
            >
              Daha Fazla Göster
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingReview(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-poppins font-bold text-teal-900">Yorumu Düzenle</h3>
                <button
                  onClick={() => setEditingReview(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium font-inter text-gray-700 mb-2">
                  Puanlama
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setEditedRating(star)}
                      className="transition-colors duration-200"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= editedRating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium font-inter text-gray-700 mb-2">
                  Yorum
                </label>
                <textarea
                  value={editedText}
                  onChange={e => setEditedText(e.target.value)}
                  className="w-full p-4 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-inter"
                  rows={5}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleEditReview}
                  disabled={!editedText.trim()}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium font-inter px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Güncelle
                </button>
                <button
                  onClick={() => setEditingReview(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium font-inter rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
