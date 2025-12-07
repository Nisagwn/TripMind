'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Utensils, Coffee, PartyPopper, Landmark, Umbrella,
    MapPin, Calendar, Wallet, ChevronRight, ChevronLeft,
    Sparkles, Check, Hotel, Loader2, Save, Map
} from 'lucide-react'
import turkeyLocations from '@/lib/data/turkeyLocations.json'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import toast, { Toaster } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import RouteMap to avoid SSR issues
const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[250px] bg-teal-50 rounded-xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        </div>
    )
})

// Types
interface RoutePreferences {
    activities: string[]
    province: string
    district: string
    days: number
    withAccommodation: boolean
    budget: 'Ucuz' | 'Orta' | 'Pahalı'
}

interface GeneratedRoute {
    day_1_hotel?: string | null
    days: {
        day: number
        activities: {
            time: string
            place: string
            place_id?: string
            description: string
            category: string
            lat?: number
            lng?: number
            imageUrl?: string
        }[]
    }[]
}

// Activity options
const ACTIVITIES = [
    { id: 'restaurant', label: 'Restoran', icon: Utensils, color: 'from-orange-400 to-red-500' },
    { id: 'cafe', label: 'Cafe', icon: Coffee, color: 'from-amber-400 to-orange-500' },
    { id: 'entertainment', label: 'Eğlence', icon: PartyPopper, color: 'from-pink-400 to-purple-500' },
    { id: 'culture', label: 'Tarihi Gezi', icon: Landmark, color: 'from-teal-400 to-cyan-500' },
    { id: 'beach', label: 'Deniz', icon: Umbrella, color: 'from-blue-400 to-indigo-500' },
]

const BUDGET_OPTIONS = [
    { id: 'Ucuz', label: 'Ekonomik', description: 'Bütçe dostu seçenekler', color: 'from-green-400 to-emerald-500' },
    { id: 'Orta', label: 'Orta', description: 'Dengeli fiyat/kalite', color: 'from-amber-400 to-orange-500' },
    { id: 'Pahalı', label: 'Premium', description: 'Lüks deneyimler', color: 'from-purple-400 to-pink-500' },
]

