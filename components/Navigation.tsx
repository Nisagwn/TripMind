'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Compass, Home, User, LogOut, Heart, Camera, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    { href: '/', label: 'Ana Sayfa', icon: Home },
    { href: '/places', label: 'Keşfet', icon: Compass },
    { href: '/gallery', label: 'Galeri', icon: Camera },
    { href: '/chat', label: 'Chat', icon: MessageCircle },
  ]

  const handleLogout = async () => {
    try {
      await logout()
      setShowUserMenu(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-poppins font-bold text-gray-900">
              TripMind
            </span>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-sky-600 hover:bg-sky-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-600 hover:text-sky-600 hover:bg-sky-50 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{user.displayName || user.email}</span>
                </button>

                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                  >
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-sky-50 hover:text-sky-600 transition-all duration-300"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profilim</span>
                    </Link>
                    <Link
                      href="/favorites"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-sky-50 hover:text-sky-600 transition-all duration-300"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Heart className="w-4 h-4" />
                      <span>Favorilerim</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all duration-300"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-gray-600 hover:text-sky-600 transition-all duration-300"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-primary"
                >
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="p-2 rounded-xl text-gray-600 hover:text-sky-600 hover:bg-sky-50 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}


