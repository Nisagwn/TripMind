'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useChatList } from '@/hooks/useChatList'
import { motion } from 'framer-motion'
import { Menu, MessageSquare, Sparkles } from 'lucide-react'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatWindow from '@/components/chat/ChatWindow'

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { chats, loading: chatsLoading } = useChatList()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const from = searchParams.get('from')

  useEffect(() => {
    if (authLoading || chatsLoading) return

    if (!user) {
      router.push('/auth/signin')
      return
    }

    // If user has chats, select the most recent one and redirect
    if (chats.length > 0 && !selectedChatId) {
      const mostRecentChatId = chats[0].id
      setSelectedChatId(mostRecentChatId)
      router.replace(`/chat/${mostRecentChatId}`)
    }
  }, [user, authLoading, chatsLoading, chats, selectedChatId, router])

  if (authLoading || chatsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-inter">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Show empty welcome screen if no chats
  if (chats.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="hidden lg:block">
            <ChatSidebar
              isOpen={true}
              onToggle={() => {}}
              activeChatId={null}
              onCreateNew={() => {}}
            />
          </div>

          {/* Mobile Sidebar */}
          <div className="lg:hidden">
            <ChatSidebar
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              activeChatId={null}
              onCreateNew={() => {}}
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
              <div className="w-10" />
            </div>

            {/* Welcome Screen */}
            <div className="flex-1 overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full max-w-5xl mx-auto bg-white shadow-xl rounded-t-2xl lg:rounded-2xl border border-teal-100 flex flex-col items-center justify-center p-8"
              >
                {from === 'routes' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl w-full"
                  >
                    <p className="text-sm font-inter text-teal-900 text-center">
                      🗺️ Rota oluşturmak için buradasınız, ne tür bir rota istiyorsunuz?
                    </p>
                  </motion.div>
                )}
                <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-poppins font-bold text-teal-900 mb-2">
                  Yeni Sohbet Başlat
                </h2>
                <p className="text-gray-600 font-inter text-center max-w-md mb-6">
                  Mesajınızı yazarak yeni bir sohbet başlatabilirsiniz. AI asistanı size seyahat planlaması, mekan önerileri ve daha fazlası konusunda yardımcı olacak.
                </p>
                <ChatWindow chatId={null} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If we have chats but no selected chat, show loading while redirecting
  if (chats.length > 0 && !selectedChatId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-inter">Yönlendiriliyor...</p>
        </div>
      </div>
    )
  }

  return null
}
