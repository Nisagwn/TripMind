'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useFavorites } from '@/hooks/useFavorites'
import MessageBubble from './MessageBubble'
import SaveRouteButton from './SaveRouteButton'
import toast from 'react-hot-toast'

interface ChatWindowProps {
  chatId: string | null
}

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestingRoute, setSuggestingRoute] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { messages, loading: messagesLoading, sendMessage } = useChat(chatId)
  const { favorites } = useFavorites()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    try {
      const result = await sendMessage(userMessage, chatId)
      
      // If chat was just created, redirect to the new chat page
      if (!chatId && result.chatId) {
        router.push(`/chat/${result.chatId}`)
      }
      
      toast.success('Mesaj gönderildi')
    } catch (error: any) {
      console.error('Chat error:', error)
      toast.error('Mesaj gönderilemedi: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePersonalizedSuggestion = async () => {
    if (favorites.length === 0) {
      toast.error('Favori mekanınız yok')
      return
    }

    setSuggestingRoute(true)
    const favoritesText = favorites
      .map(f => f.placeData?.name || 'Bilinmeyen mekan')
      .join(', ')

    const prompt = `Kullanıcının favori mekanları: ${favoritesText}. Bu favorilere göre kullanıcının seyahat tercihlerini analiz et ve kişiselleştirilmiş bir rota öner. Türkçe yanıt ver. Eğer bir rota öneriyorsan, JSON formatında şu yapıda döndür:
{
  "name": "Rota Adı",
  "days": 3,
  "places": [
    {
      "name": "Mekan Adı",
      "lat": 36.884,
      "lng": 30.705,
      "order": 1
    }
  ]
}
Eğer sadece analiz yapıyorsan, normal metin olarak yanıt ver.`

    setInput(prompt)
    setTimeout(() => {
      handleSend()
      setSuggestingRoute(false)
    }, 100)
  }

  // Parse JSON route from messages
  const extractRouteFromMessages = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.sender === 'ai') {
        try {
          // Try to find JSON in the message
          const jsonMatch = msg.text.match(/\{[\s\S]*"name"[\s\S]*"days"[\s\S]*"places"[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.name && parsed.days && Array.isArray(parsed.places)) {
              return parsed
            }
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }
    }
    return null
  }

  const routeData = extractRouteFromMessages()

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-br from-teal-50/50 to-cyan-50/50">
        {messagesLoading ? (
          <div className="text-center text-gray-500 py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-500" />
            <p className="text-sm">Mesajlar yükleniyor...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-inter mb-2">
              Merhaba! Size nasıl yardımcı olabilirim?
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Seyahat planlaması, mekan önerileri veya genel sorularınız için buradayım.
            </p>
            {favorites.length > 0 && (
              <motion.button
                onClick={handlePersonalizedSuggestion}
                disabled={suggestingRoute}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {suggestingRoute ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Analiz ediliyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    Favorilerime Göre Rota Öner
                  </>
                )}
              </motion.button>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble key={msg.id || index} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[70%] p-3 rounded-xl shadow-sm bg-gray-100 text-gray-800 rounded-bl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                  <span className="text-sm font-inter">Yazıyor...</span>
                </div>
              </div>
            )}
            {routeData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-teal-900">Rota Tespit Edildi</h4>
                  <SaveRouteButton routeData={routeData} />
                </div>
                <p className="text-sm text-teal-700">
                  {routeData.name} • {routeData.days} gün • {routeData.places.length} mekan
                </p>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Mesajınızı yazın..."
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-700 font-inter"
            disabled={loading}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-teal-500 text-white p-3 rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
