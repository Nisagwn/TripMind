'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageSquare, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatUI() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage, 
          conversationHistory: messages 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'AI yanıtı alınamadı')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
      toast.success('Yanıt alındı!')
    } catch (error: any) {
      console.error('Chat API error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Bir hata oluştu: ${error.message}`
      }])
      toast.error('Mesaj gönderilemedi')
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

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 w-80 h-[500px] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl flex flex-col z-40 border border-teal-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-4 rounded-t-2xl flex items-center justify-between shadow-md">
              <h3 className="text-lg font-poppins font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                AI Asistanı
              </h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm font-inter">
                    Merhaba! Size nasıl yardımcı olabilirim?
                  </p>
                </div>
              )}
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-teal-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm font-inter whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] p-3 rounded-xl shadow-sm bg-gray-100 text-gray-800 rounded-bl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                    <span className="text-sm font-inter">Yazıyor...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-700 font-inter text-sm"
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

