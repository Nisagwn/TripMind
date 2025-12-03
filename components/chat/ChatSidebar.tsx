'use client'

import { motion } from 'framer-motion'
import { MessageSquare, Plus, X, Edit2, Trash2 } from 'lucide-react'
import { useChatList } from '@/hooks/useChatList'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { doc, deleteDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  activeChatId: string | null
  onCreateNew: () => void
}

export default function ChatSidebar({ isOpen, onToggle, activeChatId, onCreateNew }: ChatSidebarProps) {
  const { chats, loading } = useChatList()
  const router = useRouter()
  const { user } = useAuth()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [creatingChat, setCreatingChat] = useState(false)

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`)
  }

  const createNewChat = async () => {
    // Prevent empty chat IDs - check if user is logged in
    if (!user) {
      toast.error('Giriş yapmanız gerekiyor')
      router.push('/auth/signin')
      return
    }

    if (creatingChat) return // Prevent multiple clicks

    setCreatingChat(true)
    try {
      // Create chat document in Firestore
      const chatsRef = collection(db, 'users', user.uid, 'chats')
      const newChatRef = await addDoc(chatsRef, {
        title: 'Yeni Sohbet',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        messageCount: 0
      })

      const chatId = newChatRef.id
      console.log('✅ New chat created:', chatId)

      // Immediately redirect to the new chat page
      router.push(`/chat/${chatId}`)
      
      // Close sidebar on mobile
      if (window.innerWidth < 1024) {
        onToggle()
      }

      toast.success('Yeni sohbet oluşturuldu')
    } catch (error) {
      console.error('❌ Error creating new chat:', error)
      toast.error('Sohbet oluşturulamadı')
    } finally {
      setCreatingChat(false)
    }
  }

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'chats', chatId))
      toast.success('Sohbet silindi')
      if (activeChatId === chatId) {
        router.push('/chat')
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast.error('Sohbet silinemedi')
    }
  }

  const handleEdit = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    const chat = chats.find(c => c.id === chatId)
    if (!chat) return

    if (editingId === chatId) {
      // Save
      try {
        await updateDoc(doc(db, 'users', user.uid, 'chats', chatId), {
          title: editTitle.trim() || 'Yeni Sohbet'
        })
        setEditingId(null)
        setEditTitle('')
        toast.success('Başlık güncellendi')
      } catch (error) {
        console.error('Error updating title:', error)
        toast.error('Başlık güncellenemedi')
      }
    } else {
      // Start editing
      setEditingId(chatId)
      setEditTitle(chat.title)
    }
  }

  const formatDate = (date: Date | any) => {
    if (!date) return 'Yeni'
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return 'Az önce'
      if (diffMins < 60) return `${diffMins} dakika önce`
      if (diffHours < 24) return `${diffHours} saat önce`
      if (diffDays < 7) return `${diffDays} gün önce`
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    } catch {
      return 'Yeni'
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? 0 : '-100%'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed lg:sticky top-0 left-0 h-screen w-80 bg-white border-r border-gray-200 z-50 lg:z-auto flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
          <h2 className="text-lg font-poppins font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Sohbetlerim
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={createNewChat}
              disabled={creatingChat}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Yeni Sohbet"
            >
              <Plus className={`w-5 h-5 ${creatingChat ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Henüz sohbet yok</p>
              <button
                onClick={createNewChat}
                disabled={creatingChat}
                className="mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingChat ? 'Oluşturuluyor...' : 'Yeni sohbet başlat'}
              </button>
            </div>
          ) : (
            <div className="p-2">
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleChatClick(chat.id)}
                  className={`p-3 rounded-xl mb-2 cursor-pointer transition-all ${
                    activeChatId === chat.id
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === chat.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleEdit(chat.id, { stopPropagation: () => {} } as any)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEdit(chat.id, { stopPropagation: () => {} } as any)
                            }
                          }}
                          className="w-full px-2 py-1 text-sm font-medium border border-teal-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="font-medium text-sm text-gray-900 truncate">
                          {chat.title}
                        </h3>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {chat.lastMessage || 'Mesaj yok'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(chat.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleEdit(chat.id, e)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(chat.id, e)}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

