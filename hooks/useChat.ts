'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ChatMessage {
  id?: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Timestamp | Date
}

export interface Chat {
  id: string
  title: string
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  lastMessage: string
  messageCount: number
}

export const useChat = (chatId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Load messages from Firestore
  useEffect(() => {
    if (!user || !chatId) {
      setMessages([])
      setLoading(false)
      return
    }

    const messagesRef = collection(db, 'users', user.uid, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('timestamp', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messagesData: ChatMessage[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          sender: doc.data().sender as 'user' | 'ai',
          text: doc.data().text || '',
          timestamp: doc.data().timestamp || serverTimestamp()
        }))
        setMessages(messagesData)
        setLoading(false)
      },
      (error) => {
        console.error('Messages snapshot error:', error)
        setMessages([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, chatId])

  // Create a new chat
  const createChat = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated')

    const chatsRef = collection(db, 'users', user.uid, 'chats')
    const newChatRef = await addDoc(chatsRef, {
      title: 'Yeni Sohbet',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
      messageCount: 0
    })

    return newChatRef.id
  }, [user])

  // Send message to Firestore and API
  const sendMessage = useCallback(async (text: string, currentChatId?: string | null): Promise<{ chatId: string; aiText: string }> => {
    if (!user || !text.trim()) throw new Error('User or message missing')

    let activeChatId = currentChatId || chatId

    // If no chat exists, create one first
    if (!activeChatId) {
      activeChatId = await createChat()
    }

    try {
      // Add user message to Firestore
      const messagesRef = collection(db, 'users', user.uid, 'chats', activeChatId, 'messages')
      await addDoc(messagesRef, {
        sender: 'user',
        text: text.trim(),
        timestamp: serverTimestamp()
      })

      // Update chat metadata
      const chatRef = doc(db, 'users', user.uid, 'chats', activeChatId)
      await updateDoc(chatRef, {
        lastMessage: text.trim(),
        updatedAt: serverTimestamp()
      })

      // Get last 10 messages for context
      const contextMessages = messages.slice(-10)
      const context = [
        ...contextMessages,
        { sender: 'user' as const, text: text.trim() }
      ]

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: context.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      const aiText = data.text || 'Yanıt alınamadı.'

      // Add AI message to Firestore
      await addDoc(messagesRef, {
        sender: 'ai',
        text: aiText,
        timestamp: serverTimestamp()
      })

      // Update chat metadata again
      await updateDoc(chatRef, {
        lastMessage: aiText.substring(0, 100),
        updatedAt: serverTimestamp()
      })

      // Generate title if needed (after 3 messages) - call separately to avoid dependency issues
      if (messages.length + 2 >= 3) {
        // Call title generation asynchronously without blocking
        generateChatTitleAsync(activeChatId, user.uid).catch(console.error)
      }

      return { chatId: activeChatId, aiText }
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [user, chatId, messages, createChat])

  // Generate chat title using AI (separate function to avoid circular dependency)
  const generateChatTitleAsync = async (chatId: string, userId: string) => {
    try {
      const messagesRef = collection(db, 'users', userId, 'chats', chatId, 'messages')
      const snapshot = await getDocs(query(messagesRef, orderBy('timestamp', 'asc'), limit(5)))
      
      const recentMessages = snapshot.docs.map(doc => ({
        sender: doc.data().sender,
        text: doc.data().text
      }))

      const titlePrompt = `Summarize this conversation in 3-5 words as a chat title. Only return the title, nothing else.\n\n${recentMessages.map(m => `${m.sender}: ${m.text}`).join('\n')}`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: titlePrompt,
          history: []
        })
      })

      if (response.ok) {
        const data = await response.json()
        const title = data.text?.trim() || 'Yeni Sohbet'
        
        const chatRef = doc(db, 'users', userId, 'chats', chatId)
        await updateDoc(chatRef, {
          title: title.substring(0, 50)
        })
      }
    } catch (error) {
      console.error('Error generating title:', error)
    }
  }

  return {
    messages,
    loading,
    sendMessage,
    createChat
  }
}
