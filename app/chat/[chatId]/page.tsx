'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatWindow from '@/components/chat/ChatWindow'
import { useAuth } from '@/contexts/AuthContext'

export default function ChatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const chatId = params?.chatId as string
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-inter">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden lg:block">
          <ChatSidebar
            isOpen={true}
            onToggle={() => {}}
            activeChatId={chatId}
            onCreateNew={() => router.push('/chat')}
          />
        </div>

        {/* Mobile Sidebar */}
        <div className="lg:hidden">
          <ChatSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            activeChatId={chatId}
            onCreateNew={() => {
              setSidebarOpen(false)
              router.push('/chat')
            }}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-poppins font-bold text-teal-900">
              AI Sohbet Asistanı
            </h1>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Chat Window */}
          <div className="flex-1 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full max-w-5xl mx-auto bg-white shadow-xl rounded-t-2xl lg:rounded-2xl border border-teal-100 flex flex-col"
            >
              <ChatWindow chatId={chatId} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

