'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type Favorite = {
  id: string
  placeId: string | number
  placeData: any
  addedAt: any
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Firestore'a undefined girmemesi için gerekli temizlik
  const sanitizePlaceData = (data: any) => {
    if (!data || typeof data !== 'object') return {}

    const safe: any = {}

    Object.keys(data).forEach(key => {
      const value = data[key]

      if (value === undefined) {
        safe[key] = null
      } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        safe[key] = sanitizePlaceData(value)
      } else {
        safe[key] = value
      }
    })

    return safe
  }

  // Koleksiyonu oluştur
  const ensureFavoritesCollection = useCallback(async (userId: string) => {
    try {
      const placeholderRef = doc(db, 'users', userId, 'favorites', '_placeholder')
      await setDoc(placeholderRef, { ok: true })
      await deleteDoc(placeholderRef)
    } catch (_) {}
  }, [])

  // Favorileri dinle
  useEffect(() => {
    if (!user || !user.uid) {
      setFavorites([])
      setLoading(false)
      return
    }

    ensureFavoritesCollection(user.uid)

    const userId = String(user.uid)
    const favoritesCol = collection(db, 'users', userId, 'favorites')

    const unsubscribe = onSnapshot(
      favoritesCol,
      (snapshot) => {
        const favoritesData: Favorite[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            placeId: data.placeId ?? '',
            placeData: data.placeData ?? {},
            addedAt: data.addedAt ?? null
          }
        })
        setFavorites(favoritesData)
        setLoading(false)
      },
      (error) => {
        console.error('Favorites snapshot error:', error)
        setFavorites([])
        setLoading(false)
      }
    )

    return () => unsubscribe && unsubscribe()
  }, [user, ensureFavoritesCollection])

  // FAVORİ EKLE (düzeltilmiş versiyon)
  const addToFavorites = useCallback(async (placeId: number | string, placeData: any) => {
    if (!user || !user.uid) return

    try {
      const userId = String(user.uid)
      const placeIdStr = String(placeId)

      const safePlaceData = sanitizePlaceData(placeData)

      await addDoc(collection(db, 'users', userId, 'favorites'), {
        placeId: placeIdStr,
        placeData: safePlaceData,
        addedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error adding to favorites:', error)
      throw error
    }
  }, [user])

  const removeFromFavorites = useCallback(async (favoriteId: string) => {
    if (!user || !user.uid) return

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'favorites', favoriteId))
    } catch (error) {
      console.error('Error removing favorite:', error)
      throw error
    }
  }, [user])

  const isFavorite = useCallback((placeId: number | string): boolean => {
    const placeIdStr = String(placeId)
    return favorites.some(f => String(f.placeId) === placeIdStr)
  }, [favorites])

  const getFavoriteId = useCallback((placeId: number | string): string | undefined => {
    const placeIdStr = String(placeId)
    return favorites.find(f => String(f.placeId) === placeIdStr)?.id
  }, [favorites])

  return {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    getFavoriteId
  }
}