export default function PlannerPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [generatedRoute, setGeneratedRoute] = useState<GeneratedRoute | null>(null)
    const [preferences, setPreferences] = useState<RoutePreferences>({
        activities: [],
        province: '',
        district: '',
        days: 1,
        withAccommodation: false,
        budget: 'Orta',
    })

    // Get districts for selected province
    const districts = useMemo(() => {
        if (!preferences.province) return []
        const province = turkeyLocations.find((p: any) => p.name === preferences.province)
        return province?.districts || []
    }, [preferences.province])

    const handleSaveRoute = async () => {
        if (!user) {
            toast.error('Rotayı kaydetmek için giriş yapmalısınız')
            window.location.href = '/auth/signin'
            return
        }
        if (!generatedRoute) return

        setIsSaving(true)
        try {
            // Flatten places for map visualization in RoutesTab
            const placesForMap = generatedRoute.days.flatMap((day, dayIndex) =>
                day.activities.map((act, actIndex) => ({
                    id: act.place_id || `${day.day}-${actIndex}`,
                    name: act.place,
                    lat: act.lat || 0,
                    lng: act.lng || 0,
                    order: dayIndex * 10 + actIndex
                }))
            ).filter(p => p.lat !== 0 && p.lng !== 0)

            const routeData = {
                routeName: `${preferences.days} Günlük ${preferences.district} Turu`,
                days: preferences.days,
                places: placesForMap, // For map viewing logic in RoutesTab
                itinerary: generatedRoute.days, // Full detailed itinerary
                createdAt: serverTimestamp(),
                preferenceDetails: preferences
            }

            // Save to users/{uid}/routes
            await addDoc(collection(db, 'users', user.uid, 'routes'), routeData)

            toast.success('Rota profilinize kaydedildi! Yönlendiriliyorsunuz...')
            setTimeout(() => {
                router.push('/profile')
            }, 1500)
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Rota kaydedilirken hata oluştu')
            setIsSaving(false)
        }
    }

    const toggleActivity = (id: string) => {
        setPreferences(prev => ({
            ...prev,
            activities: prev.activities.includes(id)
                ? prev.activities.filter(a => a !== id)
                : [...prev.activities, id]
        }))
    }

    const canProceed = () => {
        switch (step) {
            case 1: return preferences.activities.length > 0
            case 2: return preferences.province !== '' && preferences.district !== ''
            case 3: return preferences.days > 0
            case 4: return true
            default: return false
        }
    }

    const generateRoute = async () => {
        setIsGenerating(true)
        try {
            const response = await fetch('/api/generate-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences)
            })
            const data = await response.json()
            setGeneratedRoute(data.route)
            setStep(5)
        } catch (error) {
            console.error('Route generation failed:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 py-8">
            <Toaster position="top-center" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-poppins font-bold text-teal-900 mb-4">
                        🗺️ Rota Planlayıcı
                    </h1>
                    <p className="text-xl font-inter text-gray-600 max-w-2xl mx-auto">
                        Tercihlerinize göre kişiselleştirilmiş gezi rotası oluşturun
                    </p>
                </motion.div>

                {/* Stepper */}
                {step < 5 && (
                    <div className="flex items-center justify-center mb-12">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${s < step ? 'bg-teal-500 text-white' :
                                    s === step ? 'bg-teal-600 text-white ring-4 ring-teal-200' :
                                        'bg-gray-200 text-gray-500'
                                    }`}>
                                    {s < step ? <Check className="w-5 h-5" /> : s}
                                </div>
                                {s < 4 && (
                                    <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${s < step ? 'bg-teal-500' : 'bg-gray-200'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* Step 1: Activity Selection */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-teal-100"
                        >
                            <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-6">
                                Ne yapmak istersiniz?
                            </h2>
                            <p className="text-gray-600 mb-8 font-inter">Birden fazla seçebilirsiniz</p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {ACTIVITIES.map((activity) => {
                                    const Icon = activity.icon
                                    const isSelected = preferences.activities.includes(activity.id)
                                    return (
                                        <motion.button
                                            key={activity.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => toggleActivity(activity.id)}
                                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${isSelected
                                                ? 'border-teal-500 bg-gradient-to-br ' + activity.color + ' text-white shadow-lg'
                                                : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-md'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-teal-500" />
                                                </div>
                                            )}
                                            <Icon className={`w-10 h-10 mx-auto mb-3 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                                            <span className={`font-semibold font-inter ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                                {activity.label}
                                            </span>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Location Selection */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-teal-100"
                        >
                            <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-2">
                                <MapPin className="w-6 h-6 text-teal-500" />
                                Nereyi keşfetmek istersiniz?
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">İl</label>
                                    <select
                                        value={preferences.province}
                                        onChange={(e) => setPreferences(prev => ({ ...prev, province: e.target.value, district: '' }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-400 focus:outline-none focus:border-teal-400 font-inter text-gray-700 bg-white"
                                    >
                                        <option value="">İl seçin...</option>
                                        {turkeyLocations.map((province: any) => (
                                            <option key={province.id} value={province.name}>{province.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-inter">İlçe</label>
                                    <select
                                        value={preferences.district}
                                        onChange={(e) => setPreferences(prev => ({ ...prev, district: e.target.value }))}
                                        disabled={!preferences.province}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-400 focus:outline-none focus:border-teal-400 font-inter text-gray-700 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">İlçe seçin...</option>
                                        {districts.map((district: any) => (
                                            <option key={district.id} value={district.name}>{district.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-teal-50 rounded-xl p-4 flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-teal-600" />
                                    <span className="text-sm text-teal-700 font-inter">
                                        Seçtiğiniz lokasyondan maksimum 10km uzaklıktaki yerler listelenecek
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Duration & Accommodation */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-teal-100"
                        >
                            <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-teal-500" />
                                Ne kadar sürecek?
                            </h2>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-4 font-inter">
                                        Gün Sayısı: <span className="text-teal-600 font-bold text-lg">{preferences.days} gün</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="14"
                                        value={preferences.days}
                                        onChange={(e) => setPreferences(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                    />
                                    <div className="flex justify-between text-sm text-gray-500 mt-2 font-inter">
                                        <span>1 gün</span>
                                        <span>14 gün</span>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setPreferences(prev => ({ ...prev, withAccommodation: !prev.withAccommodation }))}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${preferences.withAccommodation
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200 bg-white hover:border-teal-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Hotel className={`w-8 h-8 ${preferences.withAccommodation ? 'text-teal-500' : 'text-gray-400'}`} />
                                            <div>
                                                <h3 className="font-semibold text-gray-800 font-inter">Konaklama Dahil</h3>
                                                <p className="text-sm text-gray-500 font-inter">Rotaya otel önerileri eklensin</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${preferences.withAccommodation ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                                            }`}>
                                            {preferences.withAccommodation && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Budget Selection */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-teal-100"
                        >
                            <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-6 flex items-center gap-2">
                                <Wallet className="w-6 h-6 text-teal-500" />
                                Bütçeniz nedir?
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {BUDGET_OPTIONS.map((budget) => {
                                    const isSelected = preferences.budget === budget.id
                                    return (
                                        <motion.button
                                            key={budget.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setPreferences(prev => ({ ...prev, budget: budget.id as any }))}
                                            className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${isSelected
                                                ? 'border-teal-500 bg-gradient-to-br ' + budget.color + ' text-white shadow-lg'
                                                : 'border-gray-200 bg-white hover:border-teal-300'
                                                }`}
                                        >
                                            <h3 className={`font-bold text-lg font-poppins ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                                {budget.label}
                                            </h3>
                                            <p className={`text-sm mt-1 font-inter ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                                                {budget.description}
                                            </p>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 5: Generated Route */}
                    {step === 5 && generatedRoute && (
                        <motion.div
                            key="step5"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-8 text-white text-center">
                                <Sparkles className="w-12 h-12 mx-auto mb-4" />
                                <h2 className="text-3xl font-poppins font-bold mb-2">Rotanız Hazır!</h2>
                                <p className="text-teal-100 font-inter">
                                    {preferences.days} günlük {preferences.district}, {preferences.province} rotası
                                </p>
                            </div>

                            {/* Hotel Info Card */}
                            {generatedRoute.day_1_hotel && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 border-2 border-amber-300 shadow-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                            <Hotel className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-amber-700 font-inter">Tüm Tatil Boyunca Konaklama</p>
                                            <h3 className="text-xl font-bold text-amber-900 font-poppins">{generatedRoute.day_1_hotel}</h3>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {generatedRoute.days.map((day) => (
                                <motion.div
                                    key={day.day}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: day.day * 0.1 }}
                                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-teal-100"
                                >
                                    <h3 className="text-xl font-poppins font-bold text-teal-900 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-teal-500" />
                                        {day.day}. Gün
                                    </h3>

                                    {/* Day Route Map */}
                                    {day.activities.some(a => a.lat && a.lng) && (
                                        <div className="mb-4">
                                            <RouteMap
                                                places={day.activities
                                                    .filter(a => a.lat && a.lng)
                                                    .map((a, idx) => ({
                                                        id: a.place_id || `${day.day}-${idx}`,
                                                        name: a.place,
                                                        lat: a.lat!,
                                                        lng: a.lng!,
                                                        order: idx + 1
                                                    }))
                                                }
                                                height="250px"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {day.activities.map((activity, idx) => (
                                            <div key={idx} className="flex items-start gap-4 p-4 bg-teal-50 rounded-xl transition-all hover:shadow-md relative">
                                                {/* Numbered marker */}
                                                <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                                                    {idx + 1}
                                                </div>

                                                {/* Connecting line to next item */}
                                                {idx < day.activities.length - 1 && (
                                                    <div className="absolute left-9 top-14 w-0.5 h-8 bg-teal-300" />
                                                )}

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs px-2 py-0.5 bg-teal-200 text-teal-700 rounded-full font-medium">
                                                            {activity.time}
                                                        </span>
                                                    </div>
                                                    {activity.place_id ? (
                                                        <Link
                                                            href={`/places/${activity.place_id}`}
                                                            className="font-semibold text-gray-800 font-inter hover:text-teal-600 hover:underline flex items-center gap-1"
                                                            target="_blank"
                                                        >
                                                            {activity.place}
                                                            <ChevronRight className="w-4 h-4 inline-block" />
                                                        </Link>
                                                    ) : (
                                                        <h4 className="font-semibold text-gray-800 font-inter">{activity.place}</h4>
                                                    )}
                                                    <p className="text-sm text-gray-600 font-inter mt-1">{activity.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                {step < 5 && (
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={() => setStep(s => s - 1)}
                            disabled={step === 1}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-inter"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Geri
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-inter"
                            >
                                İleri
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={generateRoute}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-600 hover:to-cyan-600 transition-all disabled:opacity-50 shadow-lg font-inter"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Rota Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Rotamı Oluştur
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Save Button for Step 5 */}
                {step === 5 && (
                    <div className="flex justify-center mt-8 pb-12">
                        <button
                            onClick={handleSaveRoute}
                            disabled={isSaving}
                            className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-lg hover:shadow-xl transition-all disabled:opacity-70 shadow-lg font-inter transform hover:scale-105"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Save className="w-6 h-6" />
                                    Rotayı Profilime Kaydet
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
