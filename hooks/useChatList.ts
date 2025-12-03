'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ChatListItem {
  id: string
  title: string
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  lastMessage: string
  messageCount: number
}

export const useChatList = () => {
  const [chats, setChats] = useState<ChatListItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setChats([])
      setLoading(false)
      return
    }

    const chatsRef = collection(db, 'users', user.uid, 'chats')
    const q = query(chatsRef, orderBy('updatedAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatsData: ChatListItem[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || 'Yeni Sohbet',
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now(),
            lastMessage: data.lastMessage || '',
            messageCount: data.messageCount || 0
          }
        })
        setChats(chatsData)
        setLoading(false)
      },
      (error) => {
        console.error('Chats snapshot error:', error)
        setChats([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  return {
    chats,
    loading
  }
}

