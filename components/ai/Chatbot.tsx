'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Loader2, MapPin, Calendar, Route } from 'lucide-react'
import toast from 'react-hot-toast'

interface Place {
  id: string
  name: string
  lat: number
  lng: number
  order: number
}

interface RouteData {
  name: string
  days: number
  places: Place[]
}

interface ChatbotProps {
  onRouteGenerated?: (route: RouteData) => void
}

export default function Chatbot({ onRouteGenerated }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedRoute, setGeneratedRoute] = useState<RouteData | null>(null)
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
      const response = await fetch('/api/ai-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!response.ok) {
        throw new Error('Rota oluşturulamadı')
      }

      const routeData: RouteData = await response.json()
      setGeneratedRoute(routeData)
      
      const assistantMessage = `✅ Rota oluşturuldu!\n\n📌 ${routeData.name}\n📅 ${routeData.days} gün\n📍 ${routeData.places.length} mekan`
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])
      
      if (onRouteGenerated) {
        onRouteGenerated(routeData)
      }

      toast.success('Rota başarıyla oluşturuldu!')
    } catch (error: any) {
      console.error('Chatbot error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Rota oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' 
      }])
      toast.error('Rota oluşturulamadı')
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
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
      >
        <MessageSquare className="w-7 h-7" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-bold text-lg">AI Rota Asistanı</h3>
                    <p className="text-xs text-teal-100">Seyahat planınızı oluşturun</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-teal-50/50 to-white">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-teal-300" />
                    <p className="font-inter text-sm">
                      Merhaba! Nereyi gezmek istiyorsunuz?
                      <br />
                      <span className="text-xs mt-2 block">
                        Örnek: "Antalya'da 3 günlük bir rota oluştur"
                      </span>
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                          : 'bg-white text-gray-800 shadow-md border border-teal-100'
                      }`}
                    >
                      <p className="font-inter text-sm whitespace-pre-line">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-2 shadow-md border border-teal-100">
                      <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                    </div>
                  </div>
                )}

                {generatedRoute && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-4 shadow-md border border-teal-200"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Route className="w-5 h-5 text-teal-600" />
                      <h4 className="font-poppins font-bold text-teal-900">{generatedRoute.name}</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-teal-700">
                        <Calendar className="w-4 h-4" />
                        <span>{generatedRoute.days} gün</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-teal-700">
                        <MapPin className="w-4 h-4" />
                        <span>{generatedRoute.places.length} mekan</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-teal-200">
                        <p className="text-xs font-inter font-medium text-teal-800 mb-2">Mekanlar:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {generatedRoute.places
                            .sort((a, b) => a.order - b.order)
                            .map((place, idx) => (
                              <div key={place.id} className="flex items-center gap-2 text-xs text-teal-700">
                                <span className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-[10px]">
                                  {place.order}
                                </span>
                                <span>{place.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-teal-100">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Mesajınızı yazın..."
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-inter text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

