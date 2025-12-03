'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Heart, Camera, MessageSquare, MapPin, Award, Calendar, TrendingUp, Star, Edit, Trash2, Filter, ArrowLeft, Route } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, collectionGroup } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import OverviewTab from '@/components/profile/OverviewTab'
import FavoritesGalleryTab from '@/components/profile/FavoritesGalleryTab'
import ReviewsHistoryTab from '@/components/profile/ReviewsHistoryTab'
import RoutesTab from '@/components/profile/RoutesTab'

type Tab = 'overview' | 'favorites' | 'reviews' | 'routes'

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
    } else {
      setLoading(false)
    }
  }, [user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="bg-white/90 rounded-2xl shadow-lg p-8 border border-teal-100 animate-pulse">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  <div className="flex gap-4">
                    <div className="h-8 bg-gray-100 rounded w-24"></div>
                    <div className="h-8 bg-gray-100 rounded w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="bg-white/90 rounded-2xl shadow-lg p-2 mb-8 border border-teal-100 animate-pulse">
            <div className="flex gap-2">
              <div className="h-12 bg-gray-200 rounded-xl w-40"></div>
              <div className="h-12 bg-gray-100 rounded-xl w-40"></div>
              <div className="h-12 bg-gray-100 rounded-xl w-40"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Genel Bakış', icon: TrendingUp },
    { id: 'favorites' as Tab, label: 'Favoriler & Galeri', icon: Heart },
    { id: 'reviews' as Tab, label: 'Yorumlarım & Geçmişim', icon: MessageSquare },
    { id: 'routes' as Tab, label: 'Rotalarım', icon: Route },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <Link 
            href="/places" 
            className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-inter font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Mekanlara Dön
          </Link>

          {/* User Profile Header */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-teal-100">
            <div className="flex items-start gap-6">
              <div className="relative">
                <img
                  src={user.photoURL || '/default-avatar.svg'}
                  alt={user.displayName || 'User'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-teal-200 shadow-lg"
                />
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full p-2 shadow-lg">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-poppins font-bold text-teal-900 mb-2">
                  {user.displayName || 'Kullanıcı'}
                </h1>
                <p className="text-gray-600 font-inter mb-4">{user.email}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-full">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-inter font-medium text-teal-900">Gezgin</span>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-inter font-medium text-amber-900">Aktif Üye</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-2 mb-8 border border-teal-100"
        >
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium font-inter transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Tab Content - Only render active tab for performance */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && <OverviewTab userId={user.uid} />}
            {activeTab === 'favorites' && <FavoritesGalleryTab userId={user.uid} />}
            {activeTab === 'reviews' && <ReviewsHistoryTab userId={user.uid} userName={user.displayName || user.email || 'User'} />}
            {activeTab === 'routes' && <RoutesTab userId={user.uid} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

