'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toggleFavorite } from '@/lib/userData'

export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Favorileri dinle - users/{uid}/favorites subcollection
  useEffect(() => {
    if (!user || !user.uid) {
      setFavoriteIds([])
      setLoading(false)
      return
    }

    const favoritesRef = collection(db, 'users', user.uid, 'favorites')

    const unsubscribe = onSnapshot(
      favoritesRef,
      (snapshot) => {
        const ids = snapshot.docs.map(doc => doc.id) // placeId is the document ID
        setFavoriteIds(ids)
        setLoading(false)
      },
      (error) => {
        console.error('Favorites snapshot error:', error)
        setFavoriteIds([])
        setLoading(false)
      }
    )

    return () => unsubscribe && unsubscribe()
  }, [user])

  // FAVORİ EKLE/KALDIR
  const addToFavorites = useCallback(async (placeId: number | string, placeData?: any) => {
    if (!user || !user.uid) return

    try {
      const placeIdStr = String(placeId)
      await toggleFavorite(user.uid, placeIdStr)
    } catch (error) {
      console.error('Error adding to favorites:', error)
      throw error
    }
  }, [user])

  const removeFromFavorites = useCallback(async (placeId: number | string) => {
    if (!user || !user.uid) return

    try {
      const placeIdStr = String(placeId)
      await toggleFavorite(user.uid, placeIdStr)
    } catch (error) {
      console.error('Error removing from favorites:', error)
      throw error
    }
  }, [user])

  const isFavorite = useCallback((placeId: number | string): boolean => {
    const placeIdStr = String(placeId)
    return favoriteIds.includes(placeIdStr)
  }, [favoriteIds])

  // Toggle favorite - Add or remove
  const toggleFavoriteAction = useCallback(async (placeId: number | string) => {
    if (!user || !user.uid) return false

    try {
      const placeIdStr = String(placeId)
      return await toggleFavorite(user.uid, placeIdStr)
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error
    }
  }, [user])

  return {
    favoriteIds,
    loading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite: toggleFavoriteAction
  }
}
