'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to restore a cached user quickly to avoid logout flashes
    try {
      const raw = localStorage.getItem('pm_user')
      if (raw) {
        const cached = JSON.parse(raw)
        // set a lightweight user object until Firebase provides the real user
        setUser(cached as unknown as User)
      }
    } catch (e) {
      // ignore JSON parse errors
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // persist minimal user info + id token
        try {
          const token = await u.getIdToken()
          const minimal = { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL }
          localStorage.setItem('pm_user', JSON.stringify(minimal))
          localStorage.setItem('pm_token', token)
        } catch (err) {
          console.error('Error getting id token', err)
        }
      } else {
        localStorage.removeItem('pm_user')
        localStorage.removeItem('pm_token')
      }

      setUser(u)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(userCredential.user, { displayName })
    } catch (error) {
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      // store minimal user info and id token
      try {
        const token = await cred.user.getIdToken()
        const minimal = { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName, photoURL: cred.user.photoURL }
        localStorage.setItem('pm_user', JSON.stringify(minimal))
        localStorage.setItem('pm_token', token)
      } catch (err) {
        console.error('Error storing token', err)
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      // clear persisted data
      try {
        localStorage.removeItem('pm_user')
        localStorage.removeItem('pm_token')
      } catch (e) {}
    } catch (error) {
      throw error
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
