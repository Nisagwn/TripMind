
'use client'

export const revalidate = 60
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Compass, ArrowRight, Star, MapPin, Users, Sparkles, Clock, CheckCircle, Map } from 'lucide-react'
import { useEffect, useState } from 'react'

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf: number
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setValue(Math.floor(progress * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export default function HomePage() {
  const placesCount = useCountUp(10000, 1400)
  const usersCount = useCountUp(50000, 1400)
  const rating = 4.9

  const sampleRoutes = [
    { title: 'İstanbul – 2 Gün', tags: 'Kültür & Kahve', days: 2 },
    { title: 'Kapadokya – 3 Gün', tags: 'Doğa & Balon', days: 3 },
    { title: 'Antalya – 1 Gün', tags: 'Plaj & Tarih', days: 1 },
  ]

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-100/60 via-white to-sky-50 pt-24 pb-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-200/30 via-transparent to-transparent opacity-80"></div>
          <div className="absolute -top-40 -left-20 w-96 h-96 rounded-3xl bg-gradient-to-br from-blue-300 to-purple-400 opacity-30 blur-3xl mix-blend-overlay"></div>
          <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-3xl bg-gradient-to-br from-yellow-200 to-pink-200 opacity-20 blur-3xl mix-blend-overlay"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-4xl sm:text-5xl md:text-6xl font-poppins font-extrabold leading-tight text-gray-900"
            >
              Yapay Zeka ile <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-purple-600">Sana Özel Seyahat Rotası</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto"
            >
              İlgi alanlarına, zamanına ve tarzına göre dakikalar içinde akıllı rota oluştur.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/planner" className="relative">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="relative inline-flex items-center px-8 py-4 rounded-2xl text-white font-semibold shadow-xl"
                  style={{
                    background: 'linear-gradient(90deg,#2563eb,#7c3aed)',
                    boxShadow: '0 8px 30px rgba(124,58,237,0.25)'
                  }}
                >
                  <span className="absolute -inset-1 rounded-2xl blur opacity-60" style={{background: 'linear-gradient(90deg,#34d399,#60a5fa)'}}></span>
                  <span className="relative flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-white" />
                    <span>✨ AI ile Rota Oluştur</span>
                  </span>
                </motion.div>
              </Link>

              <Link href="/places" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-gray-200 text-gray-700 bg-white/60 backdrop-blur-sm">
                <Map className="w-4 h-4" />
                Yerleri Keşfet
              </Link>
            </motion.div>

            <div className="mt-2 text-sm text-gray-500">Ücretsiz • 1 dakikada</div>
          </div>

          {/* Preview cards */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {sampleRoutes.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }} className="bg-white rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{r.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{r.tags} • {r.days} gün</p>
                  </div>
                  <div className="text-sky-600 font-bold text-xl">{r.days}d</div>
                </div>
                <div className="mt-4 text-sm text-gray-600">AI tarafından öne çıkarıldı — optimize edilmiş ziyaret sırası ve zamanlama.</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-poppins font-bold text-gray-900">Nasıl Çalışır?</h2>
            <p className="text-gray-600 mt-3">Sadece 3 adım — şehir, tercihler ve AI iş başında.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-6 bg-white rounded-2xl shadow-md text-center">
              <div className="mx-auto w-14 h-14 rounded-xl bg-sky-50 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-semibold">Şehrini ve tarzını seç</h3>
              <p className="text-sm text-gray-500 mt-2">Kafeni boşalt, bize söyle. İlgi alanların, tarih ve tempo.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="p-6 bg-white rounded-2xl shadow-md text-center">
              <div className="mx-auto w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold">AI senin için planlasın</h3>
              <p className="text-sm text-gray-500 mt-2">Dakikalar içinde kişiye özel rota: ziyaret süresi, mesafe, ilgi noktaları.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="p-6 bg-white rounded-2xl shadow-md text-center">
              <div className="mx-auto w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold">Kaydet, paylaş, keşfet</h3>
              <p className="text-sm text-gray-500 mt-2">Rotalarını kaydet, paylaş veya anında rehber olarak kullan.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-b from-white to-sky-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl p-8 shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <div className="text-3xl font-poppins font-bold text-gray-900">{placesCount.toLocaleString()}+</div>
                  <div className="text-sm text-gray-500">Mekan</div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }} className="bg-white rounded-2xl p-8 shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-turquoise-50 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-turquoise-600" />
                </div>
                <div>
                  <div className="text-3xl font-poppins font-bold text-gray-900">{usersCount.toLocaleString()}+</div>
                  <div className="text-sm text-gray-500">Kullanıcı</div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }} className="bg-white rounded-2xl p-8 shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <div className="text-3xl font-poppins font-bold text-gray-900">{rating}/5</div>
                  <div className="text-sm text-gray-500">Memnuniyet</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

