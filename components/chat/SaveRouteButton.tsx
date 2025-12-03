'use client'

import { useState } from 'react'
import { Save, Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRoutes } from '@/hooks/useRoutes'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

interface SaveRouteButtonProps {
  routeData: {
    name: string
    days: number
    places: Array<{
      id?: string
      name: string
      lat: number
      lng: number
      order: number
      image?: string
    }>
  }
}

export default function SaveRouteButton({ routeData }: SaveRouteButtonProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { saveRoute } = useRoutes()
  const { user } = useAuth()

  const handleSave = async () => {
    if (!user) {
      toast.error('Giriş yapmanız gerekiyor')
      return
    }

    if (saving || saved) return

    setSaving(true)
    try {
      await saveRoute(routeData)
      setSaved(true)
      toast.success('Rota kaydedildi!')
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving route:', error)
      toast.error('Rota kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.button
      onClick={handleSave}
      disabled={saving || saved}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
        saved
          ? 'bg-green-500 text-white'
          : 'bg-teal-500 text-white hover:bg-teal-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      whileHover={{ scale: saved ? 1 : 1.05 }}
      whileTap={{ scale: saved ? 1 : 0.95 }}
    >
      {saving ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Kaydediliyor...</span>
        </>
      ) : saved ? (
        <>
          <Check className="w-4 h-4" />
          <span>Kaydedildi!</span>
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          <span>Rotayı Kaydet</span>
        </>
      )}
    </motion.button>
  )
}

