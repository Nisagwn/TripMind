'use client'

export const revalidate = 60
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Compass, ArrowRight, Star, MapPin, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div suppressHydrationWarning
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-5xl md:text-7xl font-poppins font-bold text-gray-900 mb-6">
                Harika Yerleri
                <span className="block bg-gradient-to-r from-primary-500 to-turquoise-500 bg-clip-text text-transparent">
                  Keşfedin
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Yapay zeka destekli asistanımızla mükemmel seyahat rotaları oluşturun. 
                Gizli hazineleri keşfedin, yolculuğunuzu planlayın ve unutulmaz anılar biriktirin.
              </p>
            </motion.div>

            <motion.div suppressHydrationWarning
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <Link href="/places" className="btn-primary group">
                <Compass className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                Yerleri Keşfet
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div suppressHydrationWarning
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              <div className="card p-6 text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-2xl font-poppins font-bold text-gray-900 mb-2">10.000+</h3>
                <p className="text-gray-600">Harika Yer</p>
              </div>
              <div className="card p-6 text-center">
                <div className="w-12 h-12 bg-turquoise-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-turquoise-500" />
                </div>
                <h3 className="text-2xl font-poppins font-bold text-gray-900 mb-2">50.000+</h3>
                <p className="text-gray-600">Mutlu Seyyah</p>
              </div>
              <div className="card p-6 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
                <h3 className="text-2xl font-poppins font-bold text-gray-900 mb-2">4.9/5</h3>
                <p className="text-gray-600">Ortalama Puan</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-turquoise-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div suppressHydrationWarning
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-poppins font-bold text-gray-900 mb-6">
              Neden TripMind'ı Seçmelisiniz?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Yapay zeka destekli platformumuz seyahat planlamasını zahmetsiz ve kişiselleştirilmiş hale getirir
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Compass,
                title: 'Akıllı Keşif',
                description: 'Yapay zeka tercihlerinize göre gizli hazineler ve popüler yerler bulur',
                color: 'primary'
              },
              {
                icon: MapPin,
                title: 'Mükemmel Rotalar',
                description: 'Zaman tasarrufu sağlayan ve deneyimleri maksimize eden optimize edilmiş seyahat rotaları',
                color: 'turquoise'
              },
              {
                icon: Star,
                title: 'Gerçek Yorumlar',
                description: 'Diğer seyyahlardan gelen otantik yorumlar ve puanlar',
                color: 'yellow'
              }
            ].map((feature, index) => {
              const Icon = feature.icon
              const colorClasses = {
                primary: 'bg-primary-100 text-primary-500',
                turquoise: 'bg-turquoise-100 text-turquoise-500',
                yellow: 'bg-yellow-100 text-yellow-500'
              }
              
              return (
                <motion.div suppressHydrationWarning
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="card p-8 text-center group"
                >
                  <div className={`w-16 h-16 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-poppins font-bold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

