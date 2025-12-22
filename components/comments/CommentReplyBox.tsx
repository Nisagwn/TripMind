'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import type { User } from './types'
import { updateHistory } from '@/lib/userData'

type CommentReplyBoxProps = {
  placeId: number | string
  parentId: string
  allUsers: User[]
  onReplySubmitted: () => void
  onTypingStart: () => void
  onCancel: () => void
}

export default function CommentReplyBox({ placeId, parentId, allUsers, onReplySubmitted, onTypingStart, onCancel }: CommentReplyBoxProps) {
  const { user } = useAuth()
  const [replyText, setReplyText] = useState('')
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (replyTextareaRef.current) {
      const id = window.setTimeout(() => {
        replyTextareaRef.current?.focus()
        const el = replyTextareaRef.current as HTMLTextAreaElement
        if (el) {
          const len = el.value.length
          el.setSelectionRange(len, len)
        }
      }, 0)
      return () => window.clearTimeout(id)
    }
  }, [])

  const extractMentions = useCallback((text: string): string[] => {
    const names = allUsers.map(u => u.displayName).filter(Boolean)
    const found = new Set<string>()
    names.forEach(name => {
      const pattern = new RegExp(`@${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?=\\s|$)`, 'g')
      if (pattern.test(text)) found.add(name)
    })
    return Array.from(found)
  }, [allUsers])

  const submitReply = useCallback(async () => {
    if (!user) return
    if (!replyText.trim()) return
    const loadingToast = toast.loading('Yanıt gönderiliyor...')
    try {
      const mentions = extractMentions(replyText)
      const payload = {
        userId: user.uid,
        userDisplayName: user?.displayName || user?.email || "Anonim Kullanıcı",
        userAvatar: user.photoURL || "",
        rating: 0,
        text: replyText.trim(),
        comment: replyText.trim(), // backward compat
        photoUrl: null,
        createdAt: serverTimestamp(),
        likes: 0,
        dislikes: 0,
        userReactions: {},
        parentCommentId: parentId || null,
        mentions
      }

      await addDoc(collection(db, 'places', String(placeId), 'comments'), payload)

      // update visitedPlaces to match security rules and use server timestamp
      try {
        await updateHistory(user.uid, String(placeId))
      } catch (uhErr) {
        console.error((uhErr as any).code, (uhErr as any).message)
      }

      toast.success('Yanıt eklendi ✅', { id: loadingToast })
      setReplyText('')
      onReplySubmitted()
    } catch (e) {
      console.error((e as any).code, (e as any).message)
      console.error(e)
      toast.error('Bir şeyler ters gitti ❌', { id: loadingToast })
      onReplySubmitted()
    }
  }, [user, replyText, placeId, parentId, extractMentions, onReplySubmitted])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTypingStart()
    setReplyText(e.target.value)
  }, [onTypingStart])

  const handleCancel = useCallback(() => {
    setReplyText('')
    onCancel()
  }, [onCancel])

  return (
    <div className="mt-3 ml-8 pl-4 border-l-2 border-gray-200">
      <textarea
        value={replyText}
        onChange={handleTextChange}
        ref={replyTextareaRef}
        placeholder="Yanıtınızı yazın..."
        className="w-full p-3 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-inter bg-[#f8fffa]"
        rows={3}
      />
      <div className="mt-2 flex gap-2">
        <button onClick={submitReply} className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition">Gönder</button>
        <button onClick={handleCancel} className="px-4 py-2 rounded-xl border border-teal-200 hover:bg-teal-50 transition">İptal</button>
      </div>
    </div>
  )
}

