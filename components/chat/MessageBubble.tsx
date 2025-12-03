'use client'

import { motion } from 'framer-motion'
import { User, Bot } from 'lucide-react'

interface MessageBubbleProps {
  message: {
    sender: 'user' | 'ai'
    text: string
  }
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-teal-500 text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message */}
      <div
        className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
          isUser
            ? 'bg-teal-500 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="text-sm font-inter whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    </motion.div>
  )
}

