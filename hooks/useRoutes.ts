'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface RoutePlace {
  id?: string
  name: string
  lat: number
  lng: number
  order: number
  image?: string
}

export interface Route {
  id: string
  name: string
  days: number
  createdAt: Timestamp | Date
  places: RoutePlace[]
}

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setRoutes([])
      setLoading(false)
      return
    }

    const routesRef = collection(db, 'users', user.uid, 'routes')
    const q = query(routesRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const routesData: Route[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || 'İsimsiz Rota',
            days: data.days || 1,
            createdAt: data.createdAt || Timestamp.now(),
            places: data.places || []
          }
        })
        setRoutes(routesData)
        setLoading(false)
      },
      (error) => {
        console.error('Routes snapshot error:', error)
        setRoutes([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const saveRoute = useCallback(async (routeData: Omit<Route, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const routesRef = collection(db, 'users', user.uid, 'routes')
      await addDoc(routesRef, {
        name: routeData.name,
        days: routeData.days,
        places: routeData.places,
        createdAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error saving route:', error)
      throw error
    }
  }, [user])

  const deleteRoute = useCallback(async (routeId: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'routes', routeId))
    } catch (error) {
      console.error('Error deleting route:', error)
      throw error
    }
  }, [user])

  const getRoute = useCallback(async (routeId: string): Promise<Route | null> => {
    if (!user) return null

    try {
      const routeDoc = await getDoc(doc(db, 'users', user.uid, 'routes', routeId))
      if (!routeDoc.exists()) return null

      const data = routeDoc.data()
      return {
        id: routeDoc.id,
        name: data.name || 'İsimsiz Rota',
        days: data.days || 1,
        createdAt: data.createdAt || Timestamp.now(),
        places: data.places || []
      }
    } catch (error) {
      console.error('Error getting route:', error)
      return null
    }
  }, [user])

  return {
    routes,
    loading,
    saveRoute,
    deleteRoute,
    getRoute
  }
}

